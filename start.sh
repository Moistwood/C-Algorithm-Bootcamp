#!/usr/bin/env bash
# 蓝桥杯 C++ 省一特训 - 启动本地评测服务（macOS / Linux / Git Bash）
cd "$(dirname "$0")" || exit 1
PY=""
command -v python3 >/dev/null 2>&1 && PY=python3
[ -z "$PY" ] && command -v python >/dev/null 2>&1 && PY=python
if [ -z "$PY" ]; then
  echo "[错误] 没有找到 python3 / python"
  exit 1
fi
exec "$PY" judge.py "$@"
