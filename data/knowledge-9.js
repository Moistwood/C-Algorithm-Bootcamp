/* ==========================================================
   阶段六 · 数学与数论（第 41 - 45 节）
   ========================================================== */
var R = String.raw;

window.CHAPTERS = (window.CHAPTERS || []).concat([

/* ---------------- 第 41 节 ---------------- */
{
  id: 41, s: 6, title: '质数与筛法', min: 40,
  goals: [
    '默写埃氏筛和线性筛',
    '会做质因数分解',
    '知道什么时候该预处理、什么时候直接试除'
  ],
  body: [
    { t: 'md', x: [
      '质数相关是蓝桥杯填空题的高频区。**「1 到 1e6 有多少个质数」「第 2020 个质数是几」** 这类题每年都有。'
    ].join('\n') },

    { t: 'md', x: [
      '## 判断单个数是否质数：O(√n)',
      '',
      '只需要试除到 `√n`。因为如果 `n = a × b` 且 `a ≤ b`，那么 `a ≤ √n`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`bool isPrime(long long n) {
    if (n < 2) return false;
    if (n == 2 || n == 3) return true;
    if (n % 2 == 0) return false;
    for (long long i = 3; i * i <= n; i += 2)   // 关键：i * i <= n，不是 i <= n/2
        if (n % i == 0) return false;
    return true;
}` },

    { t: 'note', kind: 'warn', x: [
      '**条件写成 `i * i <= n` 时，`i` 必须用 `long long`。** 如果 `n` 接近 `2e9`，`i` 到 5e4 时 `i*i` 就溢出了 `int`，循环提前结束，把合数判成质数。写 `i <= n / i` 可以避免溢出。'
    ].join('\n') },

    { t: 'md', x: [
      '## 埃氏筛：O(n log log n)',
      '',
      '筛出 `1 ~ n` 的所有质数。思路：从 2 开始，把每个质数的倍数全部标记为合数。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 1000005;
bool isComp[N];             // true 表示合数

void sieve(int n) {
    isComp[0] = isComp[1] = true;
    for (int i = 2; i * i <= n; i++) {
        if (!isComp[i]) {
            for (int j = i * i; j <= n; j += i)   // 从 i*i 开始，前面的已经被更小的质数筛过了
                isComp[j] = true;
        }
    }
}

// 用的时候
if (!isComp[x]) { /* x 是质数 */ }` },

    { t: 'note', kind: 'tip', x: [
      '**`j` 从 `i * i` 开始，不是 `i * 2`。** 因为 `i × 2`、`i × 3`、…、`i × (i-1)` 都已经被更小的质因子筛掉了，从 `i²` 开始才不重复。这个小优化能把常数降一半。',
      '',
      '`i * i <= n` 里的 `i` 用 `int` 时，`i` 最大到 31623，`i*i` 约 1e9，不会溢出（n 最大 1e9 时勉强安全）。但保险起见用 `long long` 或写 `i <= n / i`。'
    ].join('\n') },

    { t: 'md', x: [
      '## 线性筛（欧拉筛）：O(n)',
      '',
      '每个合数只被它的**最小质因子**筛掉一次，所以是严格线性的。n 到 1e8 时比埃氏筛快。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 100000005;
int primes[N], cnt = 0;
bool isComp[N];

void linearSieve(int n) {
    isComp[0] = isComp[1] = true;
    for (int i = 2; i <= n; i++) {
        if (!isComp[i]) primes[cnt++] = i;
        for (int j = 0; j < cnt && i * primes[j] <= n; j++) {
            isComp[i * primes[j]] = true;
            if (i % primes[j] == 0) break;      // 关键：保证每个数只被最小质因子筛一次
        }
    }
}` },

    { t: 'note', kind: 'info', x: [
      '**`if (i % primes[j] == 0) break;` 是线性筛的灵魂。** 它保证 `i * primes[j]` 的最小质因子就是 `primes[j]`。如果不 break，同一个合数会被多个质因子各筛一次，就不是线性了（退化成 `O(n log log n)`，虽然也能过）。',
      '',
      '省赛其实**埃氏筛就够用**。线性筛的价值在于「顺便求每个数的最小质因子」，某些题需要。'
    ].join('\n') },

    { t: 'md', x: [
      '## 质因数分解',
      '',
      '把 n 拆成 `p1^a1 × p2^a2 × ...`。试除到 `√n` 即可，复杂度 `O(√n)`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`map<int,int> factorize(long long n) {
    map<int,int> fac;
    for (long long i = 2; i * i <= n; i++) {
        while (n % i == 0) {
            fac[i]++;
            n /= i;
        }
    }
    if (n > 1) fac[n]++;      // 剩下的大于 1 的因子一定是质数
    return fac;
}

// 例：360 = 2^3 × 3^2 × 5
// 输出：2 3 / 3 2 / 5 1` },

    { t: 'note', kind: 'warn', x: [
      '**循环结束后如果 `n > 1`，说明剩下的 `n` 本身是质数，必须单独计入。** 忘了这一步，`factorize(7)` 会返回空。这是最常漏的一行。'
    ].join('\n') },

    { t: 'md', x: [
      '## 用质因数求约数个数与约数和',
      '',
      '设 `n = p1^a1 × p2^a2 × ... × pk^ak`，则：',
      '',
      '- 约数个数：`(a1+1)(a2+1)...(ak+1)`',
      '- 约数之和：`(1+p1+...+p1^a1) × (1+p2+...+p2^a2) × ...`'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long divisorCount(long long n) {
    long long cnt = 1;
    for (long long i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            int a = 0;
            while (n % i == 0) { n /= i; a++; }
            cnt *= (a + 1);
        }
    }
    if (n > 1) cnt *= 2;
    return cnt;
}

long long divisorSum(long long n) {
    long long sum = 1;
    for (long long i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            long long part = 1, pw = 1;
            while (n % i == 0) { n /= i; pw *= i; part += pw; }
            sum *= part;
        }
    }
    if (n > 1) sum *= (1 + n);
    return sum;
}` },

    { t: 'quiz',
      q: '埃氏筛内层循环从 `i * i` 开始而不是 `i * 2`，原因是？',
      o: [
        '`i * 2` 会越界',
        '`i * 2` 到 `i * (i-1)` 都已经被更小的质因子筛掉了，从 `i²` 开始才不重复',
        '`i * i` 更小，循环更快',
        '没有区别'
      ],
      a: 1,
      e: '任何 `i × k`（`2 ≤ k < i`）都有一个小于 `i` 的质因子 `k` 的质因子，早在处理那个更小的质数时就被标记了。所以从 `i²` 开始标记才不重复劳动。这个优化把内层循环次数减少约一半，是埃氏筛的标准写法。'
    },

    { t: 'quiz',
      q: '质因数分解的循环结束后，为什么还要 `if (n > 1) 记录 n`？',
      o: [
        '防止死循环',
        '剩下的 `n` 如果大于 1，它本身一定是质数，是一个未被记录的质因子',
        '为了让函数有返回值',
        '这是错误写法，应该去掉'
      ],
      a: 1,
      e: '循环只试除到 `√n`。如果 n 有一个大于 `√n` 的质因子，它不可能通过试除被发现（试除到 `√n` 后 `n` 已经变成那个质因子本身）。比如 `12 = 2²×3`，试除 2 后 n=3，循环条件 `3*3 <= 3` 不成立，退出，此时 n=3 > 1，必须记为质因子。漏掉这行，答案会错一半。'
    }
  ]
},

/* ---------------- 第 42 节 ---------------- */
{
  id: 42, s: 6, title: '快速幂与矩阵快速幂', min: 40,
  goals: [
    '默写快速幂',
    '用矩阵快速幂求大下标递推',
    '知道取模时每一步都要取'
  ],
  body: [
    { t: 'md', x: [
      '## 快速幂：O(log b) 算 a^b',
      '',
      '朴素做法乘 b 次，b 到 1e9 就废了。快速幂利用二进制拆分：`a^13 = a^8 × a^4 × a^1`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long qpow(long long a, long long b, long long mod) {
    long long res = 1;
    a %= mod;
    while (b > 0) {
        if (b & 1) res = res * a % mod;    // 这一位是 1，乘进去
        a = a * a % mod;                   // a 自乘，对应下一位
        b >>= 1;
    }
    return res;
}

// 不带取模的版本（b 小、a 小的时候用）
long long power(long long a, int b) {
    long long res = 1;
    while (b) {
        if (b & 1) res *= a;
        a *= a;
        b >>= 1;
    }
    return res;
}` },

    { t: 'note', kind: 'danger', x: [
      '**`res = res * a % mod` 里如果 `res` 和 `a` 都接近 `mod`（约 1e9），乘积约 1e18，刚好在 `long long` 范围内（9.2e18），不会溢出。但如果 `mod` 超过 `3e9`，就要用 `__int128`。**',
      '',
      '```cpp',
      'res = (__int128)res * a % mod;',
      '```',
      '',
      '省赛的 `mod` 一般是 `1e9+7`，用 `long long` 就够。'
    ].join('\n') },

    { t: 'md', x: [
      '## 快速幂求逆元',
      '',
      '当 `mod` 是质数且 `a` 不是 `mod` 的倍数时，`a` 的逆元是 `a^(mod-2) mod mod`（费马小定理）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const long long MOD = 1e9 + 7;
long long inv(long long a) {
    return qpow(a, MOD - 2, MOD);
}
// 用途：把「除以 a」变成「乘以 a 的逆元」，用于组合数取模` },

    { t: 'md', x: [
      '## 矩阵快速幂',
      '',
      '**用途：递推式的下标可以到 1e18 时，用矩阵加速。** 典型是「求第 n 个斐波那契数 mod 1e9+7，n ≤ 1e18」。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`struct Mat {
    long long a[2][2];
    Mat() { memset(a, 0, sizeof(a)); }
};

Mat mul(const Mat& A, const Mat& B) {
    Mat C;
    for (int i = 0; i < 2; i++)
        for (int k = 0; k < 2; k++) {
            if (A.a[i][k] == 0) continue;         // 小优化
            for (int j = 0; j < 2; j++)
                C.a[i][j] = (C.a[i][j] + A.a[i][k] * B.a[k][j]) % MOD;
        }
    return C;
}

Mat mpow(Mat base, long long b) {
    Mat res;
    res.a[0][0] = res.a[1][1] = 1;                // 单位矩阵
    while (b) {
        if (b & 1) res = mul(res, base);
        base = mul(base, base);
        b >>= 1;
    }
    return res;
}

// 求斐波那契第 n 项：f(1)=1, f(2)=1
// [f(n+1)]   [1 1]^n   [f(1)]
// [f(n)  ] = [1 0]   × [f(0)]
long long fib(long long n) {
    if (n <= 1) return n;
    Mat m;
    m.a[0][0] = 1; m.a[0][1] = 1;
    m.a[1][0] = 1; m.a[1][1] = 0;
    Mat r = mpow(m, n);
    return r.a[0][1] % MOD;         // 对应 f(n)
}` },

    { t: 'note', kind: 'tip', x: [
      '**怎么构造矩阵？** 拿递推式 `f(n) = f(n-1) + f(n-2)`：',
      '',
      '1. 状态向量写成 `[f(n), f(n-1)]ᵀ`',
      '2. 问：`[f(n), f(n-1)]` 怎么由 `[f(n-1), f(n-2)]` 得到？',
      '   - `f(n) = 1×f(n-1) + 1×f(n-2)` → 第一行 `[1, 1]`',
      '   - `f(n-1) = 1×f(n-1) + 0×f(n-2)` → 第二行 `[1, 0]`',
      '3. 得到矩阵 `[[1,1],[1,0]]`',
      '',
      '**k 阶递推就用 `k × k` 的矩阵。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 通用 k 阶矩阵快速幂模板
const int K = 3;                 // 阶数
struct Mat { long long a[K][K]; };

Mat mul(Mat A, Mat B) {
    Mat C{};
    for (int i = 0; i < K; i++)
        for (int k = 0; k < K; k++) {
            if (!A.a[i][k]) continue;
            for (int j = 0; j < K; j++)
                C.a[i][j] = (C.a[i][j] + A.a[i][k] * B.a[k][j]) % MOD;
        }
    return C;
}

Mat mpow(Mat base, long long b) {
    Mat res{};
    for (int i = 0; i < K; i++) res.a[i][i] = 1;
    while (b) {
        if (b & 1) res = mul(res, base);
        base = mul(base, base);
        b >>= 1;
    }
    return res;
}` },

    { t: 'md', x: [
      '## 应用场景识别',
      '',
      '看到下面这些，想矩阵快速幂：',
      '',
      '- 递推式 + `n ≤ 1e18`',
      '- 「求第 n 项 mod 1e9+7」',
      '- 路径计数（邻接矩阵的 n 次方，`(A^n)[i][j]` = 从 i 到 j 长度恰好 n 的路径数）',
      '',
      '第三条很巧妙：把邻接矩阵自乘 n 次，就得到「走 n 步的方案数」。这在图论计数题里非常好用。'
    ].join('\n') },

    { t: 'quiz',
      q: '快速幂 `qpow(a, b, mod)` 的时间复杂度是？',
      o: ['O(b)', 'O(log b)', 'O(√b)', 'O(1)'],
      a: 1,
      e: '每次把 `b` 右移一位，所以循环执行 `log₂b` 次。b = 1e18 时只需约 60 次迭代。这就是快速幂能把「不可算」变成「瞬间」的原因。'
    },

    { t: 'quiz',
      q: '求斐波那契第 1e18 项，应该用什么方法？',
      o: [
        '递推 O(n)',
        '矩阵快速幂 O(log n)',
        '记忆化搜索',
        '通项公式（比内公式）直接算'
      ],
      a: 1,
      e: '`O(n)` 递推要 1e18 次运算，宇宙毁灭都算不完。矩阵快速幂把递推变成矩阵乘法，再用快速幂把 n 次乘法压到 `log n` 次，总复杂度 `O(k³ log n)`（k 是矩阵阶数，这里是 2），约 60 次 2×2 矩阵乘法。比内公式含无理数和浮点，精度完全不够。'
    }
  ]
},

/* ---------------- 第 43 节 ---------------- */
{
  id: 43, s: 6, title: 'gcd、lcm 与扩展欧几里得', min: 35,
  goals: [
    '默写 gcd 和 lcm',
    '用 exgcd 解二元一次不定方程',
    '知道 lcm 要先除后乘防溢出'
  ],
  body: [
    { t: 'md', x: [
      '## 最大公约数：辗转相除',
      '',
      '`gcd(a, b) = gcd(b, a mod b)`，一行搞定。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

// C++17 起有标准库函数（在 <numeric> 里，bits/stdc++.h 已包含）
// std::gcd(a, b);
// std::lcm(a, b);

// 最小公倍数：必须先除后乘，防止溢出
long long lcm(long long a, long long b) {
    return a / gcd(a, b) * b;      // 不要写 a * b / gcd(a,b)
}` },

    { t: 'note', kind: 'danger', x: [
      '**`a * b / gcd(a,b)` 会溢出。** `a = b = 1e9` 时 `a * b = 1e18`，`long long` 勉强装得下；但如果 `a, b` 到 `1e18`，直接溢出。必须先除：`a / gcd(a,b) * b`，因为 `gcd` 一定能整除 `a`，除法没有精度损失。'
    ].join('\n') },

    { t: 'md', x: [
      '## 扩展欧几里得：解 ax + by = gcd(a,b)',
      '',
      '`exgcd` 不仅能求 `gcd`，还能同时求出满足 `ax + by = gcd(a,b)` 的一组整数解 `(x, y)`。',
      '',
      '**用途：** 解二元一次不定方程、求模逆元（当模数不是质数时）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long exgcd(long long a, long long b, long long& x, long long& y) {
    if (b == 0) {
        x = 1;
        y = 0;
        return a;
    }
    long long d = exgcd(b, a % b, y, x);
    y -= (a / b) * x;
    return d;
}

// 解 ax + by = c（要求 c 是 gcd(a,b) 的倍数，否则无整数解）
bool solve(long long a, long long b, long long c, long long& x, long long& y) {
    long long g = exgcd(a, b, x, y);
    if (c % g != 0) return false;
    x *= c / g;
    y *= c / g;
    // 通解：x + k*(b/g), y - k*(a/g)
    return true;
}` },

    { t: 'note', kind: 'tip', x: [
      '**`exgcd` 里的 `exgcd(b, a % b, y, x)` 传的是 `y, x`（交换了），然后 `y -= (a/b) * x`。** 这个写法比先递归到临时变量再赋值简洁，但很容易写错。',
      '',
      '记忆方式：`x` 对应 `b` 的系数，`y` 对应 `a` 的系数，递归时角色互换，所以传参交换。'
    ].join('\n') },

    { t: 'md', x: [
      '## 用 exgcd 求模逆元',
      '',
      '求 `a` 在模 `m` 下的逆元，就是解 `a × x ≡ 1 (mod m)`，即 `a × x + m × y = 1`。',
      '',
      '**费马小定理只适用于 m 是质数，exgcd 没有这个限制**（只要 `gcd(a, m) = 1`）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long modInverse(long long a, long long m) {
    long long x, y;
    long long g = exgcd(a, m, x, y);
    if (g != 1) return -1;          // 不互质，无逆元
    return (x % m + m) % m;          // 保证是非负数
}

// 注意 (x % m + m) % m 这个写法：x 可能是负数，
// 直接 % m 得到负数，加 m 再取模才能归一化` },

    { t: 'md', x: [
      '## 其他常用数论结论',
      '',
      '| 结论 | 内容 |',
      '| --- | --- |',
      '| 裴蜀定理 | `ax + by = c` 有整数解 ⟺ `gcd(a,b) \\| c` |',
      '| 费马小定理 | `p` 为质数且 `p ∤ a` 时，`a^(p-1) ≡ 1 (mod p)` |',
      '| 欧拉定理 | `gcd(a,m)=1` 时，`a^φ(m) ≡ 1 (mod m)` |',
      '| 威尔逊定理 | `p` 为质数 ⟺ `(p-1)! ≡ -1 (mod p)` |',
      '| 同余方程 | `ax ≡ b (mod m)` 有解 ⟺ `gcd(a,m) \\| b` |',
      '',
      '省赛里前两条足够，后三条了解即可。'
    ].join('\n') },

    { t: 'quiz',
      q: '`lcm(a, b)` 应该怎么写才不溢出？',
      o: [
        '`return a * b / gcd(a, b);`',
        '`return a / gcd(a, b) * b;`',
        '`return a * b % MOD / gcd(a, b);`',
        '`return (long long)a * b / gcd(a, b);`'
      ],
      a: 1,
      e: '`a * b` 在 a、b 接近 1e9 时就已经是 1e18，接近 `long long` 上限；如果 a、b 到 1e18，直接溢出。先算 `a / gcd(a,b)` 一定是整数（因为 gcd 整除 a），不会丢精度，结果再乘 b 也在 `lcm` 的真实范围内（lcm ≤ a*b/gcd，通常远小于 a*b）。'
    }
  ]
},

/* ---------------- 第 44 节 ---------------- */
{
  id: 44, s: 6, title: '组合数学与逆元', min: 45,
  goals: [
    '用杨辉三角求小范围组合数',
    '用阶乘 + 逆元求大范围组合数 mod 1e9+7',
    '知道什么时候该用哪个'
  ],
  body: [
    { t: 'md', x: [
      '组合数 `C(n, m)` = 从 n 个里选 m 个的方案数。它在竞赛里出现频率极高，求法有三种。'
    ].join('\n') },

    { t: 'md', x: [
      '## 方法一：杨辉三角（n ≤ 2000，可带任意模数）',
      '',
      '`C(n, m) = C(n-1, m-1) + C(n-1, m)`。`O(n²)` 预处理，`O(1)` 查询。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long C[2005][2005];

void initC(int n) {
    for (int i = 0; i <= n; i++) {
        C[i][0] = C[i][i] = 1;
        for (int j = 1; j < i; j++)
            C[i][j] = (C[i-1][j-1] + C[i-1][j]) % MOD;
    }
}` },

    { t: 'note', kind: 'tip', x: [
      '**杨辉三角的优点：不要求模数是质数，也不需要逆元。** 如果题目给的模数是 1000000009 以外的随便一个数，就只能用这个方法（n 小时）。',
      '',
      '**缺点：`O(n²)` 空间和时间。** n = 5000 时就是 `2.5e7` 个 `long long` = 200MB，爆内存了。'
    ].join('\n') },

    { t: 'md', x: [
      '## 方法二：阶乘 + 逆元（n ≤ 1e6，模数必须是质数）',
      '',
      '`C(n, m) = n! / (m! × (n-m)!)`。除法在模意义下要换成乘逆元。',
      '',
      '预处理阶乘和阶乘的逆元，`O(n)` 时间，`O(1)` 查询。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`const int N = 1000005;
const long long MOD = 1e9 + 7;
long long fact[N], invFact[N];

long long qpow(long long a, long long b) {
    long long r = 1; a %= MOD;
    while (b) { if (b & 1) r = r * a % MOD; a = a * a % MOD; b >>= 1; }
    return r;
}

void initCombo(int n) {
    fact[0] = 1;
    for (int i = 1; i <= n; i++) fact[i] = fact[i-1] * i % MOD;

    invFact[n] = qpow(fact[n], MOD - 2);          // 一次求逆
    for (int i = n; i >= 1; i--)
        invFact[i-1] = invFact[i] * i % MOD;      // 递推往回算，省 O(n) 次快速幂
}

long long C(int n, int m) {
    if (m < 0 || m > n) return 0;
    return fact[n] * invFact[m] % MOD * invFact[n-m] % MOD;
}` },

    { t: 'note', kind: 'tip', x: [
      '**`invFact` 的递推是关键优化。** 如果对每个 `i` 都算一次 `qpow(fact[i], MOD-2)`，就是 `O(n log MOD)`，慢很多。利用 `1/i! = 1/(i+1)! × (i+1)`，从后往前一遍就能算完。',
      '',
      '这个技巧必须掌握，是所有「组合数取模」题的标准写法。'
    ].join('\n') },

    { t: 'md', x: [
      '## 方法三：卢卡斯定理（n, m 巨大但模数小）',
      '',
      '当 `n, m` 到 `1e18` 而 `MOD` 只有 `1e5` 左右时，用 Lucas：',
      '',
      '`C(n, m) mod p = C(n mod p, m mod p) × C(n/p, m/p) mod p`'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`long long lucas(long long n, long long m, long long p) {
    if (m == 0) return 1;
    return Csmall(n % p, m % p, p) * lucas(n / p, m / p, p) % p;
}
// Csmall 用 p 以内的阶乘表直接算（p 通常 ≤ 1e5）` },

    { t: 'note', kind: 'warn', x: [
      '**Lucas 要求 `p` 是质数。** 省赛里出现概率低，但国赛会考。知道有这么个东西，遇到 `n = 1e18, p = 1e5` 时能想起来就够。'
    ].join('\n') },

    { t: 'md', x: [
      '## 常用组合恒等式',
      '',
      '这些在推导题里能救命，看到就用：',
      '',
      '- `C(n, m) = C(n, n-m)`',
      '- `C(n, 0) + C(n, 1) + ... + C(n, n) = 2ⁿ`',
      '- `C(n, 0) - C(n, 1) + C(n, 2) - ... = 0`（n ≥ 1）',
      '- `C(n, m) = C(n-1, m-1) + C(n-1, m)`（帕斯卡）',
      '- `m × C(n, m) = n × C(n-1, m-1)`（吸收恒等式）',
      '- `C(n, 0)² + C(n, 1)² + ... + C(n, n)² = C(2n, n)`（范德蒙德）'
    ].join('\n') },

    { t: 'md', x: [
      '## 排列与组合的区别',
      '',
      '**组合不看顺序，排列看顺序。**',
      '',
      '- 从 5 个人里选 3 个组队：`C(5,3) = 10`',
      '- 从 5 个人里选 3 个排队：`A(5,3) = 5×4×3 = 60`',
      '',
      '`A(n, m) = C(n, m) × m!`'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 排列数 A(n, m) = n! / (n-m)!
long long A(int n, int m) {
    long long r = 1;
    for (int i = 0; i < m; i++) r = r * (n - i) % MOD;
    return r;
}

// 或者用阶乘表：fact[n] * invFact[n-m] % MOD` },

    { t: 'quiz',
      q: '计算 `C(n, m) mod 1e9+7`（n ≤ 1e6），标准做法是？',
      o: [
        '直接算 `n! / (m!(n-m)!)` 再取模',
        '预处理阶乘和阶乘逆元，用 `fact[n] * invFact[m] % MOD * invFact[n-m] % MOD`',
        '用杨辉三角',
        '用 `long double` 算'
      ],
      a: 1,
      e: '直接算阶乘再除会溢出（`n!` 天文数字），必须先取模。但取模后除法不成立（没有除法逆运算），所以要乘逆元。标准做法：预处理 `fact[]` 和 `invFact[]`，`O(n)` 时间，`O(1)` 查询。注意 `invFact[n]` 只需一次快速幂，其余递推。'
    },

    { t: 'quiz',
      q: '如果题目给的模数不是质数（比如 1e9+9 是质数，但 1e9+8 不是），还能用阶乘逆元法吗？',
      o: [
        '可以，逆元总是存在',
        '不可以，费马小定理不成立；n 小时应改用杨辉三角递推',
        '可以，改用 exgcd',
        '可以，直接除就行'
      ],
      a: 1,
      e: '阶乘逆元法的正确性依赖费马小定理（`a^(p-2)` 是逆元），这要求 p 是质数。模数非质数时，`m!` 可能和模数不互质，逆元根本不存在。此时如果 n ≤ 2000~5000，改用杨辉三角（只用加法，不需要逆元）；n 大就要用中国剩余定理分解模数，非常麻烦，省赛不会考。'
    }
  ]
},

/* ---------------- 第 45 节 ---------------- */
{
  id: 45, s: 6, title: '常见计数模型与容斥', min: 40,
  goals: [
    '认识错排、卡特兰、斯特林这几类经典数列',
    '会用容斥原理处理「至少 / 至多」',
    '填空题里能靠打表找规律'
  ],
  body: [
    { t: 'md', x: [
      '有一批「计数模型」反复出现在竞赛里。**认识它们，就能把陌生题翻译成已知问题。**'
    ].join('\n') },

    { t: 'table',
      head: ['模型', '数列', '递推 / 公式', '典型问法'],
      rows: [
        ['错排', '0, 1, 2, 9, 44, 265…', '`D[n] = (n-1)(D[n-1]+D[n-2])`', 'n 封信全装错'],
        ['卡特兰数', '1, 1, 2, 5, 14, 42, 132…', '`C(n) = C(2n,n)/(n+1)`', '合法括号、二叉树形态、出栈序列'],
        ['斐波那契', '1, 1, 2, 3, 5, 8…', '`f[n]=f[n-1]+f[n-2]`', '爬楼梯、铺砖'],
        ['第二类斯特林数', '1, 3, 7, 15…（按行）', '`S(n,k)=k·S(n-1,k)+S(n-1,k-1)`', 'n 个球放 k 个相同盒子'],
        ['伯努利 / 欧拉数', '—', '—', '省赛不考']
      ]
    },

    { t: 'md', x: [
      '## 卡特兰数：最高频的一个',
      '',
      'n 对括号的合法组合数、n 个节点的二叉树形态数、n 个元素的出栈序列数 —— 都是卡特兰数。',
      '',
      '**看到「合法」「不能前缀超过」「二叉树形态」「出栈顺序」，先想卡特兰。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 递推式：C(n) = C(n-1) * (4n-2) / (n+1)
// 注意：除法要配合逆元（模数质数时）
long long catalan[100];
catalan[0] = 1;
for (int i = 1; i <= 30; i++)
    catalan[i] = catalan[i-1] * (4 * i - 2) / (i + 1);

// 用组合数：C(2n, n) / (n+1)
// 模意义下：C(2n,n) * inv(n+1) % MOD

// 30 以内的卡特兰数（long long 够）
// C(0..10) = 1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862, 16796` },

    { t: 'note', kind: 'warn', x: [
      '**`catalan[i-1] * (4i-2) / (i+1)` 这种写法只有在「整除一定成立」时才安全。** 对卡特兰数确实成立（递推式的性质），但如果加了模运算，除法就不能这么做，必须换成乘逆元。',
      '',
      '`C(30)` 约 `3.8e15`，`long long` 还能装；`C(36)` 就溢出了。'
    ].join('\n') },

    { t: 'md', x: [
      '## 容斥原理',
      '',
      '求「至少满足一个条件」的并集大小：',
      '',
      '`|A ∪ B ∪ C| = |A| + |B| + |C| - |A∩B| - |A∩C| - |B∩C| + |A∩B∩C|`',
      '',
      '**口诀：奇数个集合的交加，偶数个集合的交减。**'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 例：1~1000 中，能被 2 或 3 或 5 整除的数有多少个？
// |A|=500, |B|=333, |C|=200
// |A∩B|=166, |A∩C|=100, |B∩C|=66
// |A∩B∩C|=33
// 答案 = 500+333+200-166-100-66+33 = 734

// 通用写法：枚举子集，用 __builtin_popcount 判奇偶
long long countUnion(vector<long long>& sets, long long n) {
    int k = sets.size();
    long long res = 0;
    for (int mask = 1; mask < (1 << k); mask++) {
        long long l = 1;
        int bits = 0;
        for (int i = 0; i < k; i++)
            if (mask >> i & 1) { l = lcm(l, sets[i]); bits++; }
        if (bits & 1) res += n / l;
        else          res -= n / l;
    }
    return res;
}` },

    { t: 'md', x: [
      '## 另一种容斥：补集思想',
      '',
      '**「至少一个」不好算时，算「一个都没有」，再用总数减。**',
      '',
      '例：n 个数里选 k 个，要求至少有一个偶数。',
      '',
      '直接算要分情况（1 个偶数、2 个偶数…）。反过来算「全是奇数」：`C(奇数个数, k)`，答案 = `C(n,k) - C(奇数个数, k)`。',
      '',
      '**这是组合计数里最常用的技巧。** 遇到「至少」「存在」先想补集。'
    ].join('\n') },

    { t: 'md', x: [
      '## 打表找规律：填空题的终极武器',
      '',
      '填空题不要求你写出通用算法。**暴力算出前几项 → 观察规律 → 直接算答案。**',
      '',
      '常用手段：',
      '',
      '1. 写个 `for` 循环暴力算前 20 项，打印出来看',
      '2. 扔进 OEIS（如果比赛允许联网？不允许。所以靠记）',
      '3. 试差分数列、比值数列',
      '4. 用 Python 的大整数直接算（如果环境有 Python）',
      '',
      '**蓝桥杯的填空题，很多暴力就能出答案。** 不要一上来就想通用解法。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 打表示例：求「第 2020 个质数」
// 直接筛到 1e5，数一数就行了，不需要什么算法
const int N = 100000;
bool comp[N];
int cnt = 0;
for (int i = 2; i < N; i++) {
    if (!comp[i]) {
        cnt++;
        if (cnt == 2020) { cout << i; break; }
        for (int j = i * i; j < N; j += i) comp[j] = true;
    }
}` },

    { t: 'quiz',
      q: '「n 对括号的合法组合数」是什么数列？',
      o: ['斐波那契数列', '卡特兰数', '错排数', '斯特林数'],
      a: 1,
      e: 'n 对括号的合法组合数是第 n 个卡特兰数：1, 1, 2, 5, 14, 42…（n=0 时是 1，n=1 是 1，n=2 是 2）。同样的数列还对应「n 个节点的不同二叉树形态数」「n 个元素的合法出栈序列数」。公式 `C(2n,n)/(n+1)`。'
    },

    { t: 'quiz',
      q: '求「1~100 中至少能被 2、3、5 中一个整除的数的个数」，用容斥原理，符号应该是？',
      o: [
        '全加',
        '单个加，两两交减，三个交加',
        '单个减，两两交加，三个交减',
        '只算并集，不用容斥'
      ],
      a: 1,
      e: '容斥公式：`|A∪B∪C| = |A|+|B|+|C| - |A∩B|-|A∩C|-|B∩C| + |A∩B∩C|`。规律是**奇数个集合的交取加号，偶数个集合的交取减号**。直观理解：单个集合重复计算了，两两交减回去，但三个交被减多了，再加回来。'
    }
  ]
}

]);
