@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   ============================================
echo       C++ 算法竞赛特训
echo   ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo   [错误] 没有找到 python
  echo   请先安装 Python 3.9 以上版本：https://www.python.org/downloads/
  echo   安装时记得勾选 "Add Python to PATH"
  echo.
  pause
  exit /b 1
)

python -c "import fastapi, sqlalchemy" >nul 2>nul
if errorlevel 1 (
  echo   首次运行，正在安装依赖，请稍等...
  echo.
  python -m pip install -r requirements.txt
  echo.
  if errorlevel 1 (
    echo   [错误] 依赖安装失败。
    echo   可以试试国内镜像：
    echo   python -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    echo.
    pause
    exit /b 1
  )
)

if not exist "toolchain\w64devkit\bin\g++.exe" (
  echo   没有找到内置编译器。如果本机已装 g++ 可以忽略。
  echo   需要在线评测功能的话，运行一次：python setup-toolchain.py
  echo.
)

echo   正在启动服务，稍后浏览器会自动打开...
echo   关闭这个窗口即停止服务。
echo.

start "" http://127.0.0.1:8000
python -m server.main

pause
