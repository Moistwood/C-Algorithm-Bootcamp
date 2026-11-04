"""评测运行沙箱：跨平台的资源限制与进程树管理。

解决的问题
----------
1. **超时杀不干净**。学生代码里一句 system("...") 就能拉起子进程，
   只杀直接子进程的话，孙进程会留下来继续吃 CPU。
   - Windows：把被测程序放进 Job Object，超时 TerminateJobObject
     一次干掉整棵树；KILL_ON_JOB_CLOSE 保证评测进程退出后
     残留程序也会被系统回收。
   - POSIX：start_new_session 建立新进程组，超时 killpg 组内全杀。
2. **内存限制是摆设**。题目里写了 memory_limit 256MB，但原来从不检查。
   - Windows：Job Object 的 ProcessMemoryLimit 直接限制提交内存
     （commit charge），分配超限会得到 bad_alloc 而不是把机器吃爆；
     跑完还能从作业对象里读出峰值内存，供前端展示。
   - POSIX：通过 sh ulimit -v 限制进程虚拟地址空间。
     （用 sh 包一层而不是 preexec_fn：后者在多线程进程里可能死锁。）

降级策略：Job Object 创建失败（老系统/权限受限）时退回
taskkill /T /F，只杀树不给内存限制，功能不至于整个不可用。
"""

from __future__ import annotations

import ctypes
import os
import subprocess

IS_WINDOWS = os.name == "nt"


# =====================================================================
# Windows：Job Object（纯 ctypes，不引第三方依赖）
# =====================================================================

if IS_WINDOWS:
    from ctypes import wintypes

    # ---- 内核结构体定义（见 MSDN: JOBOBJECT_EXTENDED_LIMIT_INFORMATION）----

    class _IO_COUNTERS(ctypes.Structure):
        _fields_ = [
            ("ReadOperationCount", ctypes.c_ulonglong),
            ("WriteOperationCount", ctypes.c_ulonglong),
            ("OtherOperationCount", ctypes.c_ulonglong),
            ("ReadTransferCount", ctypes.c_ulonglong),
            ("WriteTransferCount", ctypes.c_ulonglong),
            ("OtherTransferCount", ctypes.c_ulonglong),
        ]

    class _JOBOBJECT_BASIC_LIMIT(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_ulonglong),
            ("PerJobUserTimeLimit", ctypes.c_ulonglong),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class _JOBOBJECT_EXTENDED_LIMIT(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", _JOBOBJECT_BASIC_LIMIT),
            ("IoInfo", _IO_COUNTERS),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    _JobObjectExtendedLimitInformation = 9
    _JOB_OBJECT_LIMIT_PROCESS_MEMORY = 0x0100
    _JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000

    _PROCESS_SET_QUOTA = 0x0100
    _PROCESS_TERMINATE = 0x0001

    _kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]


