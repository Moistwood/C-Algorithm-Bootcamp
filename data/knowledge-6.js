/* ==========================================================
   阶段三（第 26 - 27 节）+ 阶段四 图论（第 28 - 30 节）
   ========================================================== */
var R = String.raw;

window.CHAPTERS = (window.CHAPTERS || []).concat([

/* ---------------- 第 26 节 ---------------- */
{
  id: 26, s: 3, title: '树状数组', min: 40,
  goals: [
    '默写树状数组的 add / sum 两个函数',
    '用树状数组做单点修改 + 区间查询',
    '用树状数组求逆序对'
  ],
  body: [
    { t: 'md', x: [
      '**问题：一个数组，支持「单点修改」和「区间求和」两种操作，各做 1e5 次。**',
      '',
      '- 朴素数组：修改 `O(1)`，求和 `O(n)` → 总 `O(n²)`，超时',
      '- 前缀和数组：求和 `O(1)`，修改 `O(n)`（要更新后面所有）→ 同样超时',
      '- **树状数组：两个都是 `O(log n)`** ✓',
      '',
      '树状数组代码极短（十行），是省赛性价比最高的数据结构之一。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005;
int tree[N], n;

// 单点修改：a[i] += v
void add(int i, int v) {
    for (; i <= n; i += i & -i) tree[i] += v;
}

// 前缀和：a[1] + a[2] + ... + a[i]
int sum(int i) {
    int s = 0;
    for (; i > 0; i -= i & -i) s += tree[i];
    return s;
}

// 区间和：a[l] + ... + a[r]
int rangeSum(int l, int r) {
    return sum(r) - sum(l - 1);
}` },

    { t: 'note', kind: 'tip', x: [
      '**`i & -i` 叫 `lowbit`，取的是 `i` 的二进制最低位的 1。**',
      '',
      '- `lowbit(6) = lowbit(110₂) = 2`',
      '- `lowbit(12) = lowbit(1100₂) = 4`',
      '',
      '`tree[i]` 维护的是区间 `[i - lowbit(i) + 1, i]` 的和。`add` 往上跳（`i += lowbit(i)`），`sum` 往下跳（`i -= lowbit(i)`），就是这么简单。'
    ].join('\n') },

    { t: 'md', x: [
      '## 建表：O(n) 而不是 O(n log n)',
      '',
      '不用一个个 `add`，可以直接从 `a` 数组线性构造。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 方法一：O(n log n)，简单但慢
for (int i = 1; i <= n; i++) add(i, a[i]);

// 方法二：O(n)，利用 tree[i] 的定义直接累加
for (int i = 1; i <= n; i++) {
    tree[i] += a[i];
    int j = i + (i & -i);
    if (j <= n) tree[j] += tree[i];
}` },

    { t: 'md', x: [
      '## 应用一：求逆序对',
      '',
      '思路：从右往左扫描，每次数「已经在树里的、比当前数小的个数」，累加。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long cnt = 0;
for (int i = n; i >= 1; i--) {
    cnt += sum(a[i] - 1);      // 右边比 a[i] 小的个数
    add(a[i], 1);              // 把 a[i] 标记为已出现
}
cout << cnt << '\n';` },

    { t: 'note', kind: 'warn', x: [
      '**树状数组的下标必须 ≥ 1。** 如果数据里有 0 或负数，要做偏移（全部加 1）或先离散化。`add(0, v)` 会陷入死循环（`0 += 0 & -0` 还是 0）。'
    ].join('\n') },

    { t: 'md', x: [
      '## 应用二：动态排名 / 第 k 小',
      '',
      '树状数组上二分可以求「第 k 小的数」，复杂度 `O(log n)`。这是很多「动态中位数」「名次查询」题的标准解法。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 求第 k 小的数（树状数组里每个位置有若干个元素）
int kth(int k) {
    int pos = 0;
    for (int step = 1 << 20; step; step >>= 1) {
        if (pos + step <= n && tree[pos + step] < k) {
            pos += step;
            k -= tree[pos];
        }
    }
    return pos + 1;
}` },

    { t: 'md', x: [
      '## 树状数组能做什么、不能做什么',
      '',
      '| 操作 | 树状数组 | 线段树 |',
      '| --- | --- | --- |',
      '| 单点修改 + 区间求和 | ✓ | ✓ |',
      '| 区间修改 + 单点查询 | ✓（用差分） | ✓ |',
      '| 区间修改 + 区间求和 | ✓（两个树状数组） | ✓ |',
      '| 区间最值 | ✗ | ✓ |',
      '| 区间第 k 小 | ✗（除非可离线） | 主席树 |',
      '',
      '**一句话：能用树状数组就别写线段树。** 代码量差 5 倍，调试时间差 10 倍。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 区间修改 + 区间求和：维护两个树状数组
// 修改 [l,r] 加 v：
//   B1: add(l, v), add(r+1, -v)
//   B2: add(l, v*(l-1)), add(r+1, -v*r)
// 查询前缀和 [1,x]：
//   x * sum(B1, x) - sum(B2, x)
long long prefixSum(int x) {
    return 1LL * x * sum1(x) - sum2(x);
}` },

    { t: 'quiz',
      q: '`lowbit(12)` 的值是？12 的二进制是 `1100`。',
      o: ['1', '2', '4', '12'],
      a: 2,
      e: '`lowbit(i) = i & -i`，取的是二进制最低位的 1 及其后面的 0。`12 = 1100₂`，最低位的 1 在从右数第三位（值为 4），所以 `lowbit(12) = 4`。这也说明 `tree[12]` 维护的是区间 `[9, 12]` 的和（长度 4）。'
    },

    { t: 'quiz',
      q: '树状数组为什么下标必须从 1 开始？',
      o: [
        '只是习惯问题',
        '因为 `lowbit(0) = 0`，`add(0, v)` 中 `i += 0` 会死循环',
        '因为 C++ 数组从 1 开始',
        '因为要留出哨兵位'
      ],
      a: 1,
      e: '`lowbit(0) = 0 & -0 = 0`。在 `add` 里 `i += i & -i` 就变成 `i += 0`，`i` 永远不变，死循环。在 `sum` 里 `i -= 0` 也是同样问题。所以树状数组的下标必须 ≥ 1，输入数据有 0 时要整体偏移。'
    }
  ]
},

/* ---------------- 第 27 节 ---------------- */
{
  id: 27, s: 3, title: '线段树入门', min: 50,
  goals: [
    '理解线段树「递归划分区间」的结构',
    '默写带懒标记的区间加 + 区间求和',
    '知道什么题必须用线段树而不是树状数组'
  ],
  body: [
    { t: 'md', x: [
      '线段树把区间 `[1, n]` 递归二分，每个节点维护一个区间的信息。它比树状数组强大得多（支持区间最值、区间赋值、多种标记组合），代价是代码长、常数大。',
      '',
      '**省赛里线段树的出现频率低于树状数组，但压轴题可能会用。** 这一节只讲最常用的「区间加 + 区间求和」。'
    ].join('\n') },

    { t: 'md', x: [
      '## 结构',
      '',
      '根节点维护 `[1, n]`，左儿子维护 `[l, mid]`，右儿子维护 `[mid+1, r]`。用数组存树，节点 `p` 的儿子是 `2p` 和 `2p+1`。',
      '',
      '**数组要开 `4n`** —— 因为完全二叉树的下标可能超过 `2n`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005;
long long sum[N << 2], lazy[N << 2];   // <<2 就是 ×4
int a[N], n;

void pushUp(int p) {
    sum[p] = sum[p << 1] + sum[p << 1 | 1];
}

void pushDown(int p, int l, int r) {
    if (lazy[p] == 0) return;
    int mid = (l + r) >> 1;
    sum[p << 1]        += lazy[p] * (mid - l + 1);
    lazy[p << 1]       += lazy[p];
    sum[p << 1 | 1]    += lazy[p] * (r - mid);
    lazy[p << 1 | 1]   += lazy[p];
    lazy[p] = 0;
}

void build(int p, int l, int r) {
    if (l == r) { sum[p] = a[l]; return; }
    int mid = (l + r) >> 1;
    build(p << 1, l, mid);
    build(p << 1 | 1, mid + 1, r);
    pushUp(p);
}

void update(int p, int l, int r, int ql, int qr, long long v) {
    if (ql <= l && r <= qr) {           // 完全覆盖
        sum[p] += v * (r - l + 1);
        lazy[p] += v;
        return;
    }
    pushDown(p, l, r);
    int mid = (l + r) >> 1;
    if (ql <= mid)     update(p << 1, l, mid, ql, qr, v);
    if (qr > mid)      update(p << 1 | 1, mid + 1, r, ql, qr, v);
    pushUp(p);
}

long long query(int p, int l, int r, int ql, int qr) {
    if (ql <= l && r <= qr) return sum[p];
    pushDown(p, l, r);
    int mid = (l + r) >> 1;
    long long res = 0;
    if (ql <= mid) res += query(p << 1, l, mid, ql, qr);
    if (qr > mid)  res += query(p << 1 | 1, mid + 1, r, ql, qr);
    return res;
}` },

    { t: 'note', kind: 'tip', x: [
      '**懒标记（lazy）的本质：先欠着。** 整个区间被完全覆盖时，不往下递归修改每个叶子，只在当前节点打一个「这里每个元素都要加 v」的标记。等以后真的需要访问子区间时，再 `pushDown` 把标记传下去。',
      '',
      '这就是线段树能做到 `O(log n)` 的原因 —— 每次修改只碰 `O(log n)` 个节点。'
    ].join('\n') },

    { t: 'note', kind: 'danger', x: [
      '**线段树的三个高频 bug：**',
      '',
      '1. **数组没开 `4n`** —— 越界写坏其他变量，表现为莫名其妙的答案错误',
      '2. **`pushDown` 忘记更新 `lazy`** —— 只改了 `sum` 没传标记，后续查询全错',
      '3. **`query` 里忘记 `pushDown`** —— 访问子区间前必须先下传标记',
      '',
      '这三条能覆盖 90% 的线段树调试时间。'
    ].join('\n') },

    { t: 'md', x: [
      '## 什么时候用线段树',
      '',
      '**判断标准：需要的操作里有一条树状数组做不了。**',
      '',
      '- 只要区间和 / 单点改 → 树状数组',
      '- 要区间最大值 → 线段树',
      '- 要区间赋值 / 多种标记 → 线段树',
      '- 要维护区间内的复杂信息（最大子段和、区间众数）→ 线段树'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 线段树维护区间最大值的核心改动（无 lazy，只有单点改）
void pushUp(int p) {
    mx[p] = max(mx[p << 1], mx[p << 1 | 1]);
}

long long queryMax(int p, int l, int r, int ql, int qr) {
    if (ql <= l && r <= qr) return mx[p];
    int mid = (l + r) >> 1;
    long long res = LLONG_MIN;
    if (ql <= mid) res = max(res, queryMax(p << 1, l, mid, ql, qr));
    if (qr > mid)  res = max(res, queryMax(p << 1 | 1, mid + 1, r, ql, qr));
    return res;
}` },

    { t: 'md', x: [
      '## 省赛策略建议',
      '',
      '**如果你的时间有限，优先级是：**',
      '',
      '1. 树状数组（20 分钟能掌握，用途广）',
      '2. 线段树单点改 + 区间查（不需要 lazy）',
      '3. 线段树 + lazy（最后学）',
      '',
      '省赛里能用树状数组解决的题，占了所有「需要区间数据结构」的题目的 **七成以上**。先把前两个吃透，性价比远高于死磕 lazy。'
    ].join('\n') },

    { t: 'quiz',
      q: '线段树的数组为什么要开到 `4n` 而不是 `2n`？',
      o: [
        '习惯写法，其实 2n 够',
        '因为递归划分的节点编号可能超过 2n，2n 会越界',
        '因为要留 lazy 的空间',
        '因为 n 可能为 0'
      ],
      a: 1,
      e: '线段树不是满二叉树，最后一层会有大量空缺，导致叶子节点的编号可能达到 `4n` 量级。举例 n=5 时，节点编号最大能到 13 左右，`2n = 10` 就不够。开 `4n` 是数学上证明过的安全上界。'
    },

    { t: 'quiz',
      q: '懒标记 `lazy[p]` 的作用是？',
      o: [
        '记录节点 p 的历史最大值',
        '记录「这个区间整体还需要加多少」，暂时不下传，等到访问子区间时再传',
        '记录区间长度',
        '标记该节点是否被删除'
      ],
      a: 1,
      e: '如果每次区间修改都递归到叶子，复杂度就退化成 `O(n)`。懒标记让完全覆盖的区间只改当前节点并打标记，把「修改子节点」这件事欠着。等后续操作真的需要访问子区间时，`pushDown` 一次性把标记传下去。这就是线段树 `O(log n)` 的关键。'
    }
  ]
},

/* ---------------- 第 28 节 ---------------- */
{
  id: 28, s: 4, title: '图的存储与遍历', min: 40,
  goals: [
    '掌握邻接表和链式前向星两种建图方式',
    '写出 DFS 和 BFS 的遍历模板',
    '知道无向图边数要开两倍'
  ],
  body: [
    { t: 'md', x: [
      '图论的第一步永远是**建图**。建错了，后面全错。',
      '',
      '三种方式，按使用频率排序：'
    ].join('\n') },

    { t: 'table',
      head: ['方式', '空间', '适用', '代码量'],
      rows: [
        ['邻接矩阵 `g[u][v]`', '`O(n²)`', 'n ≤ 1000 的稠密图', '最少'],
        ['邻接表 `vector<int> g[N]`', '`O(n+m)`', '**首选**', '少'],
        ['链式前向星', '`O(n+m)`', '边数极大、需要快速遍历', '多']
      ]
    },

    { t: 'md', x: [
      '## 邻接表（首选）'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005;
vector<int> g[N];              // 无权图
int n, m;

// 无向图：加两条有向边
for (int i = 0; i < m; i++) {
    int u, v;
    cin >> u >> v;
    g[u].push_back(v);
    g[v].push_back(u);
}

// 有向图：只加一条
g[u].push_back(v);

// 带权图：存 pair
vector<pair<int,int>> gw[N];   // {邻居, 边权}
gw[u].push_back({v, w});` },

    { t: 'note', kind: 'danger', x: [
      '**无向图的边数组要开两倍。** m 条无向边会产生 `2m` 条有向边。如果你按 m 开 `edge` 数组（链式前向星），会越界。这个错误非常隐蔽 —— 有时能过，有时 RE。'
    ].join('\n') },

    { t: 'md', x: [
      '## 链式前向星',
      '',
      '用数组模拟邻接表，比 `vector` 更快，且支持快速遍历所有边。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005, M = 200005;
int head[N], tot = 0;
struct Edge { int to, nxt, w; } e[M * 2];    // 无向图要 ×2

void addEdge(int u, int v, int w) {
    e[++tot] = {v, head[u], w};
    head[u] = tot;
}

// 初始化
memset(head, -1, sizeof(head));

// 遍历 u 的所有邻边
for (int i = head[u]; i != -1; i = e[i].nxt) {
    int v = e[i].to, w = e[i].w;
}` },

    { t: 'md', x: [
      '## DFS 遍历',
      '',
      '**递归版**（简单，但深度大会爆栈）：'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`bool vis[N];

void dfs(int u) {
    vis[u] = true;
    // 处理 u
    for (int v : g[u]) {
        if (!vis[v]) dfs(v);
    }
}

// 主函数里对每个未访问的点启动一次，处理非连通图
for (int i = 1; i <= n; i++)
    if (!vis[i]) {
        dfs(i);
        cnt++;              // 连通块数量
    }` },

    { t: 'note', kind: 'warn', x: [
      '**非连通图必须在外层套一层循环。** 只从 1 号点 `dfs(1)` 会漏掉其他连通块。这是「求连通块个数」「判断图是否连通」类题目最常见的错误。'
    ].join('\n') },

    { t: 'md', x: [
      '**迭代版**（深度可能 1e6 时用）：'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`void dfsIter(int start) {
    stack<int> st;
    st.push(start);
    vis[start] = true;
    while (!st.empty()) {
        int u = st.top(); st.pop();
        // 处理 u
        for (int v : g[u]) {
            if (!vis[v]) {
                vis[v] = true;
                st.push(v);
            }
        }
    }
}
// 注意：迭代版的访问顺序和递归版不同（是"反着的"），
// 如果题目要求特定顺序（比如按字典序），需要额外处理` },

    { t: 'md', x: [
      '## BFS 遍历',
      '',
      'BFS 用队列，一层一层扩展。**它的关键性质是：第一次到达某个点时，走的就是最短路径（边权为 1 时）。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int dist[N];              // 距离，-1 表示未访问
queue<int> q;

memset(dist, -1, sizeof(dist));
dist[start] = 0;
q.push(start);

while (!q.empty()) {
    int u = q.front(); q.pop();
    for (int v : g[u]) {
        if (dist[v] == -1) {
            dist[v] = dist[u] + 1;
            q.push(v);
        }
    }
}` },

    { t: 'note', kind: 'tip', x: [
      '**用 `dist` 数组同时承担「访问标记」和「距离记录」两个职责**，不要另外开 `vis`。少一个数组就少一处不一致的可能。',
      '',
      '`dist[v] == -1` 既表示没访问过，也方便最后输出「不可达」为 -1。'
    ].join('\n') },

    { t: 'quiz',
      q: '无向图有 m 条边，用链式前向星存边（`e[M * 2]`），M 至少应该设为多少？',
      o: ['m', 'm / 2', '2m', 'm²'],
      a: 2,
      e: '每条无向边要存两条有向边（u→v 和 v→u），所以总边数是 `2m`。如果数组只开 `m`，会写越界，破坏其他变量的内存，表现为随机的错误答案或 RE。**开数组时 `M * 2` 是标准做法。**'
    },

    { t: 'quiz',
      q: 'BFS 第一次访问到某个节点时得到的距离，为什么一定是最短的？',
      o: [
        '因为 BFS 的代码写得好',
        '因为 BFS 按层扩展，先到达的一定经过更少的边',
        '因为队列是先进先出的',
        '不一定最短，要看具体图'
      ],
      a: 1,
      e: 'BFS 从起点开始，第 1 轮访问所有距离 1 的点，第 2 轮访问所有距离 2 的点……按距离严格递增的顺序扩展。所以任何一个点第一次被访问时，当前层数就是它的最短距离。**前提：所有边权相同（通常为 1）。** 边权不同时必须用 Dijkstra。'
    }
  ]
},

/* ---------------- 第 29 节 ---------------- */
{
  id: 29, s: 4, title: 'BFS 与最短步数', min: 40,
  goals: [
    '解决网格迷宫最短路径问题',
    '处理多源 BFS、状态 BFS',
    '知道 BFS 与 DFS 的选择标准'
  ],
  body: [
    { t: 'md', x: [
      'BFS 在竞赛里的核心用途只有一个：**求无权图（或边权全相等）的最短距离**。',
      '',
      '包含三种常见变体：网格迷宫、多源 BFS、状态空间 BFS。'
    ].join('\n') },

    { t: 'md', x: [
      '## 网格迷宫：最标准的模板',
      '',
      '给定 `n × m` 的迷宫，`\'.\'` 可走、`\'#\'` 障碍、`\'S\'` 起点、`\'E\'` 终点，求最少步数（上下左右）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`#include <bits/stdc++.h>
using namespace std;

const int N = 1005;
int n, m;
char g[N][N];
int dist[N][N];
int dx[4] = {-1, 1, 0, 0};
int dy[4] = {0, 0, -1, 1};

int bfs(int sx, int sy, int ex, int ey) {
    memset(dist, -1, sizeof(dist));
    queue<pair<int,int>> q;
    dist[sx][sy] = 0;
    q.push({sx, sy});

    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        if (x == ex && y == ey) return dist[x][y];

        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
            if (g[nx][ny] == '#') continue;
            if (dist[nx][ny] != -1) continue;
            dist[nx][ny] = dist[x][y] + 1;
            q.push({nx, ny});
        }
    }
    return -1;
}` },

    { t: 'note', kind: 'warn', x: [
      '**入队时就标记 `dist`，不要等出队时再标记。** 如果写成「出队时才标记已访问」，同一个点可能被多次入队，队列规模爆炸，甚至 MLE。',
      '',
      '上面代码在 `push` 之前就设了 `dist[nx][ny] = dist[x][y] + 1`，这是正确写法。'
    ].join('\n') },

    { t: 'md', x: [
      '## 多源 BFS',
      '',
      '有多个起点，求每个点到「最近的起点」的距离。做法是把所有起点一次性入队，`dist = 0`。',
      '',
      '**经典应用：腐烂的橘子、火源蔓延、逃离最近出口。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`queue<pair<int,int>> q;
for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++)
        if (g[i][j] == 'S') {          // 所有起点都入队
            dist[i][j] = 0;
            q.push({i, j});
        }

while (!q.empty()) {
    auto [x, y] = q.front(); q.pop();
    for (int d = 0; d < 4; d++) {
        int nx = x + dx[d], ny = y + dy[d];
        if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
        if (g[nx][ny] == '#' || dist[nx][ny] != -1) continue;
        dist[nx][ny] = dist[x][y] + 1;
        q.push({nx, ny});
    }
}` },

    { t: 'note', kind: 'tip', x: [
      '**多源 BFS 和单源 BFS 的代码几乎一样，区别只是初始化。** 它的正确性来自：可以想象一个虚拟源点，到所有起点的边权为 0，问题就变成了单源最短路。'
    ].join('\n') },

    { t: 'md', x: [
      '## 状态 BFS',
      '',
      '有时候「位置」不足以描述状态，需要加上额外维度。比如「推箱子」要知道人站在哪，「收集钥匙」要记录已收集的钥匙集合。',
      '',
      '**做法：把状态编码成一个整数，或者用多维数组。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 例：数字变换。从 n 变到 m，每次可以 +1、-1、×2，求最少步数（n, m <= 1e5）
int dist[100005];
queue<int> q;

memset(dist, -1, sizeof(dist));
dist[n] = 0;
q.push(n);

while (!q.empty()) {
    int u = q.front(); q.pop();
    if (u == m) break;

    int nxt[3] = {u + 1, u - 1, u * 2};
    for (int v : nxt) {
        if (v < 0 || v > 100000) continue;
        if (dist[v] != -1) continue;
        dist[v] = dist[u] + 1;
        q.push(v);
    }
}
cout << dist[m];` },

    { t: 'md', x: [
      '## BFS 还是 DFS？',
      '',
      '| 需求 | 选 |',
      '| --- | --- |',
      '| 最短步数 / 最少操作 | **BFS** |',
      '| 是否存在路径 | 都行，DFS 更省内存 |',
      '| 枚举所有方案 | DFS |',
      '| 连通块划分 | 都行 |',
      '| 需要回溯（撤销选择） | DFS |',
      '| 图很深（链状） | BFS（DFS 会爆栈） |',
      '',
      '**一句话：问「最少几步」用 BFS，问「有多少种」用 DFS。**'
    ].join('\n') },

    { t: 'quiz',
      q: 'BFS 中如果把「标记已访问」放在出队时而不是入队时，会有什么后果？',
      o: [
        '没有影响',
        '答案会错，可能得到比真实值大的距离',
        '同一个点可能被多次入队，队列膨胀，可能超时或超内存',
        '会死循环'
      ],
      a: 2,
      e: '如果出队时才标记，那么一个点在被处理之前，可能已经被它的多个邻居各自 `push` 了一次。队列规模会爆炸（网格图上可能放大几倍到几十倍），严重时 TLE / MLE。虽然距离值不会错（第一次出队时是最小的），但性能不可接受。**标准写法：入队前判重并标记。**'
    }
  ]
},

/* ---------------- 第 30 节 ---------------- */
{
  id: 30, s: 4, title: '拓扑排序', min: 35,
  goals: [
    '用 Kahn 算法做拓扑排序',
    '判断有向图是否存在环',
    '解决「任务先后顺序」类问题'
  ],
  body: [
    { t: 'md', x: [
      '拓扑排序解决的是：**一堆有依赖关系的任务，排出一个合法的执行顺序。**',
      '',
      '比如课程先修关系、编译依赖、工程工序。它的数学定义是：对有向无环图（DAG），把所有顶点排成一个序列，使得每条边 `u → v` 中 `u` 都排在 `v` 前面。'
    ].join('\n') },

    { t: 'md', x: [
      '## Kahn 算法（BFS 版，推荐）',
      '',
      '1. 统计每个点的入度',
      '2. 所有入度为 0 的点入队',
      '3. 每次取出队首，把它加入答案序列，并把它的所有后继入度减 1',
      '4. 如果某个后继入度变成 0，入队',
      '5. **最后如果答案序列长度 < n，说明有环**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005;
vector<int> g[N];
int indeg[N], n, m;

bool topoSort(vector<int>& order) {
    queue<int> q;
    for (int i = 1; i <= n; i++)
        if (indeg[i] == 0) q.push(i);

    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) {
            if (--indeg[v] == 0) q.push(v);
        }
    }
    return (int)order.size() == n;      // false 说明有环
}` },

    { t: 'note', kind: 'tip', x: [
      '**`order.size() < n` 等价于「图中有环」。** 因为环上的点入度永远减不到 0，永远进不了队列。这是判断有向图是否有环最简洁的方法，比 DFS 染色法好写。'
    ].join('\n') },

    { t: 'md', x: [
      '## 输出字典序最小的拓扑序',
      '',
      '把 `queue` 换成 `priority_queue`（小根堆），每次取编号最小的入度为 0 的点。这是拓扑排序最常见的变体，几乎必考。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`priority_queue<int, vector<int>, greater<int>> pq;
for (int i = 1; i <= n; i++)
    if (indeg[i] == 0) pq.push(i);

while (!pq.empty()) {
    int u = pq.top(); pq.pop();
    cout << u << ' ';
    for (int v : g[u])
        if (--indeg[v] == 0) pq.push(v);
}
// 注意：这里能得到字典序最小的序列，
// 但"每次取最小"这个贪心对拓扑序是成立的，因为入度为 0 的点之间没有约束` },

    { t: 'md', x: [
      '## 应用：DAG 上的最长路',
      '',
      '拓扑排序还有一个重要用途：**在 DAG 上按拓扑序做 DP**。因为拓扑序保证了「所有前驱都已经算完」，可以直接递推。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// DAG 上求从 1 出发到各点的最长路
vector<int> order;
topoSort(order);

memset(dist, -1, sizeof(dist));
dist[1] = 0;
for (int u : order) {
    if (dist[u] == -1) continue;
    for (auto& e : g[u]) {
        dist[e.to] = max(dist[e.to], dist[u] + e.w);
    }
}
// 如果按任意顺序更新，后面的点可能先被更新、再被前面影响，
// 结果错。拓扑序保证了一次性算对。` },

    { t: 'md', x: [
      '## DFS 写法（了解）',
      '',
      'DFS 后序遍历的逆序就是一个拓扑序。判断环需要三色标记。代码更短但更容易写错，**推荐用 Kahn**。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int color[N];     // 0 未访问，1 在栈中，2 已完成
vector<int> order;
bool hasCycle = false;

void dfs(int u) {
    color[u] = 1;
    for (int v : g[u]) {
        if (color[v] == 1) { hasCycle = true; return; }   // 回到栈中的点 = 有环
        if (color[v] == 0) dfs(v);
    }
    color[u] = 2;
    order.push_back(u);       // 后序
}
// 最后 reverse(order.begin(), order.end())` },

    { t: 'quiz',
      q: 'Kahn 算法结束后，如果 `order.size() < n`，说明什么？',
      o: [
        '图不连通',
        '图中有环',
        '代码写错了',
        '有孤立点'
      ],
      a: 1,
      e: '环上的每个点入度都至少为 1（环内前驱），所以永远不会变成 0，永远进不了队列。队列空了但还有剩余点，就说明剩下的点都在环上（或依赖环）。这是判断有向图是否有环的标准方法，复杂度 `O(n + m)`。'
    },

    { t: 'quiz',
      q: '要输出字典序最小的拓扑序，应该把 `queue` 换成什么？',
      o: [
        '`stack`',
        '`priority_queue<int, vector<int>, greater<int>>`',
        '`deque`',
        '`set`'
      ],
      a: 1,
      e: '每次从「当前所有入度为 0 的点」里选编号最小的，用**小根堆**。选最小是安全的贪心：这些点之间没有依赖约束，先输出谁都可以，选最小的能让字典序最优。注意用大根堆会得到字典序最大的序列。'
    }
  ]
}

]);
