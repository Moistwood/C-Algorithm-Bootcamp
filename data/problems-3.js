/* ==========================================================
   题库 · 第三批：动态规划 / 数学 / 综合
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

/* ---------- H 组：动态规划 ---------- */
{
  id: 28, g: 'H 组 · 动态规划', title: '数字三角形', diff: 'easy', diffName: '简单',
  tag: '线性 DP / 倒推', src: 'IOI 1994 / 蓝桥杯常考', ref: 35,
  desc: '给定一个 `n` 行的数字三角形，从顶部出发，每次只能走向左下或右下，一直走到底部。\n\n求路径上所有数字之和的最大值。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 1000`）。\n接下来 `n` 行，第 `i` 行有 `i` 个整数（`|a| ≤ 1000`）。',
  output: '一行一个整数。',
  samples: [['5\n7\n3 8\n8 1 0\n2 7 4 4\n4 5 2 6 5\n', '30\n']],
  noteText: '全部为负数时答案可能是负数，注意初始化。',
  hint: '**倒着推**。`f[i][j]` = 从 `(i,j)` 走到底部的最大和。这样每个格子都有两个来源，不用特判左右边界。\n\n`f[i][j] = a[i][j] + max(f[i+1][j], f[i+1][j+1])`',
  code: R`#include <bits/stdc++.h>
using namespace std;

int a[1005][1005];
long long f[1005][1005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= i; j++) cin >> a[i][j];

    for (int j = 1; j <= n; j++) f[n][j] = a[n][j];       // 边界

    for (int i = n - 1; i >= 1; i--)
        for (int j = 1; j <= i; j++)
            f[i][j] = a[i][j] + max(f[i+1][j], f[i+1][j+1]);

    cout << f[1][1] << '\n';
    return 0;
}`,
  complexity: 'O(n²)',
  pitfall: '正着推（`f[i][j]` = 从顶部走到 `(i,j)` 的最大和）需要特判 `j == 1` 和 `j == i` 的边界，容易写错。**倒推更简单。**'
},

{
  id: 29, g: 'H 组 · 动态规划', title: '01 背包', diff: 'mid', diffName: '中等',
  tag: '背包 DP', src: '经典背包', ref: 36,
  desc: '有 `n` 件物品和一个容量为 `W` 的背包。第 `i` 件物品的重量是 `w[i]`，价值是 `v[i]`。\n\n每件物品**最多选一次**，求背包能装下的最大总价值。',
  input: '第一行两个整数 `n, W`（`1 ≤ n ≤ 1000`，`1 ≤ W ≤ 10^5`）。\n接下来 `n` 行，每行两个整数 `w[i], v[i]`（`1 ≤ w[i] ≤ W`，`0 ≤ v[i] ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['3 5\n2 3\n3 4\n4 5\n', '7\n']],
  noteText: '答案可能超过 `int`（`1000 × 1e9 = 1e12`）。',
  hint: '`dp[j]` = 容量为 `j` 时的最大价值。**容量必须倒序**，否则同一件物品会被重复选。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, W;
    cin >> n >> W;

    vector<long long> dp(W + 1, 0);

    for (int i = 0; i < n; i++) {
        int w; long long v;
        cin >> w >> v;
        for (int j = W; j >= w; j--)
            dp[j] = max(dp[j], dp[j - w] + v);
    }

    cout << dp[W] << '\n';
    return 0;
}`,
  complexity: 'O(nW)',
  pitfall: '容量写成正序就变成完全背包了（每件物品可以无限取），答案会偏大。'
},

{
  id: 30, g: 'H 组 · 动态规划', title: '完全背包', diff: 'mid', diffName: '中等',
  tag: '背包 DP', src: '经典背包', ref: 36,
  desc: '有 `n` 种物品和一个容量为 `W` 的背包。第 `i` 种物品的重量是 `w[i]`，价值是 `v[i]`。\n\n每种物品**可以取任意多次**，求最大总价值。',
  input: '第一行两个整数 `n, W`（`1 ≤ n ≤ 1000`，`1 ≤ W ≤ 10^5`）。\n接下来 `n` 行，每行两个整数 `w[i], v[i]`。',
  output: '一行一个整数。',
  samples: [['2 5\n2 3\n3 4\n', '7\n']],
  noteText: '样例：取 2 个第一种物品，重 4、价值 6；或取 1 个第一种 + 1 个第二种，重 5、价值 7。最优是 7。',
  hint: '和 01 背包唯一区别：**容量正序**。正序让 `dp[j-w]` 已经包含了「再放一个第 i 种物品」的可能性，正好实现无限取。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, W;
    cin >> n >> W;

    vector<long long> dp(W + 1, 0);

    for (int i = 0; i < n; i++) {
        int w; long long v;
        cin >> w >> v;
        for (int j = w; j <= W; j++)          // 正序！
            dp[j] = max(dp[j], dp[j - w] + v);
    }

    cout << dp[W] << '\n';
    return 0;
}`,
  complexity: 'O(nW)',
  pitfall: '忘记改成正序，写成了 01 背包，答案会偏小。'
},

