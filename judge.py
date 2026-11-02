#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蓝桥杯 C++ 省一特训 —— 本地评测服务

一个进程干两件事：
  1. 把 algo-lanqiao 目录当静态站点伺服（http://127.0.0.1:8787）
  2. 提供 POST /api/run 编译并运行 C++ 代码

用法：
    python judge.py            # 默认端口 8787
    python judge.py 9000       # 指定端口

依赖：Python 3.8+，以及一个 g++ 编译器。
    优先级：toolchain/mingw64/bin/g++.exe  →  PATH 里的 g++  →  常见安装路径

注意：这个服务会执行你提交的任意 C++ 代码，只在本机使用，不要暴露到公网。
"""

import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
MAX_OUTPUT = 512 * 1024          # 单流输出上限 512KB，超出截断
COMPILE_TIMEOUT = 40             # 编译超时（秒）


# ---------------------------------------------------------------- 编译器查找
def find_gxx():
    candidates = [
        os.path.join(BASE_DIR, 'toolchain', 'mingw64', 'bin', 'g++.exe'),
        os.path.join(BASE_DIR, 'toolchain', 'mingw32', 'bin', 'g++.exe'),
        os.path.join(BASE_DIR, 'toolchain', 'w64devkit', 'bin', 'g++.exe'),
        os.path.join(BASE_DIR, 'toolchain', 'bin', 'g++.exe'),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c

    p = shutil.which('g++')
    if p:
        return p

    extra = [
        r'C:\msys64\mingw64\bin\g++.exe',
        r'C:\MinGW\bin\g++.exe',
        r'C:\mingw64\bin\g++.exe',
        r'C:\TDM-GCC-64\bin\g++.exe',
        r'C:\Program Files\Dev-Cpp\MinGW64\bin\g++.exe',
        r'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe',
        r'C:\Program Files\CodeBlocks\MinGW\bin\g++.exe',
    ]
    for c in extra:
        if os.path.isfile(c):
            return c
    return None


GXX = find_gxx()


def compiler_version():
    if not GXX:
        return None
    try:
        r = subprocess.run([GXX, '--version'], capture_output=True, text=True,
                           timeout=15, encoding='utf-8', errors='replace')
        first = (r.stdout or '').splitlines()[0] if r.stdout else 'g++'
        return first.strip().replace('g++.exe', 'g++')
    except Exception:
        return 'g++'


def decode(b):
    """优先 UTF-8，失败退回 GBK，再失败用替换字符。"""
    for enc in ('utf-8', 'gbk'):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            continue
    return b.decode('utf-8', errors='replace')


def read_capped(path):
    try:
        size = os.path.getsize(path)
        with open(path, 'rb') as f:
            data = f.read(MAX_OUTPUT)
        txt = decode(data).replace('\r\n', '\n')
        if size > MAX_OUTPUT:
            txt += '\n\n... [输出超过 %d KB，已截断，原长度 %d 字节]' % (MAX_OUTPUT // 1024, size)
        return txt
    except FileNotFoundError:
        return ''


# ---------------------------------------------------------------- 编译与运行
def judge(code, stdin_data='', time_limit_ms=2000):
    if not GXX:
        return {
            'ok': False, 'phase': 'env',
            'message': '没有找到 g++ 编译器。请把 MinGW 解压到 algo-lanqiao/toolchain/mingw64/ ，'
                       '或安装 MinGW-w64 后把 bin 目录加入 PATH。'
        }

    if not code or not code.strip():
        return {'ok': False, 'phase': 'env', 'message': '代码是空的。'}

    tmp = tempfile.mkdtemp(prefix='lqjudge_')
    src = os.path.join(tmp, 'main.cpp')
    exe = os.path.join(tmp, 'main.exe')

    try:
        with open(src, 'w', encoding='utf-8') as f:
            f.write(code)

        env = os.environ.copy()
        env['PATH'] = os.path.dirname(GXX) + os.pathsep + env.get('PATH', '')

        cmd = [GXX, '-std=c++14', '-O2', '-o', exe, src]

        t0 = time.time()
        try:
            cr = subprocess.run(cmd, capture_output=True, timeout=COMPILE_TIMEOUT,
                                cwd=tmp, env=env)
        except subprocess.TimeoutExpired:
            return {'ok': False, 'phase': 'compile',
                    'message': '编译超时（超过 %d 秒）' % COMPILE_TIMEOUT}
        compile_ms = int((time.time() - t0) * 1000)

        if cr.returncode != 0:
            err = decode(cr.stderr or b'')
            return {
                'ok': False, 'phase': 'compile', 'message': err,
                'compileTimeMs': compile_ms,
                'command': 'g++ -std=c++14 -O2 main.cpp -o main'
            }

        # 运行（stdout/stderr 重定向到文件，防止死循环程序把内存写爆）
        out_path = os.path.join(tmp, 'stdout.txt')
        err_path = os.path.join(tmp, 'stderr.txt')
        in_path = os.path.join(tmp, 'stdin.txt')
        with open(in_path, 'wb') as f:
            f.write((stdin_data or '').encode('utf-8'))

        t1 = time.time()
        with open(in_path, 'rb') as fin, open(out_path, 'wb') as fout, open(err_path, 'wb') as ferr:
            p = subprocess.Popen([exe], stdin=fin, stdout=fout, stderr=ferr, cwd=tmp, env=env)
            timed_out = False
            try:
                p.wait(timeout=time_limit_ms / 1000.0)
            except subprocess.TimeoutExpired:
                timed_out = True
                try:
                    p.kill()
                except Exception:
                    pass
                try:
                    p.wait(timeout=3)
                except Exception:
                    pass

        run_ms = int((time.time() - t1) * 1000)
        stdout = read_capped(out_path)
        stderr = read_capped(err_path)
        code_rc = p.returncode

        if timed_out:
            return {
                'ok': False, 'phase': 'run', 'verdict': 'TLE',
                'message': '运行超时（超过 %d ms）' % time_limit_ms,
                'stdout': stdout, 'stderr': stderr,
                'timeMs': run_ms, 'compileTimeMs': compile_ms
            }

        verdict = 'OK' if code_rc == 0 else 'RE'
        return {
            'ok': True, 'phase': 'run', 'verdict': verdict,
            'stdout': stdout, 'stderr': stderr,
            'exitCode': code_rc,
            'timeMs': run_ms, 'compileTimeMs': compile_ms
        }

    except Exception as e:
        return {'ok': False, 'phase': 'internal', 'message': '%s: %s' % (type(e).__name__, e)}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------- HTTP 服务
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, fmt, *args):
        # 只打印 API 请求，静态资源不刷屏
        if '/api/' in (self.path or ''):
            sys.stderr.write("[%s] %s\n" % (time.strftime('%H:%M:%S'), fmt % args))

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/ping'):
            body = json.dumps({
                'ok': True,
                'compiler': compiler_version(),
                'gxx': GXX or '',
                'python': sys.version.split()[0],
            }, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 别让浏览器把工具链目录当静态资源遍历
        if self.path.startswith('/toolchain'):
            self.send_error(403, 'Forbidden')
            return

        if self.path == '/' or self.path == '':
            self.path = '/index.html'
        super().do_GET()

    def do_POST(self):
        if not self.path.startswith('/api/run'):
            self.send_error(404)
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else b'{}'
            data = json.loads(raw.decode('utf-8'))
        except Exception as e:
            self._json(400, {'ok': False, 'phase': 'request', 'message': '请求解析失败: %s' % e})
            return

        code = data.get('code', '')
        stdin_data = data.get('stdin', '')
        try:
            tl = int(data.get('timeLimit', 2000))
        except Exception:
            tl = 2000
        tl = max(200, min(tl, 10000))

        result = judge(code, stdin_data, tl)
        self._json(200, result)

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    print('=' * 58)
    print('  蓝桥杯 C++ 省一特训 · 本地评测服务')
    print('=' * 58)
    if GXX:
        print('  编译器 : %s' % compiler_version())
        print('  路径   : %s' % GXX)
    else:
        print('  编译器 : [未找到] 代码运行功能将不可用')
        print('           把 MinGW 解压到 toolchain/mingw64/ 即可')
    print('  地址   : http://127.0.0.1:%d' % PORT)
    print('  停止   : Ctrl + C')
    print('=' * 58)

    try:
        srv = ThreadedServer(('127.0.0.1', PORT), Handler)
    except OSError as e:
        print('\n[错误] 端口 %d 启动失败：%s' % (PORT, e))
        print('可能已有实例在运行，或换一个端口：python judge.py 8788')
        input('按回车退出...')
        return

    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止。')
        srv.server_close()


if __name__ == '__main__':
    main()
