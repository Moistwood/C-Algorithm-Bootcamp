/* ==========================================================
   题库 · 第一批：基础 / 模拟 / 排序二分 / 前缀和
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

/* ---------- A 组：语法与基础 ---------- */
{
  id: 1, g: 'A 组 · 语法与基础', title: 'A + B 问题', diff: 'easy', diffName: '入门',
  tag: '输入输出', src: '经典入门题', ref: 1,
  desc: '输入两个整数 a 和 b，输出它们的和。\n\n这是所有 OJ 的第一题。**不要觉得它没有意义** —— 它考察的是你能不能正确读入、正确输出、正确提交。很多人在第一题上就踩了「多组数据」「输出多余空格」的坑。',
  input: '一行两个整数 `a` 和 `b`。',
  output: '一行一个整数，表示 `a + b`。',
  samples: [['1 2\n', '3\n'], ['-1000000000 1000000000\n', '0\n']],
  noteText: '`-10^9 ≤ a, b ≤ 10^9`。注意 `a + b` 可能达到 `2 × 10^9`，**超过了 `int` 的上限 2147483647**。',
  hint: '直接用 `long long`，别用 `int`。这一题的真正考点是「看到 1e9 就该想到溢出」。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b;
    cin >> a >> b;
    cout << a + b << '\n';
    return 0;
}`,
  complexity: 'O(1)',
  pitfall: '用 `int` 存 `a + b`：`1e9 + 1e9 = 2e9`，超过 `int` 上限，得到负数。这是省赛第一题就会埋的坑。'
},

{
  id: 2, g: 'A 组 · 语法与基础', title: '温度转换', diff: 'easy', diffName: '入门',
  tag: '浮点输出', src: '基础练习', ref: 2,
  desc: '给定华氏温度 `F`，按公式 `C = 5 × (F − 32) / 9` 计算摄氏温度，输出保留两位小数。',
  input: '一行一个实数 `F`（`-1000 ≤ F ≤ 1000`）。',
  output: '一行一个实数 `C`，保留两位小数。',
  samples: [['32\n', '0.00\n'], ['212\n', '100.00\n']],
  noteText: '`F` 是浮点数，直接用 `double` 读入。',
  hint: '注意 `5 / 9` 在整数运算里是 `0`。要么写 `5.0 / 9`，要么把 `F - 32` 的结果保持为 `double`（这样整个表达式就是浮点运算）。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    double f;
    cin >> f;
    double c = 5.0 * (f - 32) / 9;
    cout << fixed << setprecision(2) << c << '\n';
    return 0;
}`,
  complexity: 'O(1)',
  pitfall: '写 `5 / 9 * (f - 32)` 会因为 `5/9 = 0` 而输出 `0.00`。**除法一定要让至少一个操作数是浮点数。**'
},

