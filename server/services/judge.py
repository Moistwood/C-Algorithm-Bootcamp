"""评测服务：编译 + 运行 + 判定。

设计要点
--------
1. **编译器自动探测**：优先用仓库自带的 toolchain/w64devkit，其次查 PATH
   和 Dev-C++、CodeBlocks、MSYS2 等常见安装位置，免去手工配环境。
2. **资源隔离**：每个提交独立临时目录；运行超时直接 kill；stdout/stderr
   重定向到文件而不是管道，避免死循环程序把内存写爆。
3. **输出截断**：单文件读取上限 512KB，超过直接判 OUTPUT_LIMIT。
4. **判定口径**：与主流 OJ 一致，按测试点给分，取最低状态作为总状态。
5. **并发控制**：用信号量限制同时编译运行的提交数，防止机器被压死。
"""

from __future__ import annotations

import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from ..config import BASE_DIR, settings

# 同时最多跑几个编译任务
_semaphore = threading.BoundedSemaphore(max(1, settings.judge_max_concurrent))

_compiler_cache: str | None = None
_compiler_probed = False


# =====================================================================
# 编译器探测
# =====================================================================

_WINDOWS_CANDIDATES = [
    "toolchain/w64devkit/bin/g++.exe",
    "toolchain/mingw64/bin/g++.exe",
    "toolchain/bin/g++.exe",
    "C:/Program Files (x86)/Dev-Cpp/MinGW64/bin/g++.exe",
    "C:/Program Files/Dev-Cpp/MinGW64/bin/g++.exe",
    "C:/Dev-Cpp/MinGW64/bin/g++.exe",
    "C:/msys64/mingw64/bin/g++.exe",
    "C:/MinGW/bin/g++.exe",
    "C:/mingw64/bin/g++.exe",
    "C:/TDM-GCC-64/bin/g++.exe",
    "C:/Program Files/CodeBlocks/MinGW/bin/g++.exe",
    "D:/Dev-Cpp/MinGW64/bin/g++.exe",
    "D:/mingw64/bin/g++.exe",
]

_POSIX_CANDIDATES = [
    "/usr/bin/g++",
    "/usr/local/bin/g++",
    "/opt/homebrew/bin/g++",
]


def find_compiler(force: bool = False) -> str | None:
    """返回可用的 g++ 路径，找不到返回 None。结果会缓存。"""
    global _compiler_cache, _compiler_probed
    if _compiler_probed and not force:
        return _compiler_cache

    _compiler_probed = True
    _compiler_cache = None

    # 1. 显式配置优先
    if settings.gpp_path and Path(settings.gpp_path).is_file():
        _compiler_cache = settings.gpp_path
        return _compiler_cache

    # 2. 项目内置工具链
    candidates = _WINDOWS_CANDIDATES if os.name == "nt" else _POSIX_CANDIDATES
    for rel in candidates:
        p = Path(rel)
        if not p.is_absolute():
            p = BASE_DIR / rel
        if p.is_file():
            _compiler_cache = str(p)
            return _compiler_cache

    # 3. PATH
    for name in ("g++", "g++.exe", "clang++"):
        found = shutil.which(name)
        if found:
            _compiler_cache = found
            return _compiler_cache

    return None