class Sandbox:
    """单次被测程序运行的资源约束上下文。

    用法：
        with Sandbox(memory_limit_mb=256) as box:
            cmd, kwargs = box.popen_params(str(exe))
            proc = subprocess.Popen(cmd, **kwargs, ...)
            box.attach(proc)          # Windows：把进程挂进作业对象
            proc.wait(timeout=...)
            ...
            peak_kb = box.peak_memory_kb()
    """

    def __init__(self, memory_limit_mb: int | None = None) -> None:
        self.memory_limit_mb = max(0, memory_limit_mb or 0)
        self._job = None            # Windows 作业对象句柄
        self._job_ok = False         # 作业对象是否可用
        self.peak_memory_kb_value = 0

    # ------------------------------------------------------------------
    # 启动参数
    # ------------------------------------------------------------------

    def popen_params(self, exe_path: str) -> tuple[list[str], dict]:
        """返回启动被测程序的命令与 Popen 附加参数。"""
        if IS_WINDOWS:
            # 新进程组只是让它别响应我们的 Ctrl 事件，杀树靠 Job Object
            return [exe_path], {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}

        # POSIX：sh 包一层做 ulimit（线程安全），setsid 建新进程组便于 killpg
        kwargs: dict = {"start_new_session": True}
        if self.memory_limit_mb:
            limit_kb = self.memory_limit_mb * 1024
            return ["/bin/sh", "-c", 'ulimit -v %d; exec "%s"' % (limit_kb, exe_path)], kwargs
        return [exe_path], kwargs

    # ------------------------------------------------------------------
    # Windows 作业对象
    # ------------------------------------------------------------------

    def _create_job(self) -> bool:
        """创建带内存上限的作业对象，成功返回 True。"""
        if not IS_WINDOWS or self._job_ok:
            return self._job_ok

        job = _kernel32.CreateJobObjectW(None, None)
        if not job:
            return False

        info = _JOBOBJECT_EXTENDED_LIMIT()
        info.BasicLimitInformation.LimitFlags = _JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if self.memory_limit_mb:
            info.BasicLimitInformation.LimitFlags |= _JOB_OBJECT_LIMIT_PROCESS_MEMORY
            info.ProcessMemoryLimit = self.memory_limit_mb * 1024 * 1024

        if not _kernel32.SetInformationJobObject(
            job, _JobObjectExtendedLimitInformation, ctypes.byref(info), ctypes.sizeof(info)
        ):
            _kernel32.CloseHandle(job)
            return False

        self._job = job
        self._job_ok = True
        return True

    def attach(self, proc: subprocess.Popen) -> None:
        """把已启动的进程挂进作业对象。失败则记住降级状态。"""
        self._create_job()
        if not self._job_ok:
            return
        # PROCESS_SET_QUOTA 是 AssignProcessToJobObject 需要的权限
        handle = _kernel32.OpenProcess(_PROCESS_SET_QUOTA | _PROCESS_TERMINATE, False, proc.pid)
        if not handle:
            return
        try:
            _kernel32.AssignProcessToJobObject(self._job, handle)
        finally:
            _kernel32.CloseHandle(handle)

    def kill_tree(self, proc: subprocess.Popen) -> None:
        """终止整棵进程树。"""
        if self._job_ok:
            _kernel32.TerminateJobObject(self._job, 1)
            return
        if IS_WINDOWS:
            # 降级路径：任务管理器同款强杀整树
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                capture_output=True,
                timeout=10,
            )
        else:
            import signal

            try:
                os.killpg(proc.pid, signal.SIGKILL)  # start_new_session 后 pgid == pid
            except (ProcessLookupError, PermissionError):
                pass
        try:
            proc.kill()
        except OSError:
            pass

    # ------------------------------------------------------------------
    # 内存统计
    # ------------------------------------------------------------------

    def peak_memory_kb(self) -> int:
        """被测进程运行期间的峰值内存（KB）。拿不到返回 0。

        作业对象关闭后查询窗口就没了，所以先返回缓存值，
        缓存为空才去查作业对象——判定 MLE 发生在沙箱退出之后，
        顺序不能反。
        """
        if self.peak_memory_kb_value:
            return self.peak_memory_kb_value
        if not (IS_WINDOWS and self._job_ok):
            return 0
        info = _JOBOBJECT_EXTENDED_LIMIT()
        if _kernel32.QueryInformationJobObject(
            self._job, _JobObjectExtendedLimitInformation, ctypes.byref(info), ctypes.sizeof(info), None
        ):
            # Windows 单位是字节，除以 1024 得 KB
            self.peak_memory_kb_value = int(info.PeakProcessMemoryUsed // 1024)
        return self.peak_memory_kb_value

    def memory_exceeded(self) -> bool:
        """峰值内存是否贴近上限（判定 MLE 用）。"""
        if not self.memory_limit_mb:
            return False
        return self.peak_memory_kb() >= self.memory_limit_mb * 1024 * 0.95

    # ------------------------------------------------------------------
    # 资源回收
    # ------------------------------------------------------------------

    def close(self) -> None:
        if self._job:
            # 关闭句柄即可：KILL_ON_JOB_CLOSE 会让残留子进程随之退出
            _kernel32.CloseHandle(self._job)
            self._job = None
            self._job_ok = False

    def __enter__(self) -> "Sandbox":
        return self

    def __exit__(self, *exc) -> None:
        self.close()