{
  id: 3, g: 'A 组 · 语法与基础', title: '数字反转与回文判定', diff: 'easy', diffName: '入门',
  tag: '循环 / 取位', src: '基础练习', ref: 4,
  desc: '给定一个非负整数 `n`，输出它反转后的数（**去掉前导零**），并判断 `n` 是否为回文数。\n\n如果是回文数，第二行输出 `YES`，否则输出 `NO`。',
  input: '一行一个整数 `n`（`0 ≤ n ≤ 10^18`）。',
  output: '第一行：反转后的数。\n第二行：`YES` 或 `NO`。',
  samples: [['1230\n', '321\nNO\n'], ['12321\n', '12321\nYES\n']],
  noteText: '`n` 最大到 `10^18`，用 `long long`。',
  hint: '两种做法：一是用 `while` 循环反复取末位（`n % 10`）拼出新数；二是把 `n` 转成字符串再 `reverse`。第二种更短，但要处理前导零。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;

    // 反转
    string t = s;
    reverse(t.begin(), t.end());

    // 去掉前导零（但至少保留一位）
    size_t p = t.find_first_not_of('0');
    cout << (p == string::npos ? "0" : t.substr(p)) << '\n';

    // 回文判定
    cout << (s == t ? "YES" : "NO") << '\n';
    return 0;
}`,
  complexity: 'O(位数)',
  pitfall: '回文判定要比较**原串和反转串**，不能比较「去掉前导零后的反转串」。比如 `1230` 反转是 `0321`，去零后是 `321`，和 `1230` 不相等 → `NO`，这个例子恰好对。但 `1000` 反转 `0001`，去零后 `1`，和 `1000` 不等 → `NO`，也对。所以这里两种写法都行，但**用原串比较更直观不易错**。'
},

/* ---------- B 组：枚举与模拟 ---------- */
{
  id: 4, g: 'B 组 · 枚举与模拟', title: '日期差', diff: 'easy', diffName: '简单',
  tag: '日期模拟', src: '蓝桥杯常考', ref: 11,
  desc: '给定两个日期（年 月 日），求它们之间相差多少天（取绝对值）。',
  input: '一行六个整数：`y1 m1 d1 y2 m2 d2`。\n保证日期合法，`1900 ≤ y ≤ 2100`。',
  output: '一行一个整数，表示相差天数。',
  samples: [['2020 1 1 2020 1 2\n', '1\n'], ['2019 12 31 2020 1 1\n', '1\n']],
  noteText: '日期合法，不需要判非法输入。两个日期可能相同，此时输出 `0`。',
  hint: '**不要算公式**，直接从一个日期一天天走到另一个日期，边走边计数。范围只有 200 年，最多 73000 天，几毫秒就跑完。这是最不容易出错的做法。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int mdays[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

bool isLeap(int y) {
    return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
}
int daysIn(int y, int m) {
    return (m == 2 && isLeap(y)) ? 29 : mdays[m];
}
void nextDay(int& y, int& m, int& d) {
    if (++d > daysIn(y, m)) { d = 1; if (++m > 12) { m = 1; y++; } }
}
// 把日期转成"从 1900-01-01 起的第几天"
long long toNum(int y, int m, int d) {
    long long cnt = 0;
    int cy = 1900, cm = 1, cd = 1;
    while (!(cy == y && cm == m && cd == d)) {
        nextDay(cy, cm, cd);
        cnt++;
    }
    return cnt;
}

int main() {
    int y1, m1, d1, y2, m2, d2;
    cin >> y1 >> m1 >> d1 >> y2 >> m2 >> d2;
    cout << llabs(toNum(y1, m1, d1) - toNum(y2, m2, d2)) << '\n';
    return 0;
}`,
  complexity: 'O(天数) ≈ 7e4',
  pitfall: '闰年判断漏掉 `|| y % 400 == 0`，2000 年会被当成平年，2 月少一天。这是日期题最常见的一分丢失点。'
},

{
  id: 5, g: 'B 组 · 枚举与模拟', title: '回文日期', diff: 'mid', diffName: '中等',
  tag: '日期 / 枚举', src: '蓝桥杯 2020 省赛改编', ref: 11,
  desc: '所谓回文日期，是指把日期写成 `YYYYMMDD` 的 8 位数字后，正着读和反着读完全一样。\n\n例如 `2020 年 2 月 2 日` 写成 `20200202`，是回文日期。\n\n给定一个日期，求它**之后**（不含当天）的下一个回文日期。',
  input: '一行一个 8 位整数 `N`，表示 `YYYYMMDD`。保证 `N` 是合法日期，`10000101 ≤ N ≤ 99991231`。',
  output: '一行一个 8 位整数，表示下一个回文日期。',
  samples: [['20200202\n', '20211202\n'], ['20211202\n', '20300302\n']],
  noteText: '只需要找下一个，不需要枚举所有。',
  hint: '思路一：从当前日期一天天往后走，每次判断是否为回文（最坏走几百天，很快）。\n\n思路二（更快）：直接枚举年份，由年份构造出唯一的回文日期（年份的倒序就是月日），再判断这个月日是否合法、是否大于当前日期。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int mdays[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
bool isLeap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }
int daysIn(int y, int m) { return (m == 2 && isLeap(y)) ? 29 : mdays[m]; }

