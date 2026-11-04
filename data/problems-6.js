/* ==========================================================
   题库 · 第六批：哈希 / 图论 补充
   ========================================================== */
var R = String.raw;

window.PROBLEMS = (window.PROBLEMS || []).concat([

{
  id: 61, g: 'F 组 · 数据结构', title: '不同子串的个数', diff: 'hard', diffName: '较难',
  tag: '字符串哈希', src: '经典哈希题', ref: 25,
  desc: '给定一个字符串 `s`，求它有多少个**互不相同**的连续子串。',
  input: '一行一个字符串 `s`，长度不超过 `2000`，只含小写字母。',
  output: '一行一个整数。',
  samples: [['abc\n', '6\n'], ['aaaa\n', '4\n']],
  noteText: '`abc` 的子串有 `a,b,c,ab,bc,abc`，共 6 个。`aaaa` 有 `a,aa,aaa,aaaa`，共 4 个。',
  hint: '`O(n²)` 枚举所有子串，用**滚动哈希**把每个子串压成一个 `unsigned long long`，扔进 `set` 去重。总复杂度 `O(n² log n)`。\n\n也可以用 `set<string>`，但字符串比较是 `O(n)`，总复杂度会退化。',
  code: R`#include <bits/stdc++.h>
using namespace std;

typedef unsigned long long ull;
const ull BASE = 131;
const int N = 2005;

ull h[N], p[N];

int main() {
    string s;
    cin >> s;
    int n = s.size();

    p[0] = 1;
    for (int i = 1; i <= n; i++) {
        h[i] = h[i-1] * BASE + (unsigned char)s[i-1];
        p[i] = p[i-1] * BASE;
    }

    set<ull> st;
    for (int i = 1; i <= n; i++)
        for (int j = i; j <= n; j++)
            st.insert(h[j] - h[i-1] * p[j-i+1]);

    cout << st.size() << '\n';
    return 0;
}`,
  complexity: 'O(n² log n)',
  pitfall: '`h[l-1] * p[len]` 这一步不能漏乘 `p`。哈希公式是 `h[r] - h[l-1] * BASE^(r-l+1)`，少乘就得不到正确的前缀。'
},

{
  id: 62, g: 'G 组 · 图论', title: '腐烂的橘子', diff: 'mid', diffName: '中等',
  tag: '多源 BFS', src: 'LeetCode 994', ref: 29,
  desc: '给定一个 `n × m` 的网格，`0` 表示空地，`1` 表示新鲜橘子，`2` 表示腐烂橘子。\n\n每分钟，腐烂橘子会让上下左右相邻的新鲜橘子腐烂。求**所有橘子都腐烂需要多少分钟**；如果有橘子永远无法腐烂，输出 `-1`。',
  input: '第一行两个整数 `n m`（`1 ≤ n, m ≤ 500`）。\n接下来 `n` 行，每行 `m` 个整数（`0`/`1`/`2`）。',
  output: '一行一个整数。没有橘子时输出 `0`。',
  samples: [['3 3\n2 1 1\n0 1 1\n0 0 1\n', '4\n'], ['2 2\n2 0\n0 1\n', '-1\n'], ['1 2\n0 2\n', '0\n']],
  noteText: '多源 BFS：所有腐烂橘子同时作为起点入队。',
  hint: '把所有 `2` 一开始就入队（`dist = 0`），然后标准 BFS。\n\n最后扫一遍：还有 `1` 没被访问到 → `-1`；否则答案是所有 `dist` 的最大值。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int g[505][505], dist[505][505];
int dx[4] = {-1, 1, 0, 0}, dy[4] = {0, 0, -1, 1};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    queue<pair<int,int>> q;
    int fresh = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            cin >> g[i][j];
            dist[i][j] = -1;
            if (g[i][j] == 2) { dist[i][j] = 0; q.push({i, j}); }
            if (g[i][j] == 1) fresh++;
        }

    int ans = 0;
    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
            if (g[nx][ny] != 1 || dist[nx][ny] != -1) continue;
            dist[nx][ny] = dist[x][y] + 1;
            ans = max(ans, dist[nx][ny]);
            q.push({nx, ny});
        }
    }

    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            if (g[i][j] == 1 && dist[i][j] == -1) { cout << -1 << '\n'; return 0; }

    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '只用一个起点入队 → 变成单源 BFS，答案偏大。必须**所有腐烂橘子同时入队**。'
},

