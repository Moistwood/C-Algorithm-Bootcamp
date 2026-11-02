/* ==========================================================
   阶段四 图论（第 31 - 33 节）+ 阶段五 DP（第 34 - 35 节）
   ========================================================== */
var R = String.raw;

window.CHAPTERS = (window.CHAPTERS || []).concat([

/* ---------------- 第 31 节 ---------------- */
{
  id: 31, s: 4, title: '最短路：Dijkstra / Floyd / SPFA', min: 50,
  goals: [
    '根据数据范围选对最短路算法',
    '默写堆优化 Dijkstra',
    '会用 Floyd 求多源最短路和传递闭包'
  ],
  body: [
    { t: 'md', x: [
      '最短路是图论最重要的考点。**四种算法，选错一个就是 0 分。** 先看这张表，把它记住，比什么都重要。'
    ].join('\n') },

    { t: 'table',
      head: ['算法', '适用', '复杂度', '能否负权', 'n 上限'],
      rows: [
        ['BFS', '边权全为 1', '`O(n+m)`', '✗', '1e6'],
        ['Dijkstra（堆优化）', '非负权，单源', '`O((n+m) log n)`', '✗', '**1e5 ~ 1e6**'],
        ['Dijkstra（朴素）', '非负权，稠密图', '`O(n²)`', '✗', 'n ≤ 5000'],
        ['Bellman-Ford / SPFA', '可有负权，单源', 'SPFA 平均 `O(km)`，最坏 `O(nm)`', '✓', '1e4（易被卡）'],
        ['Floyd', '多源，任意两点', '`O(n³)`', '✓（不能有负环）', '**n ≤ 400**']
      ]
    },

    { t: 'md', x: [
      '## 一、Dijkstra（堆优化）—— 最常用',
      '',
      '**前提：所有边权非负。** 有负权边时 Dijkstra 会给出错误答案，不是慢，是错。',
      '',
      '贪心思想：每次从未确定的点里取当前距离最小的，它的距离就已经是最终答案（因为经过其他点绕路只会更长）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`#include <bits/stdc++.h>
using namespace std;

const int N = 100005, INF = 0x3f3f3f3f;
vector<pair<int,int>> g[N];      // {邻居, 边权}
int dist[N];
bool done[N];
int n, m, s;

void dijkstra(int s) {
    memset(dist, 0x3f, sizeof(dist));
    dist[s] = 0;

    // 小根堆：{距离, 点}
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, s});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (done[u]) continue;         // 已经确定过，跳过（等价于 d > dist[u]）
        done[u] = true;

        for (auto [v, w] : g[u]) {
            if (dist[v] > d + w) {
                dist[v] = d + w;
                pq.push({dist[v], v});   // 懒惰删除：不修改堆内元素，直接压新的
            }
        }
    }
}` },

    { t: 'note', kind: 'tip', x: [
      '**`0x3f3f3f3f` 是竞赛里的「无穷大」。** 它约等于 10.6 亿，两个相加约 21 亿，**不会溢出 int**。而 `INT_MAX`（21.47 亿）加任何数都会溢出成负数。',
      '',
      '用 `memset(dist, 0x3f, sizeof(dist))` 可以一次性把所有位置填成 `0x3f3f3f3f`，因为每个字节都是 0x3f。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 如果需要记录路径：加一个 pre 数组
int pre[N];
// 在松弛成功时：
//   dist[v] = d + w;
//   pre[v] = u;

// 最后从终点往回找
vector<int> path;
for (int x = t; x != -1; x = pre[x]) path.push_back(x);
reverse(path.begin(), path.end());

// 如果需要统计最短路条数
long long cnt[N];
// cnt[s] = 1;
// 松弛成功：cnt[v] = cnt[u];
// 距离相等：cnt[v] += cnt[u];` },

    { t: 'md', x: [
      '## 二、Floyd —— 多源最短路',
      '',
      '求**任意两点**之间的最短路，`O(n³)`。n ≤ 400 时可用。代码只有五行。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int INF = 0x3f3f3f3f;
int d[405][405];

// 初始化：自己到自己为 0，其余为 INF
for (int i = 1; i <= n; i++)
    for (int j = 1; j <= n; j++)
        d[i][j] = (i == j) ? 0 : INF;

// 读边（注意重边，取最小值）
for (int i = 0; i < m; i++) {
    int u, v, w;
    cin >> u >> v >> w;
    d[u][v] = min(d[u][v], w);
    // 无向图再加 d[v][u] = min(d[v][u], w);
}

// 核心五行：k 必须是最外层循环
for (int k = 1; k <= n; k++)
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++)
            if (d[i][k] + d[k][j] < d[i][j])
                d[i][j] = d[i][k] + d[k][j];` },

    { t: 'note', kind: 'danger', x: [
      '**`k` 必须在最外层。** 这不是可选的优化，而是算法正确性的要求。`d[i][j]` 经过的中间点集合随 `k` 递增而扩大，如果 `k` 在内层，就变成「只允许经过一个中间点」，答案会错。',
      '',
      '这是 Floyd 最经典的错误，面试也常考。'
    ].join('\n') },

    { t: 'md', x: [
      '## 三、SPFA / Bellman-Ford —— 有负权时用',
      '',
      '有负权边时 Dijkstra 失效，要用 Bellman-Ford 系列。SPFA 是它的队列优化版，**但最坏复杂度是 `O(nm)`，出题人可以构造数据卡死它**。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`bool spfa(int s) {              // 返回 false 表示有负环
    memset(dist, 0x3f, sizeof(dist));
    memset(inq, 0, sizeof(inq));
    memset(cnt, 0, sizeof(cnt));
    dist[s] = 0;
    queue<int> q;
    q.push(s);
    inq[s] = true;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        inq[u] = false;

        for (auto [v, w] : g[u]) {
            if (dist[v] > dist[u] + w) {
                dist[v] = dist[u] + w;
                cnt[v] = cnt[u] + 1;
                if (cnt[v] >= n) return false;   // 松弛 n 次以上 = 有负环
                if (!inq[v]) { q.push(v); inq[v] = true; }
            }
        }
    }
    return true;
}` },

    { t: 'note', kind: 'warn', x: [
      '**省赛里慎用 SPFA。** 现在的出题人都知道怎么卡它（构造网格状数据）。如果边权非负，一定用 Dijkstra。',
      '',
      '如果题目明确有负权，优先考虑：**SPFA 判负环 + 拓扑排序**，或者直接用 **Johnson**（省赛不会考）。'
    ].join('\n') },

    { t: 'md', x: [
      '## 四、Floyd 的另一个用途：传递闭包',
      '',
      '求「谁能否到达谁」，把 `min` 换成逻辑或即可。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// reach[i][j] 表示 i 能否到达 j
for (int k = 1; k <= n; k++)
    for (int i = 1; i <= n; i++)
        if (reach[i][k])
            for (int j = 1; j <= n; j++)
                if (reach[k][j]) reach[i][j] = true;
// 也可以直接用 bitset 加速到 O(n³/64)` },

    { t: 'md', x: [
      '## 选算法的决策流程',
      '',
      '1. 边权是不是**全为 1**？→ 是就 BFS',
      '2. 要**任意两点**的距离吗？→ 是且 n ≤ 400 用 Floyd',
      '3. 有**负权边**吗？→ 有就用 SPFA（或用 Bellman-Ford）',
      '4. 都不满足 → **堆优化 Dijkstra**',
      '',
      '按这个顺序问自己，30 秒就能定下来。'
    ].join('\n') },

    { t: 'quiz',
      q: '图中存在负权边时，用 Dijkstra 会怎样？',
      o: [
        '只是变慢，答案仍然正确',
        '编译错误',
        '得到错误的答案，因为「已确定点的距离不会再变小」这个前提被破坏',
        '陷入死循环'
      ],
      a: 2,
      e: 'Dijkstra 的正确性依赖「贪心选择的最小距离点已经是最优」。有负权边时，一个已经确定的点可能通过「先绕到远处、再走一条负权边」获得更小的距离，但 Dijkstra 不会再更新它。所以结果是**错的**，而且不报错，最难查。'
    },

    { t: 'quiz',
      q: 'Floyd 算法中，为什么 `k` 循环必须放最外层？',
      o: [
        '为了利用缓存，提高速度',
        '因为 `d[i][j]` 的定义是「只允许经过 1..k 这些中间点」，k 递增才能保证正确性',
        '因为 k 在内层会导致数组越界',
        '其实放哪都一样'
      ],
      a: 1,
      e: 'Floyd 的递推本质是：`d[k][i][j] = min(d[k-1][i][j], d[k-1][i][k] + d[k-1][k][j])`，第三维 `k` 是「允许使用的中间点集合」。只有按 `k` 从小到大滚动，才能保证计算 `d[i][j]` 时用到的 `d[i][k]` 和 `d[k][j]` 已经是正确的。`k` 在内层时，很多状态还没算出来就被使用了。'
    }
  ]
},