int main() {
    int n;
    cin >> n;

    int y = n / 10000, m = n / 100 % 100, d = n % 100;

    // 一天天往后走，最多约 400 天必能找到
    while (true) {
        if (++d > daysIn(y, m)) { d = 1; if (++m > 12) { m = 1; y++; } }

        int t[8] = {y/1000, y/100%10, y/10%10, y%10, m/10, m%10, d/10, d%10};
        bool ok = true;
        for (int i = 0; i < 4; i++)
            if (t[i] != t[7-i]) { ok = false; break; }

        if (ok) {
            printf("%04d%02d%02d\n", y, m, d);
            return 0;
        }
    }
}`,
  complexity: 'O(天数)',
  pitfall: '`printf("%04d%02d%02d")` 的补零格式不能省。用 `cout` 直接输出三个数会得到 `2021122` 这种 7 位结果。'
},

{
  id: 6, g: 'B 组 · 枚举与模拟', title: '螺旋矩阵', diff: 'mid', diffName: '中等',
  tag: '模拟 / 方向数组', src: '常见面试题', ref: 11,
  desc: '给定正整数 `n`，生成一个 `n × n` 的矩阵，从左上角开始按顺时针螺旋顺序填入 `1` 到 `n²`。',
  input: '一行一个整数 `n`（`1 ≤ n ≤ 100`）。',
  output: '`n` 行，每行 `n` 个整数，用空格分隔。',
  samples: [['3\n', '1 2 3\n8 9 4\n7 6 5\n']],
  noteText: '`n ≤ 100`，矩阵最多 `10^4` 个格子。',
  hint: '方向数组 `{0,1} {1,0} {0,-1} {-1,0}` 表示右、下、左、上。每走一步就检查「下一个位置是否越界或已填过」，是就转向。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int a[105][105];

int main() {
    int n;
    cin >> n;

    int dx[4] = {0, 1, 0, -1};
    int dy[4] = {1, 0, -1, 0};
    int x = 0, y = 0, d = 0;

    for (int v = 1; v <= n * n; v++) {
        a[x][y] = v;
        int nx = x + dx[d], ny = y + dy[d];
        if (nx < 0 || nx >= n || ny < 0 || ny >= n || a[nx][ny] != 0) {
            d = (d + 1) % 4;
            nx = x + dx[d];
            ny = y + dy[d];
        }
        x = nx; y = ny;
    }

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) cout << a[i][j] << ' ';
        cout << '\n';
    }
    return 0;
}`,
  complexity: 'O(n²)',
  pitfall: '转向后没有重新计算 `nx, ny`，直接用旧值继续走，会导致原地打转。转向后必须重新算。'
},

