/* ==========================================================
   蓝桥杯 C++ 省一特训 · 渲染引擎
   ========================================================== */
(function () {
  'use strict';

  /* ---------------- 阶段元信息 ---------------- */
  var STAGES = [
    { n: 1, num: 'STAGE 01', name: 'C++ 语言基础',
      desc: '从编译运行到 STL，把写代码这件事变成肌肉记忆。没有这一层，后面全是空中楼阁。' },
    { n: 2, num: 'STAGE 02', name: '算法基础工具',
      desc: '复杂度、枚举、二分、前缀和、双指针、贪心、高精度、位运算 —— 省赛一半的分在这里。' },
    { n: 3, num: 'STAGE 03', name: '核心数据结构',
      desc: '栈队列、单调结构、并查集、堆、哈希、树状数组、线段树。' },
    { n: 4, num: 'STAGE 04', name: '图论',
      desc: '建图、遍历、拓扑、最短路、最小生成树、连通性。蓝桥杯压轴常客。' },
    { n: 5, num: 'STAGE 05', name: '动态规划',
      desc: '从状态定义到转移方程，六大 DP 模型全覆盖。' },
    { n: 6, num: 'STAGE 06', name: '数学与数论',
      desc: '筛法、快速幂、gcd/exgcd、组合数学与逆元、容斥。填空题的送分区。' },
    { n: 7, num: 'STAGE 07', name: '进阶技巧与实战',
      desc: '搜索剪枝、分治、倍增与 ST 表、离散化，以及考场的得分策略。' }
  ];

  var CHAPTERS = window.CHAPTERS || [];
  var PROBLEMS = window.PROBLEMS || [];

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
  function quiz(sec) {
    var opts = sec.o.map(function (o, i) {
      return '<div class="quiz-opt" data-i="' + i + '">' +
        '<span class="quiz-key">' + 'ABCD'[i] + '</span><span>' + inline(o) + '</span></div>';
    }).join('');

    return '<div class="quiz" data-answer="' + sec.a + '">' +
      '<div class="quiz-head"><span class="quiz-q-no">检查</span><span>' + inline(sec.q) + '</span></div>' +
      '<div class="quiz-opts">' + opts + '</div>' +
      '<div class="quiz-expl">' + (sec.e ? md(sec.e) : '') + '</div>' +
    '</div>';
  }

  /* ---------------- section 分发 ---------------- */
  function renderSection(s) {
    if (typeof s === 'string') return md(s);
    switch (s.t) {
      case 'code': return codeBlock(s.x, s.lang);
      case 'note': return note(s.kind, s.x);
      case 'table': return table(s.head, s.rows);
      case 'quiz': return quiz(s);
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
          '<br><br>需要先双击站点根目录的' +
          '<br><b style="color:var(--amber)">启动评测服务.bat</b>' +
          '<br><br>编译器版本 <b style="color:var(--text-dim)">g++ -std=c++14 -O2</b>，与蓝桥杯考场一致。' +
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
  function route() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    var mode = parts[0] === 'practice' ? 'practice' : (parts[0] === 'runner' ? 'runner' : 'learn');
    var id = parts[1] || '';

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
      '<h1>从零到省一，一条不打折的路</h1>' +
      '<p>按顺序学完 ' + CHAPTERS.length + ' 个知识点专题，再进入 ' + PROBLEMS.length +
      ' 道配套题目。每节都有可编译代码、易错点、自测题。学完不是目的，能默写模板才是。</p>' +
    '</div>';

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
      '2. 每节的代码**自己敲一遍并编译运行**，看懂了不等于会写，蓝桥杯是闭卷手写。\n' +
      '3. 每节末尾的自测题必须答对才能标"已学完"——答错说明那一节白学了。\n' +
      '4. 学完一个阶段再去题库做对应分组的题，做不出来说明知识点没进脑子，回去重看。\n' +
      '5. 最后的《考场模板与代码库》要背到能默写，省赛 4 小时里没时间现推。'
    );

    h += '<div class="note tip"><div class="note-icon">✓</div><div class="note-body">' +
      '<p><strong>代码可以直接跑。</strong>站点自带本地评测：双击目录里的 <b>启动评测服务.bat</b>，' +
      '然后在「代码运行」里写代码，或直接在某道题下面点「测样例」。' +
      '用的是真实的 <code class="inline">g++ -std=c++14 -O2</code>，不是模拟执行。</p></div></div>';

    h += '<div class="note info"><div class="note-icon">i</div><div class="note-body">' +
      '<p><strong>关于赛制：</strong>第 17 届起蓝桥杯改为 <strong>2 道填空 + 6 道编程，满分 100 分，时长 4 小时</strong>。' +
      '省一通常需要拿到 60 分以上（各省略有浮动）。填空题不要求通用解法，能算出答案就行，' +
      '这意味着 <strong>Excel / Python / 暴力枚举</strong> 都是合法工具。</p></div></div>';

    h += '</div>';
    el('content').innerHTML = h;
  }

  /* ---------------- 章节页 ---------------- */
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

    h += c.body.map(renderSection).join('');

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

    var mb = el('markBtn');
    if (mb) {
      mb.addEventListener('click', function () {
        if (prog.chapters[c.id]) delete prog.chapters[c.id];
        else prog.chapters[c.id] = Date.now();
        saveProgress();
        route();
        refreshProgress();
      });
    }
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
      '<p>按知识点分组，从模板题到省赛压轴。做不出来就回去重看对应章节。</p></div>';

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
      h += '<div class="prob-sec"><div class="prob-sec-title">样例</div>';
      p.samples.forEach(function (s) {
        h += '<div class="sample">' +
          '<div class="sample-col"><span>输入</span><pre>' + esc(s[0]) + '</pre></div>' +
          '<div class="sample-col"><span>输出</span><pre>' + esc(s[1]) + '</pre></div>' +
        '</div>';
      });
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

    /* 本地评测 */
    h += '<div class="collapse open"><div class="collapse-head"><span class="arrow">▶</span>动手写代码 · 本地评测（先自己想，卡住了再看参考代码）</div>' +
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

  /* 启动 */
  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/learn';
  route();
  refreshProgress();
})();
