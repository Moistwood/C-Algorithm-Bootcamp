/* ==========================================================
   阶段一 · C++ 语言基础（第 6 - 9 节）+ 阶段二 入门（第 10 节）
   ========================================================== */
var R = String.raw;

window.CHAPTERS = (window.CHAPTERS || []).concat([

/* ---------------- 第 6 节 ---------------- */
{
  id: 6, s: 1, title: '函数、递归与作用域', min: 35,
  goals: [
    '分清值传递与引用传递，知道什么时候必须用引用',
    '能独立写出正确的递归函数（边界 + 递推 + 返回）',
    '知道递归会爆栈，以及什么时候要改成迭代'
  ],
  body: [
    { t: 'md', x: [
      '## 函数传参的两种方式',
      '',
      'C++ 默认是**值传递**：把实参复制一份给形参，函数里怎么改都影响不到外面。想改外面，必须用**引用**。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`#include <bits/stdc++.h>
using namespace std;

void byValue(int x) { x = 100; }        // 改的是副本
void byRef(int& x)  { x = 100; }        // 改的是本体

int main() {
    int a = 1;
    byValue(a);
    cout << a << '\n';   // 1

    byRef(a);
    cout << a << '\n';   // 100
    return 0;
}` },

    { t: 'md', x: [
      '**什么时候该用 `const &`？** 传大结构体（`vector`、`string`、自定义 `struct`）时，值传递会整体拷贝一遍，慢且浪费内存。用 `const Node&` 既避免拷贝，又保证函数不会改它。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`struct Big { int a[1000]; };

void bad(Big x)              { }   // 每次调用拷贝 4000 字节
void good(const Big& x)      { }   // 只传地址，零拷贝

// 变长数组参数的写法：数组会退化成指针，长度必须另外传
void process(int a[], int n) { }
void process(int* a, int n)  { }   // 完全等价
// 注意：函数内 sizeof(a) 得到的是指针大小（8），不是数组大小` },

    { t: 'note', kind: 'warn', x: [
      '**数组作为参数会退化成指针**，函数内部无法得知数组长度，`sizeof(a) / sizeof(a[0])` 在函数里是错的。必须显式传 `n`。这是 C 语言的历史遗留问题，考试里经常考。'
    ].join('\n') },

    { t: 'md', x: [
      '## 递归的三个要素',
      '',
      '任何正确的递归函数都必须回答三个问题：',
      '',
      '1. **边界（递归出口）是什么？** —— 什么时候直接返回，不再往下叫自己',
      '2. **递推关系是什么？** —— 大问题怎么用小一号的答案拼出来',
      '3. **返回值 / 副作用是什么？** —— 函数是返回一个值，还是修改全局状态',
      '',
      '写递归前先把这三条用中文写在草稿纸上，再动手敲代码。跳过这一步的人，百分之八十会写出死递归。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 例 1：阶乘。边界 n<=1 返回 1；递推 n * fact(n-1)
long long fact(int n) {
    if (n <= 1) return 1;
    return 1LL * n * fact(n - 1);
}

// 例 2：汉诺塔。把 n-1 个盘子先挪到中转柱，挪最大的，再把 n-1 个挪到目标柱
void hanoi(int n, char from, char via, char to) {
    if (n == 0) return;                        // 边界
    hanoi(n - 1, from, to, via);               // 先把上面 n-1 个移到 via
    cout << from << " -> " << to << '\n';      // 移动最大的那个
    hanoi(n - 1, via, from, to);               // 再把它俩移到 to
}

// 例 3：快速幂（递归版）。a^n = (a^(n/2))^2，偶数；奇数再乘一个 a
long long power(long long a, int n) {
    if (n == 0) return 1;
    long long half = power(a, n / 2);
    if (n % 2 == 0) return half * half;
    return half * half * a;
}` },

    { t: 'md', x: [
      '## 递归的两个致命问题',
      '',
      '**问题一：爆栈。** 每次函数调用都在栈上压一个栈帧（保存参数、局部变量、返回地址），大约几十到几百字节。Windows 默认栈只有 1MB，安全递归深度大约是 **1 万到 10 万**这个量级。递归深度到 1e6 必崩。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 危险：递归求 1e6 的和，直接爆栈
long long sum(int n) {
    if (n == 0) return 0;
    return n + sum(n - 1);    // 深度 1e6 → 崩溃
}

// 安全：改成迭代
long long sum(int n) {
    long long s = 0;
    for (int i = 1; i <= n; i++) s += i;
    return s;
}` },

    { t: 'md', x: [
      '**问题二：重复子问题。** 朴素递归求斐波那契，`f(40)` 需要约 2 亿次调用，跑几秒；`f(50)` 根本跑不完。原因是 `f(38)` 被重复计算了几百万次。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 朴素递归：O(2^n)，n=40 就要好几秒
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

// 记忆化：加一个「算过就存」的数组，复杂度降到 O(n)
long long memo[100];
long long fib2(int n) {
    if (n <= 1) return n;
    if (memo[n]) return memo[n];          // 算过，直接用
    return memo[n] = fib2(n - 1) + fib2(n - 2);
}` },

    { t: 'note', kind: 'tip', x: [
      '「加一个数组把算过的答案存起来」这个动作，就是**动态规划的记忆化搜索形式**。第 34 节会详细讲。现在只要记住：**凡是递归里出现重复子问题，就加记忆化。**'
    ].join('\n') },

    { t: 'md', x: [
      '## 作用域与全局变量',
      '',
      '函数内部定义的变量是局部的，函数外定义的变量是全局的（所有函数共享）。竞赛代码里**大量使用全局变量**来避免层层传参 —— 这是合理的，不要有心理负担。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int n, m;              // 全局：所有函数都能直接用
int grid[1005][1005];
int ans = 0;

void dfs(int x, int y) {
    if (x < 0 || x >= n || y < 0 || y >= m) return;
    ans++;                       // 直接改全局变量，不需要引用传参
    grid[x][y] = 0;
    // ...
}` },

    { t: 'quiz',
      q: '把 `vector<int>` 传给一个只读函数，最高效的参数写法是？',
      o: [
        '`void f(vector<int> v)`',
        '`void f(vector<int>& v)`',
        '`void f(const vector<int>& v)`',
        '`void f(vector<int>* v)`'
      ],
      a: 2,
      e: '`const vector<int>&` 既避免整体拷贝（引用传递），又向调用者和编译器承诺不会修改内容（const）。如果只写 `vector<int>&`，虽然也是零拷贝，但语义上没有表达「只读」，而且无法接受 const 实参。`vector<int> v` 会完整拷贝整个数组，元素多时非常慢。'
    },

    { t: 'quiz',
      q: '在 Windows（默认栈 1MB）上，递归深度达到多少最可能崩溃？',
      o: ['约 100 层', '约 1 千层', '约 1 万 ~ 10 万层', '约 1 亿层'],
      a: 2,
      e: '每个栈帧通常占几十到几百字节，1MB / 100B ≈ 1 万，1MB / 20B ≈ 5 万。所以安全深度在 1e4 量级，超过 1e5 基本必崩。DFS 深度可能到 1e6 的题（比如链状图），必须改成手写栈迭代。'
    }
  ]
},

/* ---------------- 第 7 节 ---------------- */
{
  id: 7, s: 1, title: '字符串：char 数组与 std::string', min: 35,
  goals: [
    '知道什么时候用 char[]、什么时候用 string',
    '掌握 substr / find / stoi / to_string 等高频操作',
    '避开 cin 与 getline 混用、strcmp 返回值比较这两个大坑'
  ],
  body: [
    { t: 'md', x: [
      '## 两种字符串，什么时候用哪个',
      '',
      '- **`std::string`**：日常处理、拼接、查找、比较。写法舒服，推荐默认用它。',
      '- **`char[]`**：需要高性能、需要 `scanf("%s")` 快速读入、或者要当二维网格用（`char g[1005][1005]`）。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    // char 数组：以 '\0' 结尾，长度必须预留一位
    char s[100];
    scanf("%s", s);              // 遇空格/换行停止，s 前不用加 &
    printf("%s %d\n", s, (int)strlen(s));

    // string
    string a = "hello";
    cout << a.size() << '\n';    // 5，O(1)
    cout << a + " world" << '\n';
    cout << a.substr(1, 3) << '\n';   // "ell"（起点 1，长度 3）

    size_t pos = a.find("ll");
    if (pos != string::npos) cout << "found at " << pos << '\n';  // 2
    return 0;
}` },

    { t: 'note', kind: 'danger', x: [
      '**`find` 找不到时返回 `string::npos`，不是 `-1` 也不是 `0`。** 必须写 `if (pos != string::npos)`。直接把返回值当 `int` 用 `if (pos >= 0)` 在某些实现上会失败，因为 `npos` 是一个极大的无符号数。'
    ].join('\n') },

    { t: 'md', x: [
      '## 高频操作速查'
    ].join('\n') },

    { t: 'table',
      head: ['需求', '写法'],
      rows: [
        ['长度', '`s.size()` 或 `s.length()`，O(1)'],
        ['取子串', '`s.substr(起点, 长度)`，长度可省略表示到末尾'],
        ['查找', '`s.find("x")`，返回下标或 `string::npos`'],
        ['拼接', '`s += t;` 或 `s = s + t;`'],
        ['插入 / 删除', '`s.insert(位置, "x")` / `s.erase(位置, 长度)`'],
        ['反转', '`reverse(s.begin(), s.end());`'],
        ['数字 → 字符串', '`to_string(123)`'],
        ['字符串 → 数字', '`stoi(s)` / `stoll(s)` / `stod(s)`'],
        ['字符 → 数字', '`c - \'0\'`'],
        ['整行读入', '`getline(cin, s);`'],
        ['字典序比较', '`s1 < s2`（string 支持全部比较运算符）']
      ]
    },

    { t: 'md', x: [
      '## 坑一：`cin >>` 和 `getline` 混用',
      '',
      '`cin >> n` 读完数字后，**换行符还留在输入缓冲区里**。紧接着调用 `getline`，它会读到一个空行，直接返回空字符串。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int n;
cin >> n;

string line;
getline(cin, line);       // 错误：line 是空字符串，读到的是 n 后面那个换行

// 正确：先清掉换行符
cin.ignore();             // 忽略一个字符
getline(cin, line);

// 或者更稳的写法（忽略到行尾，包括那种 \r\n 的情况）
cin.ignore(numeric_limits<streamsize>::max(), '\n');
getline(cin, line);` },

    { t: 'note', kind: 'warn', x: [
      '如果测数据是用 Windows 记事本编辑的，行尾是 `\\r\\n`。`getline` 默认按 `\\n` 分割，会把 `\\r` 留在字符串末尾，导致比对答案时莫名其妙不对。解决办法：读完后 `if (!s.empty() && s.back() == \'\\r\') s.pop_back();`'
    ].join('\n') },

    { t: 'md', x: [
      '## 坑二：`strcmp` 的返回值',
      '',
      '`strcmp(a, b)` 返回的是**负数 / 0 / 正数**，不是固定的 -1 和 1。所以判断相等只能写 `== 0`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`char a[] = "abc", b[] = "abd";

if (strcmp(a, b) == 0)  { /* 相等 */ }
if (strcmp(a, b) <  0)  { /* a 字典序小于 b */ }

// 错误：在某些实现上 strcmp 返回的是字符差值，可能是 -100 之类
if (strcmp(a, b) == -1) { /* 不可靠 */ }` },

    { t: 'md', x: [
      '## 字符分类与大小写',
      '',
      '`<cctype>` 里有一组函数，比手写 `if (c >= \'a\' && c <= \'z\')` 更清晰。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`char c = 'A';
if (isalpha(c))  { }          // 是字母
if (isdigit(c))  { }          // 是数字
if (isalnum(c))  { }          // 字母或数字
if (isupper(c))  { }          // 大写
if (isspace(c))  { }          // 空白字符

cout << (char)tolower(c);     // 'a'
cout << (char)toupper('a');   // 'A'

// 注意：isdigit 等函数的参数必须是 unsigned char 或 EOF，
// 传负数的 char 是未定义行为。比赛里一般不会触发，但知道有这回事。` },

    { t: 'md', x: [
      '## 统计字符出现的次数',
      '',
      '这是蓝桥杯填空题的高频套路，经常用「给一段文本，问某个字母出现几次」。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int cnt[26] = {0};
string s = "hello world";
for (char c : s) {
    if (c >= 'a' && c <= 'z') cnt[c - 'a']++;
}
for (int i = 0; i < 26; i++) {
    if (cnt[i]) cout << (char)('a' + i) << ": " << cnt[i] << '\n';
}` },

    { t: 'quiz',
      q: '`string s = "abc"; cout << s.find("z");` 输出什么？',
      o: ['-1', '0', '一个极大的无符号数（即 string::npos）', '抛出异常'],
      a: 2,
      e: '`find` 找不到时返回 `string::npos`，它的定义是 `static const size_t npos = -1;`。`size_t` 是无符号类型，所以 `-1` 会被解释成该类型的最大值（64 位上约 1.8e19）。虽然 `cout` 出来的数字很吓人，但判断方式只有一种：`if (pos != string::npos)`。'
    },

    { t: 'quiz',
      q: '执行 `cin >> n;` 之后立刻 `getline(cin, line);`，`line` 会是什么？',
      o: [
        '下一行的全部内容',
        '空字符串，因为读到的是 n 后面的换行符',
        '编译错误',
        '整个剩余的输入'
      ],
      a: 1,
      e: '`cin >> n` 只把数字读走，行尾的 `\\n` 留在缓冲区。`getline` 一上来就遇到这个 `\\n`，认为「读到行尾了」，于是返回空字符串。必须先用 `cin.ignore()` 清掉它。这是 C++ IO 最经典的坑。'
    }
  ]
},

/* ---------------- 第 8 节 ---------------- */
{
  id: 8, s: 1, title: '结构体、枚举、引用与指针', min: 30,
  goals: [
    '会用 struct 打包数据并对它排序',
    '理解运算符重载的 const 为什么不能省',
    '搞懂引用与指针的区别，知道比赛里什么时候用哪个'
  ],
  body: [
    { t: 'md', x: [
      '## struct：把相关数据捆在一起',
      '',
      '比赛里凡是「一组有多个属性的对象」——学生、边、坐标、状态 —— 都该用 `struct`，而不是开几个平行数组。平行数组（`name[]`、`score[]`、`age[]`）在你需要排序时会立刻爆炸。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`struct Student {
    string name;
    int score;
    int id;
};

// 三种初始化方式
Student a = {"张三", 90, 1};
Student b{"李四", 85, 2};
Student c;
c.name = "王五"; c.score = 70; c.id = 3;

// 结构体数组
Student cls[100];
int n; cin >> n;
for (int i = 0; i < n; i++) cin >> cls[i].name >> cls[i].score;` },

    { t: 'md', x: [
      '## 给结构体排序：两种写法',
      '',
      '**写法一：重载 `<` 运算符。** 之后 `sort` 直接可用，也能放进 `set` / `map` / `priority_queue`。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`struct Node {
    int x, y;
    // 注意末尾的 const，绝对不能省
    bool operator<(const Node& o) const {
        if (x != o.x) return x < o.x;   // 第一关键字升序
        return y < o.y;                 // 第二关键字升序
    }
};

vector<Node> v = {{3, 1}, {1, 5}, {1, 2}};
sort(v.begin(), v.end());
// 结果：{1,2} {1,5} {3,1}` },

    { t: 'note', kind: 'danger', x: [
      '**`operator<` 末尾的 `const` 不能省。** `sort` 内部会用 `const Node&` 去比较，如果成员函数不是 `const`，编译器报一堆看不懂的错误（`no match for call to ...` / `discards qualifiers`）。这是新手最常见的编译错误之一，记住就好。'
    ].join('\n') },

    { t: 'md', x: [
      '**写法二：单独的 `cmp` 函数。** 更灵活，适合临时改排序规则。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`bool cmp(const Node& a, const Node& b) {
    return a.x > b.x;      // 按 x 降序
}
sort(v.begin(), v.end(), cmp);

// 多关键字：先按分数降序，分数相同按学号升序
bool cmp2(const Student& a, const Student& b) {
    if (a.score != b.score) return a.score > b.score;
    return a.id < b.id;
}` },

    { t: 'note', kind: 'warn', x: [
      '**比较函数必须满足严格弱序**：`cmp(a, a)` 必须为 `false`，且不能出现 `a < b` 和 `b < a` 同时为真的情况。写成 `return a.x <= b.x;` 就违反了这一点，`sort` 可能越界崩溃或死循环。**永远用 `<` 或 `>`，不要用 `<=` 或 `>=`。**'
    ].join('\n') },

    { t: 'md', x: [
      '## enum 枚举',
      '',
      '用 `enum` 给常量起名字，比 `#define` 类型安全，比裸数字可读。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`enum Color { RED, GREEN, BLUE };          // 默认 0, 1, 2
enum Dir { UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8 };   // 可指定值，适合做位标记

Color c = GREEN;
if (c == GREEN) { }

// 方向数组配合枚举（图论高频）
enum D { U, D, L, R };
int dx[] = {-1, 1, 0, 0};
int dy[] = {0, 0, -1, 1};` },

    { t: 'md', x: [
      '## 引用与指针',
      '',
      '**引用是别名，指针是地址。** 引用必须初始化且不能改绑，指针可以为空、可以换目标。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`int x = 10;

int& r = x;        // r 是 x 的另一个名字
r = 20;            // x 也变成 20
// int& r2;        // 错误：引用必须初始化

int* p = &x;       // p 存的是 x 的地址
*p = 30;           // 通过指针改 x
cout << p << '\n'; // 打印地址，类似 0x61fe14

int* q = nullptr;  // 空指针，C++11 推荐用 nullptr 而不是 NULL
if (q != nullptr) { /* 用之前必须判空 */ }` },

    { t: 'md', x: [
      '## 比赛里什么时候用哪个',
      '',
      '**结论：99% 的情况你只需要「引用」，指针几乎用不上。**'
    ].join('\n') },

    { t: 'table',
      head: ['场景', '写法'],
      rows: [
        ['函数想修改实参', '`void f(int& x)`'],
        ['函数只读大对象', '`void f(const vector<int>& v)`'],
        ['遍历容器并修改', '`for (auto& x : v)`'],
        ['遍历容器只读', '`for (const auto& x : v)`'],
        ['链表 / 树节点', '`struct Node { int v; Node* nxt; }`（或者用数组下标模拟，更安全）'],
        ['函数返回多个值', '用 `pair` 或结构体，别用指针']
      ]
    },

    { t: 'note', kind: 'tip', x: [
      '竞赛代码里，**用数组下标模拟链表/树/图，比真指针安全得多**：不会内存泄漏、不会野指针、调试时能直接 `print` 出来看。第 22 节讲链表时会用这种写法。'
    ].join('\n') },

    { t: 'quiz',
      q: '`bool operator<(const Node& o) const` 末尾的 `const` 去掉后会发生什么？',
      o: [
        '没影响，可以去掉',
        '编译错误：`sort` 无法用 const 对象调用非 const 成员函数',
        '运行时崩溃',
        '排序结果顺序反转'
      ],
      a: 1,
      e: '`sort` 内部比较元素时，元素可能以 `const` 形式被访问，此时只能调用 `const` 成员函数。如果 `operator<` 不是 `const`，编译器会报 `passing \'const Node\' as \'this\' argument discards qualifiers` 一类的错误。**记住：所有比较运算符、所有只读成员函数，末尾都加 `const`。**'
    },

    { t: 'quiz',
      q: '下面哪个比较函数会让 `sort` 崩溃或死循环？',
      o: [
        '`return a.x < b.x;`',
        '`return a.x > b.x;`',
        '`return a.x <= b.x;`',
        '`return a.x != b.x ? a.x < b.x : a.y < b.y;`'
      ],
      a: 2,
      e: '`cmp(a, a)` 必须返回 `false`（自己不能小于自己）。`a.x <= b.x` 在 `a` 和 `b` 相等时返回 `true`，违反严格弱序，`std::sort` 的 introsort 实现会出现越界访问或死循环。这是很多「本地能跑、交上去 RE」的元凶。'
    }
  ]
},

/* ---------------- 第 9 节 ---------------- */
{
  id: 9, s: 1, title: 'STL 容器与算法速查', min: 45,
  goals: [
    '掌握 vector / map / set / queue / priority_queue 的常用操作',
    '会用 sort + unique 去重、lower_bound 二分',
    '知道每种容器的复杂度，选对容器'
  ],
  body: [
    { t: 'md', x: [
      '**STL 是 C++ 相对其他语言的唯一优势。** 省赛里大量题目用 `sort` + `vector` + `map` 就能过，不需要手写任何数据结构。这一节的内容必须熟练到不用想。'
    ].join('\n') },

    { t: 'table',
      head: ['容器', '底层', '插入', '查找', '适用场景'],
      rows: [
        ['`vector`', '动态数组', '尾部 O(1)，中间 O(n)', 'O(n) / 下标 O(1)', '**默认首选**，可排序可随机访问'],
        ['`deque`', '分块数组', '两端 O(1)', 'O(n)', '需要双端操作'],
        ['`queue`', 'deque 适配', 'O(1)', '—', 'BFS'],
        ['`stack`', 'deque 适配', 'O(1)', '—', '括号匹配、单调栈'],
        ['`priority_queue`', '堆', 'O(log n)', '取顶 O(1)', '堆优化 Dijkstra、贪心'],
        ['`set` / `map`', '红黑树', 'O(log n)', '**O(log n)**', '需要有序、需要查前驱后继'],
        ['`unordered_set/map`', '哈希表', '平均 O(1)', '**平均 O(1)**', '只查存在性，不需要顺序'],
        ['`string`', '动态数组', '尾部 O(1)', 'O(n)', '文本处理']
      ]
    },

    { t: 'md', x: [
      '## vector',
      '',
      '最常用的容器，没有之一。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`vector<int> v;                 // 空
vector<int> a(10);             // 10 个 0
vector<int> b(10, 5);          // 10 个 5
vector<int> c = {1, 2, 3};

v.push_back(4);                // 尾部插入
v.pop_back();                  // 尾部删除
v.size();                      // 元素个数（无符号，注意和 int 比较时的坑）
v.empty();                     // 是否为空
v[i];                          // 下标访问，不检查越界
v.front(); v.back();           // 首尾
v.clear();                     // 清空（不释放容量）
v.resize(20, 0);               // 改变大小，新增的填 0

// 二维
vector<vector<int>> g(n, vector<int>(m, 0));

// 遍历
for (int i = 0; i < (int)v.size(); i++) cout << v[i];
for (int x : v) cout << x;
for (auto& x : v) x *= 2;` },

    { t: 'note', kind: 'warn', x: [
      '`v.size()` 返回的是 **`size_t`（无符号）**。写 `for (int i = 0; i < v.size() - 1; i++)` 时，如果 `v` 为空，`v.size() - 1` 会回绕成 `1.8e19`，循环直接越界崩溃。**统一加 `(int)` 转换**：`i < (int)v.size() - 1`。'
    ].join('\n') },

    { t: 'md', x: [
      '## 排序 + 去重：固定组合',
      '',
      '这个三行组合在离散化、去重、统计不同元素个数里出现频率极高，背下来。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`vector<int> v = {3, 1, 3, 2, 1, 5};

sort(v.begin(), v.end());                          // 1 1 2 3 3 5
v.erase(unique(v.begin(), v.end()), v.end());      // 1 2 3 5

// unique 只是把重复元素移到后面，返回去重后末尾的迭代器
// 必须配合 erase 才能真正删除` },

    { t: 'md', x: [
      '## map 与 set'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`map<string, int> mp;
mp["apple"] = 3;                 // 不存在则自动创建，值为 0 再赋值
mp["banana"]++;

if (mp.count("apple")) { }       // 判断是否存在
if (mp.find("apple") != mp.end()) { }   // 同上，更常用

for (auto& kv : mp) {
    cout << kv.first << " " << kv.second << '\n';   // 按 key 升序
}
mp.erase("apple");

set<int> s;
s.insert(5);
s.insert(3);
s.insert(5);                     // 重复插入无效
if (s.count(3)) { }
s.erase(3);
cout << *s.begin();              // 最小值
cout << *s.rbegin();             // 最大值（反向迭代器）

// 找 >= x 的最小元素
auto it = s.lower_bound(3);
if (it != s.end()) cout << *it;` },

    { t: 'note', kind: 'danger', x: [
      '**`mp[key]` 在 key 不存在时会插入一个默认值。** 写 `if (mp[x] == 1)` 这种查询，会悄悄把一堆 key 塞进 map，既慢又容易出错。**只查询用 `mp.count(x)` 或 `mp.find(x)`；确认存在后再用 `[]`。**'
    ].join('\n') },

    { t: 'md', x: [
      '## queue / stack / priority_queue'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`queue<int> q;
q.push(1); q.push(2);
cout << q.front();      // 1
q.pop();                // 弹出队首，注意 pop 没有返回值
q.size(); q.empty();

stack<int> st;
st.push(1); st.push(2);
cout << st.top();       // 2
st.pop();

// 大根堆（默认）
priority_queue<int> pq;
pq.push(3); pq.push(1); pq.push(5);
cout << pq.top();       // 5

// 小根堆：加两个参数
priority_queue<int, vector<int>, greater<int>> minHeap;

// 存结构体：需要重载 <（默认大根堆，< 定义"更小"的那个在堆顶的反面）
struct Task { int cost; };
struct TaskCmp {
    bool operator()(const Task& a, const Task& b) const {
        return a.cost > b.cost;      // 小根堆写法：反着比
    }
};
priority_queue<Task, vector<Task>, TaskCmp> tasks;` },

    { t: 'note', kind: 'tip', x: [
      '**`priority_queue` 的自定义比较很容易搞反。** 记住一句话：`operator()` 返回 `true` 表示「a 的优先级比 b 低」，也就是 a 会沉到下面。所以**想要小根堆就写 `return a.cost > b.cost;`**（大的沉下去，小的浮上来）。'
    ].join('\n') },

    { t: 'md', x: [
      '## 常用算法函数',
      '',
      '都在 `<algorithm>` 里（`bits/stdc++.h` 已经包含）。'
    ].join('\n') },

    { t: 'table',
      head: ['函数', '作用', '注意'],
      rows: [
        ['`sort(b, e)`', '升序排序', 'O(n log n)，**不稳定**'],
        ['`sort(b, e, cmp)`', '自定义排序', 'cmp 必须严格弱序'],
        ['`stable_sort`', '稳定排序', 'O(n log²n)，需要保持相对顺序时用'],
        ['`reverse(b, e)`', '翻转', '字符串、数组、vector 都能用'],
        ['`unique(b, e)`', '相邻去重', '**必须先排序**，返回值是新末尾'],
        ['`lower_bound(b, e, x)`', '第一个 ≥ x 的位置', '要求区间**已排序**'],
        ['`upper_bound(b, e, x)`', '第一个 > x 的位置', '两者相减 = x 的出现次数'],
        ['`max_element / min_element`', '最值位置', '返回迭代器，要 `*` 解引用'],
        ['`count(b, e, x)`', '统计出现次数', 'O(n)'],
        ['`next_permutation(b, e)`', '下一个排列', '需先排序，用于枚举全排列'],
        ['`accumulate(b, e, 0LL)`', '求和', '**初始值写 `0LL`** 防止 int 溢出']
      ]
    },

    { t: 'code', lang: 'cpp', x: R`int a[] = {3, 1, 4, 1, 5, 9, 2, 6};
int n = 8;
sort(a, a + n);

// 二分查找（数组必须已排序）
int* p = lower_bound(a, a + n, 4);   // 指向第一个 >= 4 的位置
int idx = p - a;                     // 下标
int cnt = upper_bound(a, a + n, 1) - lower_bound(a, a + n, 1);  // 1 的个数

// vector 版本
vector<int> v(a, a + n);
int pos = lower_bound(v.begin(), v.end(), 4) - v.begin();

// 全排列
vector<int> perm = {1, 2, 3};
do {
    for (int x : perm) cout << x;
    cout << '\n';
} while (next_permutation(perm.begin(), perm.end()));` },

    { t: 'quiz',
      q: '要把 `vector` 里的重复元素去掉（只留一份），正确的做法是？',
      o: [
        '`v.erase(unique(v.begin(), v.end()), v.end());`',
        '先 `sort`，再 `v.erase(unique(v.begin(), v.end()), v.end());`',
        '`v.erase(unique(v.begin(), v.end()));`',
        '`sort(v.begin(), v.end()); v.erase(v.end());`'
      ],
      a: 1,
      e: '`unique` **只去除相邻**的重复元素，所以必须先排序让相同元素聚在一起。此外 `unique` 只是把不重复的元素移到前面并返回新的逻辑末尾，**不会真的缩小容器**，必须再 `erase` 才能真正删除。选项 C 的 `erase(迭代器)` 只删一个元素。'
    },

    { t: 'quiz',
      q: '需要一个「每次取出当前最小值」的容器，应该用？',
      o: [
        '`priority_queue<int>`',
        '`priority_queue<int, vector<int>, greater<int>>`',
        '`queue<int>`',
        '`stack<int>`'
      ],
      a: 1,
      e: '`priority_queue<int>` 默认是**大根堆**，`top()` 取的是最大值。要小根堆必须显式指定容器和比较器：`priority_queue<int, vector<int>, greater<int>>`。`queue` 是先进先出，`stack` 是后进先出，都不会自动排序。'
    }
  ]
},

/* ---------------- 第 10 节 ---------------- */
{
  id: 10, s: 2, title: '复杂度分析与数据规模对照', min: 30,
  goals: [
    '看到数据范围能立刻反推出该用什么复杂度的算法',
    '知道 1 秒钟大约能做多少次运算',
    '会估算内存占用'
  ],
  body: [
    { t: 'md', x: [
      '**这一节是整个站最重要的元知识。** 它的作用是：拿到题，先看数据范围，直接排除掉不可能的算法，把思考范围压缩到 1~2 个候选。省赛 4 小时，你没有时间试遍所有算法。'
    ].join('\n') },

    { t: 'md', x: [
      '## 一秒能做什么',
      '',
      '蓝桥杯的评测机性能参差不齐，但可以用一个保守数字估：**C++ 每秒约 1 × 10⁸ 次简单运算**（加减、比较、数组访问）。带取模、乘除、函数调用的，打个对折。'
    ].join('\n') },

    { t: 'table',
      head: ['n 的范围', '能过的复杂度', '典型算法', '不能碰'],
      rows: [
        ['n ≤ 10', 'O(n!)', '全排列暴力', '—'],
        ['n ≤ 20', 'O(2ⁿ)、O(n·2ⁿ)', '状压 DP、子集枚举', 'O(n!)'],
        ['n ≤ 100', 'O(n³)', 'Floyd、区间 DP', 'O(2ⁿ)'],
        ['n ≤ 500', 'O(n³)（常数小）', '矩阵乘法', 'O(n⁴)'],
        ['n ≤ 5000', 'O(n²)', '朴素 DP、二维前缀和', 'O(n³)（2.5e10 太慢）'],
        ['n ≤ 1e5', 'O(n log n)', '排序、二分、线段树、Dijkstra 堆优化', '**O(n²) = 1e10 必超时**'],
        ['n ≤ 1e6', 'O(n)、O(n log n)', '线性筛、单调队列、哈希', 'O(n √n)'],
        ['n ≤ 1e8', 'O(n) 常数极小', '简单循环、位运算', '几乎所有非 O(n) 算法'],
        ['n ≥ 1e9', 'O(log n)、O(1)', '快速幂、数学公式、二分答案', '任何线性算法']
      ]
    },

    { t: 'note', kind: 'tip', x: [
      '**反推流程（拿到题的第一分钟）：**',
      '',
      '1. 找题目里的数据范围，比如 `n ≤ 1e5`',
      '2. 查表：`1e5` 对应 `O(n log n)`',
      '3. 想：哪些算法是 `O(n log n)`？排序、二分、线段树、树状数组、堆……',
      '4. 从中挑一个能表达题目结构的',
      '',
      '**9 成的题，光靠数据范围就能把算法锁定到两三个候选。** 这一分钟是全场回报最高的投资。'
    ].join('\n') },

    { t: 'md', x: [
      '## 常见算法的复杂度速记'
    ].join('\n') },

    { t: 'table',
      head: ['算法', '复杂度', '对应 n 上限（1 秒）'],
      rows: [
        ['一重循环', 'O(n)', '1e8'],
        ['排序', 'O(n log n)', '1e6 ~ 2e6'],
        ['二分查找 / 二分答案', 'O(log n) / O(n log n)', '1e5 ~ 1e6'],
        ['二维前缀和建表', 'O(n·m)', 'n·m ≤ 1e7'],
        ['Dijkstra（堆优化）', 'O((n+m) log n)', 'n,m ≤ 1e5'],
        ['Dijkstra（朴素）', 'O(n²)', 'n ≤ 5000'],
        ['Floyd', 'O(n³)', 'n ≤ 300（稳妥）'],
        ['SPFA', '平均 O(km)，最坏 O(nm)', 'n,m ≤ 1e5（有被卡风险）'],
        ['并查集', '近似 O(α(n)) ≈ O(1)', '1e6'],
        ['记忆化搜索', 'O(状态数 × 转移数)', '视状态数'],
        ['埃氏筛', 'O(n log log n)', '1e7'],
        ['线性筛', 'O(n)', '1e8（内存允许时）'],
        ['矩阵快速幂', 'O(k³ log n)', 'k ≤ 100，n 任意大']
      ]
    },

    { t: 'md', x: [
      '## 空间复杂度与内存',
      '',
      '内存限制 256MB。换算基准：**1 MB = 1024 × 1024 字节 ≈ 1e6 字节**。'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 快速估算某个数组占多少 MB
// int a[N]        → 4N 字节
// long long a[N]  → 8N 字节
// char a[N]       → N 字节

// 例：int a[1000005]  → 4e6 字节 ≈ 4 MB
// 例：int g[5005][5005] → 25e6 × 4 = 100 MB   ← 很危险，接近上限
// 例：long long dp[1005][1005][2] → 1005²×2×8 ≈ 16 MB

// 256MB 能放：
// int   约 6.4e7 个
// long long 约 3.2e7 个
// 二维 int 约 8000 × 8000` },

    { t: 'md', x: [
      '## 常数因子也不能忽视',
      '',
      '同样是 O(n log n)，用 `cin` 不加加速和加了加速，跑 1e6 数据能差 5 倍。三个最有效的常数优化：',
      '',
      '1. **`ios::sync_with_stdio(false); cin.tie(nullptr);`** —— 必加，收益巨大',
      '2. **用 `int` 不用 `long long`**（确认不溢出时）—— 64 位运算慢一些，缓存占用大一倍',
      '3. **数组按行优先访问** —— `a[i][j]` 在 `j` 内层循环时，内存连续，缓存命中率高；反过来写能慢 5~10 倍'
    ].join('\n') },

    { t: 'code', lang: 'cpp', x: R`// 快：内层沿 j 走，连续内存
for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++)
        sum += a[i][j];

// 慢：内层沿 i 走，每次跳跃 m 个元素
for (int j = 0; j < m; j++)
    for (int i = 0; i < n; i++)
        sum += a[i][j];` },

    { t: 'quiz',
      q: '题目给定 `n ≤ 100000`，需要求「数组中和为 k 的两个数的下标」。该用什么复杂度的算法？',
      o: [
        'O(n²) 双重循环',
        'O(n log n) 排序后双指针，或 O(n) 哈希表',
        'O(n!) 全排列',
        'O(3ⁿ) 状态枚举'
      ],
      a: 1,
      e: '`n = 1e5` 时 `O(n²) = 1e10`，一秒只能做 1e8 次运算，必然超时（要 100 秒）。正确做法是 `O(n log n)`：排序后用对撞双指针，或者用 `unordered_map` 记录「还差多少」做到 `O(n)` 平均。这就是数据范围直接锁定算法的典型例子。'
    },

    { t: 'quiz',
      q: '`int dp[3005][3005];` 开成全局数组，大约占用多少内存？',
      o: ['约 9 MB', '约 36 MB', '约 90 MB', '约 360 MB'],
      a: 1,
      e: '`3005 × 3005 ≈ 9.03 × 10⁶` 个元素，每个 `int` 4 字节，总共约 `3.6 × 10⁷` 字节 ≈ 36 MB（1 MB ≈ 1.05e6 字节）。这个大小在 256MB 限制下是安全的。但如果是 `long long`，就是 72MB，再加上其他数组就危险了。'
    }
  ]
}

]);