{
  id: 7, g: 'B 组 · 枚举与模拟', title: '任意进制转换', diff: 'mid', diffName: '中等',
  tag: '进制 / 字符串', src: '基础综合', ref: 11,
  desc: '给定一个十进制整数 `n` 和一个进制 `base`，输出 `n` 在 `base` 进制下的表示。\n\n`base` 在 `2` 到 `16` 之间，大于 9 的数字用大写字母 `A`~`F` 表示。',
  input: '一行两个整数 `n` 和 `base`（`0 ≤ n ≤ 10^18`，`2 ≤ base ≤ 16`）。',
  output: '一行一个字符串。',
  samples: [['255 16\n', 'FF\n'], ['10 2\n', '1010\n'], ['0 7\n', '0\n']],
  noteText: '`n = 0` 时需要特判输出 `0`。',
  hint: '「除基取余，倒序拼接」。注意 `n = 0` 时循环一次都不执行，要单独处理。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    int base;
    cin >> n >> base;

    if (n == 0) { cout << 0 << '\n'; return 0; }

    string s;
    while (n > 0) {
        int r = n % base;
        s += (r < 10) ? char('0' + r) : char('A' + r - 10);
        n /= base;
    }
    reverse(s.begin(), s.end());
    cout << s << '\n';
    return 0;
}`,
  complexity: 'O(log_base n)',
  pitfall: '忘记处理 `n = 0`，会输出空行。'
},

/* ---------- C 组：排序与二分 ---------- */
{
  id: 8, g: 'C 组 · 排序与二分', title: '成绩排序', diff: 'easy', diffName: '简单',
  tag: '结构体 / 多关键字排序', src: '基础综合', ref: 13,
  desc: '有 `n` 个学生，每人有姓名、语文、数学、英语三科成绩。\n\n按以下规则排序后输出：\n1. 总分高的在前\n2. 总分相同时，姓名字典序小的在前\n3. 姓名也相同时，按输入顺序（保证姓名唯一，所以不会出现）',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 1000`）。\n接下来 `n` 行，每行一个字符串和三个整数：`name chinese math english`。\n姓名只含小写字母，长度不超过 20；成绩在 `0` 到 `100` 之间。',
  output: '`n` 行，每行 `name total`，其中 `total` 是三科总分。',
  samples: [['3\nalice 90 80 70\nbob 100 90 80\ncarol 90 80 70\n', 'bob 270\nalice 240\ncarol 240\n']],
  noteText: '姓名唯一，不需要考虑完全相同时的稳定性。',
  hint: '用结构体存数据，写一个 `cmp` 函数。注意 `cmp` 必须满足严格弱序（只用 `<` 和 `>`）。',
  code: R`#include <bits/stdc++.h>
using namespace std;

struct Stu {
    string name;
    int total;
};

bool cmp(const Stu& a, const Stu& b) {
    if (a.total != b.total) return a.total > b.total;   // 总分降序
    return a.name < b.name;                             // 姓名升序
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<Stu> v(n);
    for (int i = 0; i < n; i++) {
        string nm; int a, b, c;
        cin >> nm >> a >> b >> c;
        v[i] = {nm, a + b + c};
    }

    sort(v.begin(), v.end(), cmp);

    for (auto& s : v) cout << s.name << ' ' << s.total << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '写成 `if (a.total >= b.total) return true;` 会违反严格弱序，`sort` 可能崩溃。**比较函数里只能用严格不等号。**'
},

{
  id: 9, g: 'C 组 · 排序与二分', title: '切绳子', diff: 'mid', diffName: '中等',
  tag: '二分答案 / 浮点', src: '经典二分', ref: 14,
  desc: '有 `n` 根绳子，长度分别为 `L[i]`。现在需要从这些绳子里剪出 `k` 根**长度相同**的绳子（可以有余料），问每根最长能有多长。\n\n结果保留两位小数，**向下取整**到两位。',
  input: '第一行两个整数 `n` 和 `k`（`1 ≤ n ≤ 10^4`，`1 ≤ k ≤ 10^4`）。\n第二行 `n` 个实数 `L[i]`（`0 < L[i] ≤ 10^5`）。',
  output: '一行一个实数，保留两位小数。',
  samples: [['4 11\n8.02 7.43 4.57 5.39\n', '2.00\n'], ['1 3\n1.00\n', '0.33\n']],
  noteText: '如果一根都剪不出来，输出 `0.00`。',
  hint: '「最大值」+ 可行性单调 → 二分答案。`check(len)` = 所有绳子能剪出的段数之和是否 ≥ k。\n\n**注意最后输出要用 `floor(lo * 100) / 100`**，不能用 `printf("%.2f")`，因为四舍五入会给出剪不出来的答案。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n, k;
double L[10005];

bool check(double len) {
    long long cnt = 0;
    for (int i = 0; i < n; i++) cnt += (long long)(L[i] / len);
    return cnt >= k;
}

int main() {
    cin >> n >> k;
    for (int i = 0; i < n; i++) cin >> L[i];

    double lo = 0, hi = 1e5;
    for (int it = 0; it < 100; it++) {
        double mid = (lo + hi) / 2;
        if (check(mid)) lo = mid;
        else hi = mid;
    }

    printf("%.2f\n", floor(lo * 100) / 100);
    return 0;
}`,
  complexity: 'O(n × 迭代次数) = O(100n)',
  pitfall: '用 `printf("%.2f", lo)` 会四舍五入。比如真实最大长度是 2.006，`%.2f` 输出 2.01，但 2.01 剪不出来。必须 `floor`。'
},

