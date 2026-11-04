/* ==========================================================
   C++ 算法竞赛特训 · 渲染引擎
   ========================================================== */
(function () {
  'use strict';

  /* ---------------- 阶段元信息 ---------------- */
  var STAGES = [
    { n: 1, num: 'STAGE 01', name: 'C++ 语言基础',
      desc: '从编译运行到 STL，把写代码这件事变成肌肉记忆。没有这一层，后面全是空中楼阁。' },
    { n: 2, num: 'STAGE 02', name: '算法基础工具',
      desc: '复杂度、枚举、二分、前缀和、双指针、贪心、高精度、位运算 —— 竞赛一半的分在这里。' },
    { n: 3, num: 'STAGE 03', name: '核心数据结构',
      desc: '栈队列、单调结构、并查集、堆、哈希、树状数组、线段树。' },
    { n: 4, num: 'STAGE 04', name: '图论',
      desc: '建图、遍历、拓扑、最短路、最小生成树、连通性。竞赛压轴常客。' },
    { n: 5, num: 'STAGE 05', name: '动态规划',
      desc: '从状态定义到转移方程，六大 DP 模型全覆盖。' },
    { n: 6, num: 'STAGE 06', name: '数学与数论',
      desc: '筛法、快速幂、gcd/exgcd、组合数学与逆元、容斥。填空题的送分区。' },
    { n: 7, num: 'STAGE 07', name: '进阶技巧与实战',
      desc: '搜索剪枝、分治、倍增与 ST 表、离散化，以及考场的得分策略。' }
  ];

  var CHAPTERS = window.CHAPTERS || [];
  var PROBLEMS = window.PROBLEMS || [];

  /* 每道题除了页面上的样例，判题时还会跑的隐藏用例数量。
     由 tools/gen_hidden_testcases.py 统一生成 3 组，改那边要同步这里。 */
  var HIDDEN_CASES = 3;

  var STORE_KEY = 'lqcpp_progress_v1';
  var prog = loadProgress();

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          p.chapters = p.chapters || {};
          p.problems = p.problems || {};
          return p;
        }
      }
    } catch (e) { /* ignore */ }
    return { chapters: {}, problems: {} };
  }

  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prog)); } catch (e) { /* ignore */ }
  }

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function el(id) { return document.getElementById(id); }

  /* ---------------- C++ 语法高亮 ---------------- */
  var KW = new Set(('alignas alignof and and_eq asm auto bitand bitor break case catch class compl ' +
    'const constexpr const_cast continue decltype default delete do dynamic_cast else enum explicit ' +
    'export extern false for friend goto if inline mutable namespace new noexcept not not_eq nullptr ' +
    'operator or or_eq private protected public register reinterpret_cast return sizeof static ' +
    'static_assert static_cast struct switch template this throw true try typedef typeid typename ' +
    'union using virtual volatile while xor xor_eq').split(' '));

  var TY = new Set(('bool char char16_t char32_t double float int long short signed unsigned void ' +
    'wchar_t size_t string vector map set multiset multimap unordered_map unordered_set queue stack ' +
    'deque priority_queue pair tuple array bitset list forward_list valarray complex function ' +
    'int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t').split(' '));

  function tk(cls, txt) { return '<span class="tk-' + cls + '">' + esc(txt) + '</span>'; }

  function highlight(code) {
    var out = '', i = 0, n = code.length, c, j, w;

    while (i < n) {
      c = code[i];

      /* 行注释 */
      if (c === '/' && code[i + 1] === '/') {
        j = code.indexOf('\n', i);
        if (j < 0) j = n;
        out += tk('cm', code.slice(i, j));
        i = j; continue;
      }

      /* 块注释 */
      if (c === '/' && code[i + 1] === '*') {
        j = code.indexOf('*/', i + 2);
        j = j < 0 ? n : j + 2;
        out += tk('cm', code.slice(i, j));
        i = j; continue;
      }

      /* 字符串 / 字符字面量 */
      if (c === '"' || c === "'") {
        j = i + 1;
        while (j < n) {
          if (code[j] === '\\') { j += 2; continue; }
          if (code[j] === c) { j++; break; }
          if (code[j] === '\n') break;
          j++;
        }
        out += tk('st', code.slice(i, j));
        i = j; continue;
      }

      /* 预处理指令 */
      if (c === '#' && (i === 0 || code[i - 1] === '\n')) {
        j = code.indexOf('\n', i);
        if (j < 0) j = n;
        out += tk('pp', code.slice(i, j));
        i = j; continue;
      }

      /* 数字 */
      if (c >= '0' && c <= '9') {
        j = i;
        while (j < n && /[0-9a-fA-FxX.]/.test(code[j])) j++;
        out += tk('nu', code.slice(i, j));
        i = j; continue;
      }

      /* 标识符 */
      if (/[A-Za-z_]/.test(c)) {
        j = i;
        while (j < n && /[A-Za-z0-9_]/.test(code[j])) j++;
        w = code.slice(i, j);
        if (KW.has(w)) out += tk('kw', w);
        else if (TY.has(w)) out += tk('ty', w);
        else if (code[j] === '(') out += tk('fn', w);
        else out += esc(w);
        i = j; continue;
      }

      out += esc(c);
      i++;
    }
    return out;
  }

  /* ---------------- 行内 Markdown ---------------- */
  function inline(s) {
    var t = esc(s);
    t = t.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return t;
  }

  /* ---------------- 块级 Markdown ---------------- */
  function md(text) {
    var lines = String(text).split('\n');
    var html = '', buf = [], list = null, quote = [];

    function flushP() {
      if (buf.length) { html += '<p>' + inline(buf.join(' ')) + '</p>'; buf = []; }
    }
    function flushList() {
      if (list) {
        html += '<' + list.tag + ' class="md-' + list.tag + '">' +
          list.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') +
          '</' + list.tag + '>';
        list = null;
      }
    }
    function flushQuote() {
      if (quote.length) {
        html += '<div class="md-quote">' + inline(quote.join(' ')) + '</div>';
        quote = [];
      }
    }
    function flushAll() { flushP(); flushList(); flushQuote(); }

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var t = ln.trim();

      if (t === '') { flushAll(); continue; }

      var m;
      if ((m = t.match(/^###\s+(.*)$/))) { flushAll(); html += '<h3>' + inline(m[1]) + '</h3>'; continue; }
      if ((m = t.match(/^##\s+(.*)$/))) { flushAll(); html += '<h2>' + inline(m[1]) + '</h2>'; continue; }
      if ((m = t.match(/^>\s?(.*)$/))) { flushP(); flushList(); quote.push(m[1]); continue; }
      if ((m = t.match(/^[-*]\s+(.*)$/))) {
        flushP(); flushQuote();
        if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
        list.items.push(m[1]); continue;
      }
      if ((m = t.match(/^\d+\.\s+(.*)$/))) {
        flushP(); flushQuote();
        if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
        list.items.push(m[1]); continue;
      }

      flushList(); flushQuote();
      buf.push(ln.trim());
    }
    flushAll();
    return html;
  }

  /* ---------------- 代码块 ---------------- */
  var cid = 0;
  function codeBlock(src, lang) {
    cid++;
    var id = 'code-' + cid;
    return '<div class="code-block">' +
      '<div class="code-head">' +
        '<span class="code-dots"><i></i><i></i><i></i></span>' +
        '<span class="code-lang">' + esc(lang || 'cpp') + '</span>' +
        '<button class="copy-btn" data-copy="' + id + '">复制</button>' +
      '</div>' +
      '<pre id="' + id + '"><code>' + highlight(src) + '</code></pre>' +
    '</div>';
  }

  /* ---------------- 表格 ---------------- */
  function table(head, rows) {
    var h = '<div class="tbl-wrap"><table><thead><tr>' +
      head.map(function (x) { return '<th>' + inline(x) + '</th>'; }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>' + r.map(function (x) { return '<td>' + inline(x) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---------------- 提示框 ---------------- */
  var NOTE_ICON = { tip: '✓', warn: '!', danger: '×', info: 'i' };

  function note(kind, body) {
    kind = kind || 'info';
    return '<div class="note ' + kind + '">' +
      '<div class="note-icon">' + (NOTE_ICON[kind] || 'i') + '</div>' +
      '<div class="note-body">' + md(body) + '</div>' +
    '</div>';
  }

  /* ---------------- 自测题 ---------------- */
  function quiz(sec, idx) {
    var opts = sec.o.map(function (o, i) {
      return '<div class="quiz-opt" data-i="' + i + '">' +
        '<span class="quiz-key">' + 'ABCD'[i] + '</span><span>' + inline(o) + '</span></div>';
    }).join('');

    return '<div class="quiz" data-answer="' + sec.a + '" data-idx="' + (idx == null ? -1 : idx) + '">' +
      '<div class="quiz-head"><span class="quiz-q-no">检查</span><span>' + inline(sec.q) + '</span></div>' +
      '<div class="quiz-opts">' + opts + '</div>' +
      '<div class="quiz-expl">' + (sec.e ? md(sec.e) : '') + '</div>' +
    '</div>';
  }

  /* ---------------- section 分发 ---------------- */
  function renderSection(s, idx) {
    if (typeof s === 'string') return md(s);
    switch (s.t) {
      case 'code': return codeBlock(s.x, s.lang);
      case 'note': return note(s.kind, s.x);
      case 'table': return table(s.head, s.rows);
      case 'quiz': return quiz(s, idx);
      case 'html': return s.x;
      case 'md':
      default: return md(s.x || '');
    }
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderSidebar(mode) {
    var box = el('sidebarList');
    var html = '';

    if (mode === 'learn') {
      STAGES.forEach(function (st) {
        var list = CHAPTERS.filter(function (c) { return c.s === st.n; });
        if (!list.length) return;
        html += '<div class="stage-title">' + esc(st.name) + '</div>';
        list.forEach(function (c) {
          var done = !!prog.chapters[c.id];
          html += '<div class="nav-item' + (done ? ' done' : '') + '" data-go="#/learn/' + c.id + '">' +
            '<span class="dot"></span>' +
            '<span class="nav-text">' + inline(c.title) + '</span>' +
            '<span class="nav-idx">' + c.id + '</span>' +
          '</div>';
        });
      });
    } else if (mode === 'practice') {
      var groups = [];
      PROBLEMS.forEach(function (p) {
        if (groups.indexOf(p.g) < 0) groups.push(p.g);
      });
      groups.forEach(function (g) {
        html += '<div class="stage-title">' + esc(g) + '</div>';
        PROBLEMS.filter(function (p) { return p.g === g; }).forEach(function (p) {
          var done = !!prog.problems[p.id];
          html += '<div class="nav-item' + (done ? ' done' : '') + '" data-go="#/practice/' + p.id + '">' +
            '<span class="dot"></span>' +
            '<span class="nav-text">' + inline(p.title) + '</span>' +
            '<span class="nav-idx diff-idx">' + esc(p.diffName || '') + '</span>' +
          '</div>';
        });
      });
    } else if (mode === 'ext') {
      html = '<div class="stage-title">我的</div>';
      if (API.isLogged()) {
        var u = API.user();
        html +=
          '<div class="nav-item" data-go="#/profile">' +
            '<span class="dot"></span><span class="nav-text">个人中心</span>' +
          '</div>' +
          '<div class="nav-item" data-go="#/stats">' +
            '<span class="dot"></span><span class="nav-text">学习统计</span>' +
          '</div>' +
          '<div class="nav-item" data-go="#/settings">' +
            '<span class="dot"></span><span class="nav-text">账号设置</span>' +
          '</div>';
        if (API.isAdmin()) {
          html += '<div class="stage-title">管理</div>' +
            '<div class="nav-item" data-go="#/admin">' +
              '<span class="dot"></span><span class="nav-text">管理后台</span>' +
            '</div>';
        }
        html += '<div class="stage-title">账号</div>' +
          '<div style="padding:6px 10px 4px;font-size:12px;color:var(--text-mute);line-height:1.8">' +
            '当前：<b style="color:var(--text-dim)">' + esc(u.display_name || u.username) + '</b><br>' +
            '<span style="color:#4d566b">' + esc(u.role) + '</span>' +
          '</div>';
      } else {
        html +=
          '<div class="nav-item" data-go="#/login">' +
            '<span class="dot"></span><span class="nav-text">登录</span>' +
          '</div>' +
          '<div class="nav-item" data-go="#/register">' +
            '<span class="dot"></span><span class="nav-text">注册</span>' +
          '</div>' +
          '<div class="stage-title">说明</div>' +
          '<div style="padding:6px 10px 4px;font-size:12px;color:var(--text-mute);line-height:1.75">' +
            (API.isOnline()
              ? '登录后学习进度会同步到服务器，换设备能接着学。'
              : '后端未启动，当前为<b style="color:var(--amber)">纯静态模式</b>，进度只存在本机浏览器。') +
          '</div>';
      }
    } else {
      html =
        '<div class="stage-title">快速开始</div>' +
        '<div class="nav-item active" data-go="#/runner">' +
          '<span class="dot"></span><span class="nav-text">代码运行器</span><span class="nav-idx">C++14</span>' +
        '</div>' +
        '<div class="stage-title">说明</div>' +
        '<div style="padding:6px 10px 4px;font-size:12px;color:var(--text-mute);line-height:1.75">' +
          '在右侧写代码，点「运行」直接编译执行。' +
          '<br><span style="color:var(--text-dim)">Ctrl + Enter</span> 快捷运行。' +
          '<br><br>编译器版本 <b style="color:var(--text-dim)">g++ -std=c++14 -O2</b>，与主流竞赛考场一致。' +
        '</div>' +
        '<div class="stage-title">模板</div>' +
        '<div style="padding:6px 10px 4px;font-size:12px;color:var(--text-mute);line-height:1.75">' +
          '右侧下拉框可插入：万能开头、快速读入、并查集、Dijkstra、树状数组。' +
        '</div>';
    }

    if (!html) html = '<div class="empty">暂无内容</div>';
    box.innerHTML = html;

    /* 侧边栏重建后，保持搜索框当前的过滤状态 */
    var sb = el('searchInput');
    if (sb && sb.value.trim()) applyFilter(sb.value.trim().toLowerCase());
  }

  function applyFilter(q) {
    document.querySelectorAll('.nav-item').forEach(function (n) {
      var txt = n.textContent.toLowerCase();
      n.style.display = (!q || txt.indexOf(q) >= 0) ? '' : 'none';
    });
  }

  /* ---------------- 进度刷新 ---------------- */
  function refreshProgress() {
    var total = CHAPTERS.length || 1;
    var done = 0;
    CHAPTERS.forEach(function (c) { if (prog.chapters[c.id]) done++; });
    var pct = Math.round(done / total * 100);
    el('progressPct').textContent = pct + '%';
    el('progressBar').style.width = pct + '%';
  }

  /* ---------------- 路由 ---------------- */
  /* 这些页面由 pages-user.js / pages-admin.js 提供，不属于知识/练习两栏 */
  var EXT_PAGES = {
    login: 1, register: 1, profile: 1, stats: 1, settings: 1, user: 1, admin: 1
  };

  function route() {
    stopDwellTimer();

    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    var root = parts[0] || 'learn';
    var id = parts[1] || '';

    /* 扩展页面 */
    if (EXT_PAGES[root]) {
      document.querySelectorAll('.mode-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      renderSidebar('ext');
      renderExtPage(root, id, parts.slice(2));
      el('content').scrollTop = 0;
      el('sidebar').classList.remove('open');
      return;
    }

    var mode = root === 'practice' ? 'practice' : (root === 'runner' ? 'runner' : 'learn');

    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    renderSidebar(mode);

    if (mode === 'runner') {
      renderRunnerPage();
    } else if (mode === 'practice') {
      if (id) renderProblem(id);
      else renderPracticeHome();
    } else {
      if (id) renderChapter(id);
      else renderLearnHome();
    }

    el('content').scrollTop = 0;
    el('sidebar').classList.remove('open');
  }

  function renderExtPage(root, id, rest) {
    var c = el('content');
    try {
      if (root === 'admin') {
        if (window.AdminPages) window.AdminPages.render(c, id, rest || []);
        else c.innerHTML = '<div class="wrap"><div class="empty">管理模块未加载</div></div>';
        setCrumb('管理后台');
        return;
      }
      if (root === 'user') {
        if (window.Pages) window.Pages.user(c, id);
        setCrumb('用户主页');
        return;
      }
      var fn = window.Pages && window.Pages[root];
      if (fn) {
        fn(c, id);
        setCrumb({ login: '登录', register: '注册', profile: '个人中心',
                   stats: '学习统计', settings: '账号设置' }[root] || '');
      } else {
        c.innerHTML = '<div class="wrap"><div class="empty">页面不存在</div></div>';
      }
    } catch (err) {
      c.innerHTML = '<div class="wrap"><div class="empty">页面渲染出错：' + esc(err.message) + '</div></div>';
    }
  }

  function setCrumb(txt) { el('crumb').innerHTML = txt; }

  /* ---------------- 首页 ---------------- */
  function renderLearnHome() {
    setCrumb('<b>知识学习</b> · 学习路线');

    var done = 0;
    CHAPTERS.forEach(function (c) { if (prog.chapters[c.id]) done++; });
    var pDone = 0;
    PROBLEMS.forEach(function (p) { if (prog.problems[p.id]) pDone++; });

    var h = '<div class="wrap wide">';
    h += '<div class="hero">' +
      '<h1>从入门到拿奖，一条不打折的路</h1>' +
      '<p>按顺序学完 ' + CHAPTERS.length + ' 个知识点专题，再进入 ' + PROBLEMS.length +
      ' 道配套题目。每节都有可编译代码、易错点、自测题。学完不是目的，能默写模板才是。</p>' +
    '</div>';

    h += '<div id="homeTips"></div>';

    h += '<div class="stat-row">' +
      '<div class="stat"><b>' + CHAPTERS.length + '</b><span>知识专题</span></div>' +
      '<div class="stat"><b>' + done + '</b><span>已学完</span></div>' +
      '<div class="stat"><b>' + PROBLEMS.length + '</b><span>配套题目</span></div>' +
      '<div class="stat"><b>' + pDone + '</b><span>已通过</span></div>' +
    '</div>';

    h += '<h2>七个阶段</h2><div class="stage-grid">';
    STAGES.forEach(function (st) {
      var list = CHAPTERS.filter(function (c) { return c.s === st.n; });
      var d = list.filter(function (c) { return prog.chapters[c.id]; }).length;
      var pct = list.length ? Math.round(d / list.length * 100) : 0;
      h += '<div class="stage-card" data-go="' + (list.length ? '#/learn/' + list[0].id : '#/learn') + '">' +
        '<div class="stage-num">' + st.num + '</div>' +
        '<div class="stage-name">' + esc(st.name) + '</div>' +
        '<div class="stage-desc">' + esc(st.desc) + '</div>' +
        '<div class="stage-prog"><span>' + d + '/' + list.length + '</span>' +
          '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
          '<span>' + pct + '%</span>' +
        '</div>' +
      '</div>';
    });
    h += '</div>';

    h += '<h2>怎么用这个站</h2>' + md(
      '1. **按编号顺序学**，不要跳。前面的数组、函数、STL 是后面所有算法的地基。\n' +
      '2. 每节的代码**自己敲一遍并编译运行**，看懂了不等于会写，比赛都是闭卷手写。\n' +
      '3. 每节末尾的自测题必须答对才能标"已学完"——答错说明那一节白学了。\n' +
      '4. 学完一个阶段再去题库做对应分组的题，做不出来说明知识点没进脑子，回去重看。\n' +
      '5. 最后的《考场模板与代码库》要背到能默写，场上那几个小时没时间现推。'
    );

    h += '<div class="note tip"><div class="note-icon">✓</div><div class="note-body">' +
      '<p><strong>代码可以直接跑。</strong>站点自带真实评测：在「代码运行」里写代码，' +
      '或直接在题目页点「运行」看样例、点「提交评测」判分。' +
      '用的是真实的 <code class="inline">g++ -std=c++14 -O2</code>，不是模拟执行。</p></div></div>';

    h += '<div class="note info"><div class="note-icon">i</div><div class="note-body">' +
      '<p><strong>关于赛制：</strong>常见的 C++ 算法竞赛——蓝桥杯、ACM/ICPC 校赛、CCPC、天梯赛——' +
      '规则各不相同，但考的核心能力是同一套：<strong>读题、建模、写对、写快</strong>。' +
      '以蓝桥杯为例，第 17 届起是 <strong>2 道填空 + 6 道编程，满分 100 分，时长 4 小时</strong>，' +
      '填空题不要求通用解法，能算出答案就行，<strong>Excel / Python / 暴力枚举</strong> 都是合法工具。' +
      '换到 ACM 赛制，则是三人一队、实时榜单、按过题数排名——练的东西照样管用。</p></div></div>';

    h += '</div>';
    el('content').innerHTML = h;

    renderHomeTips();
  }

  /* ---------------- 首页状态条 ---------------- */
  function renderHomeTips() {
    var box = el('homeTips');
    if (!box) return;

    if (!API.isOnline()) {
      box.innerHTML =
        '<div class="home-band">' +
          '<div class="hb-left"><b>当前是纯静态模式</b>' +
          '<span>后端没启动，学习进度只存在这台设备的浏览器里。</span></div>' +
          '<div class="hb-right"><span class="hb-code">python -m server.main</span></div>' +
        '</div>';
      return;
    }

    if (!API.isLogged()) {
      box.innerHTML =
        '<div class="home-band accent">' +
          '<div class="hb-left"><b>登录后进度自动同步</b>' +
          '<span>换电脑接着学，做题记录和掌握度分析都跟着你走。</span></div>' +
          '<div class="hb-right">' +
            '<a class="btn btn-primary btn-sm" href="#/register">免费注册</a>' +
            '<a class="btn btn-sm" href="#/login">已有账号</a>' +
          '</div>' +
        '</div>';
      return;
    }

    box.innerHTML = '<div class="home-band loading-band">加载今日建议…</div>';
    API.stats.tips().then(function (tips) {
      if (!tips || !tips.length) { box.innerHTML = ''; return; }
      var first = tips[0];
      box.innerHTML =
        '<div class="home-band ' + (first.level === 'warn' ? 'warn' : first.level === 'ok' ? 'ok' : '') + '">' +
          '<div class="hb-left"><b>' + esc(first.title) + '</b>' +
          '<span>' + esc(first.detail) + '</span></div>' +
          '<div class="hb-right">' +
            (first.action ? '<a class="btn btn-sm" href="' + esc(first.action) + '">去看看</a>' : '') +
            '<a class="btn btn-sm" href="#/profile">个人中心</a>' +
          '</div>' +
        '</div>';
    }).catch(function () { box.innerHTML = ''; });
  }
  function renderChapter(id) {
    var idx = -1;
    for (var i = 0; i < CHAPTERS.length; i++) { if (String(CHAPTERS[i].id) === String(id)) { idx = i; break; } }
    if (idx < 0) { el('content').innerHTML = '<div class="wrap"><div class="empty">找不到这一节</div></div>'; return; }

    var c = CHAPTERS[idx];
    var st = STAGES.filter(function (x) { return x.n === c.s; })[0] || {};
    var done = !!prog.chapters[c.id];

    setCrumb('<b>' + esc(st.name || '') + '</b> · 第 ' + c.id + ' 节');

    var h = '<div class="wrap"><div class="chapter-head">';
    h += '<div class="chapter-meta">' +
      '<span class="tag stage">' + esc(st.num || '') + '</span>' +
      '<span class="tag">' + c.id + ' / ' + CHAPTERS.length + '</span>' +
      (c.min ? '<span class="tag">约 ' + c.min + ' 分钟</span>' : '') +
      '</div>';
    h += '<h1>' + inline(c.title) + '</h1>';
    h += '</div>';

    if (c.goals && c.goals.length) {
      h += '<div class="goals"><div class="goals-title">学完这一节，你应该能</div><ul>' +
        c.goals.map(function (g) { return '<li>' + inline(g) + '</li>'; }).join('') + '</ul></div>';
    }

    h += c.body.map(function (s, i) { return renderSection(s, i); }).join('');

    /* 底部导航 */
    h += '<div class="chapter-foot">';
    h += '<button class="btn" ' + (idx === 0 ? 'disabled' : '') + ' data-go="' +
      (idx > 0 ? '#/learn/' + CHAPTERS[idx - 1].id : '#/learn') + '">← 上一节</button>';
    h += '<span class="spacer"></span>';
    h += '<button class="btn ' + (done ? 'ok' : 'primary') + '" id="markBtn">' +
      (done ? '✓ 已学完（点击取消）' : '标记为已学完') + '</button>';
    h += '<button class="btn" ' + (CHAPTERS[idx + 1] ? '' : 'disabled') + ' data-go="' +
      (CHAPTERS[idx + 1] ? '#/learn/' + CHAPTERS[idx + 1].id : '#/learn') + '">下一节 →</button>';
    h += '</div>';

    h += '</div>';
    el('content').innerHTML = h;
    el('content').setAttribute('data-chapter', c.id);

    var mb = el('markBtn');
    if (mb) {
      mb.addEventListener('click', function () {
        var willDone = !prog.chapters[c.id];
        if (willDone) prog.chapters[c.id] = Date.now();
        else delete prog.chapters[c.id];
        saveProgress();

        /* 登录状态下同步到服务器 */
        if (API.isOnline() && API.isLogged()) {
          mb.disabled = true;
          API.progress.save({
            chapter_id: c.id,
            status: willDone ? 'done' : 'learning',
            seconds_delta: 0,
            scroll_percent: willDone ? 100 : 0
          }).then(function () {
            if (window.Pages) window.Pages.toast(willDone ? '已标记学完，进度已同步' : '已取消完成标记', 'ok');
          }).catch(function (e) {
            if (window.Pages) window.Pages.toast('同步失败：' + e.message, 'bad');
          }).then(function () {
            mb.disabled = false;
            route();
            refreshProgress();
          });
        } else {
          route();
          refreshProgress();
        }
      });
    }

    startDwellTimer(c.id);
  }

  /* ---------------- 停留时长统计 ---------------- */
  var _dwellTimer = null;
  var _dwellChapter = null;
  var _dwellSec = 0;

  function startDwellTimer(chapterId) {
    stopDwellTimer();
    _dwellChapter = chapterId;
    _dwellSec = 0;
    if (!API.isOnline() || !API.isLogged()) return;
    _dwellTimer = setInterval(function () {
      _dwellSec += 30;
      flushDwell();
    }, 30000);
  }

  function flushDwell() {
    if (!_dwellChapter || !_dwellSec) return;
    var sec = _dwellSec;
    _dwellSec = 0;
    API.progress.save({ chapter_id: _dwellChapter, seconds_delta: sec }).catch(function () {});
  }

  function stopDwellTimer() {
    if (_dwellTimer) {
      clearInterval(_dwellTimer);
      _dwellTimer = null;
    }
    flushDwell();
    _dwellChapter = null;
  }

  /* ---------------- 代码运行器 ---------------- */
  function renderRunnerPage() {
    setCrumb('<b>代码运行</b> · 本地评测');

    var h = '<div class="wrap wide">';
    h += '<div class="hero"><h1>代码运行器</h1>' +
      '<p>写 C++，直接编译运行。编译器参数与考场一致：<code class="inline">g++ -std=c++14 -O2</code>，' +
      '不是模拟执行，是真的在本机编译。</p></div>';

    h += '<div class="runner-tips">' +
      '<div class="runner-tip"><b>先启动服务</b>双击站点目录下的「启动评测服务.bat」，黑色窗口不要关。</div>' +
      '<div class="runner-tip"><b>再写代码</b>Ctrl+Enter 运行，Tab 插入 4 个空格，左边下拉框可插模板。</div>' +
      '<div class="runner-tip"><b>看编译错误</b>g++ 的报错原样显示，照着改是最快的进步方式。</div>' +
    '</div>';

    h += '<div id="judgeHost"></div>';
    h += '</div>';

    el('content').innerHTML = h;

    var host = el('judgeHost');
    if (host && window.Judge) {
      window.Judge.createRunner(host, { codeHeight: 400, ioHeight: 110 });
    } else if (host) {
      host.innerHTML = '<div class="note warn"><div class="note-icon">!</div><div class="note-body">' +
        '<p>评测脚本没有加载成功，请确认 <code class="inline">assets/judge.js</code> 存在。</p></div></div>';
    }
  }

  /* ---------------- 练习首页 ---------------- */
  function renderPracticeHome() {
    setCrumb('<b>题目练习</b> · 全部题单');

    var h = '<div class="wrap">';
    h += '<div class="hero"><h1>题目练习</h1>' +
      '<p>按知识点分组，从模板题到竞赛压轴。做不出来就回去重看对应章节。</p></div>';

    var groups = [];
    PROBLEMS.forEach(function (p) { if (groups.indexOf(p.g) < 0) groups.push(p.g); });

    var totalDone = 0;
    PROBLEMS.forEach(function (p) { if (prog.problems[p.id]) totalDone++; });

    h += '<div class="stat-row">' +
      '<div class="stat"><b>' + PROBLEMS.length + '</b><span>题目总数</span></div>' +
      '<div class="stat"><b>' + totalDone + '</b><span>已通过</span></div>' +
      '<div class="stat"><b>' + groups.length + '</b><span>分组</span></div>' +
      '<div class="stat"><b>' + (PROBLEMS.length - totalDone) + '</b><span>待攻克</span></div>' +
    '</div>';

    groups.forEach(function (g) {
      var list = PROBLEMS.filter(function (p) { return p.g === g; });
      var d = list.filter(function (p) { return prog.problems[p.id]; }).length;
      h += '<div class="group-title">' + esc(g) + ' <span style="color:var(--text-mute);font-weight:400;font-size:11.5px">' +
        d + '/' + list.length + '</span></div>';
      list.forEach(function (p) {
        var done = !!prog.problems[p.id];
        h += '<div class="prow' + (done ? ' done' : '') + '" data-go="#/practice/' + p.id + '">' +
          '<span class="prow-id">' + esc(p.id) + '</span>' +
          '<span class="prow-title">' + inline(p.title) + '</span>' +
          '<span class="prow-tags"><span class="diff ' + esc(p.diff) + '">' + esc(p.diffName) + '</span></span>' +
          '<span class="prow-check" data-check="' + p.id + '"></span>' +
        '</div>';
      });
    });

    h += '</div>';
    el('content').innerHTML = h;
  }

  /* ---------------- 题目详情 ---------------- */
  function renderProblem(id) {
    var idx = -1;
    for (var i = 0; i < PROBLEMS.length; i++) { if (String(PROBLEMS[i].id) === String(id)) { idx = i; break; } }
    if (idx < 0) { el('content').innerHTML = '<div class="wrap"><div class="empty">找不到这道题</div></div>'; return; }

    var p = PROBLEMS[idx];
    setCrumb('<b>题目练习</b> · ' + esc(p.g) + ' · ' + esc(p.id));

    var h = '<div class="wrap">';
    h += '<div class="back-link" data-go="#/practice">← 返回题单</div>';

    h += '<div class="prob-head">' +
      '<div class="chapter-meta">' +
        '<span class="tag stage">' + esc(p.g) + '</span>' +
        '<span class="tag ' + (p.diff === 'easy' ? 'lv1' : p.diff === 'mid' ? 'lv2' : p.diff === 'hard' ? 'lv3' : 'lv4') + '">' +
          esc(p.diffName) + '</span>' +
        (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') +
      '</div>' +
      '<h1 class="prob-title">' + inline(p.title) + '</h1>' +
      (p.src ? '<div class="hint-line">来源 / 出处：' + esc(p.src) + '</div>' : '') +
    '</div>';

    h += '<div class="prob-body">';
    h += md(p.desc);

    if (p.input) {
      h += '<div class="prob-sec"><div class="prob-sec-title">输入格式</div>' + md(p.input) + '</div>';
    }
    if (p.output) {
      h += '<div class="prob-sec"><div class="prob-sec-title">输出格式</div>' + md(p.output) + '</div>';
    }
    if (p.samples && p.samples.length) {
      h += '<div class="prob-sec"><div class="prob-sec-title">样例' +
        '<span class="sec-hint">判题时另跑 ' + HIDDEN_CASES + ' 组隐藏数据</span>' +
        '</div>';
      p.samples.forEach(function (s) {
        h += '<div class="sample">' +
          '<div class="sample-col"><span>输入</span><pre>' + esc(s[0]) + '</pre></div>' +
          '<div class="sample-col"><span>输出</span><pre>' + esc(s[1]) + '</pre></div>' +
        '</div>';
      });
      h += '<p class="sample-note">上表只是样例，提交时还会跑 ' + HIDDEN_CASES +
        ' 组看不见的数据。把答案写死是过不了的。</p>';
      h += '</div>';
    }
    if (p.noteText) {
      h += '<div class="prob-sec"><div class="prob-sec-title">数据范围与约定</div>' + md(p.noteText) + '</div>';
    }
    h += '</div>';

    /* 提示 */
    if (p.hint) {
      h += '<div class="collapse"><div class="collapse-head"><span class="arrow">▶</span>思路提示（先自己想 10 分钟再看）</div>' +
        '<div class="collapse-body">' + md(p.hint) + '</div></div>';
    }

    /* 参考代码 */
    if (p.code) {
      h += '<div class="collapse"><div class="collapse-head"><span class="arrow">▶</span>参考代码</div>' +
        '<div class="collapse-body">' + codeBlock(p.code, 'cpp') +
        (p.complexity ? '<p class="hint-line">复杂度：' + esc(p.complexity) + '</p>' : '') +
        '</div></div>';
    }

    /* 易错点 */
    if (p.pitfall) {
      h += '<div class="collapse"><div class="collapse-head"><span class="arrow">▶</span>常见错误</div>' +
        '<div class="collapse-body">' + md(p.pitfall) + '</div></div>';
    }

    /* 提交判分 */
    h += '<div class="collapse open"><div class="collapse-head"><span class="arrow">▶</span>提交评测 · 服务器判分（计入通过记录）</div>' +
      '<div class="collapse-body"><div id="submitBox"></div></div></div>';

    /* 本地跑样例 */
    h += '<div class="collapse"><div class="collapse-head"><span class="arrow">▶</span>本地测样例 · 不判分，秒出结果</div>' +
      '<div class="collapse-body"><div id="judgeHost"></div></div></div>';

    /* 关联知识点 */
    if (p.ref) {
      var refCh = CHAPTERS.filter(function (c) { return c.id === p.ref; })[0];
      if (refCh) {
        h += '<div class="note info"><div class="note-icon">i</div><div class="note-body">' +
          '<p>对应知识点：<a href="#/learn/' + refCh.id + '">第 ' + refCh.id + ' 节 · ' + esc(refCh.title) + '</a></p>' +
        '</div></div>';
      }
    }

    h += '<div class="chapter-foot">';
    h += '<button class="btn" ' + (idx === 0 ? 'disabled' : '') + ' data-go="' +
      (idx > 0 ? '#/practice/' + PROBLEMS[idx - 1].id : '#/practice') + '">← 上一题</button>';
    h += '<span class="spacer"></span>';
    h += '<button class="btn ' + (prog.problems[p.id] ? 'ok' : 'primary') + '" id="doneBtn">' +
      (prog.problems[p.id] ? '✓ 已通过（点击取消）' : '标记为已通过') + '</button>';
    h += '<button class="btn" ' + (PROBLEMS[idx + 1] ? '' : 'disabled') + ' data-go="' +
      (PROBLEMS[idx + 1] ? '#/practice/' + PROBLEMS[idx + 1].id : '#/practice') + '">下一题 →</button>';
    h += '</div></div>';

    el('content').innerHTML = h;

    /* 提交判分面板 */
    renderSubmitBox(p);

    /* 挂载本地评测面板 */
    var judgeHost = el('judgeHost');
    if (judgeHost && window.Judge) {
      window.Judge.createRunner(judgeHost, {
        samples: p.samples || [],
        templates: false,
        codeHeight: 340,
        ioHeight: 100
      });
    }

    var db = el('doneBtn');
    if (db) {
      db.addEventListener('click', function () {
        if (prog.problems[p.id]) delete prog.problems[p.id];
        else prog.problems[p.id] = Date.now();
        saveProgress();
        route();
        refreshProgress();
      });
    }
  }

  /* ---------------- 提交判分面板 ---------------- */
  function renderSubmitBox(p) {
    var box = el('submitBox');
    if (!box) return;

    if (!API.isOnline()) {
      box.innerHTML = '<div class="empty-sm">提交判分需要后端服务。启动方式：<code class="inline">python -m server.main</code></div>';
      return;
    }

    var logged = API.isLogged();

    box.innerHTML =
      '<div class="sub-panel">' +
        '<textarea id="subCode" class="sub-editor" spellcheck="false" ' +
          'placeholder="在这里写你的 C++ 代码。Ctrl+Enter 提交。" ' + (logged ? '' : 'disabled') + '></textarea>' +
        '<div class="sub-bar">' +
          '<span class="sub-hint" id="subHint">' +
            (logged ? '服务器会用全部测试点判分，通过后计入刷题记录' : '登录后才能提交') +
          '</span>' +
          '<button class="btn btn-primary btn-sm" id="subBtn"' + (logged ? '' : ' disabled') + '>' +
            (logged ? '提交评测' : '请先登录') +
          '</button>' +
        '</div>' +
        '<div id="subResult"></div>' +
      '</div>';

    var ta = el('subCode');
    if (!ta) return;

    /* 草稿自动保存：刷新页面代码不丢 */
    var key = 'lqcpp_code_p' + p.id;
    try {
      var saved = localStorage.getItem(key);
      if (saved) ta.value = saved;
    } catch (e) { /* 隐私模式下 localStorage 可能不可用 */ }

    ta.addEventListener('input', function () {
      try { localStorage.setItem(key, ta.value); } catch (e) { /* ignore */ }
    });

    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = ta.selectionStart;
        var t = ta.value;
        ta.value = t.slice(0, s) + '    ' + t.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 4;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        var b = el('subBtn');
        if (b && !b.disabled) b.click();
      }
    });

    var btn = el('subBtn');
    if (btn && logged) {
      btn.addEventListener('click', function () { doSubmit(p, ta); });
    }
  }

  function doSubmit(p, ta) {
    var code = (ta.value || '').trim();
    var res = el('subResult');
    var btn = el('subBtn');

    if (!code) {
      res.innerHTML = '<div class="judge-verdict fail">代码是空的</div>';
      return;
    }

    btn.disabled = true;
    btn.textContent = '提交中…';
    res.innerHTML = '<div class="judge-empty">已提交，正在排队评测…</div>';

    API.judge.submit(p.id, code).then(function (sub) {
      return API.judge.waitFor(sub.id, function (tick) {
        var label = { pending: '排队中', compiling: '编译中', running: '运行测试点' }[tick.status] || tick.status_name;
        res.innerHTML = '<div class="judge-empty">' + esc(label) + '…</div>';
      });
    }).then(function (sub) {
      renderSubmitResult(res, sub);

      if (sub.status === 'accepted') {
        prog.problems[p.id] = Date.now();
        saveProgress();
        refreshProgress();
        var db = el('doneBtn');
        if (db) {
          db.className = 'btn ok';
          db.textContent = '✓ 已通过（点击取消）';
        }
      }
    }).catch(function (e) {
      res.innerHTML = '<div class="judge-verdict fail">提交失败：' + esc(e.message) + '</div>';
    }).then(function () {
      btn.disabled = false;
      btn.textContent = '提交评测';
    });
  }

  function renderSubmitResult(box, sub) {
    var pass = sub.status === 'accepted';
    var h = '<div class="judge-verdict ' + (pass ? 'pass' : 'fail') + '">' +
      esc(sub.status_name) + ' · ' + sub.score + ' / ' + sub.max_score + ' 分' +
      (sub.time_ms ? ' · 最慢 ' + sub.time_ms + ' ms' : '') +
      (sub.judge_time_ms ? ' · 评测耗时 ' + (sub.judge_time_ms / 1000).toFixed(1) + ' s' : '') +
    '</div>';

    if (sub.compile_message) {
      h += '<div class="judge-sub">编译输出</div>' +
        '<pre class="judge-pre err-text">' + esc(sub.compile_message) + '</pre>';
    }

    if (sub.results && sub.results.length) {
      var passed = sub.results.filter(function (r) { return r.status === 'accepted'; }).length;
      h += '<div class="judge-sub">测试点 · 通过 ' + passed + ' / ' + sub.results.length + '</div>' +
        '<div class="case-list">';
      sub.results.forEach(function (r) {
        var ok = r.status === 'accepted';
        h += '<div class="case-row">' +
          '<span class="case-no">#' + r.order_no + '</span>' +
          '<span class="jv ' + (ok ? 'ok' : 'err') + '">' + esc(STATUS_TEXT[r.status] || r.status) + '</span>' +
          '<span class="case-meta">' + r.time_ms + ' ms</span>' +
          '<span class="case-meta">' + r.score + ' 分</span>' +
          '<span class="case-flag' + (r.is_sample ? ' sample' : '') + '">' +
            (r.is_sample ? '样例' : '隐藏') + '</span>' +
        '</div>';
        if (!ok && r.is_sample && r.actual_excerpt) {
          h += '<div class="case-diff">' +
            '<div><span>期望</span><pre>' + esc(r.expected_excerpt) + '</pre></div>' +
            '<div><span>实际</span><pre>' + esc(r.actual_excerpt) + '</pre></div>' +
          '</div>';
        }
      });
      h += '</div>';
      if (passed < sub.results.length && passed > 0) {
        h += '<p class="sample-note">只过了 ' + passed + ' 组，多半是只覆盖了样例。' +
          '隐藏数据在边界、规模、极端输入上都会不同。</p>';
      }
    }

    if (sub.judge_message && !pass) {
      h += '<div class="judge-sub">判定说明</div><div class="dim" style="font-size:12.5px">' +
        esc(sub.judge_message) + '</div>';
    }

    box.innerHTML = h;
  }

  var STATUS_TEXT = {
    accepted: '通过',
    wrong_answer: '答案错误',
    time_limit: '超时',
    memory_limit: '超内存',
    runtime_error: '运行错误',
    compile_error: '编译错误',
    output_limit: '输出超限',
    system_error: '系统错误',
    pending: '等待',
    running: '运行'
  };

  /* ---------------- 全局事件 ---------------- */
  document.addEventListener('click', function (e) {
    /* 题目列表里的小方框：直接切换该题的完成状态 */
    var chk = e.target.closest('[data-check]');
    if (chk) {
      e.stopPropagation();
      var pid = chk.getAttribute('data-check');
      var row = chk.closest('.prow');
      if (prog.problems[pid]) {
        delete prog.problems[pid];
        if (row) row.classList.remove('done');
      } else {
        prog.problems[pid] = Date.now();
        if (row) row.classList.add('done');
      }
      saveProgress();
      /* 同步侧边栏对应项 */
      var nav = document.querySelector('.nav-item[data-go="#/practice/' + pid + '"]');
      if (nav) nav.classList.toggle('done', !!prog.problems[pid]);
      return;
    }

    /* 跳转 */
    var go = e.target.closest('[data-go]');
    if (go) {
      var target = go.getAttribute('data-go');
      if (target) { location.hash = target; }
      return;
    }

    /* 复制代码 */
    var cp = e.target.closest('[data-copy]');
    if (cp) {
      var pre = document.getElementById(cp.getAttribute('data-copy'));
      if (pre) {
        var txt = pre.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () {
            cp.textContent = '已复制';
            setTimeout(function () { cp.textContent = '复制'; }, 1400);
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); cp.textContent = '已复制'; } catch (err) { /* ignore */ }
          document.body.removeChild(ta);
          setTimeout(function () { cp.textContent = '复制'; }, 1400);
        }
      }
      return;
    }

    /* 折叠面板 */
    var ch = e.target.closest('.collapse-head');
    if (ch) { ch.parentElement.classList.toggle('open'); return; }

    /* 自测题 */
    var opt = e.target.closest('.quiz-opt');
    if (opt) {
      var quizBox = opt.closest('.quiz');
      if (quizBox.dataset.answered === '1') return;
      quizBox.dataset.answered = '1';
      var ans = parseInt(quizBox.getAttribute('data-answer'), 10);
      var chosen = parseInt(opt.getAttribute('data-i'), 10);
      quizBox.querySelectorAll('.quiz-opt').forEach(function (o) {
        var i = parseInt(o.getAttribute('data-i'), 10);
        if (i === ans) o.classList.add('correct');
        else if (i === chosen) o.classList.add('wrong');
      });
      var ex = quizBox.querySelector('.quiz-expl');
      if (ex) ex.classList.add('show');

      /* 登录状态下把作答结果上报，用于掌握度计算 */
      if (API.isOnline() && API.isLogged()) {
        var chapterId = parseInt(el('content').getAttribute('data-chapter') || '0', 10);
        var secIdx = parseInt(quizBox.getAttribute('data-idx') || '-1', 10);
        if (chapterId && secIdx >= 0) {
          API.progress.quiz({
            chapter_id: chapterId,
            section_index: secIdx,
            chosen: chosen,
            answer: ans
          }).then(function (res) {
            if (window.Pages) {
              window.Pages.toast(res.correct ? '答对了' : '答案是 ' + 'ABCD'[res.answer], res.correct ? 'ok' : 'bad');
            }
          }).catch(function () { /* 静默失败，不影响阅读 */ });
        }
      }
      return;
    }
  });

  /* 模式切换 */
  document.querySelectorAll('.mode-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.dataset.mode;
      location.hash = m === 'practice' ? '#/practice'
                   : m === 'runner'   ? '#/runner'
                                      : '#/learn';
    });
  });

  /* 搜索 */
  var si = el('searchInput');
  if (si) {
    si.addEventListener('input', function () {
      applyFilter(si.value.trim().toLowerCase());
    });
  }

  /* 移动端菜单 */
  var mt = el('mobileToggle');
  if (mt) {
    mt.addEventListener('click', function () { el('sidebar').classList.toggle('open'); });
  }

  /* 重置 */
  var rb = el('resetBtn');
  if (rb) {
    rb.addEventListener('click', function () {
      if (confirm('确定清空全部学习进度和做题记录？此操作不可撤销。')) {
        prog = { chapters: {}, problems: {} };
        saveProgress();
        route();
        refreshProgress();
      }
    });
  }

  /* ---------------- 顶栏用户区 ---------------- */
  function updateUserBar() {
    var box = el('userBar');
    if (!box) return;

    if (!API.isOnline()) {
      box.innerHTML = '<span class="ub-offline" title="后端未启动，当前为纯静态模式">离线模式</span>';
      return;
    }

    if (API.isLogged()) {
      var u = API.user();
      var initial = (u.display_name || u.username || '?').slice(0, 1).toUpperCase();
      box.innerHTML =
        (API.isAdmin() ? '<a class="ub-link" href="#/admin">后台</a>' : '') +
        '<a class="ub-link" href="#/stats">统计</a>' +
        '<a class="ub-user" href="#/profile" title="' + esc(u.email) + '">' +
          '<span class="ub-avatar">' + esc(initial) + '</span>' +
          '<span class="ub-name">' + esc(u.display_name || u.username) + '</span>' +
        '</a>';
    } else {
      box.innerHTML =
        '<a class="ub-link" href="#/login">登录</a>' +
        '<a class="ub-btn" href="#/register">注册</a>';
    }
  }

  /* ---------------- 服务端进度同步 ---------------- */
  function syncFromServer() {
    if (!API.isOnline() || !API.isLogged()) return Promise.resolve();
    return API.progress.list().then(function (list) {
      (list || []).forEach(function (p) {
        if (p.status === 'done') prog.chapters[p.chapter_id] = true;
      });
      saveProgress();
      refreshProgress();
      return API.judge.mine({ size: 200, status: 'accepted' }).then(function (d) {
        ((d && d.items) || []).forEach(function (s) { prog.problems[s.problem_id] = true; });
        saveProgress();
      }).catch(function () {});
    }).catch(function () {});
  }

  function onLoginChanged() {
    updateUserBar();
    syncFromServer().then(function () { route(); });
  }

  /* 暴露给 pages-*.js 使用 */
  window.App = {
    route: route,
    el: el,
    esc: esc,
    md: md,
    inline: inline,
    setCrumb: setCrumb,
    updateUserBar: updateUserBar,
    onLoginChanged: onLoginChanged,
    syncFromServer: syncFromServer,
    chapters: function () { return CHAPTERS; },
    problems: function () { return PROBLEMS; }
  };

  /* ---------------- 启动 ---------------- */
  window.addEventListener('hashchange', route);

  if (!location.hash) location.hash = '#/learn';
  route();
  refreshProgress();

  /* 探测后端：在线就走完整功能，离线退回纯静态 */
  API.probe().then(function () {
    updateUserBar();
    return syncFromServer();
  }).then(function () {
    route();
  }).catch(function () {
    updateUserBar();
  });
})();
