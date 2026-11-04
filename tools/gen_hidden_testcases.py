#!/usr/bin/env python3
"""为每道题生成隐藏测试点。

做法：为每道题随机造 3 组输入（小 / 中 / 边界），用题目自带的参考代码
（reference_code）跑出期望输出，存成 server/hidden_testcases.json，服务启动时由 seed 灌进测试点表。

    python tools/gen_hidden_testcases.py
"""
from __future__ import annotations

import json
import random
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from server.services import judge as engine  # noqa: E402

OUT_JSON = ROOT / "server" / "hidden_testcases.json"
WORK = ROOT / "runtime" / "gen"


# ---------------------------------------------------------------------
# 通用工具
# ---------------------------------------------------------------------
def days_in_month(y: int, m: int) -> int:
    if m == 2:
        return 29 if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0 else 28
    return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m]


def rnd_date(r: random.Random) -> tuple[int, int, int]:
    y = r.randint(1900, 2100)
    m = r.randint(1, 12)
    return y, m, r.randint(1, days_in_month(y, m))


def name_of(i: int) -> str:
    """0 -> a, 1 -> b, ... 26 -> ba 唯一小写名。"""
    s = ""
    i += 1
    while i > 0:
        i, rem = divmod(i - 1, 26)
        s = chr(97 + rem) + s
    return s


def edges_of_tree(r: random.Random, n: int) -> list[tuple[int, int]]:
    """随机树：每个点连到前面某个点。"""
    return [(r.randint(1, i - 1), i) for i in range(2, n + 1)]


def rand_graph(r: random.Random, n: int, m: int, *, dag: bool = False,
               weighted: bool = False) -> list[tuple]:
    out = []
    for _ in range(m):
        u = r.randint(1, n)
        if dag:
            v = r.randint(u + 1, n) if u < n else u
            if v == u:
                continue
        else:
            v = r.randint(1, n)
        if weighted:
            out.append((u, v, r.randint(1, 10 ** 9)))
        else:
            out.append((u, v))
    return out


def fmt_edges(es: list[tuple]) -> str:
    return "\n".join(" ".join(str(x) for x in e) for e in es) + "\n"


# ---------------------------------------------------------------------
# 每题生成器：签名 (rng, tier) -> 输入字符串
# tier: 'a' 小随机 / 'b' 中等 / 'c' 边界
# ---------------------------------------------------------------------
def g1(r, t):
    if t == "c":
        return "%d %d\n" % (10 ** 9, 10 ** 9)
    return "%d %d\n" % (r.randint(-10 ** 9, 10 ** 9), r.randint(-10 ** 9, 10 ** 9))


def g2(r, t):
    if t == "c":
        f = -1000.0
    elif t == "a":
        f = float(r.randint(-100, 100))
    else:
        f = round(r.uniform(-1000, 1000), 2)
    return "%.2f\n" % f


def g3(r, t):
    if t == "c":
        n = 0
    elif t == "a":
        n = r.randint(0, 9999)
    else:
        n = r.randint(10 ** 17, 10 ** 18 - 1)
    return "%d\n" % n


def g4(r, t):
    if t == "c":
        return "2020 1 1 2020 1 1\n"
    a = rnd_date(r)
    b = rnd_date(r)
    if a > b:
        a, b = b, a
    return "%d %d %d %d %d %d\n" % (a + b)


def g5(r, t):
    if t == "c":
        return "10000101\n"
    y = r.randint(1001, 9800) if t == "b" else r.randint(1001, 2900)
    m = r.randint(1, 12)
    d = r.randint(1, days_in_month(y, m))
    return "%04d%02d%02d\n" % (y, m, d)


def g6(r, t):
    n = 1 if t == "c" else (r.randint(2, 8) if t == "a" else r.randint(20, 40))
    return "%d\n" % n


def g7(r, t):
    if t == "c":
        return "0 7\n"
    n = r.randint(0, 999) if t == "a" else r.randint(10 ** 15, 10 ** 18 - 1)
    return "%d %d\n" % (n, r.randint(2, 16))


def g8(r, t):
    n = 1 if t == "c" else (r.randint(2, 8) if t == "a" else r.randint(200, 600))
    lines = [str(n)]
    for i in range(n):
        lines.append("%s %d %d %d" % (name_of(i), r.randint(0, 100),
                                      r.randint(0, 100), r.randint(0, 100)))
    return "\n".join(lines) + "\n"