{
  id: 10, g: 'C 组 · 排序与二分', title: '跳石头', diff: 'hard', diffName: '较难',
  tag: '二分答案 / 贪心判定', src: 'NOIP 2015 提高组', ref: 14,
  desc: '有一条长 `L` 的河，河中有 `n` 块石头，第 `i` 块石头到起点的距离是 `D[i]`。终点在 `L` 处。\n\n现在最多可以移走 `m` 块石头，问**最短跳跃距离的最大值**是多少。',
  input: '第一行三个整数 `L, n, m`（`1 ≤ L ≤ 10^9`，`0 ≤ n ≤ 5×10^4`，`0 ≤ m ≤ n`）。\n第二行 `n` 个整数 `D[i]`，严格递增，`0 < D[i] < L`。',
  output: '一行一个整数。',
  samples: [['25 5 2\n2 11 14 17 21\n', '4\n']],
  noteText: '起点位置是 0，终点位置是 L，它们不能被移走。',
  hint: '「最小值最大」→ 二分答案。`check(d)` 表示「在保证任意两块保留的石头间距 ≥ d 的前提下，最少要移走几块石头」，如果 ≤ m 就可行。\n\n判定用贪心：从左往右扫，如果当前石头和上一块保留石头的距离 < d，就移走它；否则保留。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int L, n, m;
int pos[50005];       // pos[1..n] 石头，pos[n+1] = L 终点

bool check(int d) {
    int removed = 0, last = 0;
    for (int i = 1; i <= n + 1; i++) {
        if (pos[i] - last < d) removed++;
        else last = pos[i];
    }
    return removed <= m;
}

int main() {
    cin >> L >> n >> m;
    for (int i = 1; i <= n; i++) cin >> pos[i];
    pos[n + 1] = L;

    int lo = 1, hi = L;
    while (lo < hi) {
        int mid = lo + (hi - lo + 1) / 2;
        if (check(mid)) lo = mid;
        else hi = mid - 1;
    }
    cout << lo << '\n';
    return 0;
}`,
  complexity: 'O(n log L)',
  pitfall: '二分求最大值时 `mid` 要写 `lo + (hi - lo + 1) / 2`（向上取整），否则区间剩两个元素时会死循环。'
},

{
  id: 11, g: 'C 组 · 排序与二分', title: '逆序对', diff: 'hard', diffName: '较难',
  tag: '归并排序 / 分治', src: '经典问题', ref: 13,
  desc: '给定一个长度为 `n` 的整数序列，求其中逆序对的数量。\n\n逆序对：满足 `i < j` 且 `a[i] > a[j]` 的下标对 `(i, j)`。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数 `a[i]`（`|a[i]| ≤ 10^9`）。',
  output: '一行一个整数，表示逆序对数量。',
  samples: [['5\n3 1 2 5 4\n', '3\n']],
  noteText: '答案可能超过 `int` 范围（`n = 1e5` 时最多约 `5×10^9`），必须用 `long long`。',
  hint: '在归并排序的合并过程中统计：当右半边的 `a[j]` 被取出时，左半边从 `i` 到 `mid` 的所有元素都大于 `a[j]`，贡献 `mid - i + 1` 个逆序对。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n;
long long a[100005], tmp[100005];
long long ans = 0;

void mergeSort(int l, int r) {
    if (l >= r) return;
    int mid = (l + r) >> 1;
    mergeSort(l, mid);
    mergeSort(mid + 1, r);

    int i = l, j = mid + 1, k = l;
    while (i <= mid && j <= r) {
        if (a[i] <= a[j]) {
            tmp[k++] = a[i++];
        } else {
            tmp[k++] = a[j++];
            ans += mid - i + 1;
        }
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= r)   tmp[k++] = a[j++];
    for (int t = l; t <= r; t++) a[t] = tmp[t];
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin >> n;
    for (int i = 0; i < n; i++) cin >> a[i];
    mergeSort(0, n - 1);
    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '`ans` 用 `int` 会溢出。`n = 1e5` 时逆序对最多 `n(n-1)/2 ≈ 5×10^9`，远超 `int` 上限。'
},

/* ---------- D 组：前缀和与差分 ---------- */
{
  id: 12, g: 'D 组 · 前缀和与差分', title: '区间和查询', diff: 'easy', diffName: '简单',
  tag: '前缀和', src: '基础练习', ref: 15,
  desc: '给定长度为 `n` 的数组和 `q` 次询问，每次询问区间 `[l, r]` 的元素和。',
  input: '第一行两个整数 `n, q`（`1 ≤ n, q ≤ 10^5`）。\n第二行 `n` 个整数 `a[i]`（`|a[i]| ≤ 10^9`）。\n接下来 `q` 行，每行两个整数 `l, r`（`1 ≤ l ≤ r ≤ n`）。',
  output: '`q` 行，每行一个整数。',
  samples: [['5 3\n1 2 3 4 5\n1 3\n2 4\n1 5\n', '6\n9\n15\n']],
  noteText: '朴素做法 `O(nq)` 会超时（`10^10` 次运算）。必须用前缀和。',
  hint: '预处理 `s[i] = s[i-1] + a[i]`，查询 `O(1)`：`s[r] - s[l-1]`。`s` 要用 `long long`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;

    vector<long long> s(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        long long x;
        cin >> x;
        s[i] = s[i - 1] + x;
    }

    while (q--) {
        int l, r;
        cin >> l >> r;
        cout << s[r] - s[l - 1] << '\n';
    }
    return 0;
}`,
  complexity: 'O(n + q)',
  pitfall: '`s` 用 `int`：`1e5` 个 `1e9` 相加是 `1e14`，直接溢出。'
},

