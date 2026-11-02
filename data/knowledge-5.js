/* ==========================================================
   阶段三 · 核心数据结构（第 21 - 25 节）
   ========================================================== */
var R = String.raw;

window.CHAPTERS = (window.CHAPTERS || []).concat([

/* ---------------- 第 21 节 ---------------- */
{
  id: 21, s: 3, title: '队列与单调队列', min: 35,
  goals: [
    '掌握普通队列在 BFS 中的用法',
    '写出滑动窗口最大值的单调队列',
    '理解 deque 相比 queue 多出的能力'
  ],
  body: [
    { t: 'md', x: [
      '队列是「先进先出」。它在竞赛里主要有两个身份：**BFS 的容器**，和**单调队列维护滑动窗口极值**。',
      '',
      '`queue` 只能从尾部进、头部出。而单调队列需要从尾部**弹出**元素，所以必须用 `deque`（双端队列）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`queue<int> q;
q.push(1); q.push(2); q.push(3);
q.front();    // 1
q.back();     // 3
q.pop();      // 弹出 1
q.empty(); q.size();

deque<int> dq;
dq.push_back(1);
dq.push_front(0);     // 头部插入
dq.pop_back();
dq.pop_front();
dq.front(); dq.back();
dq[i];                // 支持随机访问` },

    { t: 'md', x: [
      '## 单调队列：滑动窗口最大值',
      '',
      '给一个长度为 n 的数组和一个窗口大小 k，窗口从左向右滑动，每次输出窗口内的最大值。',
      '',
      '暴力做法每次扫 k 个元素，`O(nk)`。单调队列把它压到 `O(n)`。',
      '',
      '**核心：队列里存下标，对应的值从队头到队尾单调递减。队头永远是当前窗口的最大值。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 滑动窗口最大值，窗口大小 k，输出每个窗口的最大值
deque<int> dq;                       // 存下标
vector<int> ans;

for (int i = 0; i < n; i++) {
    // 1. 把已经滑出窗口的队头踢掉
    while (!dq.empty() && dq.front() <= i - k) dq.pop_front();

    // 2. 把队尾所有 <= a[i] 的都踢掉（它们永远不可能成为最大值）
    while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();

    // 3. 当前元素入队
    dq.push_back(i);

    // 4. 窗口满了就输出队头
    if (i >= k - 1) ans.push_back(a[dq.front()]);
}` },

    { t: 'note', kind: 'tip', x: [
      '**为什么可以放心踢掉队尾？** 如果 `a[j] <= a[i]` 且 `j < i`，那么在任何包含 `j` 的窗口里，`i` 也一定在窗口内（因为 `i` 更靠右，更晚过期），而且 `a[i]` 更大。所以 `a[j]` 永远不可能成为最大值，可以永久删除。',
      '',
      '这是**「后来的更强，前面的就没用了」** 的典型论证。单调栈、单调队列的所有正确性证明都是这个套路。'
    ].join('\n') },

    { t: 'md', x: [
      '## 单调队列的其他应用',
      '',
      '1. **定长区间最小值** —— 把 `<=` 改成 `>=`，队头就是最小值',
      '2. **优化 DP** —— 转移方程形如 `dp[i] = min(dp[j]) + w[i]`（`j` 在一个滑动区间内）时，用单调队列把 `O(n²)` 降到 `O(n)`',
      '3. **最大子序和（长度不超过 m）** —— 前缀和 + 单调队列'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 应用：长度不超过 m 的连续子序列最大和
// 前缀和 s[i]，答案 = max(s[i] - min(s[j]))，其中 i-m <= j < i
long long ans = -1e18;
deque<int> dq;

for (int i = 0; i <= n; i++) {
    while (!dq.empty() && dq.front() < i - m) dq.pop_front();
    if (i > 0) ans = max(ans, s[i] - s[dq.front()]);
    while (!dq.empty() && s[dq.back()] >= s[i]) dq.pop_back();
    dq.push_back(i);
}` },

    { t: 'quiz',
      q: '单调队列中，队尾元素被弹出的条件是？',
      o: [
        '队尾元素已经滑出窗口',
        '队尾元素的值小于等于当前元素的值',
        '队列长度超过 k',
        '队尾元素的值大于当前元素的值'
      ],
      a: 1,
      e: '当前元素 `a[i]` 比队尾元素更新、更大（或相等），那么队尾元素在任何窗口里都会先过期，且值不占优势，永远不可能成为最大值，直接永久删除。注意用 `<=` 还是 `<` 会影响「相等元素保留几个」，一般用 `<=` 让队列更短。'
    }
  ]
},

/* ---------------- 第 22 节 ---------------- */
{
  id: 22, s: 3, title: '链表（数组模拟）', min: 30,
  goals: [
    '用数组模拟单链表和双向链表',
    '知道为什么比赛里不用 new/delete',
    '会解约瑟夫环这类链表模拟题'
  ],
  body: [
    { t: 'md', x: [
      '链表在比赛里很少直接用 `new Node`。原因很简单：**`new` 慢、容易内存泄漏、调试时看不到内容。**',
      '',
      '标准做法是**用数组模拟**：`val[i]` 存值，`nxt[i]` 存下一个节点的下标。分配新节点就是 `++tot`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005;
int val[N], nxt[N], head = -1, tot = 0;

// 头插：新节点插到最前面
void insertHead(int v) {
    val[tot] = v;
    nxt[tot] = head;
    head = tot++;
}

// 在节点 p 后面插入 v
void insertAfter(int p, int v) {
    val[tot] = v;
    nxt[tot] = nxt[p];
    nxt[p] = tot++;
}

// 删除节点 p 的后继
void eraseAfter(int p) {
    if (nxt[p] != -1) nxt[p] = nxt[nxt[p]];
}

// 遍历
for (int i = head; i != -1; i = nxt[i]) {
    cout << val[i] << ' ';
}` },

    { t: 'note', kind: 'warn', x: [
      '**数组模拟链表的两条铁律：**',
      '',
      '1. **下标必须初始化为 `-1`** 表示空。用 `0` 当下标时，`0` 是合法节点，判空会出错。',
      '2. **不要真的删除节点**，只改指针（`nxt[p] = nxt[nxt[p]]`）。节点还占着数组位置，但已经不在链上了。要复用位置需要额外的空闲链表。'
    ].join('\n') },

    { t: 'md', x: [
      '## 双向链表',
      '',
      '每个节点多一个 `pre[]` 记录前驱。',
      '',
      '**应用：** 需要「删除当前节点后还能往回走」的场景，比如约瑟夫环、编辑器的撤销。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int val[N], pre[N], nxt[N], tot = 0;

// 建一条 1..n 的循环双向链表
void build(int n) {
    for (int i = 1; i <= n; i++) {
        val[i] = i;
        pre[i] = (i == 1) ? n : i - 1;
        nxt[i] = (i == n) ? 1 : i + 1;
    }
    tot = n;
}

// 从链上摘掉节点 x
void remove(int x) {
    nxt[pre[x]] = nxt[x];
    pre[nxt[x]] = pre[x];
}` },

    { t: 'md', x: [
      '## 约瑟夫环',
      '',
      'n 个人围成一圈，从 1 开始报数，报到 m 的人出圈，下一个人重新从 1 报数。问最后剩下谁。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 写法 A：链表模拟，O(nm)，n <= 1e4 时可用，直观
int build(int n) { /* 如上 */ }

int cur = 1;
for (int left = n; left > 1; left--) {
    for (int step = 1; step < m; step++) cur = nxt[cur];   // 走 m-1 步
    remove(cur);                                          // cur 出圈
    cur = nxt[cur];                                       // 从下一个人继续
}
cout << cur;

// 写法 B：数学递推，O(n)，n 可以到 1e8
// f[1] = 0；f[i] = (f[i-1] + m) % i；答案 = f[n] + 1（0 起编号转 1 起）
int f = 0;
for (int i = 2; i <= n; i++) f = (f + m) % i;
cout << f + 1;` },

    { t: 'note', kind: 'tip', x: [
      '**约瑟夫环的数学递推是竞赛常考的小技巧**：`f[i] = (f[i-1] + m) % i`，答案 `f[n] + 1`。它的含义是「n 个人时，剩下那个人的编号」等于「n-1 个人时的编号整体后移 m 位」。',
      '',
      '`O(n)` 已经很快了。如果 n 到 1e18，还有更快的方法（按块跳），但省赛不会考那么深。'
    ].join('\n') },

    { t: 'quiz',
      q: '数组模拟链表时，`nxt[i] = -1` 表示什么？',
      o: [
        '节点 i 的值为 -1',
        '节点 i 是最后一个节点（没有后继）',
        '节点 i 已被删除',
        '链表为空'
      ],
      a: 1,
      e: '在数组模拟链表中，`-1` 是「空指针」的约定，表示链到这里结束。注意**不能用 0 当空指针**，因为 0 是合法的数组下标（第一个节点）。遍历写法因此是 `for (int i = head; i != -1; i = nxt[i])`。'
    }
  ]
},

/* ---------------- 第 23 节 ---------------- */
{
  id: 23, s: 3, title: '并查集', min: 40,
  goals: [
    '默写带路径压缩的并查集',
    '解决连通块计数、判断连通性',
    '知道什么时候并查集比 DFS 更合适'
  ],
  body: [
    { t: 'md', x: [
      '并查集（DSU）只支持两个操作：**合并两个集合**、**查询两个元素是否在同一集合**。',
      '',
      '但它把这两个操作做到了接近 `O(1)`，而且代码只有十几行。这是竞赛里「性价比最高的数据结构」。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int fa[100005];

// 初始化：每个元素自成一个集合
void init(int n) {
    for (int i = 1; i <= n; i++) fa[i] = i;
}

// 查找根节点 + 路径压缩
int find(int x) {
    if (fa[x] == x) return x;
    return fa[x] = find(fa[x]);      // 顺手把路径上的节点都直接连到根
}

// 合并
void unite(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra != rb) fa[ra] = rb;
}

// 判断是否同集合
bool same(int a, int b) {
    return find(a) == find(b);
}` },

    { t: 'note', kind: 'tip', x: [
      '**`fa[x] = find(fa[x])` 这一行就是路径压缩**，整个算法的精髓。它把查找路径上的所有节点直接挂到根上，下次查就是 `O(1)`。',
      '',
      '加了这个优化后，单次操作平均复杂度是 `O(α(n))`，其中 `α` 是反阿克曼函数，在 `n < 10^80` 时都不超过 5。**可以说就是 O(1)。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 典型应用一：连通块计数',
      '',
      '给 n 个点 m 条边，问有多少个连通块。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`init(n);
for (int i = 0; i < m; i++) {
    int u, v;
    cin >> u >> v;
    unite(u, v);
}

int cnt = 0;
for (int i = 1; i <= n; i++)
    if (find(i) == i) cnt++;       // 根节点的个数就是连通块数
cout << cnt << '\n';` },

    { t: 'md', x: [
      '## 典型应用二：动态连通性',
      '',
      '边一条一条加进来，每次问某两个点是否连通。**这是并查集的主场，DFS 做不了**（DFS 要重新搜一遍）。',
      '',
      '这也是判断该用并查集还是 DFS 的标准：',
      '',
      '- 图是**静态**的，只问一次 → DFS / BFS 都行',
      '- 图是**动态加边**的，问很多次 → 并查集',
      '- 要问**路径**而不只是连通性 → 必须 DFS / 最短路'
    ].join('\n') },

    { t: 'md', x: [
      '## 典型应用三：Kruskal 最小生成树',
      '',
      '把边按权值排序，从小到大尝试加入，如果两个端点已经连通就跳过（会成环），否则加入。**「是否连通」的判断正是并查集。** 第 32 节会详细讲。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// Kruskal 的骨架，先感受一下
sort(edges, edges + m, [](const Edge& a, const Edge& b) {
    return a.w < b.w;
});

init(n);
long long total = 0;
int picked = 0;
for (int i = 0; i < m && picked < n - 1; i++) {
    if (find(edges[i].u) == find(edges[i].v)) continue;   // 已连通，跳过
    unite(edges[i].u, edges[i].v);
    total += edges[i].w;
    picked++;
}` },

    { t: 'md', x: [
      '## 带权并查集（选学）',
      '',
      '如果元素之间有「相对关系」（比如 A 比 B 重 3），并且要支持查询任意两个元素的关系，就需要在 `find` 里顺便维护到根的权值。省赛出现频率不高，但国赛有。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int fa[N], d[N];    // d[x] = x 到父节点的权值

int find(int x) {
    if (fa[x] == x) return x;
    int root = find(fa[x]);
    d[x] += d[fa[x]];        // 累加到根的权值
    return fa[x] = root;
}` },

    { t: 'note', kind: 'warn', x: [
      '**并查集不能「拆分」**。合并容易，拆开极难（需要可持久化或 LCT）。如果题目要求「删边后判断连通性」，考虑**倒着做**：把删边变成加边，离线倒序处理。这是非常常见的套路。'
    ].join('\n') },

    { t: 'quiz',
      q: '并查集的路径压缩代码 `fa[x] = find(fa[x])` 的作用是？',
      o: [
        '把 x 从集合中删除',
        '把查找路径上的所有节点直接挂到根节点下，加速后续查找',
        '合并两个集合',
        '检测环'
      ],
      a: 1,
      e: '朴素 `find` 沿着父指针一路往上找，如果树退化成链，单次查找就是 `O(n)`。路径压缩在递归返回时，把路径上每个节点的 `fa` 都直接改成根节点。这样树的高度几乎永远是 1，后续查找接近 `O(1)`。配合按秩合并，均摊复杂度是 `O(α(n))`。'
    }
  ]
},

/* ---------------- 第 24 节 ---------------- */
{
  id: 24, s: 3, title: '堆与优先队列', min: 35,
  goals: [
    '熟练使用 priority_queue 的大根堆 / 小根堆',
    '用对顶堆求动态中位数',
    '知道堆在贪心和最短路中的用法'
  ],
  body: [
    { t: 'md', x: [
      '堆是一种能在 `O(log n)` 内插入、`O(1)` 内取最值的结构。C++ 里用 `priority_queue` 就够了，不需要手写。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 大根堆（默认）
priority_queue<int> maxHeap;

// 小根堆
priority_queue<int, vector<int>, greater<int>> minHeap;

// 存 pair：默认按 first 降序，first 相同按 second 降序
priority_queue<pair<int,int>> pq;
pq.push({5, 1});
pq.push({3, 2});
cout << pq.top().first;      // 5

// 存结构体：自定义比较器
struct Node { int d, id; };
struct Cmp {
    bool operator()(const Node& a, const Node& b) const {
        return a.d > b.d;      // 小根堆：返回 true 表示 a 优先级更低
    }
};
priority_queue<Node, vector<Node>, Cmp> pq2;` },

    { t: 'md', x: [
      '## 应用一：动态维护前 k 大',
      '',
      '数据一个个进来，随时问「当前最大的 k 个数」。做法是维护一个**大小为 k 的小根堆**：堆顶是这 k 个里最小的，新元素比堆顶大就替换掉堆顶。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`priority_queue<int, vector<int>, greater<int>> pq;   // 小根堆，存前 k 大

for (int i = 0; i < n; i++) {
    pq.push(a[i]);
    if ((int)pq.size() > k) pq.pop();    // 弹出最小的，保证只剩 k 个
}
cout << pq.top();                        // 第 k 大的数` },

    { t: 'note', kind: 'tip', x: [
      '**「求第 k 大」用大小为 k 的小根堆，「求第 k 小」用大小为 k 的大根堆。** 记法：堆顶是你想丢弃的那一端。',
      '',
      '这个技巧在「海量数据求 Top K」里也通用 —— 只需要 O(k) 内存，不需要把所有数据装进内存。'
    ].join('\n') },

    { t: 'md', x: [
      '## 应用二：对顶堆求动态中位数',
      '',
      '数据流不断进来，随时输出当前中位数。做法是维护两个堆：**大根堆放较小的一半，小根堆放较大的一半**，保持两者大小差不超过 1。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`priority_queue<int> low;                                  // 大根堆，存较小的一半
priority_queue<int, vector<int>, greater<int>> high;    // 小根堆，存较大的一半

void add(int x) {
    if (low.empty() || x <= low.top()) low.push(x);
    else high.push(x);

    // 平衡：保证 low.size() == high.size() 或 low.size() == high.size() + 1
    if ((int)low.size() > (int)high.size() + 1) {
        high.push(low.top()); low.pop();
    }
    if ((int)high.size() > (int)low.size()) {
        low.push(high.top()); high.pop();
    }
}

double median() {
    if (low.size() == high.size()) return (low.top() + high.top()) / 2.0;
    return low.top();
}` },

    { t: 'md', x: [
      '## 应用三：合并果子 / 任务调度',
      '',
      '前面贪心里已经见过：每次取最小的两个合并，用堆实现。这类「每次取最值」的贪心，堆几乎是标配。'
    ].join('\n') },

    { t: 'md', x: [
      '## 应用四：堆优化 Dijkstra',
      '',
      '最短路算法里用堆取出「当前距离最小的未访问点」，把 `O(n²)` 降到 `O(m log n)`。第 31 节详讲。',
      '',
      '**注意：** C++ 的 `priority_queue` 不支持「修改堆中元素」，所以 Dijkstra 里用的是「懒惰删除」—— 把新距离直接 `push` 进去，弹出时如果发现这个距离已经过期就 `continue`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 懒惰删除的骨架
while (!pq.empty()) {
    auto [d, u] = pq.top(); pq.pop();
    if (d > dist[u]) continue;      // 过期数据，跳过
    for (auto& e : g[u]) {
        if (dist[e.to] > d + e.w) {
            dist[e.to] = d + e.w;
            pq.push({dist[e.to], e.to});
        }
    }
}` },

    { t: 'quiz',
      q: '要实时维护「当前数据里最大的 100 个数」，应该用什么堆？',
      o: [
        '大小为 100 的大根堆',
        '大小为 100 的小根堆',
        '大小为 n 的大根堆',
        '两个堆'
      ],
      a: 1,
      e: '维护「最大的 k 个」要用**大小为 k 的小根堆**。堆顶是这 k 个里最小的，新元素只要比堆顶大，就替换掉堆顶（`pop` 后 `push`）。这样堆里始终是当前最大的 k 个，堆顶就是第 k 大。用大根堆的话，你无法知道什么时候该丢弃元素。'
    },

    { t: 'quiz',
      q: '`priority_queue` 的自定义比较器中，`return a.d > b.d;` 得到的是什么堆？',
      o: ['大根堆', '小根堆', '无序', '编译错误'],
      a: 1,
      e: '`priority_queue` 的规则是：比较器返回 `true` 表示 `a` 的优先级**低于** `b`，`a` 会沉到堆底。所以 `a.d > b.d`（a 更大）时 a 沉下去，也就是**小的浮上来，得到小根堆**。想要大根堆就写 `a.d < b.d`。这个方向很多人搞反，写的时候先在脑子里过一遍「谁沉下去」。'
    }
  ]
},

/* ---------------- 第 25 节 ---------------- */
{
  id: 25, s: 3, title: '哈希表与字符串哈希', min: 35,
  goals: [
    '知道 map 和 unordered_map 的取舍',
    '会写滚动哈希判断子串相等',
    '知道哈希被卡的场景和应对'
  ],
  body: [
    { t: 'md', x: [
      '哈希把「查找」从 `O(log n)` 降到 `O(1)`（平均）。C++ 提供了 `unordered_map` / `unordered_set`，但**竞赛里要小心用**。'
    ].join('\n') },

    { t: 'table',
      head: ['容器', '复杂度', '优点', '缺点'],
      rows: [
        ['`map` / `set`', '`O(log n)`', '稳定、有序、可查前驱后继', '常数较大'],
        ['`unordered_map` / `unordered_set`', '平均 `O(1)`，最坏 `O(n)`', '快', '**可能被构造数据卡成 O(n)**']
      ]
    },

    { t: 'note', kind: 'danger', x: [
      '**`unordered_map` 会被卡。** 它的哈希函数是固定的（对 `int` 就是取模），出题人构造一组冲突数据，你的 `O(n)` 算法就退化成 `O(n²)`，直接 TLE。',
      '',
      '**三条应对：**',
      '1. 数据量 `≤ 1e5` 时，`map` 的 `O(log n)` 完全够用，直接用 `map` 最稳',
      '2. 需要极快时，自己写哈希（用 `chrono` 随机种子）',
      '3. 值域小时，直接用数组当哈希表（最快）'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 最稳的「哈希表」：值域小的时候直接用数组
// 例：统计每个数出现几次，a[i] <= 1e6
int cnt[1000005] = {0};
for (int i = 0; i < n; i++) cnt[a[i]]++;

// 值域大但只有 n 个不同的值 → 离散化（第 49 节）
// 或者用 map，1e5 规模足够

// 防卡的自定义哈希
struct CustomHash {
    static uint64_t splitmix64(uint64_t x) {
        x += 0x9e3779b97f4a7c15;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
        x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
        return x ^ (x >> 31);
    }
    size_t operator()(uint64_t x) const {
        static const uint64_t FIXED_RANDOM =
            chrono::steady_clock::now().time_since_epoch().count();
        return splitmix64(x + FIXED_RANDOM);
    }
};
unordered_map<long long, int, CustomHash> safeMap;` },

    { t: 'md', x: [
      '## 字符串哈希（滚动哈希）',
      '',
      '**问题：判断两个子串是否相等，或者求一个长串里有多少个不同的子串。**',
      '',
      '把字符串看成一个 base 进制数，预处理前缀哈希，就能 `O(1)` 取任意子串的哈希值。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`typedef unsigned long long ull;
const ull BASE = 131;          // 常用 131 或 13331

ull h[N], p[N];                // h[i]：前 i 个字符的哈希；p[i]：BASE^i

void build(const string& s) {  // s 用 1 起下标更方便，这里 s[0..n-1]
    int n = s.size();
    p[0] = 1;
    for (int i = 1; i <= n; i++) {
        h[i] = h[i - 1] * BASE + (unsigned char)s[i - 1];
        p[i] = p[i - 1] * BASE;
    }
}

// 取子串 s[l..r]（0 起下标）的哈希
ull get(int l, int r) {        // 传 0 起下标，内部转 1 起
    int L = l + 1, R = r + 1;
    return h[R] - h[L - 1] * p[R - L + 1];
}

// 判断 s[l1..r1] 和 s[l2..r2] 是否相等
bool equal(int l1, int r1, int l2, int r2) {
    return get(l1, r1) == get(l2, r2);
}` },

    { t: 'note', kind: 'tip', x: [
      '**`unsigned long long` 的自然溢出就是模 2⁶⁴**，不用手动取模，速度最快，碰撞概率已经极低（约 `n² / 2⁶⁴`）。',
      '',
      '如果担心被卡，可以用**双哈希**：选两个不同的 base 和模数，两个哈希都相等才算相等。代价是常数翻倍。',
      '',
      '**省赛一般单哈希就够。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 应用：求一个字符串有多少个不同的子串（n <= 1e5 时可用，O(n²) 枚举 + 哈希）
set<ull> st;
for (int i = 0; i < n; i++)
    for (int j = i; j < n; j++)
        st.insert(get(i, j));
cout << st.size();

// 应用：最长重复子串（二分长度 + 哈希判重，O(n log n)）
bool check(int len) {
    set<ull> seen;
    for (int i = 0; i + len - 1 < n; i++) {
        ull v = get(i, i + len - 1);
        if (seen.count(v)) return true;
        seen.insert(v);
    }
    return false;
}` },

    { t: 'md', x: [
      '## 哈希的思想：用空间换时间',
      '',
      '哈希不只是「用个 `unordered_map`」。它的本质是**把复杂的对象映射成一个整数，用整数比较代替对象比较**。',
      '',
      '所以很多题可以这样做：',
      '',
      '- 把「一个集合」哈希成一个数（集合哈希 / 异或哈希）',
      '- 把「一棵树」哈希成一个数（树哈希，判断同构）',
      '- 把「一个矩阵」哈希成一个数（二维哈希）',
      '',
      '看到「判断两个东西是否相同」而直接比较太慢时，就想哈希。'
    ].join('\n') },

    { t: 'quiz',
      q: '字符串哈希中，为什么常用 `unsigned long long` 存哈希值？',
      o: [
        '因为它能存更大的数',
        '因为它溢出时自动对 2⁶⁴ 取模，省掉手动取模且速度更快',
        '因为它的运算比 int 快',
        '因为标准要求'
      ],
      a: 1,
      e: '无符号整数的溢出在 C++ 中是**定义良好的**（回绕，等价于模 2⁶⁴），而有符号整数溢出是未定义行为。所以用 `unsigned long long` 可以白嫖「自动取模」，不用写 `% MOD`，速度快很多。碰撞概率约 `子串对数 / 2⁶⁴`，对 1e5 规模来说可以忽略。'
    },

    { t: 'quiz',
      q: '蓝桥杯里用 `unordered_map<int,int>` 有什么风险？',
      o: [
        '不能用，编译器不支持',
        '会被构造的冲突数据卡成 O(n)，导致超时',
        '占用内存太大',
        '不能存 int'
      ],
      a: 1,
      e: '`unordered_map` 对 `int` 的哈希基本就是取模桶数，出题人可以构造大量同余的数让它们全落进同一个桶，退化成链表，单次操作变成 `O(n)`，总复杂度 `O(n²)`。**数据量 ≤ 1e5 时直接用 `map`**（`O(log n)` 稳定），或者手写带随机种子的哈希。'
    }
  ]
}

]);
