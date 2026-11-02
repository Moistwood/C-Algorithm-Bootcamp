/* ==========================================================
   题库 · 第四批：基础 / 模拟 / 排序二分 补充
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

{
  id: 40, g: 'A 组 · 语法与基础', title: '某月有多少天', diff: 'easy', diffName: '入门',
  tag: '分支 / 闰年', src: '基础练习', ref: 4,
  desc: '给定年份和月份，输出这个月有多少天。',
  input: '一行两个整数 `y m`（`1900 ≤ y ≤ 2100`，`1 ≤ m ≤ 12`）。',
  output: '一行一个整数。',
  samples: [['2020 2\n', '29\n'], ['1900 2\n', '28\n'], ['2021 4\n', '30\n']],
  noteText: '注意 1900 是平年（能被 100 整除但不能被 400 整除），2000 是闰年。',
  hint: '先判断闰年，再对 2 月特判。用数组查表比一堆 `if` 干净。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int mdays[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

int main() {
    int y, m;
    cin >> y >> m;
    bool leap = (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0);
    cout << ((m == 2 && leap) ? 29 : mdays[m]) << '\n';
    return 0;
}`,
  complexity: 'O(1)',
  pitfall: '只判 `y % 4 == 0`，会把 1900 判成闰年。这是最经典的一个错。'
},

{
  id: 41, g: 'A 组 · 语法与基础', title: '打印菱形', diff: 'easy', diffName: '入门',
  tag: '循环 / 图形', src: '基础练习', ref: 4,
  desc: '给定奇数 `n`，打印一个 `n` 行的菱形，由 `*` 组成，中间最宽处有 `n` 个星号。',
  input: '一行一个奇数 `n`（`1 ≤ n ≤ 99`）。',
  output: '`n` 行，每行由若干空格和 `*` 组成。行尾不要输出多余空格。',
  samples: [['5\n', '  *\n ***\n*****\n ***\n  *\n']],
  noteText: '菱形对称，上半部分（含中间）`(n+1)/2` 行。',
  hint: '第 `i` 行（`1` 起）的星号数是 `2i-1`，前面的空格是 `(n - (2i-1)) / 2`。下半部分把 `i` 从 `(n+1)/2 - 1` 递减即可。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    int half = (n + 1) / 2;

    for (int i = 1; i <= half; i++) {
        int stars = 2 * i - 1;
        int spaces = (n - stars) / 2;
        cout << string(spaces, ' ') << string(stars, '*') << '\n';
    }
    for (int i = half - 1; i >= 1; i--) {
        int stars = 2 * i - 1;
        int spaces = (n - stars) / 2;
        cout << string(spaces, ' ') << string(stars, '*') << '\n';
    }
    return 0;
}`,
  complexity: 'O(n²)',
  pitfall: '行尾多输出了空格。多数评测机会忽略行尾空格，但有的不会。用 `string(count, ch)` 构造不会有多余空格。'
},

{
  id: 42, g: 'B 组 · 枚举与模拟', title: '回文质数', diff: 'mid', diffName: '中等',
  tag: '筛法 + 回文', src: 'USACO 1.5', ref: 41,
  desc: '给定区间 `[a, b]`，从小到大输出区间内所有既是**回文数**又是**质数**的数。',
  input: '一行两个整数 `a b`（`5 ≤ a ≤ b ≤ 10^7`）。',
  output: '每行一个数。若没有，输出 `0`。',
  samples: [['5 100\n', '5\n7\n11\n']],
  noteText: '`a ≥ 5` 保证 1 位数不用特判。',
  hint: '筛出 `[1, b]` 的质数表（`b ≤ 1e7`，埃氏筛约 10MB 内存），然后遍历 `a..b` 判断是否回文。\n\n**优化**：偶数位数的回文数一定能被 11 整除（除了 11 本身），所以 8 位以上的偶数位回文可以直接排除 —— 但 `b ≤ 1e7` 时没必要。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const int N = 10000005;
bool comp[N];

bool isPal(int x) {
    int y = x, r = 0;
    while (y) { r = r * 10 + y % 10; y /= 10; }
    return r == x;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int a, b;
    cin >> a >> b;

    comp[0] = comp[1] = true;
    for (long long i = 2; i * i <= b; i++)
        if (!comp[i])
            for (long long j = i * i; j <= b; j += i) comp[j] = true;

    bool any = false;
    for (int i = a; i <= b; i++)
        if (!comp[i] && isPal(i)) { cout << i << '\n'; any = true; }
    if (!any) cout << 0 << '\n';
    return 0;
}`,
  complexity: 'O(b log log b)',
  pitfall: '`comp` 数组开 `1e7` 的 `bool` 是 10MB，安全。但如果开成 `int` 就是 40MB，再加上别的可能爆。**用 `bool` 或 `char`。**'
},

{
  id: 43, g: 'B 组 · 枚举与模拟', title: '这一天是星期几', diff: 'mid', diffName: '中等',
  tag: '日期 / 蔡勒公式', src: '基础综合', ref: 11,
  desc: '给定一个日期，输出它是星期几。用 `0`~`6` 表示周日到周六。',
  input: '一行三个整数 `y m d`（`1900 ≤ y ≤ 2100`）。保证日期合法。',
  output: '一行一个整数（`0` = 周日，`1` = 周一，…，`6` = 周六）。',
  samples: [['2020 1 1\n', '3\n'], ['2024 2 29\n', '4\n'], ['2000 1 1\n', '6\n']],
  noteText: '2020 年 1 月 1 日是星期三。',
  hint: '两种做法：\n1. **累加法**：从 1900-01-01（星期一）开始一天天走到目标日，天数 mod 7。稳妥，不怕记错公式。\n2. **蔡勒公式**：直接算，但要小心月份调整和负数取模。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int mdays[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
bool isLeap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }
int daysIn(int y, int m) { return (m == 2 && isLeap(y)) ? 29 : mdays[m]; }

int main() {
    int ty, tm, td;
    cin >> ty >> tm >> td;

    // 1900-01-01 是星期一（=1）
    long long days = 0;
    int y = 1900, m = 1, d = 1;
    while (!(y == ty && m == tm && d == td)) {
        if (++d > daysIn(y, m)) { d = 1; if (++m > 12) { m = 1; y++; } }
        days++;
    }
    cout << (days + 1) % 7 << '\n';
    return 0;
}`,
  complexity: 'O(天数) ≈ 7e4',
  pitfall: '基准日选错就全错。1900-01-01 是**星期一**（`1`），不是星期日。用累加法时先在纸上验一个已知日期。'
},

{
  id: 44, g: 'B 组 · 枚举与模拟', title: '报数出圈', diff: 'mid', diffName: '中等',
  tag: '队列 / 约瑟夫环', src: '经典模拟', ref: 21,
  desc: '`n` 个人围成一圈，编号 `1` 到 `n`。从 1 号开始报数，报到 `m` 的人出圈，下一个人重新从 1 开始报。\n\n按顺序输出所有出圈人的编号。',
  input: '一行两个整数 `n m`（`1 ≤ n ≤ 1000`，`1 ≤ m ≤ 1000`）。',
  output: '一行 `n` 个整数，用空格分隔。',
  samples: [['5 3\n', '3 1 5 2 4\n'], ['4 2\n', '2 4 3 1\n']],
  noteText: '`m = 1` 时按顺序出圈。',
  hint: '用队列模拟：每次把队首的人移到队尾，重复 `m-1` 次，然后弹出队首（这个人出圈）。这个写法比手写下标清晰得多。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    queue<int> q;
    for (int i = 1; i <= n; i++) q.push(i);

    vector<int> out;
    while (!q.empty()) {
        for (int k = 0; k < m - 1; k++) {
            q.push(q.front());
            q.pop();
        }
        out.push_back(q.front());
        q.pop();
    }

    for (int i = 0; i < (int)out.size(); i++)
        cout << out[i] << (i + 1 == (int)out.size() ? '\n' : ' ');
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '循环写成 `for (k = 0; k < m; k++)` 会多数一个人。因为「报到 m 出圈」等价于「先转 m-1 次，再弹出队首」。'
},

{
  id: 45, g: 'B 组 · 枚举与模拟', title: '矩阵转置', diff: 'easy', diffName: '简单',
  tag: '二维数组', src: '基础练习', ref: 5,
  desc: '给定一个 `n` 行 `m` 列的矩阵，输出它的转置（`m` 行 `n` 列）。',
  input: '第一行两个整数 `n m`（`1 ≤ n, m ≤ 100`）。\n接下来 `n` 行，每行 `m` 个整数。',
  output: '`m` 行，每行 `n` 个整数。',
  samples: [['2 3\n1 2 3\n4 5 6\n', '1 4\n2 5\n3 6\n']],
  noteText: '元素可能为负数。',
  hint: '转置就是 `b[j][i] = a[i][j]`。直接输出 `a[j][i]` 更省空间，但要注意循环顺序是「先列后行」。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int a[105][105];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) cin >> a[i][j];

    for (int j = 0; j < m; j++) {
        for (int i = 0; i < n; i++) cout << a[i][j] << (i + 1 == n ? '\n' : ' ');
    }
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '外层循环写成了 `i`（行），输出就成了原矩阵。转置的输出**外层必须是列**。'
},

{
  id: 46, g: 'C 组 · 排序与二分', title: '第 k 小的数', diff: 'easy', diffName: '简单',
  tag: '排序', src: '基础练习', ref: 13,
  desc: '给定 `n` 个整数和一个整数 `k`，求第 `k` 小的数（重复的数分别计数）。',
  input: '第一行两个整数 `n k`（`1 ≤ k ≤ n ≤ 10^5`）。\n第二行 `n` 个整数（`|a| ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['5 2\n5 1 3 3 2\n', '2\n'], ['3 3\n7 7 7\n', '7\n']],
  noteText: '重复元素各算一个。样例中排序后是 `1 2 3 3 5`，第 2 小是 `2`。',
  hint: '直接 `sort` 后取 `a[k-1]`，`O(n log n)`。\n\n如果要求 `O(n)`，可以用 `nth_element`：`nth_element(a, a+k-1, a+n);` 之后 `a[k-1]` 就是答案。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (auto& x : a) cin >> x;

    nth_element(a.begin(), a.begin() + k - 1, a.end());
    cout << a[k - 1] << '\n';
    return 0;
}`,
  complexity: 'O(n) 平均（nth_element）',
  pitfall: '`nth_element` 只保证第 k 个位置是正确的，**其他位置不保证有序**。要完整排序还是得 `sort`。'
},

{
  id: 47, g: 'C 组 · 排序与二分', title: '二分查找', diff: 'easy', diffName: '简单',
  tag: '二分 / lower_bound', src: '基础练习', ref: 14,
  desc: '给定一个长度为 `n` 的**升序**数组和 `q` 次查询，每次查询一个数 `x`，输出 `x` 第一次出现的下标（`1` 起），不存在输出 `-1`。',
  input: '第一行两个整数 `n q`（`1 ≤ n, q ≤ 10^5`）。\n第二行 `n` 个升序整数。\n接下来 `q` 行，每行一个整数 `x`。',
  output: '`q` 行，每行一个整数。',
  samples: [['5 3\n1 3 3 5 9\n3\n4\n9\n', '2\n-1\n5\n']],
  noteText: '数组可能有重复元素，要输出**第一次**出现的位置。',
  hint: '`lower_bound(a, a+n, x)` 返回第一个 `≥ x` 的位置。再判断 `a[pos] == x` 即可。不要手写二分——手写容易错边界。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> a(n);
    for (auto& x : a) cin >> x;

    while (q--) {
        int x;
        cin >> x;
        int pos = lower_bound(a.begin(), a.end(), x) - a.begin();
        if (pos < n && a[pos] == x) cout << pos + 1 << '\n';
        else cout << -1 << '\n';
    }
    return 0;
}`,
  complexity: 'O((n + q) log n)',
  pitfall: '只写 `lower_bound` 不判断 `a[pos] == x`：`x` 不存在时 `lower_bound` 会返回「第一个比它大的位置」，可能等于 `n`（越界）。'
},

{
  id: 48, g: 'C 组 · 排序与二分', title: '木材加工', diff: 'mid', diffName: '中等',
  tag: '二分答案', src: '洛谷 P2440', ref: 14,
  desc: '有 `n` 根原木，长度分别为 `L[i]`。要把它们切成 `k` 段**长度相同**的小段（可以有剩余），问每段最长能有多长。',
  input: '第一行两个整数 `n k`（`1 ≤ n ≤ 10^5`，`1 ≤ k ≤ 10^8`）。\n第二行 `n` 个整数 `L[i]`（`1 ≤ L[i] ≤ 10^8`）。',
  output: '一行一个整数，表示最大长度。如果连 1 都切不出来，输出 `0`。',
  samples: [['3 7\n10 20 15\n', '5\n'], ['1 3\n2\n', '0\n']],
  noteText: '答案是整数，不需要考虑小数。',
  hint: '「最大值」+ 单调可行性 → 二分答案。`check(len)` = `Σ(L[i] / len) >= k`。\n\n**注意 `Σ(L[i]/len)` 可能很大**，用 `long long` 累加。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n;
long long k;
int L[100005];

bool check(int len) {
    long long cnt = 0;
    for (int i = 0; i < n; i++) cnt += L[i] / len;
    return cnt >= k;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n >> k;
    for (int i = 0; i < n; i++) cin >> L[i];

    int lo = 1, hi = 0;
    for (int i = 0; i < n; i++) hi = max(hi, L[i]);

    int ans = 0;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (check(mid)) { ans = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n log L)',
  pitfall: '`cnt` 用 `int`：`n = 1e5`、`L[i] = 1e8`、`len = 1` 时 `cnt` 达 `1e13`，直接溢出。'
},

{
  id: 49, g: 'C 组 · 排序与二分', title: '包裹快递', diff: 'hard', diffName: '较难',
  tag: '二分答案 / 贪心判定', src: 'LeetCode 1011', ref: 14,
  desc: '有 `n` 个包裹排成一列，第 `i` 个重量为 `w[i]`。船每天最多载重 `C`，**必须按顺序**装运（不能打乱顺序，但一天可以装多个连续的包裹）。\n\n要在 `D` 天内运完，求船的最小载重 `C`。',
  input: '第一行两个整数 `n D`（`1 ≤ n ≤ 10^5`，`1 ≤ D ≤ n`）。\n第二行 `n` 个整数 `w[i]`（`1 ≤ w[i] ≤ 10^8`）。',
  output: '一行一个整数。',
  samples: [['10 5\n1 2 3 4 5 6 7 8 9 10\n', '15\n']],
  noteText: '载重至少是单个最重包裹的重量，否则永远运不走。',
  hint: '二分载重 `C`，范围 `[max(w), sum(w)]`。`check(C)` = 贪心装船，需要的天数是否 `≤ D`。\n\n贪心：能装就装，装不下就开新的一天。这个贪心对「必须按顺序」是正确的。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n, D;
long long w[100005];

bool check(long long cap) {
    int days = 1;
    long long cur = 0;
    for (int i = 0; i < n; i++) {
        if (cur + w[i] > cap) { days++; cur = 0; }
        cur += w[i];
    }
    return days <= D;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n >> D;
    long long lo = 0, hi = 0;
    for (int i = 0; i < n; i++) {
        cin >> w[i];
        lo = max(lo, w[i]);
        hi += w[i];
    }

    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (check(mid)) hi = mid;
        else lo = mid + 1;
    }
    cout << lo << '\n';
    return 0;
}`,
  complexity: 'O(n log Σw)',
  pitfall: '`check` 里 `days` 从 1 开始（至少有第一天），而不是从 0。从 0 开始会让所有答案偏小一天。'
}

]);
