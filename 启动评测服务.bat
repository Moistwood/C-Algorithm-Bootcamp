@echo off
chcp 65001 >nul
title C++ 算法竞赛特训 - 在线评测服务
cd /d "%~dp0"

set "PY="
where python >nul 2>nul
if %errorlevel%==0 set "PY=python"
if not defined PY (
    where py >nul 2>nul
    if %errorlevel%==0 set "PY=py -3"
)

if not defined PY (
    echo.
    echo  [错误] 没有找到 Python。
    echo  请先安装 Python 3.8 或更高版本: https://www.python.org/downloads/
    echo  安装时务必勾选 "Add Python to PATH"。
    echo.
    pause
    exit /b 1
)

%PY% -m server.main
pause
