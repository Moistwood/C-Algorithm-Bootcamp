/* ==========================================================
   题库 · 第七批：DP / 数学 补充
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

{
  id: 71, g: 'H 组 · 动态规划', title: '爬楼梯', diff: 'easy', diffName: '简单',
  tag: '递推', src: '经典 DP 入门', ref: 12,
  desc: '有 `n` 级台阶，每次可以走 1 级或 2 级。求走到第 `n` 级的方案数，答案对 `10^9+7` 取模。',
  input: '一行一个整数 `n`（`1 ≤ n ≤ 10^6`）。',
  output: '一行一个整数。',
  samples: [['3\n', '3\n'], ['1\n', '1\n'], ['10\n', '89\n']],
  noteText: '`n=3` 时有 `1+1+1`、`1+2`、`2+1` 三种。',
  hint: '`f[i] = f[i-1] + f[i-2]`，边界 `f[0]=1, f[1]=1`。\n\n**`f[0]` 必须是 1**，否则 `f[2]` 会算成 1（正确是 2）。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1e9 + 7;

int main() {
    int n;
    cin >> n;

    long long a = 1, b = 1, c = 1;   // f[0], f[1]
    for (int i = 2; i <= n; i++) {
        c = (a + b) % MOD;
        a = b;
        b = c;
    }
    cout << b << '\n';
    return 0;
}`,
  complexity: 'O(n)，O(1) 空间',
  pitfall: '`f[0]` 写成 0：`f[2] = f[1] + f[0] = 1 + 0 = 1`，但正确答案是 2（`1+1` 和 `2`）。'
},

{
  id: 72, g: 'H 组 · 动态规划', title: '编辑距离', diff: 'hard', diffName: '较难',
  tag: '二维 DP', src: '经典 DP', ref: 35,
  desc: '给定两个字符串 `A` 和 `B`，每次可以**插入**、**删除**或**替换**一个字符。求把 `A` 变成 `B` 的最少操作次数。',
  input: '两行，分别为 `A` 和 `B`，长度均不超过 `1000`，只含小写字母。',
  output: '一行一个整数。',
  samples: [['horse\nros\n', '3\n'], ['intention\nexecution\n', '5\n']],
  noteText: '`horse → ros`：替换 h→r、删除 r、删除 e，共 3 步。',
  hint: '`f[i][j]` = `A` 前 `i` 个变成 `B` 前 `j` 个的最少操作数。\n\n边界：`f[i][0] = i`（全删），`f[0][j] = j`（全插）。\n转移：字符相同则 `f[i-1][j-1]`；否则 `min(删, 插, 换) + 1`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int f[1005][1005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string A, B;
    cin >> A >> B;
    int n = A.size(), m = B.size();

    for (int i = 0; i <= n; i++) f[i][0] = i;
    for (int j = 0; j <= m; j++) f[0][j] = j;

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (A[i-1] == B[j-1]) f[i][j] = f[i-1][j-1];
            else f[i][j] = min({f[i-1][j] + 1,      // 删 A[i]
                                f[i][j-1] + 1,      // 插 B[j]
                                f[i-1][j-1] + 1});  // 替换
        }

    cout << f[n][m] << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '边界初始化漏掉 `f[0][j] = j`：空串变成长度为 `j` 的串需要插入 `j` 次，漏了会得到偏小的答案。'
},

{
  id: 73, g: 'H 组 · 动态规划', title: '多重背包', diff: 'hard', diffName: '较难',
  tag: '背包 / 二进制拆分', src: '经典背包', ref: 36,
  desc: '有 `n` 种物品，第 `i` 种重量 `w[i]`、价值 `v[i]`、数量 `c[i]`。背包容量 `W`，求最大总价值。',
  input: '第一行两个整数 `n W`（`1 ≤ n ≤ 100`，`1 ≤ W ≤ 10^5`）。\n接下来 `n` 行，每行三个整数 `w[i] v[i] c[i]`（`1 ≤ w[i] ≤ W`，`0 ≤ v[i] ≤ 10^9`，`1 ≤ c[i] ≤ 100`）。',
  output: '一行一个整数。',
  samples: [['2 10\n3 4 3\n2 3 5\n', '15\n'], ['1 5\n6 100 10\n', '0\n']],
  noteText: '样例 1：取 5 个第二种物品，重量 `2×5=10`、价值 `3×5=15`。这是最优解。',
  hint: '把每种物品的 `c[i]` 个拆成 `1, 2, 4, 8, …` 这些「组」，每组当作一个 01 背包物品。这样 `c[i]` 个物品只用 `log c` 个替身表示。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, W;
    cin >> n >> W;

    vector<long long> dp(W + 1, 0);

    for (int i = 0; i < n; i++) {
        int w, c;
        long long v;
        cin >> w >> v >> c;

        // 二进制拆分
        int k = 1;
        while (c > 0) {
            int take = min(k, c);
            long long tw = 1LL * w * take;
            long long tv = v * take;
            for (int j = W; j >= tw; j--)
                dp[j] = max(dp[j], dp[j - tw] + tv);
            c -= take;
            k <<= 1;
        }
    }

    cout << dp[W] << '\n';
    return 0;
}`,
  complexity: 'O(W log c · n)',
  pitfall: '拆分的顺序：先 `take = min(k, c)`，再 `c -= take`，最后 `k <<= 1`。顺序错会导致最后一块数量不对。'
},

{
  id: 74, g: 'H 组 · 动态规划', title: '分组背包', diff: 'hard', diffName: '较难',
  tag: '背包 / 分组', src: '经典背包', ref: 36,
  desc: '有 `n` 组物品，每组有若干件。背包容量 `W`，**每组最多选一件**，求最大总价值。',
  input: '第一行两个整数 `n W`（`1 ≤ n ≤ 100`，`1 ≤ W ≤ 1000`）。\n接下来 `n` 组：每组第一行一个整数 `k`（`1 ≤ k ≤ 100`），接下来 `k` 行每行两个整数 `w v`。',
  output: '一行一个整数。',
  samples: [['2 10\n2\n5 8\n4 5\n2\n6 12\n3 4\n', '17\n'], ['1 10\n1\n11 100\n', '0\n']],
  noteText: '样例最优：第 1 组选 `(4,5)`、第 2 组选 `(6,12)`，总重 10、总价值 17。',
  hint: '三层循环，顺序是：**组 → 容量（倒序）→ 组内物品**。\n\n容量循环必须在中间的 `组内物品` 外层，否则会变成「一组可以选多个」。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, W;
    cin >> n >> W;

    vector<long long> dp(W + 1, 0);

    for (int g = 0; g < n; g++) {
        int k;
        cin >> k;
        vector<pair<int,long long>> items(k);
        for (auto& it : items) cin >> it.first >> it.second;

        for (int j = W; j >= 0; j--) {           // 容量倒序
            for (auto& it : items) {             // 组内物品
                if (j >= it.first)
                    dp[j] = max(dp[j], dp[j - it.first] + it.second);
            }
        }
    }

    cout << dp[W] << '\n';
    return 0;
}`,
  complexity: 'O(W · Σk)',
  pitfall: '循环顺序写成「组 → 物品 → 容量」，就变成每组可选多个，答案偏大。'
},

{
  id: 75, g: 'H 组 · 动态规划', title: '没有上司的舞会', diff: 'hard', diffName: '较难',
  tag: '树形 DP', src: '经典树形 DP', ref: 38,
  desc: '`n` 个人组成一棵上下级关系树，每个人有一个快乐值 `h[i]`。\n\n如果一个人参加了舞会，他的**直接下属**就不能参加。求最大总快乐值。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数 `h[i]`（`0 ≤ h[i] ≤ 10^4`）。\n接下来 `n-1` 行，每行两个整数 `u v`，表示 `v` 是 `u` 的直接上司。',
  output: '一行一个整数。',
  samples: [['3\n1 2 3\n1 2\n2 3\n','4\n'], ['1\n5\n','5\n']],
  noteText: '样例：3 个人，1 的上司是 2，2 的上司是 3。快乐值 `h1=1, h2=2, h3=3`。\n\n选 `{1, 3}`（1 和 3 不相邻）→ `1+3=4`；选 `{2}` → 2。最优 4。',
  hint: '`f[u][0]` = u 不去时子树最大快乐值，`f[u][1]` = u 去时。\n\n`f[u][1] = h[u] + Σ f[v][0]`（儿子不能去）\n`f[u][0] = Σ max(f[v][0], f[v][1])`',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n;
long long h[100005];
vector<int> g[100005];
bool hasParent[100005];
long long f[100005][2];

void dfs(int u) {
    f[u][1] = h[u];
    f[u][0] = 0;
    for (int v : g[u]) {
        dfs(v);
        f[u][0] += max(f[v][0], f[v][1]);
        f[u][1] += f[v][0];
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n;
    for (int i = 1; i <= n; i++) cin >> h[i];
    for (int i = 1; i < n; i++) {
        int u, v;
        cin >> u >> v;
        g[v].push_back(u);          // v 是 u 的上司，边是 v -> u
        hasParent[u] = true;
    }

    int root = 1;
    for (int i = 1; i <= n; i++) if (!hasParent[i]) { root = i; break; }

    dfs(root);
    cout << max(f[root][0], f[root][1]) << '\n';
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '边方向搞反：题目「`v` 是 `u` 的上司」，所以树边是 `v → u`。写成 `g[u].push_back(v)` 会从 root 往下走反。'
},

{
  id: 76, g: 'H 组 · 动态规划', title: '打家劫舍', diff: 'mid', diffName: '中等',
  tag: '线性 DP', src: 'LeetCode 198', ref: 35,
  desc: '一条街上有一排房子，第 `i` 间有 `a[i]` 元现金。不能偷相邻的两间，求最多能偷多少钱。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个非负整数（`0 ≤ a[i] ≤ 10^4`）。',
  output: '一行一个整数。',
  samples: [['4\n1 2 3 1\n', '4\n'], ['5\n2 7 9 3 1\n', '12\n']],
  noteText: '样例 1：偷第 1 间和第 3 间，`1+3=4`。',
  hint: '`f[i]` = 考虑前 `i` 间房能偷到的最大值，`f[i] = max(f[i-1], f[i-2] + a[i])`。\n\n**`f[i]` 表示「前 i 间」，不是「第 i 间必偷」**，这样转移更简单。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];

    long long prev2 = 0, prev1 = 0, cur = 0;
    for (int i = 1; i <= n; i++) {
        cur = max(prev1, prev2 + a[i]);
        prev2 = prev1;
        prev1 = cur;
    }

    cout << prev1 << '\n';
    return 0;
}`,
  complexity: 'O(n)，O(1) 空间',
  pitfall: '把状态定义成「第 i 间必偷」，转移就变成 `max(f[i-2], f[i-3]) + a[i]`，容易漏边界。用「前 i 间」的定义最省事。'
},

{
  id: 77, g: 'I 组 · 数学', title: '最大公约数与最小公倍数', diff: 'easy', diffName: '简单',
  tag: 'gcd / lcm', src: '基础数论', ref: 43,
  desc: '给定两个正整数 `a` 和 `b`，输出它们的最大公约数和最小公倍数。',
  input: '一行两个整数 `a b`（`1 ≤ a, b ≤ 10^9`）。',
  output: '一行两个整数，用空格分隔。',
  samples: [['12 18\n', '6 36\n'], ['7 5\n', '1 35\n']],
  noteText: '`lcm` 最大可到 `1e18`，用 `long long`。',
  hint: '`gcd` 用辗转相除。`lcm(a,b) = a / gcd(a,b) * b` —— **必须先除后乘**，否则 `a*b` 溢出。',
  code: R`#include <bits/stdc++.h>
using namespace std;

long long gcd_(long long a, long long b) {
    return b == 0 ? a : gcd_(b, a % b);
}

int main() {
    long long a, b;
    cin >> a >> b;
    long long g = gcd_(a, b);
    cout << g << ' ' << a / g * b << '\n';
    return 0;
}`,
  complexity: 'O(log min(a,b))',
  pitfall: '写成 `a * b / g`：`1e9 × 1e9 = 1e18` 勉强装得下，但再大一点就溢出。先除后乘永远安全。'
},

{
  id: 78, g: 'I 组 · 数学', title: '约数个数', diff: 'mid', diffName: '中等',
  tag: '质因数分解', src: '基础数论', ref: 41,
  desc: '给定 `n`，输出它有多少个正约数。',
  input: '一行一个整数 `n`（`1 ≤ n ≤ 10^12`）。',
  output: '一行一个整数。',
  samples: [['12\n', '6\n'], ['1000000000000\n', '169\n']],
  noteText: '`12` 的约数是 `1,2,3,4,6,12`，共 6 个。',
  hint: '质因数分解成 `p1^a1 × p2^a2 × …`，约数个数 `= (a1+1)(a2+1)…`。\n\n试除到 `√n`（`1e12` 时只需到 `1e6`），最后如果剩 `n > 1`，它本身是一个质因子，乘 2。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin >> n;

    long long cnt = 1;
    for (long long i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            int a = 0;
            while (n % i == 0) { n /= i; a++; }
            cnt *= (a + 1);
        }
    }
    if (n > 1) cnt *= 2;     // 剩下的大于 1 的因子是质数，指数为 1

    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O(√n) = O(1e6)',
  pitfall: '漏掉 `if (n > 1) cnt *= 2`：`n = 7` 时循环一次都不执行，输出 1（错误），正确答案是 2。'
},

{
  id: 79, g: 'I 组 · 数学', title: '错排问题', diff: 'mid', diffName: '中等',
  tag: '递推 / 组合', src: '经典计数', ref: 45,
  desc: '`n` 封信装进 `n` 个信封，每个信封恰好一封。求**所有信都装错**的方案数，答案对 `10^9+7` 取模。',
  input: '一行一个整数 `n`（`1 ≤ n ≤ 10^6`）。',
  output: '一行一个整数。',
  samples: [['1\n', '0\n'], ['3\n', '2\n'], ['4\n', '9\n']],
  noteText: '`n=3` 时两种错排是 `(2,3,1)` 和 `(3,1,2)`。',
  hint: '`D[1]=0, D[2]=1, D[n] = (n-1)(D[n-1] + D[n-2])`。\n\n推导：第 1 封信放进第 `k` 个信封（`n-1` 种选法）。若第 `k` 封正好放进第 1 个，剩下 `n-2` 封错排；否则等价于 `n-1` 封错排。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1e9 + 7;
long long D[1000005];

int main() {
    int n;
    cin >> n;

    D[1] = 0;
    if (n >= 2) D[2] = 1;
    for (int i = 3; i <= n; i++)
        D[i] = (i - 1) % MOD * ((D[i-1] + D[i-2]) % MOD) % MOD;

    cout << D[n] % MOD << '\n';
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '`(i-1) * (D[i-1] + D[i-2])` 直接乘：`D` 已经是模过的值，但 `i` 到 `1e6` 时乘积仍可能到 `1e15`，`long long` 能装；不过要先取模再乘，否则连续累乘会溢出。'
},

{
  id: 80, g: 'I 组 · 数学', title: '括号序列计数', diff: 'hard', diffName: '较难',
  tag: '卡特兰数 / 组合', src: '经典计数', ref: 45,
  desc: '求 `n` 对括号能组成多少种**合法**的括号序列，答案对 `10^9+7` 取模。',
  input: '一行一个整数 `n`（`0 ≤ n ≤ 10^6`）。',
  output: '一行一个整数。',
  samples: [['3\n', '5\n'], ['4\n', '14\n']],
  noteText: '`n=3` 的 5 种：`((()))`、`(()())`、`(())()`、`()(())`、`()()()`。这是第 n 个卡特兰数。',
  hint: '卡特兰数 `Cat(n) = C(2n,n) / (n+1)`。\n\n模意义下除法变乘逆元：`Cat(n) = fact[2n] * invFact[n] % MOD * invFact[n] % MOD * inv(n+1) % MOD`。\n\n预处理到 `2n` 的阶乘和逆阶乘。',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef long long ll;
const ll MOD = 1e9 + 7;
const int MAXN = 2000005;
ll fact[MAXN], invFact[MAXN];

ll qpow(ll a, ll b) {
    ll r = 1; a %= MOD;
    while (b) { if (b & 1) r = r * a % MOD; a = a * a % MOD; b >>= 1; }
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    if (n == 0) { cout << 1 << '\n'; return 0; }

    int N = 2 * n;
    fact[0] = 1;
    for (int i = 1; i <= N; i++) fact[i] = fact[i-1] * i % MOD;
    invFact[N] = qpow(fact[N], MOD - 2);
    for (int i = N; i >= 1; i--) invFact[i-1] = invFact[i] * i % MOD;

    ll cat = fact[N] * invFact[n] % MOD * invFact[n] % MOD;
    cat = cat * qpow(n + 1, MOD - 2) % MOD;

    cout << cat << '\n';
    return 0;
}`,
  complexity: 'O(n + log MOD)',
  pitfall: '`MAXN` 要开到 `2n+5`。`n = 1e6` 时 `2n = 2e6`，数组开成 `1e6` 会越界。'
}

]);
