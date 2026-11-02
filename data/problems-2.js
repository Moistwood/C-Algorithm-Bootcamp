/* ==========================================================
   题库 · 第二批：双指针贪心 / 数据结构 / 图论
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

/* ---------- E 组：双指针与贪心 ---------- */
{
  id: 15, g: 'E 组 · 双指针与贪心', title: '有序数组两数之和', diff: 'easy', diffName: '简单',
  tag: '对撞双指针', src: '经典双指针', ref: 16,
  desc: '给定一个**按升序排列**的长度为 `n` 的数组和一个目标值 `target`，找出两个数使它们的和等于 `target`，输出这两个数的下标（`1` 起，`i < j`）。\n\n保证有且只有一组解。',
  input: '第一行 `n` 和 `target`（`2 ≤ n ≤ 10^5`）。\n第二行 `n` 个递增整数。',
  output: '一行两个整数 `i j`。',
  samples: [['4 9\n2 7 11 15\n', '1 2\n'], ['3 6\n1 2 4\n', '2 3\n']],
  noteText: '数组严格递增，保证唯一解。',
  hint: '左右两个指针往中间夹。和太小就 `l++`，和太大就 `r--`。`O(n)` 完成，不需要哈希表。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n; long long target;
    cin >> n >> target;

    vector<long long> a(n);
    for (auto& x : a) cin >> x;

    int l = 0, r = n - 1;
    while (l < r) {
        long long s = a[l] + a[r];
        if (s == target) { cout << l + 1 << ' ' << r + 1 << '\n'; return 0; }
        if (s < target) l++;
        else r--;
    }
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '`a[l] + a[r]` 用 `int` 可能溢出（若 `a[i]` 到 `1e9`）。用 `long long` 存和。'
},

{
  id: 16, g: 'E 组 · 双指针与贪心', title: '最长无重复字符子串', diff: 'mid', diffName: '中等',
  tag: '滑动窗口', src: 'LeetCode 3', ref: 16,
  desc: '给定一个只含可见 ASCII 字符（`33`~`126`）的字符串 `s`，求不含重复字符的最长连续子串的长度。',
  input: '一行一个字符串 `s`，长度不超过 `10^5`。',
  output: '一行一个整数。',
  samples: [['abcabcbb\n', '3\n'], ['bbbbb\n', '1\n'], ['pwwkew\n', '3\n']],
  noteText: '子串必须连续。`pwwkew` 的答案是 `wke`，长度 3。',
  hint: '滑动窗口。用 `last[c]` 记录字符 `c` 上次出现的位置。右端扩张时，如果发现重复且重复位置在窗口内，左端跳到 `last[c] + 1`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;

    int last[128];
    fill(last, last + 128, -1);

    int l = 0, ans = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        unsigned char c = s[r];
        if (last[c] >= l) l = last[c] + 1;
        last[c] = r;
        ans = max(ans, r - l + 1);
    }
    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '`if (last[c] >= l)` 这个条件不能省成 `if (last[c] != -1)`。因为 `last[c]` 可能在窗口**左边**（已经滑出去了），那时候不算重复。'
},

