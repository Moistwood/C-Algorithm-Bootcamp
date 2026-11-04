#!/usr/bin/env bash
# 蓝桥杯算法学习与在线评测系统 —— 启动脚本（macOS / Linux）
set -e
cd "$(dirname "$0")"

PY=""
command -v python3 >/dev/null 2>&1 && PY=python3
[ -z "$PY" ] && command -v python >/dev/null 2>&1 && PY=python
if [ -z "$PY" ]; then
  echo "[错误] 没有找到 python3 / python"
  exit 1
fi

if ! "$PY" -c "import fastapi, sqlalchemy" >/dev/null 2>&1; then
  echo "首次运行，正在安装依赖..."
  "$PY" -m pip install -r requirements.txt
fi

echo
echo "  蓝桥杯算法学习与在线评测系统"
echo "  启动后访问 http://127.0.0.1:8000"
echo
exec "$PY" -m server.main