{
  id: 31, g: 'H 组 · 动态规划', title: '最长上升子序列', diff: 'hard', diffName: '较难',
  tag: 'LIS / 二分', src: '经典 DP', ref: 35,
  desc: '给定长度为 `n` 的序列，求最长**严格递增**子序列的长度（子序列不要求连续）。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数 `a[i]`（`|a[i]| ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['8\n10 9 2 5 3 7 101 18\n', '4\n'], ['5\n1 1 1 1 1\n', '1\n']],
  noteText: '严格递增：`1 1 1` 的 LIS 是 1，不是 3。',
  hint: '`O(n²)` 版本会超时（`1e10`）。用 `O(n log n)`：维护 `tails` 数组，`tails[k]` = 长度为 `k+1` 的上升子序列的最小结尾值。\n\n**严格递增用 `lower_bound`**，非降序用 `upper_bound`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    vector<int> tails;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }

    cout << tails.size() << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '把 `lower_bound` 写成 `upper_bound`：对 `1 1 1` 会得到 3（当成非降序），而答案应该是 1。'
},

{
  id: 32, g: 'H 组 · 动态规划', title: '最长公共子序列', diff: 'mid', diffName: '中等',
  tag: 'LCS', src: '经典 DP', ref: 35,
  desc: '给定两个字符串 `A` 和 `B`，求它们的最长公共子序列的长度（不要求连续）。',
  input: '两行，分别为字符串 `A` 和 `B`，长度均不超过 `1000`，只含小写字母。',
  output: '一行一个整数。',
  samples: [['abcde\nace\n', '3\n'], ['abc\ndef\n', '0\n']],
  noteText: '子序列不要求连续。`abcde` 和 `ace` 的 LCS 是 `ace`。',
  hint: '`f[i][j]` = `A` 前 `i` 个字符与 `B` 前 `j` 个字符的 LCS 长度。\n\n`A[i-1] == B[j-1]` 时 `f[i][j] = f[i-1][j-1] + 1`，否则取两者较大的。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int f[1005][1005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string A, B;
    cin >> A >> B;
    int n = A.size(), m = B.size();

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (A[i-1] == B[j-1]) f[i][j] = f[i-1][j-1] + 1;
            else f[i][j] = max(f[i-1][j], f[i][j-1]);
        }

    cout << f[n][m] << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '把「子序列」看成「子串」（要求连续），转移就错了。子串的转移是 `else f[i][j] = 0`，答案取所有 `f` 的最大值。'
},

