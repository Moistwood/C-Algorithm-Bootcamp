/* ==========================================================
   题库 · 第五批：前缀和 / 双指针贪心 / 数据结构 补充
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

{
  id: 50, g: 'D 组 · 前缀和与差分', title: '子矩阵求和', diff: 'mid', diffName: '中等',
  tag: '二维前缀和', src: '基础练习', ref: 15,
  desc: '给定一个 `n × m` 的整数矩阵和 `q` 次询问，每次询问左上角 `(x1,y1)` 到右下角 `(x2,y2)` 的子矩阵元素和。',
  input: '第一行三个整数 `n m q`（`1 ≤ n, m ≤ 1000`，`1 ≤ q ≤ 10^5`）。\n接下来 `n` 行，每行 `m` 个整数（`|a| ≤ 1000`）。\n接下来 `q` 行，每行四个整数 `x1 y1 x2 y2`（`1` 起，保证 `x1 ≤ x2`，`y1 ≤ y2`）。',
  output: '`q` 行，每行一个整数。',
  samples: [['3 3 2\n1 2 3\n4 5 6\n7 8 9\n1 1 2 2\n2 2 3 3\n', '12\n28\n']],
  noteText: '朴素做法每次遍历子矩阵，最坏 `O(nmq) = 1e11`，必超时。',
  hint: '二维前缀和：`s[i][j] = s[i-1][j] + s[i][j-1] - s[i-1][j-1] + a[i][j]`。\n\n查询：`s[x2][y2] - s[x1-1][y2] - s[x2][y1-1] + s[x1-1][y1-1]`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

long long s[1005][1005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, q;
    cin >> n >> m >> q;

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            long long x;
            cin >> x;
            s[i][j] = s[i-1][j] + s[i][j-1] - s[i-1][j-1] + x;
        }

    while (q--) {
        int x1, y1, x2, y2;
        cin >> x1 >> y1 >> x2 >> y2;
        cout << s[x2][y2] - s[x1-1][y2] - s[x2][y1-1] + s[x1-1][y1-1] << '\n';
    }
    return 0;
}`,
  complexity: 'O(nm + q)',
  pitfall: '查询公式里减了两个矩形，必须把多减的 `s[x1-1][y1-1]` 加回来。漏掉这一项是最常见的错误。'
},

{
  id: 51, g: 'D 组 · 前缀和与差分', title: '最大子段和', diff: 'mid', diffName: '中等',
  tag: 'Kadane / DP', src: '经典问题', ref: 35,
  desc: '给定长度为 `n` 的整数序列，求**非空**连续子段的最大和。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数（`|a| ≤ 10^4`）。',
  output: '一行一个整数。',
  samples: [['7\n2 -4 3 -1 2 -4 3\n', '4\n'], ['3\n-5 -2 -9\n', '-2\n']],
  noteText: '子段必须非空。全负数时答案是最大的那个负数。',
  hint: '`f[i]` = 以 `a[i]` 结尾的最大子段和，`f[i] = max(a[i], f[i-1] + a[i])`。\n\n**答案初始化为 `a[0]` 或 `-INF`，不能是 0** —— 否则全负数时会输出 0。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;

    long long cur = a[0], ans = a[0];
    for (int i = 1; i < n; i++) {
        cur = max(a[i], cur + a[i]);
        ans = max(ans, cur);
    }
    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n)',
  pitfall: '`ans` 初始化为 0：全负数数组会输出 0，而正确答案是最大的负数。'
},

{
  id: 52, g: 'D 组 · 前缀和与差分', title: '区间异或和', diff: 'mid', diffName: '中等',
  tag: '前缀异或', src: '基础练习', ref: 15,
  desc: '给定 `n` 个整数和 `q` 次询问，每次求区间 `[l, r]` 内所有数的异或和。',
  input: '第一行两个整数 `n q`（`1 ≤ n, q ≤ 10^5`）。\n第二行 `n` 个整数（`0 ≤ a[i] < 2^30`）。\n接下来 `q` 行，每行两个整数 `l r`。',
  output: '`q` 行，每行一个整数。',
  samples: [['5 3\n1 2 3 4 5\n1 3\n2 4\n1 5\n', '0\n5\n1\n']],
  noteText: '`1^2^3 = 0`，`2^3^4 = 5`，`1^2^3^4^5 = 1`。',
  hint: '异或也有前缀和：`s[i] = s[i-1] ^ a[i]`，则区间异或 `= s[r] ^ s[l-1]`。\n\n因为异或的逆运算是它自己（`x ^ x = 0`），所以「减去前缀」变成了「异或上前缀」。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int s[100005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    for (int i = 1; i <= n; i++) {
        int x;
        cin >> x;
        s[i] = s[i-1] ^ x;
    }

    while (q--) {
        int l, r;
        cin >> l >> r;
        cout << (s[r] ^ s[l-1]) << '\n';
    }
    return 0;
}`,
  complexity: 'O(n + q)',
  pitfall: '把区间异或写成 `s[r] - s[l-1]`（当成加法前缀和）。异或没有减法，只有异或。'
},

{
  id: 53, g: 'E 组 · 双指针与贪心', title: '三数之和为零', diff: 'hard', diffName: '较难',
  tag: '排序 + 双指针', src: 'LeetCode 15', ref: 16,
  desc: '给定 `n` 个整数，求有多少个**互不相同的三元组** `(i,j,k)`（`i<j<k`）满足 `a[i]+a[j]+a[k]=0`。\n\n注意：值相同的不同下标算不同三元组；但完全相同的数值组合只算一次？\n\n**本题按「下标三元组」计数**，不做去重。',
  input: '第一行一个整数 `n`（`3 ≤ n ≤ 3000`）。\n第二行 `n` 个整数（`|a| ≤ 10^4`）。',
  output: '一行一个整数，表示满足条件的三元组个数。',
  samples: [['6\n-1 0 1 2 -1 -4\n', '3\n']],
  noteText: '样例中满足的三元组是 `(-1,0,1)` 两组（两个 -1 各配一次）加上 `(-1,-1,2)` 一组，共 3 组。',
  hint: '排序后枚举第一个数 `i`，然后对 `i+1..n-1` 用对撞双指针找 `a[j]+a[k] = -a[i]`。总数用 `long long`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    sort(a.begin(), a.end());

    long long cnt = 0;
    for (int i = 0; i < n - 2; i++) {
        int l = i + 1, r = n - 1;
        long long target = -(long long)a[i];
        while (l < r) {
            long long s = (long long)a[l] + a[r];
            if (s == target) {
                if (a[l] == a[r]) {
                    // 中间所有元素都相同，C(len, 2) 对
                    long long len = r - l + 1;
                    cnt += len * (len - 1) / 2;
                    break;
                } else {
                    // 分别统计两侧相同值的个数
                    long long cl = 1, cr = 1;
                    while (l + 1 < r && a[l+1] == a[l]) { l++; cl++; }
                    while (r - 1 > l && a[r-1] == a[r]) { r--; cr++; }
                    cnt += cl * cr;
                    l++; r--;
                }
            } else if (s < target) l++;
            else r--;
        }
    }
    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O(n²)',
  pitfall: '用三重循环会超时；用 `set` 去重反而更慢，而且本题按下标计数不能去重。指针相遇后要正确处理「相等元素」的批量统计，否则重复扫描会退化。'
},

{
  id: 54, g: 'E 组 · 双指针与贪心', title: '最短覆盖子串', diff: 'hard', diffName: '较难',
  tag: '滑动窗口', src: 'LeetCode 76', ref: 16,
  desc: '给定字符串 `s` 和 `t`，求 `s` 中**包含 `t` 全部字符**（含重复）的最短连续子串长度。\n\n如果不存在这样的子串，输出 `-1`。',
  input: '两行，第一行 `s`，第二行 `t`。`s` 长度不超过 `10^5`，`t` 长度不超过 `10^4`，均只含大小写字母。',
  output: '一行一个整数。',
  samples: [['ADOBECODEBANC\nABC\n', '4\n'], ['a\nb\n', '-1\n']],
  noteText: '样例中最短的是 `BANC`，长度 4。',
  hint: '滑动窗口：右端扩张直到「包含 t 的全部字符」，然后收缩左端并记录最小长度。\n\n用 `need[128]` 记录需要的字符数，`have[128]` 记录窗口内的，`match` 统计「已经满足数量要求」的字符种类数。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s, t;
    cin >> s >> t;

    int need[128] = {0}, win[128] = {0};
    for (char c : t) need[(unsigned char)c]++;

    int kind = 0;                     // 需要满足种类的总数
    for (int i = 0; i < 128; i++) if (need[i]) kind++;

    int match = 0, l = 0, ans = INT_MAX;

    for (int r = 0; r < (int)s.size(); r++) {
        unsigned char c = s[r];
        win[c]++;
        if (need[c] && win[c] == need[c]) match++;

        while (match == kind) {       // 满足条件，尝试收缩
            ans = min(ans, r - l + 1);
            unsigned char lc = s[l];
            win[lc]--;
            if (need[lc] && win[lc] < need[lc]) match--;
            l++;
        }
    }

    cout << (ans == INT_MAX ? -1 : ans) << '\n';
    return 0;
}`,
  complexity: 'O(|s| + |t|)',
  pitfall: '`match` 统计的是「种类数」而不是「字符总个数」。判断条件是 `match == kind`，不是 `match == t.size()`。'
},

{
  id: 55, g: 'E 组 · 双指针与贪心', title: '区间覆盖', diff: 'mid', diffName: '中等',
  tag: '贪心 / 区间', src: '经典贪心', ref: 17,
  desc: '给定 `n` 个闭区间 `[l_i, r_i]` 和一个目标区间 `[1, T]`，求最少用几个区间能完全覆盖 `[1, T]`。\n\n无法覆盖则输出 `-1`。',
  input: '第一行两个整数 `n T`（`1 ≤ n ≤ 10^5`，`1 ≤ T ≤ 10^9`）。\n接下来 `n` 行，每行两个整数 `l r`（`1 ≤ l ≤ r ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['4 10\n1 4\n3 6\n6 10\n1 2\n', '3\n'], ['2 10\n1 3\n4 6\n', '-1\n']],
  noteText: '样例 1：`[1,4]`、`[3,6]`、`[6,10]` 首尾相接覆盖 `[1,10]`。',
  hint: '按左端点排序。维护「当前已覆盖到 `cur`」，在所有 `l ≤ cur` 的区间里选 `r` 最大的，跳到 `far`。\n\n如果 `far == cur`（没有区间能继续），说明断了，返回 `-1`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, T;
    cin >> n >> T;
    vector<pair<int,int>> seg(n);
    for (auto& p : seg) cin >> p.first >> p.second;
    sort(seg.begin(), seg.end());

    int cnt = 0, cur = 1, i = 0;
    while (cur <= T) {
        int far = cur;
        while (i < n && seg[i].first <= cur) {
            far = max(far, seg[i].second);
            i++;
        }
        if (far == cur) { cout << -1 << '\n'; return 0; }
        cur = far + 1;
        cnt++;
    }
    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '`cur = far` 而不是 `cur = far + 1` 会导致死循环（区间是左闭右闭，已经覆盖到 `far`，下一个要从 `far+1` 开始看）。'
},

{
  id: 56, g: 'E 组 · 双指针与贪心', title: '任务调度', diff: 'hard', diffName: '较难',
  tag: '贪心 + 堆', src: '经典调度问题', ref: 24,
  desc: '有 `n` 个任务，第 `i` 个任务必须在第 `d[i]` 天或之前完成，完成后获得收益 `p[i]`。每天最多完成一个任务。\n\n求能获得的最大总收益。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n接下来 `n` 行，每行两个整数 `d[i] p[i]`（`1 ≤ d[i] ≤ 10^5`，`1 ≤ p[i] ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['3\n1 5\n2 3\n1 8\n', '11\n']],
  noteText: '`(1,5)` 和 `(1,8)` 都只能在第 1 天做，只能选一个。最优是第 1 天做 `(1,8)`，第 2 天做 `(2,3)`，总收益 `8 + 3 = 11`。',
  hint: '按截止时间升序排序。维护一个**小根堆**存已选任务的收益：\n- 新任务收益 > 堆顶 → 替换（放弃收益小的，选收益大的）\n- 堆大小超过当前截止时间 → 说明天数不够，弹出最小的\n\n最后堆里所有收益之和就是答案。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<pair<int,long long>> t(n);
    for (auto& x : t) cin >> x.first >> x.second;

    sort(t.begin(), t.end());      // 按截止时间升序

    priority_queue<long long, vector<long long>, greater<long long>> pq;
    long long sum = 0;

    for (auto& x : t) {
        int d = x.first;
        long long p = x.second;
        pq.push(p);
        sum += p;
        if ((int)pq.size() > d) {   // 天数不够，丢掉收益最小的
            sum -= pq.top();
            pq.pop();
        }
    }

    cout << sum << '\n';
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '样例答案我写成了 11（8+3），不是 13。注意本题的 `p[i]` 到 `1e9`，`sum` 必须 `long long`。'
},

{
  id: 57, g: 'F 组 · 数据结构', title: '最小栈', diff: 'mid', diffName: '中等',
  tag: '栈 / 辅助栈', src: 'LeetCode 155', ref: 20,
  desc: '实现一个栈，支持 `push x`、`pop`、`top`、`getMin` 四种操作，其中 `getMin` 要求 `O(1)`。\n\n输入 `q` 条操作，对 `top` 和 `getMin` 输出结果。',
  input: '第一行一个整数 `q`（`1 ≤ q ≤ 10^5`）。\n接下来 `q` 行，格式为 `push x` / `pop` / `top` / `getMin`。\n保证 `pop`、`top`、`getMin` 在栈非空时调用。',
  output: '对每个 `top` 和 `getMin` 输出一行。',
  samples: [['7\npush 3\npush 1\npush 5\npop\ngetMin\ntop\ngetMin\n', '1\n1\n1\n']],
  noteText: '样例：push 3,1,5 后栈是 [3,1,5]，pop 掉 5，getMin=1，top=1，getMin=1。',
  hint: '用两个栈：主栈存数据，辅助栈 `mn` 存「到当前为止的最小值」。\n\n`push` 时 `mn.push(min(x, mn.top()))`；`pop` 时两个一起弹。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;

    stack<long long> st;
    stack<long long> mn;

    while (q--) {
        string op;
        cin >> op;
        if (op == "push") {
            long long x;
            cin >> x;
            st.push(x);
            mn.push(mn.empty() ? x : min(x, mn.top()));
        } else if (op == "pop") {
            st.pop();
            mn.pop();
        } else if (op == "top") {
            cout << st.top() << '\n';
        } else {
            cout << mn.top() << '\n';
        }
    }
    return 0;
}`,
  complexity: '每个操作 O(1)',
  pitfall: '`mn.push(min(x, mn.top()))` 在 `mn` 为空时调用 `top()` 会 RE。必须先判断空。'
},

{
  id: 58, g: 'F 组 · 数据结构', title: '逆波兰表达式求值', diff: 'mid', diffName: '中等',
  tag: '栈 / 表达式', src: '经典栈应用', ref: 20,
  desc: '给定一个后缀表达式（逆波兰式），求它的值。\n\n运算符只有 `+ - * /`，除法为**向零取整**的整数除法。',
  input: '一行字符串，token 之间用空格分隔。token 要么是整数，要么是 `+ - * /`。\n保证表达式合法。',
  output: '一行一个整数。',
  samples: [['3 4 + 2 *\n', '14\n'], ['5 1 2 + 4 * + 3 -\n', '14\n']],
  noteText: '中间结果可能超过 `int`，用 `long long`。',
  hint: '遇到数字就入栈；遇到运算符就弹出两个数，算出结果再压回去。\n\n**注意顺序**：先弹出的是右操作数，后弹出的是左操作数。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    string line;
    getline(cin, line);

    stack<long long> st;
    stringstream ss(line);
    string tok;

    while (ss >> tok) {
        if (tok == "+" || tok == "-" || tok == "*" || tok == "/") {
            long long b = st.top(); st.pop();   // 右操作数
            long long a = st.top(); st.pop();   // 左操作数
            if (tok == "+") st.push(a + b);
            else if (tok == "-") st.push(a - b);
            else if (tok == "*") st.push(a * b);
            else st.push(a / b);
        } else {
            st.push(stoll(tok));
        }
    }

    cout << st.top() << '\n';
    return 0;
}`,
  complexity: 'O(表达式长度)',
  pitfall: '写成 `long long a = st.top(); ... b = st.top();` 会把左右操作数搞反，减法除法全错。**先弹的是右边。**'
},

{
  id: 59, g: 'F 组 · 数据结构', title: '数据流的中位数', diff: 'hard', diffName: '较难',
  tag: '对顶堆', src: 'LeetCode 295', ref: 24,
  desc: '依次读入 `n` 个数，每读入一个数，输出当前已读入所有数的**下中位数**（排序后第 `⌈k/2⌉` 个，`k` 为当前元素个数）。',
  input: '第一行一个整数 `n`（`1 ≤ n ≤ 10^5`）。\n第二行 `n` 个整数（`|a| ≤ 10^9`）。',
  output: '一行 `n` 个整数，用空格分隔。',
  samples: [['5\n1 3 2 5 4\n', '1 1 2 2 3\n']],
  noteText: '下中位数 = 排序后第 `⌈k/2⌉` 个。`k=2` 时取第 1 个（较小者），`k=4` 时取第 2 个。',
  hint: '对顶堆：大根堆 `low` 存较小的一半，小根堆 `high` 存较大的一半。保持 `low.size() == high.size() + 1`，此时 `low.top()` 就是答案。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    priority_queue<long long> low;                                  // 大根堆
    priority_queue<long long, vector<long long>, greater<long long>> high;  // 小根堆

    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;

        if (low.empty() || x <= low.top()) low.push(x);
        else high.push(x);

        // 保持 low.size() == high.size() 或 low.size() == high.size() + 1
        if ((int)low.size() > (int)high.size() + 1) {
            high.push(low.top()); low.pop();
        }
        if ((int)high.size() > (int)low.size()) {
            low.push(high.top()); high.pop();
        }

        cout << low.top() << (i == n - 1 ? '\n' : ' ');
    }
    return 0;
}`,
  complexity: 'O(n log n)',
  pitfall: '平衡条件写反（让 `high` 比 `low` 多一个），答案就变成上中位数。本题要求 `low` 多一个（下中位数）。'
},

{
  id: 60, g: 'F 组 · 数据结构', title: '前 k 大的数之和', diff: 'mid', diffName: '中等',
  tag: '堆 / Top K', src: '经典堆应用', ref: 24,
  desc: '给定 `n` 个整数和整数 `k`，求最大的 `k` 个数之和。',
  input: '第一行两个整数 `n k`（`1 ≤ k ≤ n ≤ 10^5`）。\n第二行 `n` 个整数（`|a| ≤ 10^9`）。',
  output: '一行一个整数。',
  samples: [['5 2\n1 5 3 9 7\n', '16\n'], ['3 3\n-1 -2 -3\n', '-6\n']],
  noteText: '`k = n` 时答案就是全部之和。',
  hint: '维护大小为 `k` 的**小根堆**，遍历数组，堆满且新元素比堆顶大就替换。最后堆内求和。\n\n或者直接 `sort` 后取后 `k` 个，`O(n log n)` 也能过。堆的写法在 `n` 巨大、只能流式读入时才有优势。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;

    priority_queue<long long, vector<long long>, greater<long long>> pq;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        pq.push(x);
        if ((int)pq.size() > k) pq.pop();
    }

    long long sum = 0;
    while (!pq.empty()) { sum += pq.top(); pq.pop(); }
    cout << sum << '\n';
    return 0;
}`,
  complexity: 'O(n log k)',
  pitfall: '用大根堆取前 k 大是错的：大根堆只能不断取最大，你无法判断「该不该丢弃」。维护前 k 大必须用小根堆（堆顶是这 k 个里最小的）。'
}

]);
