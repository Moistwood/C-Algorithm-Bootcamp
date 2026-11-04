/* ==========================================================
   管理后台
   ----------------------------------------------------------
   七个标签页：概览 / 用户 / 题目 / 测试点 / 章节 / 公告 / 日志
   ========================================================== */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(m, k) { if (window.Pages && window.Pages.toast) window.Pages.toast(m, k); }
  function go(h) { location.hash = h; }

  var TABS = [
    { key: 'overview', name: '概览' },
    { key: 'users', name: '用户' },
    { key: 'problems', name: '题库' },
    { key: 'testcases', name: '测试点' },
    { key: 'chapters', name: '章节' },
    { key: 'announce', name: '公告' },
    { key: 'logs', name: '日志' }
  ];

  function fmtTime(iso) {
    if (!iso) return '-';
    return String(iso).slice(0, 19).replace('T', ' ');
  }

  /* ====================================================== */
  function adminPage(container, tab, rest) {
    tab = tab || 'overview';
    rest = rest || [];

    if (!API.isOnline()) {
      container.innerHTML = '<div class="wrap"><div class="empty">需要后端服务</div></div>';
      return;
    }
    if (!API.isLogged()) {
      container.innerHTML = '<div class="wrap"><div class="hero"><h1>请先登录</h1>' +
        '<div class="hero-actions"><a class="btn btn-primary" href="#/login">去登录</a></div></div></div>';
      return;
    }
    if (!API.isAdmin()) {
      container.innerHTML = '<div class="wrap"><div class="hero"><h1>没有权限</h1>' +
        '<p>管理后台只对管理员和教师开放。</p></div></div>';
      return;
    }

    var bodyID = 'adminBody';

    var h = '<div class="wrap admin-wrap">' +
      '<div class="admin-head"><h1>管理后台</h1>' +
      '<span class="chip">' + esc(API.user().username) + ' · ' + esc(API.user().role) + '</span></div>' +
      '<div class="admin-tabs">' +
        TABS.map(function (t) {
          return '<button class="admin-tab' + (t.key === tab ? ' active' : '') +
            '" data-tab="' + t.key + '">' + esc(t.name) + '</button>';
        }).join('') +
      '</div>' +
      '<div id="' + bodyID + '"><div class="loading">加载中…</div></div>' +
    '</div>';

    container.innerHTML = h;

    container.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { go('#/admin/' + b.dataset.tab); });
    });

    var box = el(bodyID);
    var renderers = {
      overview: renderOverview,
      users: renderUsers,
      problems: renderProblems,
      testcases: function (b) { renderTestcases(b, rest[0]); },
      chapters: renderChapters,
      announce: renderAnnounce,
      logs: renderLogs
    };
    (renderers[tab] || renderOverview)(box);
  }

  /* ---------------- 概览 ---------------- */
  function renderOverview(box) {
    API.admin.overview().then(function (d) {
      box.innerHTML = '<div class="stat-cards">' +
        card('用户总数', d.users_total) +
        card('今日活跃', d.users_active_today) +
        card('题目总数', d.problems_total) +
        card('提交总数', d.submissions_total) +
        '</div>' +
        '<div class="stat-cards">' +
        card('今日提交', d.submissions_today) +
        card('整体通过率', d.accept_rate + '%') +
        card('评测队列', d.judge_queue) +
        card('数据库大小', d.db_size_kb + ' KB') +
        '</div>' +
        '<section class="panel"><div class="panel-head"><h2>运行状态</h2></div>' +
        '<div class="kv-list">' +
          '<div class="kv"><span>服务版本</span><b>' + esc(API.state.version || '-') + '</b></div>' +
          '<div class="kv"><span>编译器</span><b>' + esc(API.state.compiler || '未检测到') + '</b></div>' +
          '<div class="kv"><span>评测功能</span><b>' + (API.state.judgeEnabled ? '已开启' : '已关闭') + '</b></div>' +
          '<div class="kv"><span>运行时长</span><b>' + fmtDuration(d.uptime_seconds) + '</b></div>' +
        '</div></section>' +
        '<section class="panel"><div class="panel-head"><h2>快捷入口</h2></div>' +
        '<div class="quick-links">' +
          '<a class="btn" href="#/admin/problems">管理题目</a>' +
          '<a class="btn" href="#/admin/testcases">配置测试点</a>' +
          '<a class="btn" href="#/admin/users">管理用户</a>' +
          '<a class="btn" href="/api/docs" target="_blank">接口文档</a>' +
        '</div></section>';
    }).catch(function (e) { box.innerHTML = errBox(e); });

    function card(label, value) {
      return '<div class="stat-card"><div class="sc-label">' + esc(label) +
        '</div><div class="sc-value">' + esc(value) + '</div></div>';
    }
    function fmtDuration(s) {
      s = s || 0;
      var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
      return (d ? d + ' 天 ' : '') + (h ? h + ' 小时 ' : '') + m + ' 分钟';
    }
  }

  /* ---------------- 用户 ---------------- */
  function renderUsers(box) {
    box.innerHTML = '<div class="admin-bar">' +
      '<input id="uSearch" class="inp" placeholder="搜索用户名 / 邮箱">' +
      '<select id="uRole" class="inp sel"><option value="">全部角色</option>' +
        '<option value="student">学员</option>' +
        '<option value="admin">管理员</option></select>' +
      '<button class="btn" id="uGo">查询</button></div>' +
      '<div id="uList"><div class="loading">加载中…</div></div>';

    function load() {
      API.admin.users({
        q: el('uSearch').value.trim() || undefined,
        role: el('uRole').value || undefined,
        size: 50
      }).then(function (d) {
        el('uList').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th>ID</th><th>用户名</th><th>邮箱</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th>' +
          '</tr></thead><tbody>' +
          d.items.map(function (u) {
            return '<tr><td class="mono">' + u.id + '</td>' +
              '<td>' + esc(u.display_name || u.username) + '<br><span class="dim mono">' + esc(u.username) + '</span></td>' +
              '<td class="dim">' + esc(u.email) + '</td>' +
              '<td><select class="inp sel tiny" data-role="' + u.id + '">' +
                ['student', 'admin'].map(function (r) {
                  return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + r + '</option>';
                }).join('') + '</select></td>' +
              '<td>' + (u.is_active ? '<span class="lr-tag ok">正常</span>' : '<span class="lr-tag bad">停用</span>') + '</td>' +
              '<td class="dim mono">' + fmtTime(u.created_at) + '</td>' +
              '<td><button class="btn btn-xs" data-toggle="' + u.id + '" data-active="' + (u.is_active ? '1' : '0') + '">' +
                (u.is_active ? '停用' : '启用') + '</button></td></tr>';
          }).join('') +
          '</tbody></table></div>' +
          '<div class="dim center" style="padding:8px">共 ' + d.total + ' 个用户</div>';

        el('uList').querySelectorAll('[data-role]').forEach(function (sel) {
          sel.addEventListener('change', function () {
            API.admin.updateUser(sel.dataset.role, { role: sel.value })
              .then(function () { toast('角色已更新', 'ok'); })
              .catch(function (e) { toast(e.message, 'bad'); load(); });
          });
        });
        el('uList').querySelectorAll('[data-toggle]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var active = btn.dataset.active === '1';
            API.admin.updateUser(btn.dataset.toggle, { is_active: !active })
              .then(function () { toast(active ? '已停用' : '已启用', 'ok'); load(); })
              .catch(function (e) { toast(e.message, 'bad'); });
          });
        });
      }).catch(function (e) { el('uList').innerHTML = errBox(e); });
    }

    el('uGo').addEventListener('click', load);
    el('uSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
    load();
  }

  /* ---------------- 题目 ---------------- */
  function renderProblems(box) {
    box.innerHTML = '<div class="admin-bar">' +
      '<input id="pSearch" class="inp" placeholder="搜索题目标题">' +
      '<button class="btn" id="pGo">查询</button>' +
      '<button class="btn btn-primary" id="pNew">新建题目</button></div>' +
      '<div id="pList"><div class="loading">加载中…</div></div>';

    function load() {
      API.content.problems({ q: el('pSearch').value.trim() || undefined, size: 100 })
        .then(function (d) {
          el('pList').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
            '<th style="width:48px">ID</th><th>题目</th><th>分组</th><th>难度</th>' +
            '<th>提交/通过</th><th>操作</th></tr></thead><tbody>' +
            d.items.map(function (p) {
              return '<tr><td class="mono">' + p.id + '</td>' +
                '<td>' + esc(p.title) + '</td>' +
                '<td class="dim">' + esc(p.group_name) + '</td>' +
                '<td><span class="diff">' + esc(p.difficulty_name) + '</span></td>' +
                '<td class="mono dim">' + p.submit_count + ' / ' + p.accept_count + '</td>' +
                '<td class="op-cell">' +
                  '<a class="btn btn-xs" href="#/practice/' + p.id + '">查看</a>' +
                  '<button class="btn btn-xs" data-tc="' + p.id + '">测试点</button>' +
                '</td></tr>';
            }).join('') +
            '</tbody></table></div><div class="dim center" style="padding:8px">共 ' + d.total + ' 题</div>';

          el('pList').querySelectorAll('[data-tc]').forEach(function (b) {
            b.addEventListener('click', function () { go('#/admin/testcases/' + b.dataset.tc); });
          });
        }).catch(function (e) { el('pList').innerHTML = errBox(e); });
    }

    el('pGo').addEventListener('click', load);
    el('pSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
    el('pNew').addEventListener('click', function () { toast('题目新建请用接口 /api/admin/problems，或直接在 content.json 里加'); });
    load();
  }

  /* ---------------- 测试点 ---------------- */
  function renderTestcases(box, pid) {
    if (!pid) {
      box.innerHTML = '<div class="admin-bar"><input id="tcPid" class="inp" placeholder="输入题目 ID" type="number">' +
        '<button class="btn" id="tcGo">打开</button></div>' +
        '<div class="empty-sm">先选一道题。测试点决定判分，样例测试点用户可见，隐藏测试点用户看不到。</div>';
      el('tcGo').addEventListener('click', function () {
        var v = el('tcPid').value.trim();
        if (v) go('#/admin/testcases/' + v);
      });
      return;
    }

    API.admin.testcases(pid).then(function (cases) {
      box.innerHTML =
        '<div class="admin-bar"><span class="chip">题目 #' + pid + '</span>' +
        '<button class="btn" id="tcAdd">添加测试点</button>' +
        '<button class="btn btn-primary" id="tcSave">保存全部</button>' +
        '<span class="dim" style="margin-left:auto">共 <b id="tcCount">' + cases.length + '</b> 个</span></div>' +
        '<div id="tcList"></div>';

      var state = cases.map(function (c) {
        return {
          input_data: c.input_data,
          expected_output: c.expected_output,
          score: c.score,
          is_sample: c.is_sample,
          explanation: c.explanation || ''
        };
      });

      function draw() {
        el('tcList').innerHTML = state.map(function (c, i) {
          return '<div class="tc-card">' +
            '<div class="tc-head"><b>#' + (i + 1) + '</b>' +
              '<label class="tc-check"><input type="checkbox" data-i="' + i + '" data-f="sample"' + (c.is_sample ? ' checked' : '') + '> 样例（用户可见）</label>' +
              '<label class="tc-check">分值 <input type="number" class="inp tiny" data-i="' + i + '" data-f="score" value="' + c.score + '"></label>' +
              '<button class="btn btn-xs danger" data-del="' + i + '">删除</button></div>' +
            '<div class="tc-grid">' +
              '<div><div class="tc-lbl">输入</div><textarea class="io-box mono" rows="4" data-i="' + i + '" data-f="input_data">' + esc(c.input_data) + '</textarea></div>' +
              '<div><div class="tc-lbl">期望输出</div><textarea class="io-box mono" rows="4" data-i="' + i + '" data-f="expected_output">' + esc(c.expected_output) + '</textarea></div>' +
            '</div></div>';
        }).join('') || '<div class="empty-sm">还没有测试点</div>';

        el('tcCount').textContent = state.length;

        el('tcList').querySelectorAll('textarea, input[data-f]').forEach(function (n) {
          n.addEventListener('input', function () {
            var i = +n.dataset.i;
            var f = n.dataset.f;
            state[i][f] = n.type === 'checkbox' ? n.checked : (f === 'score' ? parseInt(n.value, 10) || 0 : n.value);
          });
        });
        el('tcList').querySelectorAll('[data-del]').forEach(function (b) {
          b.addEventListener('click', function () {
            state.splice(+b.dataset.del, 1);
            draw();
          });
        });
      }

      draw();

      el('tcAdd').addEventListener('click', function () {
        state.push({ input_data: '', expected_output: '', score: 10, is_sample: false, explanation: '' });
        draw();
      });
      el('tcSave').addEventListener('click', function () {
        API.admin.saveTestcases(pid, state)
          .then(function (r) { toast('已保存 ' + r.length + ' 个测试点', 'ok'); })
          .catch(function (e) { toast(e.message, 'bad'); });
      });
    }).catch(function (e) { box.innerHTML = errBox(e); });
  }

  /* ---------------- 章节 ---------------- */
  function renderChapters(box) {
    API.admin.chapters().then(function (list) {
      var groups = {};
      list.forEach(function (c) {
        (groups[c.stage_code] = groups[c.stage_code] || []).push(c);
      });

      box.innerHTML = '<div class="admin-bar"><span class="chip">共 ' + list.length + ' 节</span>' +
        '<span class="dim" style="margin-left:auto">正文在 server/content.json 里维护，改完重启服务生效</span></div>' +
        Object.keys(groups).sort().map(function (code) {
          return '<section class="panel"><div class="panel-head"><h2>' + esc(code) + ' 阶段</h2>' +
            '<span class="panel-sub">' + groups[code].length + ' 节</span></div>' +
            '<div class="list-box">' +
            groups[code].map(function (c) {
              return '<a class="list-row" href="#/learn/' + c.id + '">' +
                '<span class="lr-main">' + esc(c.title) + '</span>' +
                '<span class="lr-sub">' + c.quiz_count + ' 自测 / ' + c.code_count + ' 代码</span>' +
                '<span class="lr-sub">' + c.est_minutes + ' 分钟</span>' +
                (c.is_published ? '' : '<span class="lr-tag bad">未发布</span>') +
              '</a>';
            }).join('') + '</div></section>';
        }).join('');
    }).catch(function (e) { box.innerHTML = errBox(e); });
  }

  /* ---------------- 公告 ---------------- */
  function renderAnnounce(box) {
    API.admin.announcements().then(function (list) {
      box.innerHTML = '<section class="panel"><div class="panel-head"><h2>发布公告</h2></div>' +
        '<div class="form-col">' +
          '<label class="field"><span>标题</span><input id="aTitle" class="inp"></label>' +
          '<label class="field"><span>内容</span><textarea id="aContent" class="io-box" rows="3"></textarea></label>' +
          '<label class="field"><span>级别</span><select id="aLevel" class="inp sel">' +
            '<option value="info">普通</option><option value="warn">提醒</option><option value="danger">重要</option>' +
          '</select></label>' +
          '<div><button class="btn btn-primary" id="aPub">发布</button></div>' +
        '</div></section>' +
        '<section class="panel"><div class="panel-head"><h2>已有公告</h2></div>' +
        '<div class="list-box">' +
        (list.length ? list.map(function (a) {
          return '<div class="list-row"><span class="lr-main">' + esc(a.title) + '</span>' +
            '<span class="lr-sub">' + esc(a.level) + '</span>' +
            '<span class="lr-sub">' + fmtTime(a.created_at) + '</span>' +
            '<button class="btn btn-xs danger" data-del="' + a.id + '">删除</button></div>';
        }).join('') : '<div class="empty-sm">还没有公告</div>') +
        '</div></section>';

      el('aPub').addEventListener('click', function () {
        var title = el('aTitle').value.trim();
        if (!title) { toast('标题不能为空', 'bad'); return; }
        API.admin.createAnnouncement({
          title: title, content: el('aContent').value, level: el('aLevel').value, is_active: true
        }).then(function () { toast('已发布', 'ok'); renderAnnounce(box); })
          .catch(function (e) { toast(e.message, 'bad'); });
      });
      box.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          API.admin.removeAnnouncement(b.dataset.del)
            .then(function () { toast('已删除', 'ok'); renderAnnounce(box); })
            .catch(function (e) { toast(e.message, 'bad'); });
        });
      });
    }).catch(function (e) { box.innerHTML = errBox(e); });
  }

  /* ---------------- 日志 ---------------- */
  function renderLogs(box) {
    API.admin.logs({ size: 60 }).then(function (d) {
      box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:60px">ID</th><th>操作人</th><th>动作</th><th>对象</th><th>说明</th><th>IP</th><th>时间</th>' +
        '</tr></thead><tbody>' +
        (d.items.length ? d.items.map(function (l) {
          return '<tr><td class="mono dim">' + l.id + '</td>' +
            '<td>' + esc(l.username) + '</td>' +
            '<td class="mono">' + esc(l.action) + '</td>' +
            '<td class="dim">' + esc(l.target_type) + ' #' + esc(l.target_id) + '</td>' +
            '<td class="dim ellip">' + esc(l.detail) + '</td>' +
            '<td class="mono dim">' + esc(l.ip) + '</td>' +
            '<td class="dim mono">' + fmtTime(l.created_at) + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="dim center">暂无日志</td></tr>') +
        '</tbody></table></div>';
    }).catch(function (e) { box.innerHTML = errBox(e); });
  }

  function errBox(e) {
    return '<div class="empty">加载失败：' + esc(e && e.message ? e.message : e) + '</div>';
  }

  window.AdminPages = { render: adminPage };
})();
