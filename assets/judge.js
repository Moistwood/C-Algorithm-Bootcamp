/* ==========================================================
   本地评测前端 · 对应 judge.py
   ========================================================== */
(function () {
  'use strict';

  /* 从 file:// 打开时，直接指向本地服务；从 http 打开时走同源 */
  var BASE = (location.protocol === 'file:') ? 'http://127.0.0.1:8787' : '';

  var state = { checked: false, ok: false, info: null };
  var uid = 0;

  var DEFAULT_CODE = [
    '#include <bits/stdc++.h>',
    'using namespace std;',
    '',
    'int main() {',
    '    ios::sync_with_stdio(false);',
    '    cin.tie(nullptr);',
    '',
    '    // 在这里写你的代码',
    '',
    '    return 0;',
    '}'
  ].join('\n');

  var TEMPLATES = {
    '万能开头': DEFAULT_CODE,
    '快速读入': [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      '',
      'inline int read() {',
      '    int x = 0, f = 1; char c = getchar();',
      '    while (c < \'0\' || c > \'9\') { if (c == \'-\') f = -1; c = getchar(); }',
      '    while (c >= \'0\' && c <= \'9\') { x = x * 10 + c - \'0\'; c = getchar(); }',
      '    return x * f;',
      '}',
      '',
      'int main() {',
      '    int n = read();',
      '    cout << n * 2 << \'\\n\';',
      '    return 0;',
      '}'
    ].join('\n'),
    '并查集': [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      '',
      'int fa[100005];',
      'int find(int x) { return fa[x] == x ? x : fa[x] = find(fa[x]); }',
      '',
      'int main() {',
      '    int n, m;',
      '    cin >> n >> m;',
      '    for (int i = 1; i <= n; i++) fa[i] = i;',
      '    while (m--) {',
      '        int u, v; cin >> u >> v;',
      '        int ru = find(u), rv = find(v);',
      '        if (ru != rv) fa[ru] = rv;',
      '    }',
      '    int cnt = 0;',
      '    for (int i = 1; i <= n; i++) if (find(i) == i) cnt++;',
      '    cout << cnt << \'\\n\';',
      '    return 0;',
      '}'
    ].join('\n'),
    'Dijkstra': [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      'typedef long long ll;',
      'typedef pair<ll,int> pli;',
      '',
      'const int N = 100005;',
      'vector<pair<int,int>> g[N];',
      'll dist[N];',
      '',
      'int main() {',
      '    ios::sync_with_stdio(false);',
      '    cin.tie(nullptr);',
      '    int n, m;',
      '    cin >> n >> m;',
      '    for (int i = 0; i < m; i++) {',
      '        int u, v, w; cin >> u >> v >> w;',
      '        g[u].push_back({v, w});',
      '        g[v].push_back({u, w});',
      '    }',
      '    memset(dist, 0x3f, sizeof(dist));',
      '    dist[1] = 0;',
      '    priority_queue<pli, vector<pli>, greater<pli>> pq;',
      '    pq.push({0, 1});',
      '    while (!pq.empty()) {',
      '        auto [d, u] = pq.top(); pq.pop();',
      '        if (d > dist[u]) continue;',
      '        for (auto [v, w] : g[u])',
      '            if (dist[v] > d + w) { dist[v] = d + w; pq.push({dist[v], v}); }',
      '    }',
      '    cout << (dist[n] > 1e18 ? -1 : dist[n]) << \'\\n\';',
      '    return 0;',
      '}'
    ].join('\n'),
    '树状数组': [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      'typedef long long ll;',
      '',
      'const int N = 100005;',
      'll bit[N];',
      'int n;',
      '',
      'void add(int i, ll v) { for (; i <= n; i += i & -i) bit[i] += v; }',
      'll sum(int i) { ll s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }',
      '',
      'int main() {',
      '    ios::sync_with_stdio(false);',
      '    cin.tie(nullptr);',
      '    int q;',
      '    cin >> n >> q;',
      '    for (int i = 1; i <= n; i++) { ll x; cin >> x; add(i, x); }',
      '    while (q--) {',
      '        int l, r; cin >> l >> r;',
      '        cout << sum(r) - sum(l - 1) << \'\\n\';',
      '    }',
      '    return 0;',
      '}'
    ].join('\n')
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- 与服务通信 ---------------- */
  function ping() {
    if (state.checked) return Promise.resolve(state.ok ? state.info : null);
    return fetch(BASE + '/api/ping', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        state.checked = true; state.ok = !!j.ok; state.info = j;
        return state.ok ? j : null;
      })
      .catch(function () {
        state.checked = true; state.ok = false; state.info = null;
        return null;
      });
  }

  function run(code, stdin, timeLimit) {
    return fetch(BASE + '/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, stdin: stdin || '', timeLimit: timeLimit || 2000 })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  /* 输出规范化：忽略行尾空格和末尾空行 */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(function (l) { return l.replace(/[ \t]+$/, ''); })
      .join('\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
  }

  /* ---------------- 编辑器 ---------------- */
  function mountEditor(gutterEl, codeEl, initial) {
    codeEl.value = initial || '';

    function syncGutter() {
      var n = codeEl.value.split('\n').length;
      var html = '';
      for (var i = 1; i <= n; i++) html += i + '\n';
      gutterEl.textContent = html;
      gutterEl.scrollTop = codeEl.scrollTop;
    }

    codeEl.addEventListener('input', syncGutter);
    codeEl.addEventListener('scroll', function () { gutterEl.scrollTop = codeEl.scrollTop; });

    /* Tab 插入 4 个空格，不跳出输入框 */
    codeEl.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = this.selectionStart, en = this.selectionEnd;
        this.value = this.value.slice(0, s) + '    ' + this.value.slice(en);
        this.selectionStart = this.selectionEnd = s + 4;
        syncGutter();
      }
    });

    syncGutter();
    return { sync: syncGutter };
  }

  /* ---------------- 主面板 ---------------- */
  function createRunner(host, opts) {
    opts = opts || {};
    var id = 'jr' + (++uid);
    var hasSamples = Array.isArray(opts.samples) && opts.samples.length > 0;
    var firstIn = hasSamples ? opts.samples[0][0] : (opts.stdin || '');
    var showTpl = opts.templates !== false;

    var tplHtml = '';
    if (showTpl) {
      tplHtml = '<select class="judge-sel" id="' + id + '-tpl"><option value="">插入模板…</option>';
      Object.keys(TEMPLATES).forEach(function (k) {
        tplHtml += '<option value="' + esc(k) + '">' + esc(k) + '</option>';
      });
      tplHtml += '</select>';
    }

    host.innerHTML =
      '<div class="judge">' +
        '<div class="judge-bar">' +
          '<span class="judge-dot" id="' + id + '-dot"></span>' +
          '<span class="judge-status" id="' + id + '-status">正在检测编译器…</span>' +
          '<span class="judge-sp"></span>' +
          tplHtml +
          '<select class="judge-sel" id="' + id + '-tl">' +
            '<option value="1000">1.0s</option>' +
            '<option value="2000" selected>2.0s</option>' +
            '<option value="5000">5.0s</option>' +
          '</select>' +
          (hasSamples ? '<button class="btn" id="' + id + '-samples">测样例</button>' : '') +
          '<button class="btn primary" id="' + id + '-run">运行</button>' +
        '</div>' +
        '<div class="judge-grid">' +
          '<div class="judge-col">' +
            '<div class="judge-label">代码 <span class="judge-hint">Tab 缩进 · Ctrl+Enter 运行</span></div>' +
            '<div class="editor" style="height:' + (opts.codeHeight || 300) + 'px">' +
              '<div class="editor-gutter" id="' + id + '-gut"></div>' +
              '<textarea class="editor-code" id="' + id + '-code" spellcheck="false" autocomplete="off"></textarea>' +
            '</div>' +
            '<div class="judge-label">输入 stdin</div>' +
            '<textarea class="io-box" id="' + id + '-in" spellcheck="false" style="height:' + (opts.ioHeight || 86) + 'px"></textarea>' +
          '</div>' +
          '<div class="judge-col">' +
            '<div class="judge-label">运行结果</div>' +
            '<div class="judge-out" id="' + id + '-out"><div class="judge-empty">点「运行」编译并执行</div></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var codeEl = document.getElementById(id + '-code');
    var gutEl = document.getElementById(id + '-gut');
    var inEl = document.getElementById(id + '-in');
    var outEl = document.getElementById(id + '-out');
    var runBtn = document.getElementById(id + '-run');
    var tlEl = document.getElementById(id + '-tl');
    var dotEl = document.getElementById(id + '-dot');
    var statusEl = document.getElementById(id + '-status');
    var tplEl = document.getElementById(id + '-tpl');
    var samplesBtn = document.getElementById(id + '-samples');

    var ed = mountEditor(gutEl, codeEl, opts.code || DEFAULT_CODE);
    inEl.value = firstIn;

    /* 编译器状态 */
    ping().then(function (info) {
      if (info) {
        dotEl.className = 'judge-dot ok';
        statusEl.textContent = (info.compiler || 'g++ 已就绪');
      } else {
        dotEl.className = 'judge-dot bad';
        statusEl.innerHTML = '未连接评测服务 —— 双击 <b>启动评测服务.bat</b> 后刷新页面';
        runBtn.disabled = true;
        if (samplesBtn) samplesBtn.disabled = true;
      }
    });

    function setOut(html, cls) {
      outEl.innerHTML = '<div class="judge-res ' + (cls || '') + '">' + html + '</div>';
    }

    function badge(text, kind) {
      return '<span class="jv ' + kind + '">' + esc(text) + '</span>';
    }

    function renderResult(res) {
      if (!res) { setOut('<div class="judge-empty">没有返回结果</div>'); return; }

      if (res.phase === 'env' || res.phase === 'internal' || res.phase === 'request') {
        setOut(badge('环境错误', 'err') + '<pre class="judge-pre">' + esc(res.message || '') + '</pre>');
        return;
      }

      if (res.phase === 'compile') {
        setOut(
          badge('编译错误', 'err') +
          '<pre class="judge-pre err-text">' + esc(res.message || '') + '</pre>' +
          (res.compileTimeMs ? '<div class="judge-meta">编译耗时 ' + res.compileTimeMs + ' ms</div>' : '')
        );
        return;
      }

      /* 运行阶段 */
      var head = '';
      if (res.verdict === 'TLE') {
        head = badge('运行超时', 'warn') + '<span class="judge-meta">' + (res.timeMs || 0) + ' ms</span>';
      } else if (res.verdict === 'RE') {
        head = badge('运行时错误 (退出码 ' + res.exitCode + ')', 'err') +
               '<span class="judge-meta">' + (res.timeMs || 0) + ' ms</span>';
      } else {
        head = badge('运行完成', 'ok') + '<span class="judge-meta">' + (res.timeMs || 0) + ' ms</span>';
      }

      var html = '<div class="judge-head">' + head + '</div>';

      var so = res.stdout || '';
      html += '<div class="judge-sub">标准输出</div>';
      html += so
        ? '<pre class="judge-pre out">' + esc(so) + '</pre>'
        : '<pre class="judge-pre out dim">（空）</pre>';

      if (res.stderr) {
        html += '<div class="judge-sub">标准错误</div><pre class="judge-pre err-text">' + esc(res.stderr) + '</pre>';
      }

      if (opts.expected !== undefined && opts.expected !== null) {
        var ok = norm(so) === norm(opts.expected);
        html += '<div class="judge-sub">与期望输出对比</div>';
        html += ok
          ? '<div class="judge-verdict pass">通过 —— 输出与样例一致</div>'
          : '<div class="judge-verdict fail">不一致</div>' +
            '<div class="judge-sub">期望</div><pre class="judge-pre out">' + esc(opts.expected) + '</pre>';
      }

      setOut(html);
    }

    async function doRun() {
      runBtn.disabled = true;
      runBtn.textContent = '运行中…';
      setOut('<div class="judge-empty">正在编译…</div>');
      try {
        var res = await run(codeEl.value, inEl.value, parseInt(tlEl.value, 10));
        renderResult(res);
      } catch (e) {
        setOut(badge('连接失败', 'err') +
          '<pre class="judge-pre err-text">' + esc(String(e.message || e)) +
          '\n\n请确认已双击「启动评测服务.bat」，且窗口没有被关闭。</pre>');
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '运行';
      }
    }

    runBtn.addEventListener('click', doRun);

    codeEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doRun();
      }
    });

    if (tplEl) {
      tplEl.addEventListener('change', function () {
        var k = tplEl.value;
        if (!k) return;
        var cur = codeEl.value.trim();
        if (cur && cur !== DEFAULT_CODE.trim()) {
          if (!confirm('插入模板会覆盖当前代码，确定吗？')) { tplEl.value = ''; return; }
        }
        codeEl.value = TEMPLATES[k];
        ed.sync();
        tplEl.value = '';
      });
    }

    /* 逐个跑样例 */
    if (samplesBtn) {
      samplesBtn.addEventListener('click', async function () {
        samplesBtn.disabled = true;
        var rows = '';
        var passed = 0;
        for (var i = 0; i < opts.samples.length; i++) {
          var s = opts.samples[i];
          setOut('<div class="judge-empty">正在测试样例 ' + (i + 1) + ' / ' + opts.samples.length + '…</div>');
          var res;
          try {
            res = await run(codeEl.value, s[0], parseInt(tlEl.value, 10));
          } catch (e) {
            rows += '<div class="sample-row"><span class="jv err">连接失败</span><span>' + esc(e.message || '') + '</span></div>';
            break;
          }
          var label, kind;
          if (res.phase === 'compile') { label = '编译错误'; kind = 'err'; }
          else if (!res.ok && res.verdict === 'TLE') { label = '超时'; kind = 'warn'; }
          else if (!res.ok) { label = '运行错误'; kind = 'err'; }
          else if (norm(res.stdout) === norm(s[1])) { label = '通过'; kind = 'ok'; passed++; }
          else { label = '答案错误'; kind = 'warn'; }
          rows += '<div class="sample-row"><span class="jv ' + kind + '">' + label + '</span>' +
                  '<span class="sample-tag">样例 ' + (i + 1) + '</span>' +
                  '<span class="judge-meta">' + (res.timeMs || 0) + ' ms</span></div>';
        }
        setOut(
          '<div class="judge-head"><span class="jv ' + (passed === opts.samples.length ? 'ok' : 'warn') + '">' +
          passed + ' / ' + opts.samples.length + ' 通过</span></div>' + rows
        );
        samplesBtn.disabled = false;
      });
    }

    return {
      getCode: function () { return codeEl.value; },
      setCode: function (c) { codeEl.value = c; ed.sync(); },
      getStdin: function () { return inEl.value; },
      setStdin: function (v) { inEl.value = v; }
    };
  }

  window.Judge = {
    ping: ping,
    run: run,
    norm: norm,
    createRunner: createRunner,
    defaultCode: DEFAULT_CODE,
    base: BASE
  };
})();
