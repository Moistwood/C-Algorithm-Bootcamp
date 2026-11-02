#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键准备 C++ 工具链（Windows）

做什么：
  1. 下载 w64devkit（MinGW-w64 + GCC，约 69MB）到 toolchain/
  2. 解压
  3. 生成 bits/stdc++.h 的预编译头（编译速度从 8 秒降到 2 秒）

用法：
    python setup-toolchain.py

如果你本机已经装了 g++（Dev-C++ / Code::Blocks / MSYS2 自带），
不跑这个脚本也能用，judge.py 会自动去 PATH 和常见安装目录里找。
"""

import os
import subprocess
import sys
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOOLCHAIN_DIR = os.path.join(BASE_DIR, 'toolchain')
GXX = os.path.join(TOOLCHAIN_DIR, 'w64devkit', 'bin', 'g++.exe')

URL = ('https://github.com/skeeto/w64devkit/releases/download/v2.11.0/'
       'w64devkit-x64-2.11.0.7z.exe')
FILENAME = 'w64devkit-x64-2.11.0.7z.exe'


def human(n):
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return '%.1f %s' % (n, unit)
        n /= 1024.0
    return '%.1f TB' % n


def download(url, dest):
    print('下载 %s' % url)

    def hook(count, block, total):
        if total > 0:
            done = count * block
            pct = min(100.0, done * 100.0 / total)
            sys.stdout.write('\r  %5.1f%%  %s / %s' % (pct, human(done), human(total)))
            sys.stdout.flush()

    urllib.request.urlretrieve(url, dest, hook)
    print('\n下载完成：%s' % human(os.path.getsize(dest)))


def main():
    print('=' * 56)
    print('  蓝桥杯 C++ 省一特训 · 工具链准备')
    print('=' * 56)

    if os.path.isfile(GXX):
        print('已存在：%s' % GXX)
        print('跳过下载。')
    else:
        os.makedirs(TOOLCHAIN_DIR, exist_ok=True)
        setup = os.path.join(TOOLCHAIN_DIR, FILENAME)
        if not os.path.isfile(setup):
            try:
                download(URL, setup)
            except Exception as e:
                print('\n[错误] 下载失败：%s' % e)
                print('你可以手动下载后放到 toolchain/ 目录：')
                print(URL)
                input('按回车退出...')
                return 1

        print('解压到 %s ...' % TOOLCHAIN_DIR)
        try:
            subprocess.run([setup, '-y', '-o' + TOOLCHAIN_DIR],
                           check=True, cwd=TOOLCHAIN_DIR)
        except Exception as e:
            print('[错误] 解压失败：%s' % e)
            input('按回车退出...')
            return 1

        if not os.path.isfile(GXX):
            print('[错误] 解压后没找到 g++.exe，目录结构可能不对。')
            input('按回车退出...')
            return 1
        print('解压完成。')

    # 生成预编译头
    print('正在生成预编译头（首次约 10 秒，之后每次编译快 4 倍）...')
    pch_dir = os.path.join(
        TOOLCHAIN_DIR, 'w64devkit', 'lib', 'gcc',
        'x86_64-w64-mingw32', '16.2.0', 'include', 'c++',
        'x86_64-w64-mingw32', 'bits')
    header = os.path.join(pch_dir, 'stdc++.h')

    if not os.path.isfile(header):
        # 版本号可能不同，兜底搜索
        for root, dirs, files in os.walk(os.path.join(TOOLCHAIN_DIR, 'w64devkit')):
            if 'stdc++.h' in files and root.endswith('mingw32\\bits' if os.name == 'nt' else 'mingw32/bits'):
                pch_dir = root
                header = os.path.join(root, 'stdc++.h')
                break

    if os.path.isfile(header):
        try:
            subprocess.run([GXX, '-std=c++14', '-O2', '-x', 'c++-header',
                            'stdc++.h', '-o', 'stdc++.h.gch'],
                           check=True, cwd=pch_dir,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print('预编译头已就绪。')
        except Exception:
            print('预编译头生成失败，不影响使用，只是编译会慢一些。')
    else:
        print('没找到 stdc++.h，跳过预编译头。')

    print()
    print('全部就绪。现在运行启动评测服务.bat 即可。')
    try:
        input('按回车退出...')
    except EOFError:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