{
  id: 33, g: 'H 组 · 动态规划', title: '石子合并', diff: 'hard', diffName: '较难',
  tag: '区间 DP', src: '经典区间 DP', ref: 37,
  desc: '有 `n` 堆石子排成一排，第 `i` 堆有 `a[i]` 个。每次只能合并**相邻**的两堆，消耗的体力等于两堆石子数之和。\n\n把所有石子合并成一堆，求最小总消耗。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 300`）。\n第二行 `n` 个整数 `a[i]`（`1 ≤ a[i] ≤ 1000`）。',
  output: '一行一个整数。',
  samples: [['4\n1 3 5 2\n', '22\n']],
  noteText: '线性排列，不是环形。',
  hint: '`f[l][r]` = 把区间 `[l,r]` 合并成一堆的最小消耗。\n\n`f[l][r] = min(f[l][k] + f[k+1][r]) + sum(l,r)`，枚举分割点 `k`。\n\n**按区间长度从小到大遍历。**',
  code: R`#include <bits/stdc++.h>
using namespace std;

int a[305];
long long s[305];           // 前缀和
long long f[305][305];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    for (int i = 1; i <= n; i++) { cin >> a[i]; s[i] = s[i-1] + a[i]; }

    for (int len = 2; len <= n; len++) {
        for (int l = 1; l + len - 1 <= n; l++) {
            int r = l + len - 1;
            f[l][r] = LLONG_MAX;
            for (int k = l; k < r; k++)
                f[l][r] = min(f[l][r], f[l][k] + f[k+1][r]);
            f[l][r] += s[r] - s[l-1];
        }
    }

    cout << f[1][n] << '\n';
    return 0;
}`,
  complexity: 'O(n³)',
  pitfall: '`f` 数组是全局的，默认全 0，`f[i][i] = 0` 天然成立，不用显式初始化。但**如果多组数据**，就必须 `memset(f, 0, sizeof(f))`。'
},

/* ---------- I 组：数学 ---------- */
{
  id: 34, g: 'I 组 · 数学', title: '质数个数', diff: 'mid', diffName: '中等',
  tag: '筛法', src: '基础数论', ref: 41,
  desc: '给定 `n`，求 `1` 到 `n` 之间（含 `n`）有多少个质数。',
  input: '一行一个整数 `n`（`1 ≤ n ≤ 10^7`）。',
  output: '一行一个整数。',
  samples: [['10\n', '4\n'], ['1\n', '0\n']],
  noteText: '`n = 1e7` 时埃氏筛约 0.05 秒，直接试除每个数会超时。',
  hint: '埃氏筛：`O(n log log n)`。用 `bool` 数组标记合数，`bool` 占 1 字节，`1e7` 个就是 10MB，安全。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const int N = 10000005;
bool comp[N];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    comp[0] = comp[1] = true;
    for (long long i = 2; i * i <= n; i++)
        if (!comp[i])
            for (long long j = i * i; j <= n; j += i) comp[j] = true;

    int cnt = 0;
    for (int i = 2; i <= n; i++) if (!comp[i]) cnt++;
    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O(n log log n)',
  pitfall: '`i * i` 用 `int` 溢出：`i` 到 31623 时 `i*i` 接近 `1e9` 还行，但如果 `n` 到 `1e9` 就必须用 `long long`。`j` 用 `long long` 更保险。'
},