{
  id: 17, g: 'E 组 · 双指针与贪心', title: '活动安排', diff: 'mid', diffName: '中等',
  tag: '区间贪心', src: '经典贪心', ref: 17,
  desc: '有 `n` 个活动，第 `i` 个活动占用时间区间 `[l_i, r_i]`（左闭右开，即 `r_i` 时刻可以开始下一个活动）。\n\n一个人最多能完整参加多少个活动？',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n接下来 `n` 行，每行两个整数 `l, r`（`0 ≤ l < r ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['4\n1 3\n2 5\n3 6\n5 8\n', '2\n'], ['3\n0 100\n1 2\n3 4\n', '2\n']],
  noteText: '两个活动首尾相接（前一个的右端点等于后一个的左端点）不算冲突。',
  hint: '按**右端点**升序排序，能参加就参加。按左端点排序是错的（反例：`[0,100]`、`[1,2]`、`[3,4]`）。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<pair<int,int>> v(n);
    for (auto& p : v) cin >> p.second >> p.first;   // 故意存成 {右端点, 左端点}

    sort(v.begin(), v.end());                       // 按右端点升序

    int cnt = 0;
    long long lastEnd = LLONG_MIN;
    for (auto& p : v) {
        int r = p.first, l = p.second;
        if (l >= lastEnd) { cnt++; lastEnd = r; }
    }
    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '写成按左端点排序会 WA。这是贪心题最经典的错误，一定要记住「按结束时间排」。'
},

{
  id: 18, g: 'E 组 · 双指针与贪心', title: '合并果子', diff: 'mid', diffName: '中等',
  tag: '优先队列 / 贪心', src: 'NOIP 2004 提高组', ref: 24,
  desc: '有 `n` 堆果子，第 `i` 堆有 `a[i]` 个。每次可以合并两堆，消耗的体力等于两堆果子数量之和。\n\n把所有果子合并成一堆，求最小总消耗。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数 `a[i]`（`1 ≤ a[i] ≤ 10^4`）。',
  output: '一行一个整数，表示最小总消耗。',
  samples: [['4\n1 2 3 4\n', '19\n']],
  noteText: '答案可能超过 `int` 范围（`n = 1e5`、`a[i] = 1e4` 时约 `1e14`）。',
  hint: '每次取最小的两堆合并 —— 用小根堆，`O(n log n)`。\n\n样例：`1+2=3`（消耗 3），剩 `3,3,4`；`3+3=6`（消耗 6），剩 `4,6`；`4+6=10`（消耗 10）。总共 `3+6+10=19`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    priority_queue<long long, vector<long long>, greater<long long>> pq;
    for (int i = 0; i < n; i++) { long long x; cin >> x; pq.push(x); }

    long long ans = 0;
    while (pq.size() > 1) {
        long long x = pq.top(); pq.pop();
        long long y = pq.top(); pq.pop();
        ans += x + y;
        pq.push(x + y);
    }
    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '用大根堆（默认的 `priority_queue<long long>`）会得到「最大消耗」，正好相反。'
},

/* ---------- F 组：数据结构 ---------- */
{
  id: 19, g: 'F 组 · 数据结构', title: '括号匹配', diff: 'easy', diffName: '简单',
  tag: '栈', src: '基础练习', ref: 20,
  desc: '给定一个只包含 `()`、`[]`、`{}` 三种括号的字符串，判断它是否合法。\n\n合法定义：每个左括号都有对应的右括号，且嵌套顺序正确。',
  input: '一行一个字符串 `s`，长度不超过 `10^5`。',
  output: '合法输出 `YES`，否则输出 `NO`。',
  samples: [['{[()]}\n', 'YES\n'], ['([)]\n', 'NO\n'], ['(()\n', 'NO\n']],
  noteText: '空串视为合法。',
  hint: '遇到左括号入栈，遇到右括号检查栈顶是否匹配。**扫描结束后还要判栈空。**',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;

    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (st.empty()) { cout << "NO\n"; return 0; }
            char t = st.top();
            bool ok = (c == ')' && t == '(') || (c == ']' && t == '[') || (c == '}' && t == '{');
            if (!ok) { cout << "NO\n"; return 0; }
            st.pop();
        }
    }
    cout << (st.empty() ? "YES\n" : "NO\n");
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '漏掉最后的 `st.empty()` 检查：`"(()"` 会被判成合法。'
},

{
  id: 20, g: 'F 组 · 数据结构', title: '滑动窗口最大值', diff: 'hard', diffName: '较难',
  tag: '单调队列', src: '经典单调队列', ref: 21,
  desc: '给定长度为 `n` 的数组和一个窗口大小 `k`，窗口从最左端开始，每次向右滑动一格。\n\n输出每个窗口内的最大值。',
  input: '第一行两个整数 `n, k`（`1 ≤ k ≤ n ≤ 10^5`）。\n第二行 `n` 个整数 `a[i]`（`|a[i]| ≤ 10^9`）。',
  output: '一行 `n - k + 1` 个整数，用空格分隔。',
  samples: [['8 3\n1 3 -1 -3 5 3 6 7\n', '3 3 5 5 6 7\n']],
  noteText: '朴素做法 `O(nk)` 在 `n = k = 1e5` 时是 `1e10`，超时。',
  hint: '单调队列存下标，对应值从队头到队尾递减。队头是当前窗口最大值。\n\n三步：踢掉过期队头 → 踢掉队尾所有 ≤ 当前值的 → 当前元素入队。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (auto& x : a) cin >> x;

    deque<int> dq;               // 存下标
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);

        if (i >= k - 1) cout << a[dq.front()] << (i == n - 1 ? '\n' : ' ');
    }
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '用 `deque` 而不是 `queue`，因为要在队尾弹出元素。`queue` 只能操作队首。'
},

{
  id: 21, g: 'F 组 · 数据结构', title: '朋友圈', diff: 'mid', diffName: '中等',
  tag: '并查集', src: '经典并查集', ref: 23,
  desc: '有 `n` 个人，编号 `1` 到 `n`。已知 `m` 对朋友关系（朋友关系具有传递性：A 和 B 是朋友，B 和 C 是朋友，则 A 和 C 也是朋友）。\n\n求：一共有几个朋友圈，以及最大的朋友圈有多少人。',
  input: '第一行两个整数 `n, m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 10^5`）。\n接下来 `m` 行，每行两个整数 `u, v`，表示 `u` 和 `v` 是朋友。',
  output: '一行两个整数：朋友圈个数、最大朋友圈人数。',
  samples: [['5 2\n1 2\n3 4\n', '3 2\n'], ['4 2\n1 2\n2 3\n', '2 3\n']],
  noteText: '可能重复给出同一对关系，并查集自动去重。',
  hint: '并查集合并所有关系，最后统计每个根节点下有多少个元素。\n\n可以用一个 `size[]` 数组维护每个集合的大小（合并时相加），或者最后遍历一遍 `find(i)` 计数。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int fa[100005], sz[100005];

int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    for (int i = 1; i <= n; i++) { fa[i] = i; sz[i] = 1; }

    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        int ru = find(u), rv = find(v);
        if (ru != rv) {
            fa[ru] = rv;
            sz[rv] += sz[ru];
        }
    }

    int groups = 0, maxSize = 0;
    for (int i = 1; i <= n; i++) {
        if (find(i) == i) { groups++; maxSize = max(maxSize, sz[i]); }
    }
    cout << groups << ' ' << maxSize << '\n';
    return 0;
}`,
  complexity: 'O((n + m) α(n))',
  pitfall: '统计时用 `if (fa[i] == i)` 而不是 `if (find(i) == i)`，在路径压缩不彻底的情况下会漏算。**统一用 `find(i) == i`。**'
},