{
  id: 63, g: 'G 组 · 图论', title: '岛屿数量', diff: 'mid', diffName: '中等',
  tag: 'DFS / 连通块', src: 'LeetCode 200', ref: 33,
  desc: '给定一个 `n × m` 的网格，`1` 表示陆地，`0` 表示水。上下左右相邻的陆地构成一个岛屿。\n\n求岛屿的数量。',
  input: '第一行两个整数 `n m`（`1 ≤ n, m ≤ 1000`）。\n接下来 `n` 行，每行一个长度为 `m` 的 `01` 字符串。',
  output: '一行一个整数。',
  samples: [['4 5\n11000\n11000\n00100\n00011\n', '3\n']],
  noteText: '斜对角相邻不算连通。',
  hint: '遍历每个格子，遇到 `1` 就计数 +1，然后用 DFS 把整个岛「淹掉」（改成 `0`）。\n\n`n·m` 最大 `1e6`，DFS 递归深度可能到 `1e6` → 会爆栈。**用 BFS 或手写栈，或者把 `n·m ≤ 1e5` 当限制。**',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n, m;
vector<string> g;
int dx[4] = {-1, 1, 0, 0}, dy[4] = {0, 0, -1, 1};

void bfs(int sx, int sy) {
    queue<pair<int,int>> q;
    q.push({sx, sy});
    g[sx][sy] = '0';
    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
            if (g[nx][ny] != '1') continue;
            g[nx][ny] = '0';
            q.push({nx, ny});
        }
    }
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n >> m;
    g.resize(n);
    for (auto& row : g) cin >> row;

    int cnt = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            if (g[i][j] == '1') { cnt++; bfs(i, j); }

    cout << cnt << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: 'DFS 递归版本在 `1000 × 1000` 全是陆地时会递归 100 万层，直接爆栈。**网格规模大就用 BFS。**'
},

{
  id: 64, g: 'G 组 · 图论', title: '判断二分图', diff: 'mid', diffName: '中等',
  tag: '染色法', src: 'LeetCode 785', ref: 33,
  desc: '给定一个 `n` 个点 `m` 条边的无向图，判断它是否是二分图。',
  input: '第一行两个整数 `n m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行两个整数 `u v`。',
  output: '是二分图输出 `YES`，否则输出 `NO`。',
  samples: [['4 4\n1 2\n2 3\n3 4\n4 1\n', 'YES\n'], ['3 3\n1 2\n2 3\n3 1\n', 'NO\n']],
  noteText: '二分图 ⟺ 无奇环。三角形有奇环，不是二分图。',
  hint: '染色法：给每个未染色的点染 1，BFS/DFS 把邻居染成相反颜色。如果遇到「邻居和自己同色」，就不是二分图。\n\n**图可能不连通，要对每个未染色的点都启动一次。**',
  code: R`#include <bits/stdc++.h>
using namespace std;

vector<int> g[100005];
int color[100005];

bool bfs(int start) {
    queue<int> q;
    color[start] = 1;
    q.push(start);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u]) {
            if (color[v] == 0) {
                color[v] = 3 - color[u];
                q.push(v);
            } else if (color[v] == color[u]) {
                return false;
            }
        }
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        g[v].push_back(u);
    }

    for (int i = 1; i <= n; i++)
        if (color[i] == 0 && !bfs(i)) { cout << "NO\n"; return 0; }

    cout << "YES\n";
    return 0;
}`,
  complexity: 'O(n + m)',
  pitfall: '只从 1 号点开始染色：图不连通时会漏掉其他连通块，把非二分图判成二分图。'
},