def compiler_version() -> str:
    """取编译器版本号，探测失败返回空串。"""
    gxx = find_compiler()
    if not gxx:
        return ""
    try:
        out = subprocess.run(
            [gxx, "--version"],
            capture_output=True,
            timeout=10,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        first = (out.stdout or "").strip().splitlines()
        if first:
            # "g++.exe (GCC) 16.2.0" -> "GCC 16.2.0"
            line = first[0]
            m = re.search(r"\)\s*(.+)$", line)
            return m.group(1).strip() if m else line.strip()
    except Exception:  # noqa: BLE001
        return ""
    return ""


def compiler_info() -> dict:
    gxx = find_compiler()
    return {
        "available": bool(gxx),
        "path": gxx or "",
        "version": compiler_version(),
        "platform": "%s %s" % (platform.system(), platform.machine()),
        "python": sys.version.split()[0],
    }


# =====================================================================
# 编译
# =====================================================================


def _normalize_stream(data: bytes) -> str:
    """字节流转文本，统一换行符。

    评测机上常见的坑：Windows 下程序输出 \\r\\n，Linux 下 \\n，
    如果不统一，同样的代码在两个平台判定结果会不一致。
    """
    if not data:
        return ""
    for enc in ("utf-8", "gbk", "latin-1"):
        try:
            text = data.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = data.decode("utf-8", errors="replace")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def compile_cpp(
    code: str,
    workdir: Path,
) -> tuple[bool, Path | None, str, int]:
    """编译一段 C++ 源码。

    返回 (是否成功, 可执行文件路径, 编译输出, 耗时毫秒)。
    """
    gxx = find_compiler()
    if not gxx:
        return False, None, "没有找到 g++ 编译器。请先运行 python setup-toolchain.py 安装工具链。", 0

    workdir.mkdir(parents=True, exist_ok=True)
    src = workdir / "main.cpp"
    src.write_text(code, encoding="utf-8", newline="\n")

    exe = workdir / ("main.exe" if os.name == "nt" else "main")

    cmd = [
        gxx,
        "-std=%s" % settings.judge_cpp_standard,
        settings.judge_optimize,
        "-Wall",
        "-o",
        str(exe),
        str(src),
    ]

    t0 = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            timeout=settings.judge_compile_timeout,
            cwd=str(workdir),
        )
        elapsed = int((time.perf_counter() - t0) * 1000)

        if proc.returncode != 0:
            msg = _normalize_stream(proc.stderr) or _normalize_stream(proc.stdout)
            return False, None, _clean_compile_message(msg, str(workdir)), elapsed

        if not exe.exists():
            return False, None, "编译进程返回成功，但没有生成可执行文件。", elapsed

        return True, exe, "", elapsed

    except subprocess.TimeoutExpired:
        elapsed = int((time.perf_counter() - t0) * 1000)
        return False, None, "编译超时（超过 %d 秒），请检查是否有死循环的模板展开。" % settings.judge_compile_timeout, elapsed
    except Exception as exc:  # noqa: BLE001
        return False, None, "编译过程出错：%s" % exc, 0


def _clean_compile_message(msg: str, workdir: str) -> str:
    """把编译输出里的临时路径替换掉，避免泄露服务器目录结构。"""
    if not msg:
        return ""
    msg = msg.replace(workdir, ".")
    msg = msg.replace(str(workdir).replace("\\", "/"), ".")
    msg = re.sub(r"[A-Za-z]:[\\/][^\s:]+[\\/]main\.cpp", "main.cpp", msg)
    # 只保留前 40 行，够定位问题了
    lines = msg.splitlines()
    if len(lines) > 40:
        lines = lines[:40] + ["... （编译输出较长，已截断）"]
    return "\n".join(lines)


# =====================================================================
# 运行
# =====================================================================