{
  id: 22, g: 'F 组 · 数据结构', title: '直方图中的最大矩形', diff: 'hard', diffName: '较难',
  tag: '单调栈', src: 'LeetCode 84 / 蓝桥杯常考', ref: 20,
  desc: '给定 `n` 个非负整数，表示直方图中每个柱子的高度（每个柱子宽度为 1）。\n\n求能框出的最大矩形面积。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数 `h[i]`（`0 ≤ h[i] ≤ 10^9`）。',
  output: '一行一个整数，表示最大矩形面积。',
  samples: [['6\n2 1 5 6 2 3\n', '10\n'], ['2\n2 4\n', '4\n']],
  noteText: '答案可能超过 `int`（`1e5 × 1e9 = 1e14`）。',
  hint: '对每根柱子，找它左右两边第一个比它矮的位置，中间宽度就是它能延伸的范围。用单调递增栈一次扫完。\n\n**技巧：末尾加一个高度 0 的哨兵，强制清空栈，省掉收尾代码。**',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> h(n + 1);
    for (int i = 0; i < n; i++) cin >> h[i];
    h[n] = 0;                       // 右哨兵

    stack<int> st;                  // 存下标，栈内高度递增
    long long ans = 0;

    for (int i = 0; i <= n; i++) {
        while (!st.empty() && h[st.top()] > h[i]) {
            long long height = h[st.top()];
            st.pop();
            int left = st.empty() ? 0 : st.top() + 1;
            ans = max(ans, height * (i - left));
        }
        st.push(i);
    }
    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '`height * (i - left)` 用 `int` 溢出。必须 `long long`。另外栈里存的是**下标**不是高度，这样才能算宽度。'
},