def g9(r, t):
    n = r.randint(1, 5) if t == "a" else (r.randint(50, 300) if t == "b" else 1)
    k = r.randint(1, 10)
    Ls = ["%.2f" % r.uniform(0.01, 1000.0) for _ in range(n)]
    if t == "c":
        return "1 3\n1.00\n"
    return "%d %d\n%s\n" % (n, k, " ".join(Ls))


def g10(r, t):
    if t == "c":
        return "10 0 0\n\n"
    n = r.randint(1, 6) if t == "a" else (r.randint(200, 2000) if t == "b" else 1)
    L = r.randint(n * 3, 10 ** 9)
    m = r.randint(0, n)
    pos = sorted(r.sample(range(1, L), n)) if n else []
    return "%d %d %d\n%s\n" % (L, n, m, " ".join(map(str, pos)))


def g11(r, t):
    n = r.randint(2, 10) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    if t == "b":
        a.sort(reverse=True)
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g12(r, t):
    n = r.randint(2, 10) if t == "a" else (r.randint(5000, 20000) if t == "b" else 1)
    q = r.randint(2, 10) if t == "a" else min(n, 20000)
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    lines = ["%d %d" % (n, q), " ".join(map(str, a))]
    for _ in range(q):
        l = r.randint(1, n)
        lines.append("%d %d" % (l, r.randint(l, n)))
    return "\n".join(lines) + "\n"


def g13(r, t):
    n = m = r.randint(2, 6) if t == "a" else (r.randint(30, 60) if t == "b" else 1)
    lines = ["%d %d" % (n, m)]
    for _ in range(n):
        lines.append(" ".join(str(r.randint(-1000, 1000)) for _ in range(m)))
    return "\n".join(lines) + "\n"


def g14(r, t):
    n = r.randint(2, 10) if t == "a" else (r.randint(3000, 15000) if t == "b" else 1)
    q = r.randint(2, 10) if t == "a" else min(n, 15000)
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    lines = ["%d %d" % (n, q), " ".join(map(str, a))]
    for _ in range(q):
        l = r.randint(1, n)
        lines.append("%d %d %d" % (l, r.randint(l, n), r.randint(-10 ** 9, 10 ** 9)))
    return "\n".join(lines) + "\n"


def g15(r, t):
    """严格递增、唯一解：生成后暴力确认只有一对。"""
    n = 2 if t == "c" else (r.randint(3, 12) if t == "a" else r.randint(100, 500))
    for _ in range(300):
        a = sorted(r.sample(range(1, 10 ** 6), n))
        i, j = r.sample(range(n), 2)
        tgt = a[i] + a[j]
        cnt, lo, hi = 0, 0, n - 1
        while lo < hi:
            s = a[lo] + a[hi]
            if s == tgt:
                cnt += 1
                lo += 1
                hi -= 1
            elif s < tgt:
                lo += 1
            else:
                hi -= 1
        if cnt == 1:
            return "%d %d\n%s\n" % (n, tgt, " ".join(map(str, a)))
    return "2 3\n1 2\n"


def g16(r, t):
    n = r.randint(1, 12) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    alpha = "abcde" if t == "b" else "abcdefghijklmnopqrstuvwxyz"
    return "".join(r.choice(alpha) for _ in range(n)) + "\n"


