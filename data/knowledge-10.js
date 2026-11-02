/* ==========================================================
   阶段七 · 进阶技巧与实战（第 46 - 51 节）
   ========================================================== */
var R = String.raw;

window.CHAPTERS = (window.CHAPTERS || []).concat([

/* ---------------- 第 46 节 ---------------- */
{
  id: 46, s: 7, title: '搜索优化与剪枝', min: 40,
  goals: [
    '写出带剪枝的 DFS',
    '知道迭代加深、双向 BFS、折半搜索分别解决什么问题',
    '能估算搜索空间并判断是否需要优化'
  ],
  body: [
    { t: 'md', x: [
      '纯暴力搜索的复杂度是指数级的，`n = 30` 时 `2³⁰` 就跑不动了。**剪枝就是「提前砍掉不可能的搜索分支」**，让实际搜索量远小于理论上界。'
    ].join('\n') },

    { t: 'md', x: [
      '## 两种基本剪枝',
      '',
      '**1. 可行性剪枝**：当前状态已经不可能到达合法解，直接返回。',
      '',
      '**2. 最优性剪枝**：当前代价已经超过已知最优解，再走下去也不会更好，直接返回。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 例：从 n 个数中选若干个，使和为 target，求方案数
int n, target, a[50], cnt = 0;

void dfs(int i, int sum) {
    if (sum > target) return;                 // 可行性剪枝：超了
    if (i == n) { if (sum == target) cnt++; return; }
    dfs(i + 1, sum + a[i]);
    dfs(i + 1, sum);
}

// 更强的剪枝：预处理后缀和
int suf[55];
void dfs2(int i, int sum) {
    if (sum > target) return;                 // 可行性
    if (sum + suf[i] < target) return;        // 可行性：全加上也不够
    if (i == n) { if (sum == target) cnt++; return; }
    dfs2(i + 1, sum + a[i]);
    dfs2(i + 1, sum);
}` },

    { t: 'note', kind: 'tip', x: [
      '**`sum + suf[i] < target` 这个剪枝威力巨大。** 它砍掉的是「剩下的全选也不够」的分支。在「凑数」类问题里，往往能把搜索量降一两个数量级。',
      '',
      '**剪枝的顺序也有讲究：先剪代价小的（O(1) 判断），再剪代价大的。** 把最容易触发的剪枝放在最前面。'
    ].join('\n') },

    { t: 'md', x: [
      '## 排序 + 剪枝',
      '',
      '把数组**从大到小排序**再搜索，能让「超出目标」尽早发生，剪枝效率高得多。这是搜索题的第一条优化，几乎无脑加。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 例：埃及分数 / 凑硬币，先排大的
sort(a, a + n, greater<int>());
// 然后 DFS，一旦 sum > target 立刻剪掉

// 另一个经典剪枝：去重。相同元素在同一层只枚举一次
for (int i = start; i < n; i++) {
    if (i > start && a[i] == a[i-1]) continue;   // 同层跳过重复
    // ...
}` },

    { t: 'md', x: [
      '## 迭代加深（IDDFS）',
      '',
      '当答案的深度很浅，但搜索树很宽（BFS 会爆内存）时用。做法是**限制深度上限，从 1 开始逐个增加，重复搜索浅层**。',
      '',
      '看起来浪费，但深层的节点数远多于浅层，重复搜索浅层的代价可以忽略。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`bool dfs(int depth, int limit, ...) {
    if (depth == limit) return check();
    if (heuristic() > limit - depth) return false;   // A* 式剪枝
    for (每个分支) {
        if (dfs(depth + 1, limit, ...)) return true;
    }
    return false;
}

for (int limit = 1; limit <= MAX; limit++) {
    if (dfs(0, limit, ...)) { cout << limit; break; }
}` },

    { t: 'md', x: [
      '## 双向 BFS',
      '',
      '起点和终点都已知，从两端同时 BFS，相遇即停止。搜索量从 `O(b^d)` 降到 `O(b^(d/2))`。',
      '',
      '**典型应用：八数码、单词接龙、最少操作次数（有明确目标状态）。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 折半搜索（Meet in the Middle）',
      '',
      '`n = 40`，枚举所有子集是 `2⁴⁰ ≈ 1e12`，不可能。但把数组分成两半，各 `2²⁰ ≈ 1e6`，分别枚举后合并。',
      '',
      '**这是「n 在 35~45 之间」时的标准解法。看到 `n ≤ 40` 且要求枚举子集，先想折半。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 例：n 个数，选若干个使和为 target，求方案数（n <= 40）
int n1 = n / 2, n2 = n - n1;
vector<long long> s1, s2;

// 枚举前半部分的所有子集和
for (int mask = 0; mask < (1 << n1); mask++) {
    long long s = 0;
    for (int i = 0; i < n1; i++) if (mask >> i & 1) s += a[i];
    s1.push_back(s);
}
// 后半部分同理
for (int mask = 0; mask < (1 << n2); mask++) {
    long long s = 0;
    for (int i = 0; i < n2; i++) if (mask >> i & 1) s += a[n1 + i];
    s2.push_back(s);
}

sort(s2.begin(), s2.end());
long long ans = 0;
for (long long x : s1)
    ans += upper_bound(s2.begin(), s2.end(), target - x)
         - lower_bound(s2.begin(), s2.end(), target - x);` },

    { t: 'note', kind: 'warn', x: [
      '**折半搜索的合并是关键。** 前半的部分和是 `x`，后半需要 `target - x`，用二分在排好序的后半数组里数个数。整体复杂度 `O(2^(n/2) · n)`。',
      '',
      '如果只问「是否存在」，用 `set` 或排序后二分都可以。如果问方案数，必须用 `upper_bound - lower_bound`。'
    ].join('\n') },

    { t: 'quiz',
      q: '`n = 40`，要枚举所有子集判断和是否为 target，应该用什么方法？',
      o: ['直接枚举 2⁴⁰ 个子集', '折半搜索（Meet in the Middle）', '状压 DP', '贪心'],
      a: 1,
      e: '`2⁴⁰ ≈ 1.1e12`，一秒只能算 1e8 次，需要 3 小时，不可行。折半搜索把数组分成两半，各枚举 `2²⁰ ≈ 1e6` 个子集和，然后排序 + 二分匹配，总复杂度 `O(2^(n/2) log)`，约 2e7 次运算，轻松过。**`n ≤ 40` 是折半搜索的标志性数据范围。**'
    }
  ]
},

/* ---------------- 第 47 节 ---------------- */
{
  id: 47, s: 7, title: '分治与归并', min: 35,
  goals: [
    '理解分治的三步：分、治、合',
    '用归并排序求逆序对',
    '认识分治在计数题里的用法'
  ],
  body: [
    { t: 'md', x: [
      '分治的模板固定：**把问题分成若干个规模更小的子问题，递归求解，再合并结果。**',
      '',
      '和 DP 的区别：分治的子问题**不重叠**，DP 的子问题**重叠**。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`void solve(区间) {
    if (区间足够小) { 直接算; return; }      // 边界
    分成左右两半;
    solve(左半);
    solve(右半);
    合并左右结果;                           // 关键，也是最难写的部分
}` },

    { t: 'md', x: [
      '## 归并排序：分治的原型',
      '',
      '第 13 节已经用它求逆序对。这里强调「合并」这一步的重要性 —— **分治的难点永远在合并，不在分。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`void mergeSort(int a[], int l, int r) {
    if (l >= r) return;
    int mid = (l + r) >> 1;
    mergeSort(a, l, mid);
    mergeSort(a, mid + 1, r);

    // 合并：两个有序数组合成一个
    int i = l, j = mid + 1, k = l;
    while (i <= mid && j <= r)
        tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= r)   tmp[k++] = a[j++];
    for (int t = l; t <= r; t++) a[t] = tmp[t];
}` },

    { t: 'md', x: [
      '## 分治求「最大子段和」',
      '',
      '虽然 Kadane 的 `O(n)` 更优，但这个例子能说明分治的思维：',
      '',
      '最大子段要么完全在左半、要么完全在右半、要么跨过中点。前两种递归解决，第三种从中点向两边扩展求最大。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long solve(int l, int r) {
    if (l == r) return a[l];
    int mid = (l + r) >> 1;

    long long leftMax = solve(l, mid);
    long long rightMax = solve(mid + 1, r);

    // 跨中点：从 mid 往左的最大和 + 从 mid+1 往右的最大和
    long long s = 0, bestL = -1e18;
    for (int i = mid; i >= l; i--) { s += a[i]; bestL = max(bestL, s); }
    s = 0;
    long long bestR = -1e18;
    for (int i = mid + 1; i <= r; i++) { s += a[i]; bestR = max(bestR, s); }

    return max({leftMax, rightMax, bestL + bestR});
}` },

    { t: 'md', x: [
      '## 分治的其他经典应用',
      '',
      '| 问题 | 分治方式 |',
      '| --- | --- |',
      '| 快速排序 | 按基准值分区，左右递归 |',
      '| 快速幂 | `a^n = (a^(n/2))²` |',
      '| 平面最近点对 | 按 x 排序分成两半 |',
      '| 大整数乘法 | 拆成高低位 |',
      '| 逆序对 | 归并时统计 |',
      '| 二分答案 | 本质是「答案空间的分治」 |',
      '',
      '**省赛里分治很少单独出题，但它藏在很多算法内部。** 理解分治，才能理解归并排序、快速排序、线段树、CDQ 分治。'
    ].join('\n') },

    { t: 'quiz',
      q: '分治和动态规划最本质的区别是？',
      o: [
        '分治更快',
        '分治的子问题互不重叠，DP 的子问题有重叠',
        '分治不能递归',
        'DP 不需要边界条件'
      ],
      a: 1,
      e: '分治把问题拆成**互不相交**的子问题（比如归并排序的左右两半），每个子问题只算一次，算完合并即可。DP 的子问题**大量重叠**（比如 `f(5)` 会被 `f(6)` 和 `f(7)` 都用到），所以必须把结果存起来复用。如果分治的子问题有重叠，那就退化成指数级暴力，必须改成 DP。'
    }
  ]
},

/* ---------------- 第 48 节 ---------------- */
{
  id: 48, s: 7, title: '倍增、ST 表与 LCA', min: 40,
  goals: [
    '用 ST 表做 O(1) 的区间最值查询',
    '用倍增求 LCA',
    '知道倍增思想的通用性'
  ],
  body: [
    { t: 'md', x: [
      '**倍增的核心：把「走 n 步」拆成「走 2^k 步」的组合。** 因为任何整数都能用二进制表示，所以只需 `log n` 次跳跃。',
      '',
      '快速幂就是倍增，跳表、倍增求 LCA、ST 表都是它的应用。'
    ].join('\n') },

    { t: 'md', x: [
      '## ST 表：O(n log n) 预处理，O(1) 查询区间最值',
      '',
      '**只能处理「可重复贡献」的运算**（max、min、gcd、按位与或），不能处理区间和（因为会重复计算）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005, LOG = 17;
int st[N][LOG + 1], lg[N];

void build(int n) {
    lg[1] = 0;
    for (int i = 2; i <= n; i++) lg[i] = lg[i >> 1] + 1;

    for (int i = 1; i <= n; i++) st[i][0] = a[i];

    // st[i][j] = 从 i 开始，长度 2^j 的区间的最大值
    for (int j = 1; (1 << j) <= n; j++)
        for (int i = 1; i + (1 << j) - 1 <= n; i++)
            st[i][j] = max(st[i][j-1], st[i + (1 << (j-1))][j-1]);
}

int query(int l, int r) {
    int k = lg[r - l + 1];
    return max(st[l][k], st[r - (1 << k) + 1][k]);
    // 两个长度 2^k 的区间覆盖 [l, r]，中间重叠部分不影响 max
}` },

    { t: 'note', kind: 'tip', x: [
      '**为什么能 `O(1)` 查询？** 因为 `max` 是「可重复贡献」的：同一个元素被算两次不影响结果。所以可以用两个**可能重叠**的长度为 `2^k` 的区间，把 `[l, r]` 完整覆盖。',
      '',
      '**区间和不行**，因为重叠部分会被加两次。求和要用前缀和或树状数组。'
    ].join('\n') },

    { t: 'md', x: [
      '## 倍增求 LCA（最近公共祖先）',
      '',
      '预处理每个点往上跳 `2^j` 步到哪，然后两个点同时往上跳。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100005, LOG = 17;
int up[N][LOG + 1], dep[N];

void dfs(int u, int fa) {
    dep[u] = dep[fa] + 1;
    up[u][0] = fa;
    for (int j = 1; j <= LOG; j++)
        up[u][j] = up[up[u][j-1]][j-1];      // 关键递推

    for (int v : g[u])
        if (v != fa) dfs(v, u);
}

int lca(int u, int v) {
    if (dep[u] < dep[v]) swap(u, v);

    // 第一步：把 u 跳到和 v 同一深度
    int d = dep[u] - dep[v];
    for (int j = 0; j <= LOG; j++)
        if (d >> j & 1) u = up[u][j];

    if (u == v) return u;

    // 第二步：两个一起往上跳，跳到 LCA 的下一层
    for (int j = LOG; j >= 0; j--)
        if (up[u][j] != up[v][j]) { u = up[u][j]; v = up[v][j]; }

    return up[u][0];
}` },

    { t: 'note', kind: 'warn', x: [
      '**第二步必须从大到小枚举 `j`。** 因为我们要尽可能跳得远但不超过 LCA。从小到大枚举会先跳到很近的祖先，之后就跳不动了。',
      '',
      '另外**循环结束后返回 `up[u][0]`，不是 `u`**。此时 `u` 和 `v` 是 LCA 的两个儿子，它们的父亲才是 LCA。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 求树上两点距离（边权为 1）
int dist(int u, int v) {
    return dep[u] + dep[v] - 2 * dep[lca(u, v)];
}` },

    { t: 'md', x: [
      '## 倍增的其他用法',
      '',
      '- **倍增找「第 k 个祖先」** —— 就是 LCA 的第一步',
      '- **倍增求「严格次大值」** —— 配合 ST 表',
      '- **倍增爬树求「最大的 x 使得条件成立」** —— 类似二分但是在树上',
      '',
      '**看到「跳 2 的幂次」「预处理后 O(log n) 查询」「跳跃问题」，就想倍增。**'
    ].join('\n') },

    { t: 'quiz',
      q: 'ST 表为什么不能用来求区间和？',
      o: [
        '因为 ST 表太慢',
        '因为求和不可重复贡献，两个重叠区间的和相加会重复计算重叠部分',
        '因为 ST 表空间不够',
        '其实可以用来求和'
      ],
      a: 1,
      e: 'ST 表的 `O(1)` 查询依赖「两个 `2^k` 区间覆盖 `[l,r]`，重叠部分不影响结果」。对 `max`/`min`/`gcd` 这类幂等运算，重叠无害。但求和时，重叠部分会被加两次，结果偏大。求和要么用前缀和（`O(1)` 查询但 `O(n)` 修改），要么用树状数组 / 线段树。'
    }
  ]
},

/* ---------------- 第 49 节 ---------------- */
{
  id: 49, s: 7, title: '离散化与其他压缩技巧', min: 30,
  goals: [
    '把大范围稀疏数据压缩到 1~n',
    '知道离散化的三行固定写法',
    '认识「值域换下标」这个通用手法'
  ],
  body: [
    { t: 'md', x: [
      '**问题：`a[i]` 的范围是 `1 ~ 1e9`，但只有 `1e5` 个数。要用 `a[i]` 当下标开数组（比如树状数组），怎么办？**',
      '',
      '离散化：把所有出现过的值排序去重，用**排名**代替原值。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 三行固定写法
vector<int> v(a, a + n);
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());

// 查排名（1 起）
int id = lower_bound(v.begin(), v.end(), x) - v.begin() + 1;

// 如果要把整个数组替换成排名
for (int i = 0; i < n; i++)
    a[i] = lower_bound(v.begin(), v.end(), a[i]) - v.begin() + 1;` },

    { t: 'note', kind: 'tip', x: [
      '**离散化严格保持大小关系**：原来 `a < b`，离散化后 `id(a) < id(b)`。所以排序、比较、前驱后继这些操作都不受影响。',
      '',
      '**它只改变「具体的值」，不改变「相对顺序」。** 凡是只关心相对大小的算法（树状数组、线段树、二分）都可以离散化后使用。'
    ].join('\n') },

    { t: 'md', x: [
      '## 离散化的典型场景',
      '',
      '1. **树状数组求逆序对**，但 `a[i]` 到 `1e9`',
      '2. **值域线段树**，值域太大',
      '3. **坐标压缩**：矩形覆盖面积、扫描线',
      '4. **状态压缩前的编号**：把字符串映射成 `1..n` 的整数（其实就是离散化）'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 完整示例：离散化后求逆序对
int n;
long long a[100005];              // 原数组，值可能到 1e18

vector<long long> v(a, a + n);
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());

int m = v.size();
long long cnt = 0;
for (int i = n - 1; i >= 0; i--) {
    int id = lower_bound(v.begin(), v.end(), a[i]) - v.begin() + 1;
    cnt += sum(id - 1);           // 树状数组：比它小的个数
    add(id, 1);
}` },

    { t: 'md', x: [
      '## 其他「压缩」手段',
      '',
      '**1. 字符串 → 整数**：给每个不同的字符串分配一个编号，用 `map<string,int>` 或哈希。',
      '',
      '**2. 二维坐标 → 一维**：`(x, y)` 映射成 `x * m + y`（m 是列数）。',
      '',
      '**3. 状态 → 整数**：状压 DP 里用二进制表示集合。',
      '',
      '**4. 前缀和降维**：把「区间」问题转成「两个前缀」的差。',
      '',
      '这些手法的共同点：**把不好处理的东西，映射成好处理的东西。** 这是算法设计里最通用的思维。'
    ].join('\n') },

    { t: 'quiz',
      q: '离散化后，原来的「大小关系」会改变吗？',
      o: [
        '会，都变成 1~n 了',
        '不会，严格保持 `a < b` ⟺ `id(a) < id(b)`',
        '只在数字很大时改变',
        '取决于排序方式'
      ],
      a: 1,
      e: '排序 + 去重 + 用排名代替原值，这是一个**严格单调**的映射。原数组中 `a[i] < a[j]` 当且仅当 `id[i] < id[j]`。所以排序、比较、二分查找、树状数组这些只依赖相对顺序的算法，离散化后完全等价。但如果题目需要**具体数值**（比如求和），就不能只存排名。'
    }
  ]
},

/* ---------------- 第 50 节 ---------------- */
{
  id: 50, s: 7, title: '蓝桥杯题型分析与得分策略', min: 35,
  goals: [
    '知道省赛的题型分布和分值结构',
    '有一套明确的 4 小时时间分配方案',
    '知道哪些分必须拿、哪些可以放弃'
  ],
  body: [
    { t: 'md', x: [
      '这一节不讲算法，讲**怎么拿分**。省一不是「做对所有题」，是「在 4 小时里拿到 60+ 分」。'
    ].join('\n') },

    { t: 'md', x: [
      '## 赛制',
      '',
      '第 17 届起（2022 年后）改为：**2 道填空题 + 6 道编程题，满分 100 分，时长 4 小时**。',
      '',
      '填空题通常每题 5 分（共 10 分），编程题按难度递增分配剩余 90 分。**具体分值以当届通知为准，但结构是稳定的。**',
      '',
      '**关键事实：填空题不要求提交代码，只要提交一个答案。** 意味着你完全可以用 Python、Excel、暴力枚举、打表来解决。'
    ].join('\n') },

    { t: 'note', kind: 'danger', x: [
      '**填空题的 10 分是全场性价比最高的分。** 它不考算法设计，只考「你能不能算出一个数」。',
      '',
      '- 日期题：写个循环遍历每一天',
      '- 数列题：暴力算前 100 项找规律',
      '- 组合计数：Python 的 `itertools` 或 `math.comb` 直接算',
      '- 大数运算：Python 天然支持',
      '',
      '**如果考场环境有 Python，填空题直接用 Python 写。** 没有的话，C++ 暴力也能算绝大多数。'
    ].join('\n') },

    { t: 'md', x: [
      '## 题目难度分布（经验值）',
      '',
      '| 题号 | 类型 | 难度 | 需要的能力 |',
      '| --- | --- | --- | --- |',
      '| 1-2 | 填空 | ★★ | 模拟、枚举、打表 |',
      '| 3 | 编程 | ★★ | 基本语法 + 模拟 |',
      '| 4 | 编程 | ★★☆ | 排序 / 前缀和 / 枚举 |',
      '| 5 | 编程 | ★★★ | 二分 / 贪心 / 简单 DP |',
      '| 6 | 编程 | ★★★☆ | 图论 / DP |',
      '| 7 | 编程 | ★★★★ | 综合（数据结构 + 算法） |',
      '| 8 | 编程 | ★★★★★ | 压轴，多数人做不出 |',
      '',
      '**省一的分数线大约在 60 分左右**（各省略有浮动）。这意味着：**填空 10 分 + 前 4 道编程全部拿满 ≈ 60 分**，第 7、8 题用暴力骗分。'
    ].join('\n') },

    { t: 'md', x: [
      '## 4 小时时间分配（建议）',
      '',
      '| 时段 | 任务 |',
      '| --- | --- |',
      '| 0:00 - 0:20 | **通读全部 8 题**，标出「会做 / 有思路 / 完全不会」，别急着写 |',
      '| 0:20 - 0:50 | 两道填空题，暴力也要算出答案 |',
      '| 0:50 - 1:30 | 第 3、4 题，稳扎稳打 |',
      '| 1:30 - 2:30 | 第 5、6 题，写到能过样例 |',
      '| 2:30 - 3:00 | 回头检查前面 6 题的边界、溢出、数组大小 |',
      '| 3:00 - 3:40 | 第 7 题，能拿多少拿多少；第 8 题写暴力 |',
      '| 3:40 - 4:00 | 最后检查：文件读写、数组越界、输出格式 |',
      '',
      '**最容易犯的错：在第 8 题上耗两小时，结果前 6 题里有 2 题因为数组开小了爆零。**'
    ].join('\n') },

    { t: 'note', kind: 'warn', x: [
      '**「骗分」是合法且必要的技能。** 编程题一般有多个测试点，部分分也是分：',
      '',
      '- 不会正解 → 写暴力，`O(n²)` 甚至 `O(2ⁿ)` 都能拿到小数据的分',
      '- 特判小范围数据，直接 `if (n <= 10) 暴力; else 输出 -1;`',
      '- 只输出一个看起来合理的答案，也可能骗到 1~2 个点',
      '',
      '**但注意：不要为了骗分牺牲前面题的检查时间。** 60 分来自稳健，不来自侥幸。'
    ].join('\n') },

    { t: 'md', x: [
      '## 省一的能力清单',
      '',
      '按重要性排序，这些是「必须会」的：',
      '',
      '1. **C++ 基础语法 + STL**（sort / vector / map / queue / priority_queue）',
      '2. **枚举、模拟、日期题、进制转换**',
      '3. **排序、二分、前缀和 / 差分**',
      '4. **DFS / BFS（含网格）**',
      '5. **基础 DP：线性 DP、01 背包、完全背包、LIS、LCS**',
      '6. **并查集、单调栈 / 队列**',
      '7. **最短路（Dijkstra）、拓扑排序**',
      '8. **质数筛、快速幂、gcd**',
      '',
      '这些是「会了更稳，不会也能拿 60」的：',
      '',
      '- 树状数组、线段树、树形 DP、状压 DP、数位 DP、区间 DP',
      '- Floyd、最小生成树、强连通分量',
      '- 矩阵快速幂、组合数学、Lucas',
      '',
      '**如果你想稳拿省一甚至冲国赛，前 8 条必须形成肌肉记忆，后 3 行按时间补。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 检查清单（交卷前 5 分钟）',
      '',
      '- [ ] 有没有 `freopen` 忘了注释',
      '- [ ] 数组够不够大（无向图边数组 ×2、线段树 ×4、字符串 +1）',
      '- [ ] 该用 `long long` 的地方用了没有',
      '- [ ] 输出格式对不对（换行、空格、保留小数位）',
      '- [ ] 多组数据有没有清空全局数组',
      '- [ ] 有没有死循环（`while(cin>>n)` 忘了结束条件）',
      '- [ ] `%lld` 和 `%d` 有没有搞错',
      '',
      '**这七条能救回至少 10 分。**'
    ].join('\n') },

    { t: 'quiz',
      q: '省赛里对填空题最有效的策略是？',
      o: [
        '写出通用算法并证明正确性',
        '暴力枚举 / 打表 / 用 Python 直接算，只要能得出那个数就行',
        '跳过，先做编程题',
        '用最复杂的算法确保正确'
      ],
      a: 1,
      e: '填空题只提交答案，不提交代码，也不检查你的方法。所以「用一个 `for` 循环遍历所有可能」「用 Python 的 `math.comb` 直接算」「打印前 100 项找规律」都是完全合法的。这是全场性价比最高的 10 分，**绝对不要用算法思维把它复杂化**。'
    }
  ]
},

/* ---------------- 第 51 节 ---------------- */
{
  id: 51, s: 7, title: '考场模板与代码库', min: 45,
  goals: [
    '背下上考场能直接默写的模板集合',
    '知道每个模板的适用条件和坑',
    '考前一周每天默写一遍'
  ],
  body: [
    { t: 'md', x: [
      '这一节是「压缩包」。**考前一周，每天把这些模板各默写一遍，写不出来就回去重看对应章节。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 0. 万能开头'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef pair<int,int> pii;
const int N = 1e5 + 5;
const int INF = 0x3f3f3f3f;
const ll LINF = 0x3f3f3f3f3f3f3f3f;
const int MOD = 1e9 + 7;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}` },

    { t: 'md', x: [
      '## 1. 并查集'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int fa[N];
void init(int n) { for (int i = 1; i <= n; i++) fa[i] = i; }
int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }
bool unite(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return false;
    fa[ra] = rb;
    return true;
}` },

    { t: 'md', x: [
      '## 2. 快速幂 / 组合数'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`ll qpow(ll a, ll b, ll m = MOD) {
    ll r = 1; a %= m;
    while (b) { if (b & 1) r = r * a % m; a = a * a % m; b >>= 1; }
    return r;
}

ll fact[N], invFact[N];
void initCombo(int n) {
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i-1] * i % MOD;
    invFact[n] = qpow(fact[n], MOD - 2);
    for (int i = n; i >= 1; i--) invFact[i-1] = invFact[i] * i % MOD;
}
ll C(int n, int m) {
    if (m < 0 || m > n) return 0;
    return fact[n] * invFact[m] % MOD * invFact[n-m] % MOD;
}` },

    { t: 'md', x: [
      '## 3. 筛法'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`bool comp[N];
void sieve(int n) {
    comp[0] = comp[1] = true;
    for (int i = 2; (ll)i * i <= n; i++)
        if (!comp[i])
            for (int j = i * i; j <= n; j += i) comp[j] = true;
}` },

    { t: 'md', x: [
      '## 4. 树状数组'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`ll bit[N];
void add(int i, ll v) { for (; i <= n; i += i & -i) bit[i] += v; }
ll sum(int i) { ll s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }
ll rangeSum(int l, int r) { return sum(r) - sum(l - 1); }` },

    { t: 'md', x: [
      '## 5. 二分答案'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 求最小值（check 单调：真 → 假）
int lo = 下界, hi = 上界;
while (lo < hi) {
    int mid = lo + (hi - lo) / 2;
    if (check(mid)) hi = mid;
    else            lo = mid + 1;
}
// 答案 lo

// 求最大值（check 单调：假 → 真）
while (lo < hi) {
    int mid = lo + (hi - lo + 1) / 2;
    if (check(mid)) lo = mid;
    else            hi = mid - 1;
}` },

    { t: 'md', x: [
      '## 6. Dijkstra'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`vector<pii> g[N];
ll dist[N];

void dijkstra(int s, int n) {
    memset(dist, 0x3f, sizeof(dist));
    dist[s] = 0;
    priority_queue<pair<ll,int>, vector<pair<ll,int>>, greater<>> pq;
    pq.push({0, s});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : g[u])
            if (dist[v] > d + w) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
    }
}` },

    { t: 'md', x: [
      '## 7. Kruskal'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`struct Edge { int u, v, w; };
Edge e[M];
bool operator<(const Edge& a, const Edge& b) { return a.w < b.w; }

ll kruskal(int n, int m) {
    init(n);
    sort(e, e + m);
    ll total = 0; int picked = 0;
    for (int i = 0; i < m && picked < n - 1; i++) {
        if (unite(e[i].u, e[i].v)) { total += e[i].w; picked++; }
    }
    return picked == n - 1 ? total : -1;
}` },

    { t: 'md', x: [
      '## 8. 网格 BFS'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int dx[4] = {-1, 1, 0, 0}, dy[4] = {0, 0, -1, 1};
int dist[N][N];

int bfs(int sx, int sy, int ex, int ey) {
    memset(dist, -1, sizeof(dist));
    queue<pii> q;
    dist[sx][sy] = 0;
    q.push({sx, sy});

    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        if (x == ex && y == ey) return dist[x][y];
        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
            if (g[nx][ny] == '#' || dist[nx][ny] != -1) continue;
            dist[nx][ny] = dist[x][y] + 1;
            q.push({nx, ny});
        }
    }
    return -1;
}` },

    { t: 'md', x: [
      '## 9. 01 背包 / 完全背包'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`ll dp[W + 1] = {0};

// 01 背包：容量倒序
for (int i = 0; i < n; i++)
    for (int j = W; j >= w[i]; j--)
        dp[j] = max(dp[j], dp[j - w[i]] + v[i]);

// 完全背包：容量正序
for (int i = 0; i < n; i++)
    for (int j = w[i]; j <= W; j++)
        dp[j] = max(dp[j], dp[j - w[i]] + v[i]);` },

    { t: 'md', x: [
      '## 10. LIS'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int lis(vector<int>& a) {
    vector<int> t;
    for (int x : a) {
        auto it = lower_bound(t.begin(), t.end(), x);   // 严格递增
        if (it == t.end()) t.push_back(x);
        else *it = x;
    }
    return t.size();
}` },

    { t: 'md', x: [
      '## 11. 日期工具'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int mdays[13] = {0,31,28,31,30,31,30,31,31,30,31,30,31};
bool isLeap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }
int daysIn(int y, int m) { return (m == 2 && isLeap(y)) ? 29 : mdays[m]; }
void nextDay(int& y, int& m, int& d) {
    if (++d > daysIn(y, m)) { d = 1; if (++m > 12) { m = 1; y++; } }
}` },

    { t: 'md', x: [
      '## 12. 离散化'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`vector<int> v(a, a + n);
sort(v.begin(), v.end());
v.erase(unique(v.begin(), v.end()), v.end());
// id = lower_bound(v.begin(), v.end(), x) - v.begin() + 1;` },

    { t: 'note', kind: 'tip', x: [
      '**默写练习的正确方法：**',
      '',
      '1. 关掉所有参考，白纸上手写',
      '2. 写完对照，标出错的地方',
      '3. 错的模板，第二天再默写一遍',
      '4. 连续三天全对，才算掌握',
      '',
      '**只「看懂」不算掌握。** 考场上你只有 4 小时，且紧张，肌肉记忆是唯一可靠的东西。'
    ].join('\n') },

    { t: 'quiz',
      q: '考场上遇到一道完全没思路的编程题，最合理的做法是？',
      o: [
        '直接跳过，交白卷',
        '写暴力解法或特判小数据，争取部分分，然后去做别的题',
        '花两小时死磕，直到做出来',
        '随便输出一个数'
      ],
      a: 1,
      e: '蓝桥杯编程题按测试点给分，暴力能过小数据点。写一个 `O(2ⁿ)` 的暴力，可能拿到 20~40% 的分数。但**前提是前面的题已经稳了** —— 不要为了这道题牺牲检查时间。**分数是累加的，不是「要么满分要么零分」。**'
    }
  ]
}

]);