/* ---------- G 组：图论 ---------- */
{
  id: 23, g: 'G 组 · 图论', title: '迷宫最短路', diff: 'mid', diffName: '中等',
  tag: 'BFS / 网格', src: '经典 BFS', ref: 29,
  desc: '给定一个 `n × m` 的迷宫：`.` 表示可走，`#` 表示墙，`S` 表示起点，`E` 表示终点。\n\n每次可以上下左右走一格，求从 `S` 到 `E` 的最少步数。',
  input: '第一行两个整数 `n, m`（`1 ≤ n, m ≤ 1000`）。\n接下来 `n` 行，每行一个长度为 `m` 的字符串。\n保证有且只有一个 `S` 和一个 `E`。',
  output: '一行一个整数，表示最少步数；如果无法到达，输出 `-1`。',
  samples: [['3 4\nS..#\n.#..\n..E.\n', '4\n']],
  noteText: '`n, m ≤ 1000`，最多 `10^6` 个格子。',
  hint: 'BFS 的标准模板。`dist` 数组同时承担「距离」和「访问标记」两个职责。\n\n**入队前就标记 `dist`**，不要等出队时再标记。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const int N = 1005;
int n, m;
char g[N][N];
int dist[N][N];
int dx[4] = {-1, 1, 0, 0}, dy[4] = {0, 0, -1, 1};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n >> m;
    int sx, sy, ex, ey;
    for (int i = 0; i < n; i++) {
        cin >> g[i];
        for (int j = 0; j < m; j++) {
            if (g[i][j] == 'S') { sx = i; sy = j; }
            if (g[i][j] == 'E') { ex = i; ey = j; }
        }
    }

    memset(dist, -1, sizeof(dist));
    queue<pair<int,int>> q;
    dist[sx][sy] = 0;
    q.push({sx, sy});

    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        if (x == ex && y == ey) { cout << dist[x][y] << '\n'; return 0; }

        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
            if (g[nx][ny] == '#' || dist[nx][ny] != -1) continue;
            dist[nx][ny] = dist[x][y] + 1;
            q.push({nx, ny});
        }
    }
    cout << -1 << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '`cin >> g[i]` 读 `char` 数组时不能加 `&`（`g[i]` 本身就是地址），也不能用 `scanf("%c")`（会读进空格和换行）。'
},

{
  id: 24, g: 'G 组 · 图论', title: '连通块计数', diff: 'easy', diffName: '简单',
  tag: 'DFS / 并查集', src: '基础图论', ref: 33,
  desc: '给定一个 `n` 个点 `m` 条边的无向图（可能有重边和自环），求连通块的数量。\n\n每个点自己也算一个连通块。',
  input: '第一行两个整数 `n, m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行两个整数 `u, v`。',
  output: '一行一个整数。',
  samples: [['5 2\n1 2\n3 4\n', '3\n'], ['3 0\n', '3\n']],
  noteText: '`m = 0` 时每个点都是独立的连通块。',
  hint: '并查集最省事：把所有边 `unite` 一遍，最后数「`find(i) == i` 的个数」。\n\n或者 DFS：对每个未访问的点启动一次 DFS，计数器加一。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int fa[100005];
int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 1; i <= n; i++) fa[i] = i;

    while (m--) {
        int u, v;
        cin >> u >> v;
        int ru = find(u), rv = find(v);
        if (ru != rv) fa[ru] = rv;
    }

    int cnt = 0;
    for (int i = 1; i <= n; i++) if (find(i) == i) cnt++;
    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O((n + m) α(n))',
  pitfall: '自环（`u == v`）不影响结果，但如果没有 `if (ru != rv)` 判断就直接赋值，会让 `fa[u] = u` 之类无意义操作，虽然不出错但会破坏 `sz` 统计。'
},