{
  id: 35, g: 'I 组 · 数学', title: '快速幂', diff: 'easy', diffName: '简单',
  tag: '快速幂', src: '基础数论', ref: 42,
  desc: '给定 `a, b, p`，求 `a^b mod p`。',
  input: '一行三个整数 `a, b, p`（`1 ≤ a, b ≤ 10^9`，`1 ≤ p ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['2 10 1000\n', '24\n'], ['3 0 7\n', '1\n']],
  noteText: '`b` 可以到 `1e9`，朴素乘法要 `1e9` 次，超时。',
  hint: '快速幂：`O(log b)`。每次看 `b` 的最低位，是 1 就乘进结果；`a` 自乘；`b` 右移。',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef long long ll;

ll qpow(ll a, ll b, ll mod) {
    ll res = 1 % mod;
    a %= mod;
    while (b > 0) {
        if (b & 1) res = res * a % mod;
        a = a * a % mod;
        b >>= 1;
    }
    return res;
}

int main() {
    ll a, b, p;
    cin >> a >> b >> p;
    cout << qpow(a, b, p) << '\n';
    return 0;
}`,
  complexity: 'O(log b)',
  pitfall: '`res` 初始化为 `1 % mod`，不能只写 `1`。当 `mod = 1` 时，答案应该是 0，写 `1` 会输出 1。'
},

{
  id: 36, g: 'I 组 · 数学', title: '组合数取模', diff: 'hard', diffName: '较难',
  tag: '组合数学 / 逆元', src: '经典组合', ref: 44,
  desc: '给定 `n, m`，求 `C(n, m) mod (10^9 + 7)`。',
  input: '一行两个整数 `n, m`（`0 ≤ m ≤ n ≤ 10^6`）。',
  output: '一行一个整数。',
  samples: [['5 2\n', '10\n'], ['10 0\n', '1\n']],
  noteText: '`n = 1e6` 时不能开 `1000 × 1000` 的杨辉三角（那是 `O(n²)`）。',
  hint: '预处理阶乘 `fact[]` 和阶乘逆元 `invFact[]`。\n\n`invFact[n] = qpow(fact[n], MOD-2)`，然后从后往前递推 `invFact[i-1] = invFact[i] * i`。\n\n`C(n,m) = fact[n] * invFact[m] % MOD * invFact[n-m] % MOD`',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const int N = 1000005;
const ll MOD = 1e9 + 7;
ll fact[N], invFact[N];

ll qpow(ll a, ll b) {
    ll r = 1; a %= MOD;
    while (b) { if (b & 1) r = r * a % MOD; a = a * a % MOD; b >>= 1; }
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i-1] * i % MOD;

    invFact[n] = qpow(fact[n], MOD - 2);
    for (int i = n; i >= 1; i--) invFact[i-1] = invFact[i] * i % MOD;

    cout << fact[n] * invFact[m] % MOD * invFact[n-m] % MOD << '\n';
    return 0;
}`,
  complexity: 'O(n + log MOD)',
  pitfall: '对每个 `i` 单独调用 `qpow` 求逆元是 `O(n log MOD)`，慢十倍。用递推 `invFact[i-1] = invFact[i] * i` 才是 `O(n)`。'
},

/* ---------- J 组：综合 ---------- */
{
  id: 37, g: 'J 组 · 综合', title: '带障碍的路径计数', diff: 'mid', diffName: '中等',
  tag: '网格 DP / 计数', src: '经典 DP', ref: 35,
  desc: '给定一个 `n × m` 的网格，从左上角 `(1,1)` 走到右下角 `(n,m)`，每次只能**向右或向下**走一格。\n\n网格中有些格子是障碍，不能经过。求不同的路径条数，答案对 `10^9+7` 取模。',
  input: '第一行两个整数 `n, m`（`1 ≤ n, m ≤ 1000`）。\n接下来 `n` 行，每行一个长度为 `m` 的字符串，`.` 表示空地，`#` 表示障碍。',
  output: '一行一个整数。',
  samples: [['3 3\n...\n.#.\n...\n', '2\n'], ['2 2\n..\n..\n', '2\n']],
  noteText: '起点或终点是障碍时答案为 0。',
  hint: '`f[i][j]` = 从 `(1,1)` 走到 `(i,j)` 的路径数。\n\n`f[i][j] = (f[i-1][j] + f[i][j-1]) % MOD`，如果 `(i,j)` 是障碍则 `f[i][j] = 0`。\n\n边界 `f[1][1] = 1`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const int N = 1005;
const long long MOD = 1e9 + 7;
long long f[N][N];
char g[N][N];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 1; i <= n; i++) {
        string s;
        cin >> s;
        for (int j = 1; j <= m; j++) g[i][j] = s[j-1];
    }

    f[1][1] = (g[1][1] == '.') ? 1 : 0;

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (i == 1 && j == 1) continue;
            if (g[i][j] == '#') { f[i][j] = 0; continue; }
            f[i][j] = (f[i-1][j] + f[i][j-1]) % MOD;
        }

    cout << f[n][m] << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '障碍格子的 `f` 必须置 0 且不能从它转移，否则会把路径「穿过」障碍，答案偏大。'
},