{
  id: 65, g: 'G 组 · 图论', title: '任意两点最短路', diff: 'hard', diffName: '较难',
  tag: 'Floyd', src: '经典最短路', ref: 31,
  desc: '给定一个 `n` 个点 `m` 条边的无向图（边权为正），回答 `q` 次询问，每次求 `u` 到 `v` 的最短距离。\n\n不可达输出 `-1`。',
  input: '第一行三个整数 `n m q`（`1 ≤ n ≤ 300`，`0 ≤ m ≤ 10^5`，`1 ≤ q ≤ 10^4`）。\n接下来 `m` 行，每行三个整数 `u v w`（`1 ≤ w ≤ 10^4`）。\n接下来 `q` 行，每行两个整数 `u v`。',
  output: '`q` 行，每行一个整数。',
  samples: [['3 3 2\n1 2 1\n2 3 2\n1 3 5\n1 3\n1 2\n', '3\n1\n']],
  noteText: '有重边，取最小值。',
  hint: 'n ≤ 300，用 Floyd `O(n³) = 2.7e7`，能过。\n\n初始化：`d[i][i] = 0`，其余 `INF`；读边时 `d[u][v] = min(d[u][v], w)`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

const int INF = 0x3f3f3f3f;
int d[305][305];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, q;
    cin >> n >> m >> q;

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++) d[i][j] = (i == j) ? 0 : INF;

    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        d[u][v] = min(d[u][v], w);
        d[v][u] = min(d[v][u], w);
    }

    for (int k = 1; k <= n; k++)
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= n; j++)
                if (d[i][k] < INF && d[k][j] < INF)
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j]);

    while (q--) {
        int u, v;
        cin >> u >> v;
        cout << (d[u][v] >= INF ? -1 : d[u][v]) << '\n';
    }
    return 0;
}`,
  complexity: 'O(n³ + q)',
  pitfall: '`k` 循环写到内层，答案会错。另外 `d[i][k] + d[k][j]` 在两者都是 `INF` 时会溢出成负数，要加判断。'
},

{
  id: 66, g: 'G 组 · 图论', title: 'DAG 上的最长路', diff: 'hard', diffName: '较难',
  tag: '拓扑排序 + DP', src: '经典 DAG DP', ref: 30,
  desc: '给定一个 `n` 个点 `m` 条边的**有向无环图**，每条边有权值。求从 `1` 号点到 `n` 号点的最长路径长度。\n\n如果 `1` 到 `n` 不可达，输出 `-1`。',
  input: '第一行两个整数 `n m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行三个整数 `u v w`（`1 ≤ w ≤ 10^4`），表示 `u → v` 的边。\n保证图无环。',
  output: '一行一个整数。',
  samples: [['4 4\n1 2 3\n1 3 1\n2 4 2\n3 4 5\n', '6\n'], ['3 1\n1 2 4\n', '-1\n']],
  noteText: '样例 1：`1→2→4` 长 5，`1→3→4` 长 6，最长是 6。',
  hint: '按拓扑序做 DP：`dist[v] = max(dist[v], dist[u] + w)`。\n\n拓扑序保证「所有前驱都已算完」，所以一次遍历就能得到正确答案。用任意顺序更新会出错。',
  code: R`#include <bits/stdc++.h>
using namespace std;

struct Edge { int to, w; };
vector<Edge> g[100005];
int indeg[100005];
long long dist[100005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        g[u].push_back({v, w});
        indeg[v]++;
    }

    queue<int> q;
    for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.push(i);

    memset(dist, -1, sizeof(dist));
    dist[1] = 0;

    while (!q.empty()) {
        int u = q.front(); q.pop();
        if (dist[u] >= 0) {
            for (auto& e : g[u])
                dist[e.to] = max(dist[e.to], dist[u] + e.w);
        }
        for (auto& e : g[u])
            if (--indeg[e.to] == 0) q.push(e.to);
    }

    cout << dist[n] << '\n';
    return 0;
}`,
  complexity: 'O(n + m)',
  pitfall: '`dist` 初始化为 -1 表示不可达，`dist[1] = 0`。样例 1 的正确答案是 6（`1→3→4` = 1+5），不是 8。'
},

{
  id: 67, g: 'H 组 · 动态规划', title: '最小路径和', diff: 'mid', diffName: '中等',
  tag: '网格 DP', src: 'LeetCode 64', ref: 35,
  desc: '给定一个 `n × m` 的非负整数矩阵，从左上角走到右下角，每次只能**向右或向下**走一步。\n\n求路径上所有数字之和的最小值。',
  input: '第一行两个整数 `n m`（`1 ≤ n, m ≤ 200`）。\n接下来 `n` 行，每行 `m` 个整数（`0 ≤ a ≤ 1000`）。',
  output: '一行一个整数。',
  samples: [['3 3\n1 3 1\n1 5 1\n4 2 1\n', '7\n'], ['2 2\n1 2\n1 1\n', '3\n']],
  noteText: '样例 1 的最优路径：`1→3→1→1→1`，和 7。',
  hint: '`f[i][j] = a[i][j] + min(f[i-1][j], f[i][j-1])`。\n\n第一行只能从左边来，第一列只能从上边来，要单独初始化（或者把 `f` 的边界设成 `INF`）。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int a[205][205];
long long f[205][205];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) cin >> a[i][j];

    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (i == 1 && j == 1) { f[i][j] = a[i][j]; continue; }
            long long best = LLONG_MAX;
            if (i > 1) best = min(best, f[i-1][j]);
            if (j > 1) best = min(best, f[i][j-1]);
            f[i][j] = best + a[i][j];
        }

    cout << f[n][m] << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '把边界 `f[0][j]` 和 `f[i][0]` 默认成 0，结果第一行会「从上面来」取到 0，答案偏小。要么特判首行首列，要么把边界设成 `INF`。'
},