{
  id: 25, g: 'G 组 · 图论', title: '课程安排', diff: 'mid', diffName: '中等',
  tag: '拓扑排序', src: '经典拓扑', ref: 30,
  desc: '有 `n` 门课程，编号 `1` 到 `n`，以及 `m` 条先修关系 `u → v`（表示学 `v` 之前必须先学 `u`）。\n\n请给出一个合法的学习顺序，要求**字典序最小**。\n\n如果存在循环依赖（无法完成所有课程），输出 `-1`。',
  input: '第一行两个整数 `n, m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行两个整数 `u, v`。',
  output: '一行 `n` 个整数，表示学习顺序；有环则输出 `-1`。',
  samples: [['4 3\n1 2\n1 3\n2 4\n', '1 2 3 4\n'], ['3 3\n1 2\n2 3\n3 1\n', '-1\n']],
  noteText: '可能存在重边，入度会重复计算 —— 但这不影响拓扑排序的正确性（Kahn 算法本身容忍重边）。',
  hint: 'Kahn 算法 + 小根堆。每次从「入度为 0 的点」里取编号最小的。\n\n最后判断选出的点数是否等于 `n`，不等就说明有环。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int indeg[100005];
vector<int> g[100005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        indeg[v]++;
    }

    priority_queue<int, vector<int>, greater<int>> pq;
    for (int i = 1; i <= n; i++) if (indeg[i] == 0) pq.push(i);

    vector<int> order;
    while (!pq.empty()) {
        int u = pq.top(); pq.pop();
        order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) pq.push(v);
    }

    if ((int)order.size() != n) { cout << -1 << '\n'; return 0; }
    for (int i = 0; i < n; i++) cout << order[i] << (i == n - 1 ? '\n' : ' ');
    return 0;
}`,
  complexity: 'O((n + m) log n)',
  pitfall: '用 `queue` 而不是 `priority_queue` 会得到某个合法顺序，但不是字典序最小的。题目要求字典序最小就必须用小根堆。'
},

{
  id: 26, g: 'G 组 · 图论', title: '单源最短路', diff: 'hard', diffName: '较难',
  tag: 'Dijkstra', src: '经典最短路', ref: 31,
  desc: '给定一个 `n` 个点 `m` 条边的无向图，边权均为正数。求从 `1` 号点到 `n` 号点的最短距离。',
  input: '第一行两个整数 `n, m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行三个整数 `u, v, w`（`1 ≤ w ≤ 10^9`），表示一条边。',
  output: '一行一个整数，表示最短距离；无法到达输出 `-1`。',
  samples: [['4 4\n1 2 1\n2 4 2\n1 3 5\n3 4 1\n', '3\n'], ['2 0\n', '-1\n']],
  noteText: '可能有重边，取最小的即可（`dist` 的松弛会自动处理）。',
  hint: '堆优化 Dijkstra。`dist` 初始化为 `0x3f3f3f3f3f3f3f3f`（`long long` 版无穷大）。\n\n**懒惰删除**：不修改堆内元素，直接把新距离压进去，弹出时 `if (d > dist[u]) continue;`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
typedef pair<ll,int> pli;

const int N = 100005;
vector<pair<int,int>> g[N];
ll dist[N];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        g[u].push_back({v, w});
        g[v].push_back({u, w});
    }

    memset(dist, 0x3f, sizeof(dist));
    dist[1] = 0;
    priority_queue<pli, vector<pli>, greater<pli>> pq;
    pq.push({0, 1});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : g[u]) {
            if (dist[v] > d + w) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }

    cout << (dist[n] == 0x3f3f3f3f3f3f3f3fLL ? -1 : dist[n]) << '\n';
    return 0;
}`,
  complexity: 'O((n + m) log n)',
  pitfall: '判断「不可达」不能写 `dist[n] == INF` 如果 `INF` 是 `0x3f3f3f3f`（`int` 版），因为 `memset` 填 `long long` 数组时每字节都是 `0x3f`，得到的是 `0x3f3f3f3f3f3f3f3f`。两者不相等，判断永远为假。'
},

{
  id: 27, g: 'G 组 · 图论', title: '修路', diff: 'hard', diffName: '较难',
  tag: '最小生成树 / Kruskal', src: '经典 MST', ref: 32,
  desc: '有 `n` 个村庄和 `m` 条可以修的路，每条路有修建费用。\n\n要使所有村庄互相可达，最少需要多少费用？如果无法连通，输出 `-1`。',
  input: '第一行两个整数 `n, m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行三个整数 `u, v, w`（`1 ≤ w ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['4 5\n1 2 1\n1 3 2\n2 3 1\n2 4 3\n3 4 3\n', '5\n'], ['3 1\n1 2 5\n', '-1\n']],
  noteText: '可能有重边和自环，Kruskal 会自动处理。',
  hint: 'Kruskal：按边权排序 + 并查集。选够 `n-1` 条边就停。\n\n`n = 1` 时不需要任何边，答案是 0。',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef long long ll;

struct Edge {
    int u, v, w;
    bool operator<(const Edge& o) const { return w < o.w; }
};

int fa[100005];
int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    vector<Edge> e(m);
    for (auto& x : e) cin >> x.u >> x.v >> x.w;

    for (int i = 1; i <= n; i++) fa[i] = i;
    sort(e.begin(), e.end());

    ll total = 0;
    int picked = 0;
    for (auto& x : e) {
        int ru = find(x.u), rv = find(x.v);
        if (ru == rv) continue;
        fa[ru] = rv;
        total += x.w;
        if (++picked == n - 1) break;
    }

    cout << (picked == n - 1 ? total : -1) << '\n';
    return 0;
}`,
  complexity: 'O(m log m)',
  pitfall: '`n = 1` 时 `picked == n - 1 == 0`，一开始就成立，输出 0，正确。但如果循环里的判断写成 `if (picked == n)` 就永远不成立，会输出 -1。'
}

]);