{
  id: 38, g: 'J 组 · 综合', title: '树的直径', diff: 'hard', diffName: '较难',
  tag: '树形 DP / 两次 BFS', src: '经典树论', ref: 38,
  desc: '给定一棵 `n` 个节点的树（边权为 1），求树上最远两个点之间的距离。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n接下来 `n-1` 行，每行两个整数 `u, v`，表示一条边。',
  output: '一行一个整数。',
  samples: [['4\n1 2\n2 3\n3 4\n', '3\n'], ['1\n', '0\n']],
  noteText: '`n = 1` 时直径为 0。',
  hint: '两次 BFS：从任意点（比如 1）出发找到最远点 `A`，再从 `A` 出发找到最远点 `B`，`dist[B]` 就是直径。\n\n也可以用树形 DP：对每个点求「最长的两条向下路径之和」，取全局最大。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const int N = 100005;
vector<int> g[N];
int dist[N];

int bfs(int start) {
    memset(dist, -1, sizeof(dist));
    queue<int> q;
    dist[start] = 0;
    q.push(start);

    int far = start;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        if (dist[u] > dist[far]) far = u;
        for (int v : g[u])
            if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
    return far;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    for (int i = 1; i < n; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        g[v].push_back(u);
    }

    int A = bfs(1);
    int B = bfs(A);
    cout << dist[B] << '\n';
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '`bfs` 里 `memset(dist, -1, ...)` 每次都要清，否则第二次 BFS 会用上一轮的距离。'
},

{
  id: 39, g: 'J 组 · 综合', title: '数字 1 的个数', diff: 'hard', diffName: '较难',
  tag: '数位统计', src: '蓝桥杯经典', ref: 40,
  desc: '给定 `n`，统计从 `1` 到 `n` 的所有整数中，数字 `1` 一共出现了多少次。\n\n例如 `n = 13` 时，`1, 10, 11, 12, 13` 中 `1` 分别出现：1（数字 1）、1（数字 10）、2（数字 11）、1（数字 12）、1（数字 13），共 6 次。',
  input: '一行一个整数 `n`（`1 ≤ n ≤ 10^18`）。',
  output: '一行一个整数。',
  samples: [['13\n', '6\n'], ['1\n', '1\n']],
  noteText: '`n` 可以到 `10^18`，不能暴力枚举。答案可能达到 `1.9 × 10^18` 左右，用 `long long`。',
  hint: '按位统计。对每一位（个位、十位、百位…），分别计算「这一位上 1 出现的次数」。\n\n设当前位权为 `i`，`high = n / (i*10)`，`cur = (n/i) % 10`，`low = n % i`：\n- `cur == 0`：`high * i`\n- `cur == 1`：`high * i + low + 1`\n- `cur > 1`：`(high + 1) * i`',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef long long ll;

ll countOne(ll n) {
    ll cnt = 0;
    for (ll i = 1; i <= n; i *= 10) {
        ll high = n / (i * 10);
        ll cur  = (n / i) % 10;
        ll low  = n % i;

        if (cur == 0)      cnt += high * i;
        else if (cur == 1) cnt += high * i + low + 1;
        else               cnt += (high + 1) * i;

        if (i > n / 10) break;      // 防止 i *= 10 溢出
    }
    return cnt;
}

int main() {
    ll n;
    cin >> n;
    cout << countOne(n) << '\n';
    return 0;
}`,
  complexity: 'O(log n)',
  pitfall: '`for (ll i = 1; i <= n; i *= 10)` 在 `n` 接近 `1e18` 时，`i` 会溢出成负数，变成死循环。必须加上 `if (i > n / 10) break;` 提前退出。'
}

]);