def g17(r, t):
    n = r.randint(1, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    lines = [str(n)]
    for _ in range(n):
        l = r.randint(0, 10 ** 9 - 1)
        lines.append("%d %d" % (l, r.randint(l + 1, 10 ** 9)))
    return "\n".join(lines) + "\n"


def g18(r, t):
    n = r.randint(1, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    a = [r.randint(1, 10 ** 4) for _ in range(n)]
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g19(r, t):
    n = r.randint(0, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    pairs = [("(", ")"), ("[", "]"), ("{", "}")]
    out = []
    for _ in range(n):
        o, c = r.choice(pairs)
        out.append(r.choice([o, c]))
    return "".join(out) + "\n"


def g20(r, t):
    n = r.randint(1, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    k = r.randint(1, n)
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    return "%d %d\n%s\n" % (n, k, " ".join(map(str, a)))


def g21(r, t):
    n = r.randint(1, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    m = 0 if t == "c" else r.randint(0, min(n * 2, 10 ** 5))
    es = [(r.randint(1, n), r.randint(1, n)) for _ in range(m)]
    return "%d %d\n%s" % (n, m, fmt_edges(es))


def g22(r, t):
    n = r.randint(1, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    h = [r.randint(0, 10 ** 9) for _ in range(n)]
    return "%d\n%s\n" % (n, " ".join(map(str, h)))


def g23(r, t):
    if t == "c":
        return "1 2\nSE\n"
    n = r.randint(2, 5) if t == "a" else (r.randint(30, 80) if t == "b" else 1)
    m = r.randint(2, 5) if t == "a" else (r.randint(30, 80) if t == "b" else 2)
    g = [["#" if r.random() < 0.3 else "." for _ in range(m)] for _ in range(n)]
    (sx, sy), (ex, ey) = (r.randrange(n), r.randrange(m)), (r.randrange(n), r.randrange(m))
    while (sx, sy) == (ex, ey):
        ex, ey = r.randrange(n), r.randrange(m)
    g[sx][sy] = "S"
    g[ex][ey] = "E"
    return "%d %d\n%s\n" % (n, m, "\n".join("".join(row) for row in g))


def g24(r, t):
    n = r.randint(1, 8) if t == "a" else (r.randint(2000, 8000) if t == "b" else 1)
    m = 0 if t == "c" else r.randint(0, min(n * 2, 2 * 10 ** 5))
    es = [(r.randint(1, n), r.randint(1, n)) for _ in range(m)]
    return "%d %d\n%s" % (n, m, fmt_edges(es))


def g25(r, t):
    n = r.randint(2, 8) if t == "a" else (r.randint(500, 2000) if t == "b" else 1)
    cyclic = t == "c"
    if cyclic:
        es = [(1, 2), (2, 3), (3, 1)] if n >= 3 else [(1, 1)]
        n = max(n, 3)
        return "%d %d\n%s" % (n, len(es), fmt_edges(es))
    m = r.randint(0, min(n * 2, 2 * 10 ** 5))
    es = rand_graph(r, n, m, dag=True)
    return "%d %d\n%s" % (n, len(es), fmt_edges(es))


def g26(r, t):
    n = r.randint(2, 8) if t == "a" else (r.randint(500, 2000) if t == "b" else 1)
    m = 0 if t == "c" else r.randint(0, min(n * 3, 2 * 10 ** 5))
    es = rand_graph(r, n, m, weighted=True)
    return "%d %d\n%s" % (n, len(es), fmt_edges(es))


def g27(r, t):
    n = r.randint(2, 8) if t == "a" else (r.randint(500, 2000) if t == "b" else 1)
    m = 0 if t == "c" else r.randint(0, min(n * 3, 2 * 10 ** 5))
    es = rand_graph(r, n, m, weighted=True)
    return "%d %d\n%s" % (n, len(es), fmt_edges(es))


def g28(r, t):
    n = 1 if t == "c" else (r.randint(2, 6) if t == "a" else r.randint(50, 200))
    lines = [str(n)]
    for i in range(1, n + 1):
        lines.append(" ".join(str(r.randint(-1000, 1000)) for _ in range(i)))
    return "\n".join(lines) + "\n"


def g29(r, t):
    n, W = (1, 1) if t == "c" else (
        (r.randint(1, 5), r.randint(5, 30)) if t == "a" else (r.randint(100, 400), r.randint(500, 3000)))
    lines = ["%d %d" % (n, W)]
    for _ in range(n):
        lines.append("%d %d" % (r.randint(1, W), r.randint(0, 10 ** 9)))
    return "\n".join(lines) + "\n"


def g30(r, t):
    n, W = (1, 1) if t == "c" else (
        (r.randint(1, 4), r.randint(5, 30)) if t == "a" else (r.randint(100, 300), r.randint(500, 3000)))
    lines = ["%d %d" % (n, W)]
    for _ in range(n):
        lines.append("%d %d" % (r.randint(1, W), r.randint(0, 10 ** 9)))
    return "\n".join(lines) + "\n"


def g31(r, t):
    n = 1 if t == "c" else (r.randint(2, 10) if t == "a" else r.randint(2000, 8000))
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    if t == "a":
        a.sort()
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g32(r, t):
    ln = r.randint(1, 6) if t == "a" else (r.randint(200, 600) if t == "b" else 1)
    A = "".join(r.choice("abcde") for _ in range(ln))
    B = "".join(r.choice("abcde") for _ in range(ln))
    return "%s\n%s\n" % (A, B)


def g33(r, t):
    n = 1 if t == "c" else (r.randint(2, 6) if t == "a" else r.randint(40, 120))
    a = [r.randint(1, 1000) for _ in range(n)]
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g34(r, t):
    if t == "c":
        return "1\n"
    return "%d\n" % (r.randint(10, 1000) if t == "a" else r.randint(500000, 2000000))


def g35(r, t):
    if t == "c":
        return "3 0 7\n"
    return "%d %d %d\n" % (r.randint(1, 10 ** 9), r.randint(1, 10 ** 9), r.randint(1, 10 ** 9))


def g36(r, t):
    if t == "c":
        return "0 0\n"
    n = r.randint(1, 30) if t == "a" else r.randint(10 ** 5, 10 ** 6)
    return "%d %d\n" % (n, r.randint(0, n))


def g37(r, t):
    if t == "c":
        return "1 1\n#\n"
    n = r.randint(2, 5) if t == "a" else (r.randint(30, 80) if t == "b" else 1)
    m = r.randint(2, 5) if t == "a" else (r.randint(30, 80) if t == "b" else 1)
    g = [["#" if r.random() < 0.25 else "." for _ in range(m)] for _ in range(n)]
    return "%d %d\n%s\n" % (n, m, "\n".join("".join(row) for row in g))


def g38(r, t):
    n = 1 if t == "c" else (r.randint(2, 10) if t == "a" else r.randint(500, 2000))
    es = edges_of_tree(r, n) if n > 1 else []
    return "%d\n%s" % (n, fmt_edges(es)) if es else "%d\n" % n


def g39(r, t):
    if t == "c":
        return "1\n"
    return "%d\n" % (r.randint(1, 1000) if t == "a" else r.randint(10 ** 17, 10 ** 18))


def g40(r, t):
    if t == "c":
        return "1900 2\n"
    return "%d %d\n" % (r.randint(1900, 2100), r.randint(1, 12))


def g41(r, t):
    if t == "c":
        return "1\n"
    return "%d\n" % r.choice([x for x in range(3, 100) if x % 2 == 1])


def g42(r, t):
    if t == "c":
        return "5 5\n"
    a = r.randint(5, 1000)
    b = a + r.randint(100, 3000)
    b = min(b, 10 ** 7)
    return "%d %d\n" % (a, b)


def g43(r, t):
    if t == "c":
        return "1900 1 1\n"
    return "%d %d %d\n" % rnd_date(r)


def g44(r, t):
    if t == "c":
        return "1 1\n"
    n = r.randint(1, 1000)
    return "%d %d\n" % (n, r.randint(1, 1000))


def g45(r, t):
    n = r.randint(1, 4) if t == "a" else r.randint(20, 60)
    m = r.randint(1, 4) if t == "a" else r.randint(20, 60)
    if t == "c":
        n = m = 1
    lines = ["%d %d" % (n, m)]
    for _ in range(n):
        lines.append(" ".join(str(r.randint(-1000, 1000)) for _ in range(m)))
    return "\n".join(lines) + "\n"


def g46(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    if t == "c":
        n = 1
    k = r.randint(1, n)
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    return "%d %d\n%s\n" % (n, k, " ".join(map(str, a)))


def g47(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    if t == "c":
        n = 1
    q = r.randint(1, 8) if t == "a" else min(n, 2000)
    a = sorted(r.randint(-10 ** 9, 10 ** 9) for _ in range(n))
    lines = ["%d %d" % (n, q), " ".join(map(str, a))]
    for _ in range(q):
        if r.random() < 0.6 and a:
            lines.append(str(r.choice(a)))
        else:
            lines.append(str(r.randint(-10 ** 9, 10 ** 9)))
    return "\n".join(lines) + "\n"


def g48(r, t):
    n = r.randint(1, 5) if t == "a" else r.randint(1000, 5000)
    k = r.randint(1, 10 ** 8)
    if t == "c":
        n, k = 1, 3
    L = [r.randint(1, 10 ** 8) for _ in range(n)]
    if t == "c":
        L = [2]
    return "%d %d\n%s\n" % (n, k, " ".join(map(str, L)))


def g49(r, t):
    n = r.randint(1, 6) if t == "a" else r.randint(1000, 5000)
    if t == "c":
        n = 1
    D = r.randint(1, n)
    w = [r.randint(1, 10 ** 8) for _ in range(n)]
    return "%d %d\n%s\n" % (n, D, " ".join(map(str, w)))


def g50(r, t):
    n = m = r.randint(2, 5) if t == "a" else (r.randint(20, 50) if t == "b" else 1)
    q = r.randint(2, 6) if t == "a" else (r.randint(500, 2000) if t == "b" else 1)
    lines = ["%d %d %d" % (n, m, q)]
    for _ in range(n):
        lines.append(" ".join(str(r.randint(-1000, 1000)) for _ in range(m)))
    for _ in range(q):
        x1 = r.randint(1, n)
        x2 = r.randint(x1, n)
        y1 = r.randint(1, m)
        y2 = r.randint(y1, m)
        lines.append("%d %d %d %d" % (x1, y1, x2, y2))
    return "\n".join(lines) + "\n"


def g51(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    if t == "c":
        n = 1
    a = [r.randint(-10 ** 4, 10 ** 4) for _ in range(n)]
    if t == "b":
        a = [-abs(x) for x in a]
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g52(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    if t == "c":
        n = 1
    q = r.randint(1, 8) if t == "a" else min(n, 2000)
    a = [r.randint(0, 2 ** 30 - 1) for _ in range(n)]
    lines = ["%d %d" % (n, q), " ".join(map(str, a))]
    for _ in range(q):
        l = r.randint(1, n)
        lines.append("%d %d" % (l, r.randint(l, n)))
    return "\n".join(lines) + "\n"


def g53(r, t):
    n = r.randint(3, 8) if t == "a" else (r.randint(200, 600) if t == "b" else 3)
    if t == "c":
        a = [-1, 0, 1]
    else:
        a = [r.randint(-10 ** 4, 10 ** 4) for _ in range(n)]
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g54(r, t):
    if t == "c":
        return "a\nb\n"
    ln = r.randint(3, 10) if t == "a" else r.randint(500, 2000)
    A = "".join(r.choice("abcdeABCDE") for _ in range(ln))
    tl = r.randint(1, min(4, ln)) if t == "a" else r.randint(50, 200)
    T = "".join(r.choice("abcdeABCDE") for _ in range(tl))
    return "%s\n%s\n" % (A, T)


def g55(r, t):
    if t == "c":
        return "1 10\n5 6\n"
    n = r.randint(1, 8) if t == "a" else r.randint(500, 2000)
    T = r.randint(1, 10 ** 9)
    lines = ["%d %d" % (n, T)]
    for _ in range(n):
        l = r.randint(1, T)
        lines.append("%d %d" % (l, r.randint(l, T)))
    return "\n".join(lines) + "\n"


def g56(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(500, 2000)
    if t == "c":
        n = 1
    lines = [str(n)]
    for _ in range(n):
        lines.append("%d %d" % (r.randint(1, max(1, min(n, 10 ** 5))), r.randint(1, 10 ** 9)))
    return "\n".join(lines) + "\n"


def g57(r, t):
    ops = []
    if t == "c":
        return "3\npush 1\ngetMin\ntop\n"
    depth = 0
    q = r.randint(1, 10) if t == "a" else r.randint(2000, 6000)
    for _ in range(q):
        if depth == 0:
            ops.append("push %d" % r.randint(-10 ** 9, 10 ** 9))
            depth += 1
        else:
            c = r.random()
            if c < 0.5:
                ops.append("push %d" % r.randint(-10 ** 9, 10 ** 9))
                depth += 1
            elif c < 0.75:
                ops.append("pop")
                depth -= 1
            else:
                ops.append("top" if c < 0.88 else "getMin")
    return "%d\n%s\n" % (len(ops), "\n".join(ops))


def g58(r, t):
    """生成合法后缀表达式。"""
    if t == "c":
        return "1 2 +\n"

    def build(depth):
        if depth <= 0 or r.random() < 0.35:
            return str(r.randint(-100, 100))
        left = build(depth - 1)
        right = build(depth - 1)
        op = r.choice(["+", "-", "*", "+", "-"])
        return "%s %s %s" % (left, right, op)

    cnt = 3 if t == "a" else (30 if t == "b" else 1)
    parts = [build(r.randint(1, 4) if t == "a" else 3) for _ in range(cnt)]
    return " ".join(parts) + "\n"


def g59(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    if t == "c":
        n = 1
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g60(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    if t == "c":
        n = 1
    k = r.randint(1, n)
    a = [r.randint(-10 ** 9, 10 ** 9) for _ in range(n)]
    return "%d %d\n%s\n" % (n, k, " ".join(map(str, a)))


def g61(r, t):
    n = r.randint(1, 8) if t == "a" else r.randint(500, 1500)
    if t == "c":
        n = 1
    return "".join(r.choice("abcdef") for _ in range(n)) + "\n"


def g62(r, t):
    if t == "c":
        return "1 1\n0\n"
    n = r.randint(2, 5) if t == "a" else r.randint(20, 50)
    m = r.randint(2, 5) if t == "a" else r.randint(20, 50)
    g = [[r.choice([0, 1, 1, 1, 2]) for _ in range(m)] for _ in range(n)]
    if not any(v == 2 for row in g for v in row):
        g[r.randrange(n)][r.randrange(m)] = 2
    return "%d %d\n%s\n" % (n, m, "\n".join(" ".join(map(str, row)) for row in g))


def g63(r, t):
    if t == "c":
        return "1 1\n1\n"
    n = r.randint(2, 6) if t == "a" else r.randint(30, 80)
    m = r.randint(2, 6) if t == "a" else r.randint(30, 80)
    g = [["1" if r.random() < 0.45 else "0" for _ in range(m)] for _ in range(n)]
    return "%d %d\n%s\n" % (n, m, "\n".join("".join(row) for row in g))


def g64(r, t):
    if t == "c":
        return "3 3\n1 2\n2 3\n3 1\n"
    n = r.randint(2, 8) if t == "a" else r.randint(500, 2000)
    m = r.randint(0, min(n * 2, 2 * 10 ** 5))
    es = [(r.randint(1, n), r.randint(1, n)) for _ in range(m)]
    return "%d %d\n%s" % (n, m, fmt_edges(es))


def g65(r, t):
    if t == "c":
        return "1 0 1\n1 1\n"
    n = r.randint(2, 8) if t == "a" else r.randint(50, 150)
    m = r.randint(0, min(n * n, 3000))
    q = r.randint(1, 8) if t == "a" else 200
    es = [(r.randint(1, n), r.randint(1, n), r.randint(1, 10 ** 4)) for _ in range(m)]
    lines = ["%d %d %d" % (n, m, q)] + [("%d %d %d" % e) for e in es]
    for _ in range(q):
        lines.append("%d %d" % (r.randint(1, n), r.randint(1, n)))
    return "\n".join(lines) + "\n"


def g66(r, t):
    if t == "c":
        return "1 0\n"
    n = r.randint(2, 8) if t == "a" else r.randint(500, 2000)
    m = r.randint(0, min(n * 2, 2 * 10 ** 5))
    es = rand_graph(r, n, m, dag=True, weighted=True)
    return "%d %d\n%s" % (n, len(es), fmt_edges(es))


def g67(r, t):
    n = m = 1 if t == "c" else (
        (r.randint(2, 5) if t == "a" else r.randint(30, 80)))
    lines = ["%d %d" % (n, m)]
    for _ in range(n):
        lines.append(" ".join(str(r.randint(0, 1000)) for _ in range(m)))
    return "\n".join(lines) + "\n"


def g68(r, t):
    if t == "c":
        return "1 1\n1\n"
    n = r.randint(2, 5) if t == "a" else r.randint(30, 80)
    m = r.randint(2, 5) if t == "a" else r.randint(30, 80)
    g = [["1" if r.random() < 0.5 else "0" for _ in range(m)] for _ in range(n)]
    return "%d %d\n%s\n" % (n, m, "\n".join("".join(row) for row in g))


def g69(r, t):
    if t == "c":
        return "1 1 1\n1 1\n"
    n = r.randint(1, 6) if t == "a" else r.randint(100, 300)
    m = r.randint(1, 6) if t == "a" else r.randint(100, 300)
    e = r.randint(0, min(n * m, 3000))
    es = [(r.randint(1, n), r.randint(1, m)) for _ in range(e)]
    return "%d %d %d\n%s" % (n, m, e, fmt_edges(es))


def g70(r, t):
    if t == "c":
        return "1 1\n1 1\n"
    n = r.randint(2, 8) if t == "a" else r.randint(500, 2000)
    m = r.randint(0, min(n * 2, 2 * 10 ** 5))
    es = [(r.randint(1, n), r.randint(1, n)) for _ in range(m)]
    return "%d %d\n%s" % (n, m, fmt_edges(es))


def g71(r, t):
    if t == "c":
        return "1\n"
    return "%d\n" % (r.randint(1, 30) if t == "a" else r.randint(10 ** 5, 10 ** 6))


def g72(r, t):
    if t == "c":
        return "a\nb\n"
    ln = r.randint(1, 6) if t == "a" else r.randint(200, 600)
    A = "".join(r.choice("abcde") for _ in range(ln))
    B = "".join(r.choice("abcde") for _ in range(ln))
    return "%s\n%s\n" % (A, B)


def g73(r, t):
    if t == "c":
        return "1 5\n6 100 10\n"
    n = r.randint(1, 5) if t == "a" else r.randint(20, 60)
    W = r.randint(5, 50) if t == "a" else r.randint(500, 3000)
    lines = ["%d %d" % (n, W)]
    for _ in range(n):
        lines.append("%d %d %d" % (r.randint(1, W), r.randint(0, 10 ** 9), r.randint(1, 100)))
    return "\n".join(lines) + "\n"


def g74(r, t):
    if t == "c":
        return "1 10\n1\n11 100\n"
    n = r.randint(1, 4) if t == "a" else r.randint(10, 40)
    W = r.randint(5, 50) if t == "a" else r.randint(200, 900)
    lines = ["%d %d" % (n, W)]
    for _ in range(n):
        k = r.randint(1, 3 if t == "a" else 6)
        lines.append(str(k))
        for _ in range(k):
            lines.append("%d %d" % (r.randint(1, W + 2), r.randint(0, 10 ** 4)))
    return "\n".join(lines) + "\n"


def g75(r, t):
    if t == "c":
        return "1\n5\n"
    n = r.randint(2, 10) if t == "a" else r.randint(500, 2000)
    h = [r.randint(0, 10 ** 4) for _ in range(n)]
    # v 是 u 的上司：v 必须在上层，用 1..n-1 -> 2..n 构造保证无环
    lines = [str(n), " ".join(map(str, h))]
    for i in range(2, n + 1):
        lines.append("%d %d" % (r.randint(1, i - 1), i))
    return "\n".join(lines) + "\n"


def g76(r, t):
    if t == "c":
        return "1\n0\n"
    n = r.randint(1, 8) if t == "a" else r.randint(2000, 8000)
    a = [r.randint(0, 10 ** 4) for _ in range(n)]
    return "%d\n%s\n" % (n, " ".join(map(str, a)))


def g77(r, t):
    if t == "c":
        return "1 1\n"
    return "%d %d\n" % (r.randint(1, 10 ** 9), r.randint(1, 10 ** 9))


def g78(r, t):
    if t == "c":
        return "1\n"
    return "%d\n" % (r.randint(1, 10 ** 6) if t == "a" else r.randint(10 ** 10, 10 ** 12))


def g79(r, t):
    if t == "c":
        return "1\n"
    return "%d\n" % (r.randint(1, 20) if t == "a" else r.randint(10 ** 5, 10 ** 6))


def g80(r, t):
    if t == "c":
        return "0\n"
    return "%d\n" % (r.randint(1, 20) if t == "a" else r.randint(10 ** 5, 10 ** 6))


GENS = {
    1: g1, 2: g2, 3: g3, 4: g4, 5: g5, 6: g6, 7: g7, 8: g8, 9: g9, 10: g10,
    11: g11, 12: g12, 13: g13, 14: g14, 15: g15, 16: g16, 17: g17, 18: g18,
    19: g19, 20: g20, 21: g21, 22: g22, 23: g23, 24: g24, 25: g25, 26: g26,
    27: g27, 28: g28, 29: g29, 30: g30, 31: g31, 32: g32, 33: g33, 34: g34,
    35: g35, 36: g36, 37: g37, 38: g38, 39: g39, 40: g40, 41: g41, 42: g42,
    43: g43, 44: g44, 45: g45, 46: g46, 47: g47, 48: g48, 49: g49, 50: g50,
    51: g51, 52: g52, 53: g53, 54: g54, 55: g55, 56: g56, 57: g57, 58: g58,
    59: g59, 60: g60, 61: g61, 62: g62, 63: g63, 64: g64, 65: g65, 66: g66,
    67: g67, 68: g68, 69: g69, 70: g70, 71: g71, 72: g72, 73: g73, 74: g74,
    75: g75, 76: g76, 77: g77, 78: g78, 79: g79, 80: g80,
}

TIER_LABEL = {"a": "小规模", "b": "中等规模", "c": "边界"}


def decode(b: bytes) -> str:
    for enc in ("utf-8", "gbk", "latin-1"):
        try:
            return b.decode(enc).replace("\r\n", "\n")
        except UnicodeDecodeError:
            continue
    return b.decode("utf-8", "replace")


def main() -> int:
    content = json.load(open(ROOT / "server" / "content.json", encoding="utf-8"))
    probs = {p["id"]: p for p in content["problems"]}
    missing = [pid for pid in probs if pid not in GENS]
    if missing:
        print("缺生成器的题:", missing)

    gpp = engine.find_compiler()
    if not gpp:
        print("找不到 g++")
        return 1
    print("编译器:", gpp)

    WORK.mkdir(parents=True, exist_ok=True)

    def build(pid: int):
        wd = WORK / str(pid)
        wd.mkdir(exist_ok=True)
        src = wd / "ref.cpp"
        src.write_text(probs[pid].get("reference_code") or "", encoding="utf-8")
        exe = wd / "ref.exe"
        try:
            r = subprocess.run([gpp, "-std=" + engine.settings.judge_cpp_standard, "-O2",
                                "-o", str(exe), str(src)],
                               capture_output=True, timeout=90)
        except subprocess.TimeoutExpired:
            return pid, None, "编译超时"
        if r.returncode != 0:
            return pid, None, "编译失败: " + decode(r.stderr)[:200]
        return pid, exe, None

    with ThreadPoolExecutor(max_workers=4) as pool:
        built = list(pool.map(build, sorted(probs)))

    cases: dict[str, list] = {}
    problems = []
    for pid, exe, err in built:
        if err:
            problems.append((pid, err))
            continue
        rows = []
        for tier in ("a", "b", "c"):
            rng = random.Random(pid * 1000 + ord(tier))
            try:
                inp = GENS[pid](rng, tier)
            except Exception as exc:  # noqa: BLE001
                problems.append((pid, "生成器异常[%s]: %r" % (tier, exc)))
                continue
            try:
                rr = subprocess.run([str(exe)], input=inp.encode("utf-8"),
                                    capture_output=True, timeout=25)
            except subprocess.TimeoutExpired:
                problems.append((pid, "运行超时[%s]" % tier))
                continue
            if rr.returncode != 0:
                problems.append((pid, "非零退出[%s] rc=%d %s" %
                                 (tier, rr.returncode, decode(rr.stderr)[:120])))
                continue
            out = decode(rr.stdout)
            if out == "":
                problems.append((pid, "输出为空[%s]" % tier))
                continue
            rows.append({
                "tier": tier,
                "label": TIER_LABEL[tier],
                "input": inp,
                "output": out,
                "score": 34 if tier != "c" else 32,
            })
        if rows:
            cases[str(pid)] = rows
        else:
            problems.append((pid, "没有任何有效用例"))

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(cases, ensure_ascii=False, indent=None), encoding="utf-8")

    total = sum(len(v) for v in cases.values())
    size = OUT_JSON.stat().st_size / 1024
    print("\n生成完成：%d 道题 / %d 个用例 / %.1f KB" % (len(cases), total, size))
    if problems:
        print("有问题的题 %d 个：" % len(problems))
        for pid, msg in problems:
            print("  #%s %s" % (pid, msg))
    else:
        print("全部 80 题生成成功")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