{
  id: 68, g: 'G 组 · 图论', title: '最大连通块面积', diff: 'mid', diffName: '中等',
  tag: 'BFS / 连通块', src: '经典网格题', ref: 33,
  desc: '给定一个 `n × m` 的 `01` 网格，求最大的全 `1` 连通块里有多少个格子。\n\n上下左右相邻算连通。如果全是 `0`，输出 `0`。',
  input: '第一行两个整数 `n m`（`1 ≤ n, m ≤ 500`）。\n接下来 `n` 行，每行一个长度为 `m` 的 `01` 字符串。',
  output: '一行一个整数。',
  samples: [['4 5\n11000\n11000\n00100\n00011\n', '4\n'], ['2 2\n01\n10\n', '1\n']],
  noteText: '每个格子最多被访问一次。',
  hint: '遍历每个 `1`，BFS 求这一块的面积，取最大值。BFS 的时候直接把访问过的格子改成 `0`，省掉 `vis` 数组。',
  code: R`#include <bits/stdc++.h>
using namespace std;

int n, m;
vector<string> g;
int dx[4] = {-1, 1, 0, 0}, dy[4] = {0, 0, -1, 1};

int bfs(int sx, int sy) {
    queue<pair<int,int>> q;
    q.push({sx, sy});
    g[sx][sy] = '0';
    int area = 0;
    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        area++;
        for (int d = 0; d < 4; d++) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
            if (g[nx][ny] != '1') continue;
            g[nx][ny] = '0';
            q.push({nx, ny});
        }
    }
    return area;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n >> m;
    g.resize(n);
    for (auto& row : g) cin >> row;

    int ans = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            if (g[i][j] == '1') ans = max(ans, bfs(i, j));

    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(nm)',
  pitfall: '`area++` 放在 `q.pop()` 之后，而不是入队时。放错位置会重复计数或漏计。'
},

{
  id: 69, g: 'G 组 · 图论', title: '二分图最大匹配', diff: 'insane', diffName: '困难',
  tag: '匈牙利算法', src: '经典匹配', ref: 33,
  desc: '有 `n` 个左边点和 `m` 个右边点，以及 `e` 条边。求最大匹配数（最多能配出多少对）。',
  input: '第一行三个整数 `n m e`（`1 ≤ n, m ≤ 500`，`0 ≤ e ≤ 10^5`）。\n接下来 `e` 行，每行两个整数 `u v`，表示左边 `u` 与右边 `v` 之间有一条边。',
  output: '一行一个整数。',
  samples: [['3 3 4\n1 1\n1 2\n2 2\n3 3\n', '3\n']],
  noteText: '每个点只能匹配一次。',
  hint: '匈牙利算法：对每个左点尝试找增广路。`match[v]` 记录右边点 `v` 匹配的左点。\n\n`dfs(u)` 里遍历 `u` 的邻居 `v`，如果 `v` 没被访问过，标记后递归尝试「让 `v` 的原配换一个」，成功就把 `v` 让给 `u`。',
  code: R`#include <bits/stdc++.h>
using namespace std;

vector<int> g[505];
int matchR[505];
bool used[505];

bool dfs(int u) {
    for (int v : g[u]) {
        if (used[v]) continue;
        used[v] = true;
        if (matchR[v] == 0 || dfs(matchR[v])) {
            matchR[v] = u;
            return true;
        }
    }
    return false;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, e;
    cin >> n >> m >> e;
    for (int i = 0; i < e; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
    }

    int ans = 0;
    for (int u = 1; u <= n; u++) {
        memset(used, 0, sizeof(used));
        if (dfs(u)) ans++;
    }

    cout << ans << '\n';
    return 0;
}`,
  complexity: 'O(n · e)',
  pitfall: '`used` 数组每次 DFS 都要清空（针对右边点），否则第二个左点会错误地跳过已经被访问过的右边点。'
},

{
  id: 70, g: 'G 组 · 图论', title: '判断有向图是否有环', diff: 'mid', diffName: '中等',
  tag: '拓扑排序', src: '基础图论', ref: 30,
  desc: '给定一个 `n` 个点 `m` 条边的有向图，判断它是否存在环。',
  input: '第一行两个整数 `n m`（`1 ≤ n ≤ 10^5`，`0 ≤ m ≤ 2×10^5`）。\n接下来 `m` 行，每行两个整数 `u v`，表示 `u → v`。',
  output: '有环输出 `YES`，否则输出 `NO`。',
  samples: [['3 3\n1 2\n2 3\n3 1\n', 'YES\n'], ['3 2\n1 2\n2 3\n', 'NO\n']],
  noteText: '自环（`u == v`）也算环。',
  hint: 'Kahn 算法：统计入度，把所有入度为 0 的点入队，能全部弹出说明无环；有剩余说明有环。\n\n代码比 DFS 染色法短得多，推荐。',
  code: R`#include <bits/stdc++.h>
using namespace std;

vector<int> g[100005];
int indeg[100005];

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        indeg[v]++;
    }

    queue<int> q;
    for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.push(i);

    int cnt = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        cnt++;
        for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
    }

    cout << (cnt == n ? "NO\n" : "YES\n");
    return 0;
}`,
  complexity: 'O(n + m)',
  pitfall: '输出反了：`cnt == n` 表示所有点都能被拓扑排序处理，说明**无环**，应该输出 `NO`。'
}

]);