def run_executable(
    exe: Path,
    stdin_data: str,
    time_limit_ms: int,
    workdir: Path,
) -> dict:
    """运行一个可执行文件，返回状态、输出、耗时。

    输出写文件而不是 PIPE：死循环程序会持续输出，
    用 PIPE + capture_output 会把内存吃光。
    """
    out_path = workdir / "stdout.txt"
    err_path = workdir / "stderr.txt"
    in_path = workdir / "stdin.txt"
    in_path.write_text(stdin_data or "", encoding="utf-8", newline="\n")

    timeout_s = max(0.2, time_limit_ms / 1000.0)

    t0 = time.perf_counter()
    status = "accepted"
    exit_code = 0
    timed_out = False

    with open(in_path, "rb") as fin, open(out_path, "wb") as fout, open(err_path, "wb") as ferr:
        try:
            proc = subprocess.run(
                [str(exe)],
                stdin=fin,
                stdout=fout,
                stderr=ferr,
                timeout=timeout_s,
                cwd=str(workdir),
            )
            exit_code = proc.returncode
        except subprocess.TimeoutExpired:
            timed_out = True
            exit_code = -1
        except Exception as exc:  # noqa: BLE001
            return {
                "status": "system_error",
                "stdout": "",
                "stderr": str(exc),
                "time_ms": int((time.perf_counter() - t0) * 1000),
                "exit_code": -1,
                "memory_kb": 0,
            }

    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    # 输出大小检查
    out_size = out_path.stat().st_size if out_path.exists() else 0
    if out_size > settings.judge_max_output:
        return {
            "status": "output_limit",
            "stdout": "",
            "stderr": "",
            "time_ms": elapsed_ms,
            "exit_code": exit_code,
            "memory_kb": 0,
            "message": "输出超过 %d KB，程序可能有死循环打印。" % (settings.judge_max_output // 1024),
        }

    stdout = _normalize_stream(out_path.read_bytes() if out_path.exists() else b"")
    stderr = _normalize_stream(err_path.read_bytes() if err_path.exists() else b"")

    if timed_out:
        status = "time_limit"
    elif exit_code != 0:
        status = "runtime_error"

    return {
        "status": status,
        "stdout": stdout,
        "stderr": stderr,
        "time_ms": elapsed_ms,
        "exit_code": exit_code,
        "memory_kb": 0,
        "message": "",
    }


def compare_output(actual: str, expected: str) -> bool:
    """比较输出。忽略行尾空白和末尾空行，这是 OJ 的通行做法。"""
    def norm(s: str) -> list[str]:
        return [line.rstrip() for line in (s or "").replace("\r\n", "\n").split("\n")]

    a = norm(actual)
    b = norm(expected)
    while a and a[-1] == "":
        a.pop()
    while b and b[-1] == "":
        b.pop()
    return a == b


# =====================================================================
# 自由运行（代码运行器页面）
# =====================================================================


def run_once(code: str, stdin_data: str, time_limit_ms: int) -> dict:
    """不判分，只编译运行，返回原始输出。"""
    if not _semaphore.acquire(timeout=60):
        return {
            "status": "system_error",
            "status_name": "评测机繁忙",
            "compile_message": "当前排队任务较多，请稍后重试。",
            "stdout": "",
            "stderr": "",
            "time_ms": 0,
            "compile_ms": 0,
            "memory_kb": 0,
            "exit_code": -1,
        }

    tmp = Path(tempfile.mkdtemp(prefix="run_", dir=settings.judge_work_dir))
    try:
        ok, exe, message, compile_ms = compile_cpp(code, tmp)
        if not ok or exe is None:
            return {
                "status": "compile_error",
                "status_name": STATUS_NAMES["compile_error"],
                "compile_message": message,
                "stdout": "",
                "stderr": "",
                "time_ms": 0,
                "compile_ms": compile_ms,
                "memory_kb": 0,
                "exit_code": -1,
            }

        result = run_executable(exe, stdin_data, time_limit_ms, tmp)
        return {
            "status": result["status"],
            "status_name": STATUS_NAMES.get(result["status"], result["status"]),
            "compile_message": "",
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "time_ms": result["time_ms"],
            "compile_ms": compile_ms,
            "memory_kb": result.get("memory_kb", 0),
            "exit_code": result["exit_code"],
        }
    finally:
        _semaphore.release()
        shutil.rmtree(tmp, ignore_errors=True)


# =====================================================================
# 判定
# =====================================================================

STATUS_NAMES = {
    "pending": "等待评测",
    "compiling": "编译中",
    "running": "运行中",
    "accepted": "通过",
    "wrong_answer": "答案错误",
    "time_limit": "运行超时",
    "memory_limit": "内存超限",
    "runtime_error": "运行错误",
    "compile_error": "编译错误",
    "system_error": "系统错误",
    "output_limit": "输出超限",
}

# 状态严重程度，取最严重的作为整题状态
_SEVERITY = {
    "accepted": 0,
    "pending": 1,
    "compiling": 2,
    "running": 3,
    "wrong_answer": 4,
    "output_limit": 5,
    "time_limit": 6,
    "memory_limit": 7,
    "runtime_error": 8,
    "system_error": 9,
    "compile_error": 10,
}


def worst_status(statuses: list[str]) -> str:
    if not statuses:
        return "system_error"
    return max(statuses, key=lambda s: _SEVERITY.get(s, 99))


def excerpt(text: str, limit: int = 300) -> str:
    """给测试点结果留一段可读的输入输出摘要。"""
    if not text:
        return ""
    text = text.replace("\r\n", "\n")
    if len(text) <= limit:
        return text
    return text[:limit] + "\n... （已截断，共 %d 字符）" % len(text)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def judge_dir(submission_id: int) -> Path:
    return Path(settings.judge_work_dir) / ("sub_%d" % submission_id)