/* ---------------- 第 32 节 ---------------- */
{
  id: 32, s: 4, title: '最小生成树', min: 40,
  goals: [
    '默写 Kruskal 算法',
    '知道 Prim 适合什么场景',
    '理解「最小生成树不唯一但权值和唯一」'
  ],
  body: [
    { t: 'md', x: [
      '**最小生成树（MST）：用 n-1 条边把所有点连通，使总权值最小。**',
      '',
      '两种算法：',
      '',
      '- **Kruskal**：按边权排序 + 并查集。适合**稀疏图**（m 小）。',
      '- **Prim**：从一点出发不断扩展。适合**稠密图**（m 接近 n²）。',
      '',
      '**省赛里 Kruskal 用得更多，因为它好写、好理解，而且能顺带判断图是否连通。**'
    ].join('\n') },

    { t: 'md', x: [
      '## Kruskal',
      '',
      '1. 把所有边按权值从小到大排序',
      '2. 依次尝试每条边：如果两个端点不在同一集合（并查集），就选中这条边，合并',
      '3. 选够 n-1 条边就停',
      '4. 如果选不够 n-1 条，说明图不连通，无 MST'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`#include <bits/stdc++.h>
using namespace std;

const int N = 200005;
int fa[N];

int find(int x) {
    return fa[x] == x ? x : fa[x] = find(fa[x]);
}

struct Edge {
    int u, v, w;
    bool operator<(const Edge& o) const { return w < o.w; }
};

int n, m;
Edge e[N];

long long kruskal() {
    for (int i = 1; i <= n; i++) fa[i] = i;
    sort(e, e + m);

    long long total = 0;
    int picked = 0;

    for (int i = 0; i < m; i++) {
        int ru = find(e[i].u), rv = find(e[i].v);
        if (ru == rv) continue;        // 已经在同一棵树里，加了会成环
        fa[ru] = rv;
        total += e[i].w;
        if (++picked == n - 1) break;  // 够了
    }

    return picked == n - 1 ? total : -1;   // -1 表示不连通
}` },

    { t: 'note', kind: 'tip', x: [
      '**为什么「不成环」就能保证最优？** 这是贪心的正确性（割性质）：对任意一个把点分成两部分的割，跨割的最小权边一定属于某棵 MST。Kruskal 就是不断找出这样的边。完整证明用**交换论证**，考试不要求，但你要知道它不是「看起来对」。'
    ].join('\n') },

    { t: 'md', x: [
      '## Prim（朴素版，稠密图）',
      '',
      '`O(n²)`，不用优先队列时更简单也更适合稠密图。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int INF = 0x3f3f3f3f;
int g[1005][1005];       // 邻接矩阵
int dist[1005];          // dist[i]：i 到已选集合的最小边权
bool used[1005];

long long prim(int n) {
    memset(dist, 0x3f, sizeof(dist));
    dist[1] = 0;
    long long total = 0;

    for (int iter = 0; iter < n; iter++) {
        int u = -1;
        for (int i = 1; i <= n; i++)
            if (!used[i] && (u == -1 || dist[i] < dist[u])) u = i;

        if (dist[u] == INF) return -1;     // 不连通
        used[u] = true;
        total += dist[u];

        for (int v = 1; v <= n; v++)
            if (!used[v]) dist[v] = min(dist[v], g[u][v]);
    }
    return total;
}` },

    { t: 'md', x: [
      '## 几个容易搞混的点',
      '',
      '**1. MST 的边权和唯一，但树本身可能不唯一。** 当有相同权值的边时，可以选不同的边组合，只要总权值一样。题目一般只问总权值。',
      '',
      '**2. MST 不保证「任意两点路径最短」。** 这是最常被误解的。MST 优化的是总代价，不是单对点的距离。要单对最短用最短路算法。',
      '',
      '**3. 有负权边时 Kruskal 仍然正确。** 排序后负权边会被优先选中，没问题。'
    ].join('\n') },

    { t: 'note', kind: 'warn', x: [
      '**别把 MST 和最短路搞混。** 一道题说「修路使所有村庄连通，花费最少」→ MST。说「从 A 到 B 运费最少」→ 最短路。**关键词：所有点连通 = MST。**'
    ].join('\n') },

    { t: 'quiz',
      q: 'Kruskal 算法中，如果一条边的两个端点已经连通，为什么必须跳过？',
      o: [
        '因为它一定不是最小的边',
        '因为加入后会形成环，而生成树不能有环',
        '因为并查集不支持',
        '因为它已经被选过了'
      ],
      a: 1,
      e: '生成树的定义是「n 个点、n-1 条边、连通、无环」。如果两个端点已经连通，说明它们之间已有路径，再加这条边就形成环，边数变成 n，不再是树。并查集的 `find(u) == find(v)` 就是在判断这件事。'
    },

    { t: 'quiz',
      q: '「最小生成树」能保证任意两点之间的路径也是最短的吗？',
      o: [
        '能，这是 MST 的定义',
        '不能，MST 只保证总权值最小，单对点路径可能不是最短',
        '只在无向图里能',
        '只在边权都相等时能'
      ],
      a: 1,
      e: 'MST 优化的是「所有边的权值总和最小」，它可能为了全局最优而让某一对点的路径绕远。经典反例：三角形 A-B 边长 1、B-C 边长 1、A-C 边长 3。MST 选 AB 和 BC，A 到 C 的路径长 2；但直接边 AC 长 3，所以 MST 恰好也最优。换成 A-C 边长 1.5 呢？MST 选 AC 和 AB（总 2.5），A 到 B 就是 1。要构造反例需四个点。总之：**MST ≠ 最短路**。'
    }
  ]
},

/* ---------------- 第 33 节 ---------------- */
{
  id: 33, s: 4, title: '连通分量与二分图', min: 35,
  goals: [
    '求无向图的连通块数量',
    '用染色法判断二分图',
    '了解强连通分量与缩点'
  ],
  body: [
    { t: 'md', x: [
      '## 连通块计数',
      '',
      '最基础也最常考：给一个无向图，问有多少个连通块。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 方法一：DFS
int cnt = 0;
for (int i = 1; i <= n; i++) {
    if (!vis[i]) {
        dfs(i);
        cnt++;
    }
}

// 方法二：并查集
init(n);
for (auto& e : edges) unite(e.u, e.v);
int cnt = 0;
for (int i = 1; i <= n; i++) if (find(i) == i) cnt++;` },

    { t: 'md', x: [
      '## 二分图判定（染色法）',
      '',
      '二分图：能把点分成两个集合，使得每条边的两个端点分属不同集合。',
      '',
      '**等价条件：图中没有奇环（长度为奇数的环）。**',
      '',
      '判定方法：DFS/BFS 染色，相邻点染不同颜色，如果遇到冲突就不是二分图。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int color[N];        // 0 未染色，1 / 2 两种颜色

bool bfsCheck(int start) {
    queue<int> q;
    color[start] = 1;
    q.push(start);

    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) {
            if (color[v] == 0) {
                color[v] = 3 - color[u];    // 染成相反的颜色
                q.push(v);
            } else if (color[v] == color[u]) {
                return false;               // 相邻同色 → 不是二分图
            }
        }
    }
    return true;
}

bool isBipartite() {
    for (int i = 1; i <= n; i++)
        if (color[i] == 0 && !bfsCheck(i)) return false;
    return true;
}` },

    { t: 'note', kind: 'tip', x: [
      '**`3 - color[u]` 是「取反」的小技巧**：1 变 2，2 变 1。比写 `color[u] == 1 ? 2 : 1` 简洁。',
      '',
      '二分图判定必须**对每个未染色的点都试一次**，因为图可能不连通。'
    ].join('\n') },

    { t: 'md', x: [
      '## 二分图的最大匹配（匈牙利算法）',
      '',
      '「n 个男生 m 个女生，每人有几个心仪对象，最多能撮合几对」—— 这就是二分图最大匹配。',
      '',
      '省赛偶尔出现，代码不长，值得背。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int match[N];       // match[v] = 与右部点 v 匹配的左部点
bool used[N];

bool dfs(int u) {
    for (int v : g[u]) {
        if (used[v]) continue;
        used[v] = true;
        // v 没有匹配，或者 v 的原配可以换一个
        if (match[v] == 0 || dfs(match[v])) {
            match[v] = u;
            return true;
        }
    }
    return false;
}

int maxMatching() {
    int res = 0;
    for (int u = 1; u <= n; u++) {
        memset(used, 0, sizeof(used));
        if (dfs(u)) res++;
    }
    return res;
}` },

    { t: 'md', x: [
      '## 强连通分量（选学）',
      '',
      '有向图里，如果 u 能到 v 且 v 能到 u，它们强连通。极大的强连通子图叫 SCC。',
      '',
      '**用途：缩点。** 把每个 SCC 缩成一个点，原图就变成了 DAG，然后可以在上面做拓扑排序 / DP。这是很多压轴题的关键一步。',
      '',
      '算法有 Tarjan 和 Kosaraju 两种。Tarjan 一次 DFS 搞定，但代码较绕。**省赛出现的概率不高，优先级放在 DP 之后。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// Tarjan 求 SCC 的骨架（了解即可）
int dfn[N], low[N], timer = 0;
int stk[N], top = 0;
bool inStk[N];
int scc[N], sccCnt = 0;

void tarjan(int u) {
    dfn[u] = low[u] = ++timer;
    stk[++top] = u; inStk[u] = true;

    for (int v : g[u]) {
        if (!dfn[v]) {
            tarjan(v);
            low[u] = min(low[u], low[v]);
        } else if (inStk[v]) {
            low[u] = min(low[u], dfn[v]);
        }
    }

    if (low[u] == dfn[u]) {          // u 是 SCC 的根
        sccCnt++;
        int x;
        do {
            x = stk[top--];
            inStk[x] = false;
            scc[x] = sccCnt;
        } while (x != u);
    }
}` },

    { t: 'quiz',
      q: '判断一个图是否为二分图，等价于判断什么？',
      o: [
        '图中是否有环',
        '图中是否有奇环（长度为奇数的环）',
        '图是否连通',
        '边数是否为偶数'
      ],
      a: 1,
      e: '二分图的充要条件是**不存在奇环**。原因是：沿环走一圈，颜色必须交替，走奇数步会回到同色，与「相邻不同色」矛盾。染色法遇到冲突时，实际上就是找到了一个奇环。偶环则完全没问题（比如四边形，黑白黑白）。'
    }
  ]
},

/* ---------------- 第 34 节 ---------------- */
{
  id: 34, s: 5, title: 'DP 入门：状态、转移、边界', min: 45,
  goals: [
    '说清楚「状态」和「转移」分别是什么',
    '能把一个递归解法改写成记忆化搜索，再改成递推',
    '知道 DP 的三个必要条件'
  ],
  body: [
    { t: 'md', x: [
      '**动态规划 = 把大问题拆成小问题，且小问题的答案可以复用。**',
      '',
      '它和分治的区别在于：分治的子问题**互不重叠**，DP 的子问题**大量重复**。正因为重复，才需要「把答案存起来」。'
    ].join('\n') },

    { t: 'md', x: [
      '## 三个必要条件',
      '',
      '不是所有问题都能 DP。必须同时满足：',
      '',
      '1. **最优子结构**：大问题的最优解由小问题的最优解构成',
      '2. **无后效性**：一旦状态确定，后面的决策不受「怎么到达这个状态」的影响',
      '3. **子问题重叠**：不同路径会到达同一个子问题',
      '',
      '**第 2 条最容易违反。** 比如「走迷宫求路径数」如果要求「不能走重复格子」，就需要记录走过哪些格子 → 状态爆炸，不能简单 DP。'
    ].join('\n') },

    { t: 'md', x: [
      '## 三步走：定义状态 → 写转移 → 定边界',
      '',
      '拿最经典的「数字三角形」演示。题目：从顶部走到底部，每次只能往左下或右下，求路径上数字之和的最大值。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 第 1 步：定义状态
// f[i][j] = 从 (i,j) 出发走到最底部的最大和
// （注意：是"从这里出发往下走"，不是"从上面走到这里"）

// 第 2 步：转移
// f[i][j] = a[i][j] + max(f[i+1][j], f[i+1][j+1])
// 从 (i,j) 可以往左下 (i+1,j) 或右下 (i+1,j+1)

// 第 3 步：边界
// f[n][j] = a[n][j]    最后一行没有下一步

int f[105][105];
for (int j = 1; j <= n; j++) f[n][j] = a[n][j];

for (int i = n - 1; i >= 1; i--)
    for (int j = 1; j <= i; j++)
        f[i][j] = a[i][j] + max(f[i + 1][j], f[i + 1][j + 1]);

cout << f[1][1] << '\n';` },

    { t: 'note', kind: 'tip', x: [
      '**状态定义决定了转移的难易。** 同一个问题可以定义成「从 (i,j) 往下走的最大和」或「从顶部走到 (i,j) 的最大和」。前者天然从下往上推，每个格子都有两个来源，不用特判边界；后者正着推，左右两侧只有一个来源，要特判。',
      '',
      '**选状态的诀窍：选那个让转移最整齐的。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 记忆化搜索：最不容易写错的 DP 形式',
      '',
      '如果你一时想不出递推顺序，先写记忆化搜索。它保留了递归的直觉，又不会重复计算。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int memo[105][105];

int dfs(int i, int j) {
    if (i == n) return a[i][j];                 // 边界
    if (memo[i][j] != -1) return memo[i][j];    // 算过，直接返回
    return memo[i][j] = a[i][j] + max(dfs(i + 1, j), dfs(i + 1, j + 1));
}

// 主函数
memset(memo, -1, sizeof(memo));
cout << dfs(1, 1) << '\n';` },

    { t: 'note', kind: 'warn', x: [
      '**`memo` 的初始值要选一个「不可能出现的值」。** 如果答案可能是 0 或负数，就不能用 `memset(memo, 0, ...)` 判「算过没有」，否则会把「答案是 0」误判成「没算过」，重复计算甚至死循环。',
      '',
      '常用 `-1`、`-0x3f3f3f3f`，或者另开一个 `bool vis[][]`。'
    ].join('\n') },

    { t: 'md', x: [
      '## 三种写法的取舍',
      '',
      '| 形式 | 优点 | 缺点 | 什么时候用 |',
      '| --- | --- | --- | --- |',
      '| 记忆化搜索 | 直译思路，不用想顺序 | 递归开销、可能爆栈 | **首选**，尤其是转移复杂时 |',
      '| 递推（填表） | 快、省空间、可滚动数组 | 要想清楚遍历顺序 | 状态少、转移规则整齐 |',
      '| BFS 式 DP | 按「阶段」推进 | 少见 | 图上 DP |',
      '',
      '**建议：先用记忆化写出来跑通，再改写成递推优化。** 改不出来也没关系，能过就行。'
    ].join('\n') },

    { t: 'md', x: [
      '## 从记忆化改递推的方法',
      '',
      '1. 把 `dfs(i, j)` 的返回值换成 `f[i][j]`',
      '2. 把 `if (边界) return ...;` 换成对 `f` 数组边界的初始化',
      '3. 把 `return f[i][j] = 表达式` 换成赋值语句',
      '4. **确定遍历顺序：保证计算 `f[i][j]` 时，它依赖的状态都已经算好**',
      '',
      '第 4 步是关键。数字三角形是「从下往上」，所以 `i` 倒序；背包是「i 从 1 到 n，j 从大到小」。顺序错了答案就错，而且很难发现。'
    ].join('\n') },

    { t: 'quiz',
      q: 'DP 的「无后效性」是什么意思？',
      o: [
        '状态转移不需要时间',
        '一旦到达某个状态，后续决策只依赖这个状态，与如何到达无关',
        '每个状态只能被访问一次',
        '状态数量不能太大'
      ],
      a: 1,
      e: '「无后效性」= 「未来与过去无关」。比如走到格子 (i,j)，之后的路径只取决于位置和剩余步数，不取决于你是怎么走过来的。如果题目要求「不能走重复格子」，那么之后能走哪里就取决于历史路径 → 有后效性 → 不能简单 DP（需要状压记录走过的格子）。'
    },

    { t: 'quiz',
      q: '为什么记忆化搜索的 `memo` 初始值不能随便用一个可能出现的结果？',
      o: [
        '会导致数组越界',
        '会把「合法的答案」误判成「还没算过」，造成重复计算甚至死循环',
        '会拖慢速度',
        '没有影响'
      ],
      a: 1,
      e: '记忆化用 `memo[x] != INIT` 来判断「算过没有」。如果某个状态的合法答案恰好等于 `INIT`（比如答案是 0 而初始值是 0），那么每次访问都会认为「没算过」，重新递归下去，可能造成指数级重复计算或无限递归。标准做法：用 `-1` 当初始值（答案非负时），或者另开 `vis` 数组。'
    }
  ]
},

/* ---------------- 第 35 节 ---------------- */
{
  id: 35, s: 5, title: '线性 DP', min: 45,
  goals: [
    '解决最大子段和、LIS、LCS 三类经典问题',
    '写出 O(n log n) 的 LIS',
    '理解「以 i 结尾」这种状态定义方式'
  ],
  body: [
    { t: 'md', x: [
      '线性 DP 指状态是一维或二维、按顺序推进的 DP。它是 DP 的地基，**省赛里出现频率最高**。',
      '',
      '三种经典问题必须练到能默写：最大子段和、最长上升子序列（LIS）、最长公共子序列（LCS）。'
    ].join('\n') },

    { t: 'md', x: [
      '## 一、最大子段和（Kadane）',
      '',
      '求数组里连续子数组的最大和。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 状态：f[i] = 以 a[i] 结尾的最大子段和
// 转移：f[i] = max(a[i], f[i-1] + a[i])
//   要么自己单开一段，要么接在前一段后面

long long f = a[0], ans = a[0];
for (int i = 1; i < n; i++) {
    f = max((long long)a[i], f + a[i]);
    ans = max(ans, f);
}
cout << ans << '\n';

// 滚动成一维，O(1) 空间` },

    { t: 'note', kind: 'tip', x: [
      '**「以 i 结尾」是线性 DP 最常用的状态定义方式。** 它的好处是转移时只依赖前一个位置，非常整齐。如果定义成「前 i 个元素里的最大子段和」，转移就要考虑「第 i 个用不用」，还需要额外记录「以 i 结尾的和」，反而更复杂。',
      '',
      '**看到「连续」「子数组」「子串」，先想「以 i 结尾」。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 二、最长上升子序列（LIS）',
      '',
      '求最长的严格递增子序列长度（不要求连续）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// O(n²) 版本：n <= 5000
// f[i] = 以 a[i] 结尾的 LIS 长度
// f[i] = 1 + max(f[j])  for all j < i and a[j] < a[i]
int f[5005], ans = 0;
for (int i = 0; i < n; i++) {
    f[i] = 1;
    for (int j = 0; j < i; j++)
        if (a[j] < a[i]) f[i] = max(f[i], f[j] + 1);
    ans = max(ans, f[i]);
}

// O(n log n) 版本：n <= 1e5
// tails[k] = 长度为 k+1 的上升子序列的最小结尾值
vector<int> tails;
for (int x : a) {
    auto it = lower_bound(tails.begin(), tails.end(), x);
    if (it == tails.end()) tails.push_back(x);
    else                   *it = x;      // 用更小的结尾替换，给后面留空间
}
cout << tails.size() << '\n';` },

    { t: 'note', kind: 'warn', x: [
      '**`tails` 数组本身不是任何一个 LIS**，它只是「长度为 k+1 的子序列的最小可能结尾」。所以只能求长度，不能反推序列。',
      '',
      '**严格递增用 `lower_bound`，非降序用 `upper_bound`。** 这个区别经常导致答案差 1。'
    ].join('\n') },

    { t: 'md', x: [
      '## 三、最长公共子序列（LCS）',
      '',
      '两个字符串的最长公共子序列（不要求连续）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// f[i][j] = A 的前 i 个字符 和 B 的前 j 个字符 的 LCS 长度
// 转移：
//   A[i] == B[j]  →  f[i][j] = f[i-1][j-1] + 1
//   否则          →  f[i][j] = max(f[i-1][j], f[i][j-1])

int f[1005][1005];
for (int i = 1; i <= n; i++)
    for (int j = 1; j <= m; j++) {
        if (A[i-1] == B[j-1]) f[i][j] = f[i-1][j-1] + 1;
        else f[i][j] = max(f[i-1][j], f[i][j-1]);
    }
cout << f[n][m] << '\n';` },

    { t: 'note', kind: 'info', x: [
      '**LCS vs 最长公共子串：** 子序列不要求连续，子串要求连续。子串的 DP 是 `if (A[i]==B[j]) f[i][j] = f[i-1][j-1] + 1; else f[i][j] = 0;`，答案是所有 `f` 的最大值。',
      '',
      '**读题时一定要看清是「子序列」还是「子串」。** 这两个词一字之差，答案完全不同。'
    ].join('\n') },

    { t: 'md', x: [
      '## 四、编辑距离',
      '',
      '把字符串 A 变成 B，每次可以插入、删除、替换一个字符，求最少操作次数。',
      '',
      '`f[i][j]` = A 的前 i 个变成 B 的前 j 个的最少操作数。这是 LCS 的加强版，转移有三种。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 边界：f[i][0] = i（全删），f[0][j] = j（全插）
for (int i = 1; i <= n; i++) f[i][0] = i;
for (int j = 1; j <= m; j++) f[0][j] = j;

for (int i = 1; i <= n; i++)
    for (int j = 1; j <= m; j++) {
        if (A[i-1] == B[j-1])
            f[i][j] = f[i-1][j-1];                          // 不用操作
        else
            f[i][j] = min({f[i-1][j] + 1,                   // 删 A[i]
                           f[i][j-1] + 1,                   // 插 B[j]
                           f[i-1][j-1] + 1});               // 替换
    }
cout << f[n][m];` },

    { t: 'quiz',
      q: 'LIS 的 O(n log n) 算法中，`tails` 数组里存的是什么？',
      o: [
        '任意一个最长上升子序列',
        '长度为 k+1 的上升子序列的最小结尾值',
        '所有上升子序列的结尾',
        '原数组排序后的结果'
      ],
      a: 1,
      e: '`tails[k]` 表示「所有长度为 `k+1` 的上升子序列中，结尾元素的最小值」。结尾越小，后面越容易接上新元素，所以这是个贪心优化。`tails` 的长度就是 LIS 的长度，但它本身不是任何一个 LIS。'
    },

    { t: 'quiz',
      q: '最大子段和的转移方程 `f[i] = max(a[i], f[i-1] + a[i])` 中，`f[i-1] + a[i]` 表示什么？',
      o: [
        '从开头到 i 的和',
        '把 a[i] 接在前一个最优子段后面',
        '跳过 a[i]',
        'a[i] 的累加和'
      ],
      a: 1,
      e: '`f[i-1]` 是以 `a[i-1]` 结尾的最优子段的长度和。把它和 `a[i]` 连起来，就是以 `a[i]` 结尾的、包含前面元素的方案。如果 `f[i-1] < 0`，那接上还不如自己单开一段（`a[i]`），所以取 `max`。这就是「前缀和为负就丢弃」的 DP 表达。'
    }
  ]
}

]);