{
  id: 13, g: 'D 组 · 前缀和与差分', title: '最大子矩阵和', diff: 'hard', diffName: '较难',
  tag: '二维前缀和 / Kadane', src: '经典问题', ref: 15,
  desc: '给定一个 `n × m` 的整数矩阵，求它的非空子矩阵的最大元素和。',
  input: '第一行两个整数 `n, m`（`1 ≤ n, m ≤ 200`）。\n接下来 `n` 行，每行 `m` 个整数 `a[i][j]`（`|a[i][j]| ≤ 1000`）。',
  output: '一行一个整数，表示最大子矩阵和。',
  samples: [['3 3\n1 -2 3\n-4 5 -6\n7 -8 9\n', '9\n']],
  noteText: '子矩阵必须非空。',
  hint: '枚举上下边界 `i, j`，把 `[i, j]` 行压成一个一维数组（每列求和），然后对这个数组求最大子段和（Kadane）。\n\n总复杂度 `O(n²m)`，`200³ = 8×10^6`，能过。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<long long>> a(n + 1, vector<long long>(m + 1));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) cin >> a[i][j];

    long long ans = LLONG_MIN;

    for (int top = 1; top <= n; top++) {
        vector<long long> col(m + 1, 0);
        for (int bottom = top; bottom <= n; bottom++) {
            for (int k = 1; k <= m; k++) col[k] += a[bottom][k];

            // 对 col 求最大子段和
            long long cur = 0, best = LLONG_MIN;
            for (int k = 1; k <= m; k++) {
                cur = max(col[k], cur + col[k]);
                best = max(best, cur);
            }
            ans = max(ans, best);
        }
    }

    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n²m)',
  pitfall: '`ans` 初始化为 0：如果矩阵全是负数，正确答案是最大的那个负数，而 0 会导致输出 0。必须初始化为 `LLONG_MIN` 或 `-1e18`。'
},

{
  id: 14, g: 'D 组 · 前缀和与差分', title: '区间修改', diff: 'mid', diffName: '中等',
  tag: '差分数组', src: '基础练习', ref: 15,
  desc: '给定长度为 `n` 的数组，进行 `q` 次操作，每次把区间 `[l, r]` 内的所有元素加上 `v`。\n\n所有操作完成后，输出最终的数组。',
  input: '第一行两个整数 `n, q`（`1 ≤ n, q ≤ 10^5`）。\n第二行 `n` 个整数 `a[i]`（`|a[i]| ≤ 10^9`）。\n接下来 `q` 行，每行三个整数 `l, r, v`（`1 ≤ l ≤ r ≤ n`，`|v| ≤ 10^9`）。',
  output: '一行 `n` 个整数，用空格分隔。',
  samples: [['5 2\n1 2 3 4 5\n1 3 10\n2 2 -5\n', '11 7 13 4 5\n']],
  noteText: '最终结果可能超过 `int` 范围。',
  hint: '差分数组 `d`：`[l, r]` 加 `v` 等价于 `d[l] += v; d[r+1] -= v;`。最后求一遍前缀和还原。\n\n`O(n + q)`，比每次暴力修改的 `O(nq)` 快得多。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;

    vector<long long> a(n + 2, 0), d(n + 2, 0);
    for (int i = 1; i <= n; i++) cin >> a[i];

    // 先构造差分数组：d[i] = a[i] - a[i-1]
    for (int i = 1; i <= n; i++) d[i] = a[i] - a[i - 1];

    while (q--) {
        int l, r; long long v;
        cin >> l >> r >> v;
        d[l] += v;
        d[r + 1] -= v;
    }

    long long cur = 0;
    for (int i = 1; i <= n; i++) {
        cur += d[i];
        cout << cur << (i == n ? '\n' : ' ');
    }
    return 0;
}`,
  complexity: 'O(n + q)',
  pitfall: '`d` 数组要开 `n+2`，因为 `r = n` 时会访问 `d[n+1]`。开成 `n+1` 就越界了（虽然多数时候不出错，但这是隐患）。'
}

]);
