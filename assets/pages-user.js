/* ==========================================================
   用户页面：登录 / 注册 / 个人中心 / 统计 / 排行榜
   ========================================================== */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function go(hash) { location.hash = hash; }

  function fmtTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
    var now = new Date();
    var diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function statusClass(s) {
    if (s === 'accepted') return 'ok';
    if (s === 'pending' || s === 'compiling' || s === 'running') return 'mute';
    return 'bad';
  }

  function toast(msg, kind) {
    var box = el('toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast';
      box.className = 'toast-box';
      document.body.appendChild(box);
    }
    var item = document.createElement('div');
    item.className = 'toast ' + (kind || 'info');
    item.textContent = msg;
    box.appendChild(item);
    setTimeout(function () {
      item.classList.add('out');
      setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 260);
    }, 2600);
  }

  /* ======================================================
     登录 / 注册
     ====================================================== */
  function authPage(container, mode) {
    if (!API.isOnline()) {
      container.innerHTML =
        '<div class="wrap"><div class="hero"><h1>需要启动后端服务</h1>' +
        '<p>登录、进度同步、在线评测这些功能依赖后端。当前是纯静态模式，只能浏览知识内容。</p></div>' +
        '<div class="card"><h3>怎么启动</h3>' +
        '<pre class="mono-block">pip install -r requirements.txt\npython -m server.main</pre>' +
        '<p class="dim">启动后访问 http://127.0.0.1:8000</p></div></div>';
      return;
    }

    if (API.isLogged()) { go('#/profile'); return; }

    var isReg = mode === 'register';

    container.innerHTML =
      '<div class="wrap auth-wrap">' +
        '<div class="auth-side">' +
          '<div class="auth-logo">C++ 算法竞赛特训</div>' +
          '<h2 class="auth-h2">把 51 个专题<br>和 80 道题<br>串成一条路</h2>' +
          '<ul class="auth-points">' +
            '<li>学习进度云端同步，换设备接着学</li>' +
            '<li>代码在线编译运行，编译器和考场一致</li>' +
            '<li>知识点掌握度雷达图，看清哪里虚</li>' +
            '<li>错题本自动收集，不用手工记</li>' +
          '</ul>' +
        '</div>' +
        '<div class="auth-card">' +
          '<div class="auth-tabs">' +
            '<button class="auth-tab' + (isReg ? '' : ' active') + '" data-auth="login">登录</button>' +
            '<button class="auth-tab' + (isReg ? ' active' : '') + '" data-auth="register">注册</button>' +
          '</div>' +
          '<form id="authForm" autocomplete="on">' +
            (isReg
              ? '<label class="field"><span>用户名</span>' +
                '<input id="fUser" name="username" autocomplete="username" placeholder="3-32 位，字母数字下划线" required></label>' +
                '<label class="field"><span>邮箱</span>' +
                '<input id="fEmail" name="email" type="email" autocomplete="email" placeholder="用于找回密码" required></label>' +
                '<label class="field"><span>昵称（可选）</span>' +
                '<input id="fName" name="display_name" autocomplete="nickname" placeholder="显示在排行榜上"></label>'
              : '<label class="field"><span>用户名或邮箱</span>' +
                '<input id="fAccount" name="account" autocomplete="username" placeholder="输入用户名或邮箱" required></label>')
            +
            '<label class="field"><span>密码</span>' +
              '<input id="fPass" name="password" type="password" autocomplete="' + (isReg ? 'new-password' : 'current-password') + '" placeholder="至少 6 位" required>' +
            '</label>' +
            (isReg ? '<label class="field"><span>确认密码</span>' +
              '<input id="fPass2" type="password" autocomplete="new-password" placeholder="再输一次" required></label>' : '') +
            '<div id="authErr" class="auth-err"></div>' +
            '<button type="submit" class="btn btn-primary btn-block" id="authBtn">' +
              (isReg ? '注册并开始学习' : '登录') +
            '</button>' +
          '</form>' +
          (isReg ? '' : '<div class="auth-tip">首次部署默认账号：<b>admin / admin123</b>，登录后请立刻改密码。</div>') +
        '</div>' +
      '</div>';

    container.querySelectorAll('[data-auth]').forEach(function (b) {
      b.addEventListener('click', function () {
        go(b.dataset.auth === 'register' ? '#/register' : '#/login');
      });
    });

    var form = el('authForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = el('authBtn');
      var err = el('authErr');
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = isReg ? '注册中…' : '登录中…';

      var pwd = el('fPass').value;

      var promise;
      if (isReg) {
        if (pwd !== el('fPass2').value) {
          err.textContent = '两次输入的密码不一致';
          btn.disabled = false;
          btn.textContent = '注册并开始学习';
          return;
        }
        promise = API.auth.register({
          username: el('fUser').value.trim(),
          email: el('fEmail').value.trim(),
          password: pwd,
          display_name: (el('fName').value || '').trim()
        });
      } else {
        promise = API.auth.login(el('fAccount').value.trim(), pwd);
      }

      promise.then(function () {
        toast(isReg ? '注册成功，开始学习吧' : '登录成功', 'ok');
        if (window.App && window.App.onLoginChanged) window.App.onLoginChanged();
        go('#/profile');
      }).catch(function (e) {
        err.textContent = e.message || '请求失败';
        btn.disabled = false;
        btn.textContent = isReg ? '注册并开始学习' : '登录';
      });
    });
  }

  /* ======================================================
     个人中心
     ====================================================== */
  function profilePage(container) {
    if (!API.isOnline()) {
      container.innerHTML = '<div class="wrap"><div class="empty">后端未启动，无法显示个人中心。</div></div>';
      return;
    }
    if (!API.isLogged()) {
      container.innerHTML =
        '<div class="wrap"><div class="hero"><h1>还没有登录</h1>' +
        '<p>登录后才有学习进度、提交记录和掌握度分析。</p>' +
        '<div class="hero-actions"><a class="btn btn-primary" href="#/login">去登录</a>' +
        '<a class="btn" href="#/register">注册新账号</a></div></div></div>';
      return;
    }

    var u = API.user();
    container.innerHTML = '<div class="wrap" id="profileBox"><div class="loading">加载中…</div></div>';
    var box = el('profileBox');

    var dash = null, submissions = [], wrong = [];

    Promise.all([
      API.stats.dashboard().catch(function () { return null; }),
      API.judge.mine({ size: 12 }).catch(function () { return null; }),
      API.stats.wrong().catch(function () { return null; })
    ]).then(function (res) {
      dash = res[0];
      submissions = (res[1] && res[1].items) || [];
      wrong = res[2] || [];
      render();
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">加载失败：' + esc(e.message) + '</div>';
    });

    function render() {
      var ov = (dash && dash.overview) || {};
      var skills = (dash && dash.skills) || [];
      var daily = (dash && dash.daily) || [];
      var tips = (dash && dash.tips) || [];

      var h = '';

      /* 顶部身份卡 */
      h += '<div class="profile-head">' +
        '<div class="avatar-lg">' + esc((u.display_name || u.username).slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="profile-id">' +
          '<h1>' + esc(u.display_name || u.username) + '</h1>' +
          '<div class="profile-meta">' +
            '<span class="chip">' + esc(u.role === 'admin' ? '管理员' : u.role === 'teacher' ? '教师' : '学员') + '</span>' +
            (u.school ? '<span class="chip">' + esc(u.school) + '</span>' : '') +
            '<span class="chip">加入于 ' + esc(String(u.created_at).slice(0, 10)) + '</span>' +
            (ov.rank ? '<span class="chip accent">排名 #' + ov.rank + ' / ' + ov.total_users + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="profile-actions">' +
          '<a class="btn" href="#/settings">设置</a>' +
          '<button class="btn" id="btnLogout">退出</button>' +
        '</div>' +
      '</div>';

      /* 四个关键数字 */
      h += '<div class="stat-cards">' +
        statCard('已学章节', ov.chapters_done + ' / ' + ov.chapters_total, pct(ov.chapters_done, ov.chapters_total), '') +
        statCard('已过题目', ov.problems_solved + ' / ' + ov.problems_total, pct(ov.problems_solved, ov.problems_total), 'accent') +
        statCard('提交通过率', (ov.accept_rate || 0) + '%', ov.accept_rate || 0, 'ok') +
        statCard('连续学习', (ov.streak_days || 0) + ' 天', Math.min(100, (ov.streak_days || 0) * 10), 'amber') +
      '</div>';

      /* 今日建议 */
      if (tips.length) {
        h += '<section class="panel"><div class="panel-head"><h2>接下来做什么</h2></div><div class="tip-list">';
        tips.forEach(function (t) {
          h += '<div class="tip-row tip-' + (t.level || 'info') + '">' +
            '<div class="tip-title">' + esc(t.title) + '</div>' +
            '<div class="tip-detail">' + esc(t.detail) + '</div>' +
            (t.action ? '<a class="tip-go" href="' + esc(t.action) + '">去看看 →</a>' : '') +
          '</div>';
        });
        h += '</div></section>';
      }

      /* 图表区 */
      h += '<div class="chart-grid">' +
        '<section class="panel"><div class="panel-head"><h2>知识点掌握度</h2>' +
          '<span class="panel-sub">完成度 40% + 自测 40% + 刷题 20%</span></div>' +
          '<div id="radarBox" class="chart-box"></div></section>' +
        '<section class="panel"><div class="panel-head"><h2>学习曲线</h2>' +
          '<span class="panel-sub">近 30 天</span></div>' +
          '<div id="lineBox" class="chart-box"></div></section>' +
      '</div>';

      h += '<section class="panel"><div class="panel-head"><h2>学习日历</h2>' +
        '<span class="panel-sub">近半年</span></div>' +
        '<div id="heatBox" class="chart-box heat"></div></section>';

      /* 错题本 + 最近提交 */
      h += '<div class="two-col">' +
        '<section class="panel"><div class="panel-head"><h2>错题本</h2>' +
          '<a class="panel-link" href="#/stats">全部 →</a></div>' +
          '<div class="list-box" id="wrongBox"></div></section>' +
        '<section class="panel"><div class="panel-head"><h2>最近提交</h2></div>' +
          '<div class="list-box" id="subBox"></div></section>' +
      '</div>';

      box.innerHTML = h;

      /* 渲染图表 */
      var radarData = skills.map(function (s) {
        return { score: s.score, stage_title: s.stage_title, stage_code: s.stage_code };
      });
      Charts.radar(el('radarBox'), radarData, { size: 300 });
      Charts.line(el('lineBox'), daily, { height: 200 });
      Charts.heatmap(el('heatBox'), [], {});

      API.stats.heatmap().then(function (cells) {
        var hb = el('heatBox');
        if (hb) Charts.heatmap(hb, cells);
      }).catch(function () {});

      /* 错题 */
      var wb = el('wrongBox');
      if (!wrong.length) {
        wb.innerHTML = '<div class="empty-sm">还没有错题。要么是没做题，要么是全对。</div>';
      } else {
        wb.innerHTML = wrong.slice(0, 6).map(function (w) {
          return '<a class="list-row" href="#/practice/' + w.problem_id + '">' +
            '<span class="lr-main">' + esc(w.title) + '</span>' +
            '<span class="lr-sub">' + esc(w.group_name) + '</span>' +
            '<span class="lr-tag bad">' + w.attempts + ' 次未过</span>' +
          '</a>';
        }).join('');
      }

      /* 提交 */
      var sb = el('subBox');
      if (!submissions.length) {
        sb.innerHTML = '<div class="empty-sm">还没有提交记录。</div>';
      } else {
        sb.innerHTML = submissions.map(function (s) {
          return '<a class="list-row" href="#/practice/' + s.problem_id + '">' +
            '<span class="lr-main">' + esc(s.problem_title) + '</span>' +
            '<span class="lr-tag ' + statusClass(s.status) + '">' + esc(s.status_name) + '</span>' +
            '<span class="lr-sub">' + fmtTime(s.created_at) + '</span>' +
          '</a>';
        }).join('');
      }

      var lo = el('btnLogout');
      if (lo) {
        lo.addEventListener('click', function () {
          API.auth.logout();
          if (window.App && window.App.onLoginChanged) window.App.onLoginChanged();
          toast('已退出登录');
          go('#/');
        });
      }
    }

    function pct(a, b) { return b ? (a * 100 / b) : 0; }

    function statCard(label, value, percent, tone) {
      return '<div class="stat-card' + (tone ? ' ' + tone : '') + '">' +
        '<div class="sc-label">' + esc(label) + '</div>' +
        '<div class="sc-value">' + esc(value) + '</div>' +
        '<div class="sc-bar"><i style="width:' + Math.max(0, Math.min(100, percent)) + '%"></i></div>' +
      '</div>';
    }
  }

  /* ======================================================
     统计页
     ====================================================== */
  function statsPage(container) {
    if (!API.isOnline() || !API.isLogged()) {
      container.innerHTML = '<div class="wrap"><div class="hero"><h1>需要登录</h1>' +
        '<p>统计数据基于你的学习记录生成。</p>' +
        '<div class="hero-actions"><a class="btn btn-primary" href="#/login">去登录</a></div></div></div>';
      return;
    }

    container.innerHTML = '<div class="wrap" id="statsBox"><div class="loading">加载中…</div></div>';
    var box = el('statsBox');

    Promise.all([
      API.stats.dashboard(),
      API.stats.heatmap(),
      API.stats.ranking(15),
      API.stats.wrong()
    ]).then(function (res) {
      var dash = res[0] || {};
      var cells = res[1] || [];
      var rank = res[2] || [];
      var wrong = res[3] || [];
      var ov = dash.overview || {};
      var skills = dash.skills || [];
      var daily = dash.daily || [];

      var h = '<div class="hero"><h1>学习统计</h1>' +
        '<p>数字不会骗人。完成度低、正确率低的地方，就是比赛会丢分的地方。</p></div>';

      h += '<div class="stat-cards">' +
        card('累计学习', Math.round((ov.minutes_total || 0) / 60) + ' 小时', '') +
        card('提交总数', ov.submissions_total || 0, '') +
        card('通过数', ov.accepted_total || 0, 'ok') +
        card('通过率', (ov.accept_rate || 0) + '%', (ov.accept_rate || 0) >= 50 ? 'ok' : 'amber') +
      '</div>';

      h += '<div class="chart-grid">' +
        '<section class="panel"><div class="panel-head"><h2>掌握度雷达</h2></div>' +
        '<div id="sRadar" class="chart-box"></div></section>' +
        '<section class="panel"><div class="panel-head"><h2>30 天曲线</h2></div>' +
        '<div id="sLine" class="chart-box"></div></section></div>';

      h += '<section class="panel"><div class="panel-head"><h2>提交日历</h2></div>' +
        '<div id="sHeat" class="chart-box heat"></div></section>';

      /* 分阶段明细表 */
      h += '<section class="panel"><div class="panel-head"><h2>分阶段明细</h2></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>阶段</th><th>章节</th><th>自测正确率</th><th>刷题通过率</th><th>掌握度</th>' +
        '</tr></thead><tbody>' +
        skills.map(function (s) {
          var tone = s.score >= 75 ? 'ok' : s.score >= 40 ? 'warn' : 'bad';
          return '<tr><td>' + esc(s.stage_code + ' ' + s.stage_title) + '</td>' +
            '<td class="mono">' + s.chapters_done + '/' + s.chapters_total + '</td>' +
            '<td class="mono">' + s.quiz_accuracy + '%</td>' +
            '<td class="mono">' + s.problem_pass_rate + '%</td>' +
            '<td><span class="score-pill ' + tone + '">' + s.score + '</span></td></tr>';
        }).join('') +
        '</tbody></table></div></section>';

      /* 排行榜 */
      h += '<section class="panel"><div class="panel-head"><h2>排行榜</h2>' +
        '<span class="panel-sub">按通过题目数排序</span></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:52px">名次</th><th>用户</th><th>通过</th><th>提交</th><th>通过率</th>' +
        '</tr></thead><tbody>' +
        (rank.length ? rank.map(function (r) {
          return '<tr><td class="mono">' + r.rank + '</td>' +
            '<td><a class="link" href="#/user/' + r.user_id + '">' + esc(r.display_name) + '</a></td>' +
            '<td class="mono">' + r.solved + '</td>' +
            '<td class="mono">' + r.submissions + '</td>' +
            '<td class="mono">' + r.accept_rate + '%</td></tr>';
        }).join('') : '<tr><td colspan="5" class="dim center">暂无数据</td></tr>') +
        '</tbody></table></div></section>';

      /* 错题本 */
      h += '<section class="panel"><div class="panel-head"><h2>错题本</h2>' +
        '<span class="panel-sub">' + wrong.length + ' 题</span></div><div class="list-box">' +
        (wrong.length ? wrong.map(function (w) {
          return '<a class="list-row" href="#/practice/' + w.problem_id + '">' +
            '<span class="lr-main">' + esc(w.title) + '</span>' +
            '<span class="lr-sub">' + esc(w.group_name) + '</span>' +
            '<span class="lr-tag bad">' + w.attempts + ' 次未过</span>' +
            '<span class="lr-sub">' + fmtTime(w.last_at) + '</span></a>';
        }).join('') : '<div class="empty-sm">没有错题记录</div>') +
        '</div></section>';

      box.innerHTML = h;

      Charts.radar(el('sRadar'), skills.map(function (s) {
        return { score: s.score, stage_title: s.stage_title };
      }), { size: 300 });
      Charts.line(el('sLine'), daily, { height: 200 });
      Charts.heatmap(el('sHeat'), cells);
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">加载失败：' + esc(e.message) + '</div>';
    });

    function card(label, value, tone) {
      return '<div class="stat-card' + (tone ? ' ' + tone : '') + '">' +
        '<div class="sc-label">' + esc(label) + '</div>' +
        '<div class="sc-value">' + esc(value) + '</div></div>';
    }
  }

  /* ======================================================
     设置页
     ====================================================== */
  function settingsPage(container) {
    if (!API.isLogged()) { go('#/login'); return; }
    var u = API.user();

    container.innerHTML = '<div class="wrap"><div class="hero"><h1>账号设置</h1></div>' +
      '<section class="panel"><div class="panel-head"><h2>个人资料</h2></div>' +
        '<form id="profileForm" class="form-col">' +
          '<label class="field"><span>昵称</span><input id="sName" value="' + esc(u.display_name) + '"></label>' +
          '<label class="field"><span>学校</span><input id="sSchool" value="' + esc(u.school) + '" placeholder="选填"></label>' +
          '<label class="field"><span>目标赛事</span><input id="sContest" value="' + esc(u.target_contest) + '" placeholder="如：蓝桥杯 C++ A 组"></label>' +
          '<label class="field"><span>每周目标（分钟）</span><input id="sGoal" type="number" min="0" max="10080" value="' + (u.weekly_goal_minutes || 300) + '"></label>' +
          '<label class="field"><span>个人简介</span><textarea id="sBio" rows="3">' + esc(u.bio) + '</textarea></label>' +
          '<div><button class="btn btn-primary" type="submit">保存资料</button></div>' +
        '</form></section>' +
      '<section class="panel"><div class="panel-head"><h2>修改密码</h2></div>' +
        '<form id="pwdForm" class="form-col">' +
          '<label class="field"><span>原密码</span><input id="pOld" type="password" autocomplete="current-password"></label>' +
          '<label class="field"><span>新密码</span><input id="pNew" type="password" autocomplete="new-password" placeholder="至少 6 位"></label>' +
          '<label class="field"><span>确认新密码</span><input id="pNew2" type="password" autocomplete="new-password"></label>' +
          '<div><button class="btn" type="submit">修改密码</button></div>' +
        '</form></section>' +
      '<section class="panel"><div class="panel-head"><h2>账号信息</h2></div>' +
        '<div class="kv-list">' +
          '<div class="kv"><span>用户名</span><b>' + esc(u.username) + '</b></div>' +
          '<div class="kv"><span>邮箱</span><b>' + esc(u.email) + '</b></div>' +
          '<div class="kv"><span>角色</span><b>' + esc(u.role) + '</b></div>' +
          '<div class="kv"><span>注册时间</span><b>' + esc(String(u.created_at).slice(0, 19).replace('T', ' ')) + '</b></div>' +
        '</div></section></div>';

    el('profileForm').addEventListener('submit', function (e) {
      e.preventDefault();
      API.auth.updateProfile({
        display_name: el('sName').value.trim(),
        school: el('sSchool').value.trim(),
        target_contest: el('sContest').value.trim(),
        weekly_goal_minutes: parseInt(el('sGoal').value, 10) || 0,
        bio: el('sBio').value.trim()
      }).then(function () {
        toast('资料已保存', 'ok');
        if (window.App && window.App.onLoginChanged) window.App.onLoginChanged();
      }).catch(function (ex) { toast(ex.message, 'bad'); });
    });

    el('pwdForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (el('pNew').value !== el('pNew2').value) { toast('两次输入的新密码不一致', 'bad'); return; }
      API.auth.changePassword(el('pOld').value, el('pNew').value)
        .then(function () { toast('密码已修改', 'ok'); el('pwdForm').reset(); })
        .catch(function (ex) { toast(ex.message, 'bad'); });
    });
  }

  /* ======================================================
     他人主页
     ====================================================== */
  function userPage(container, id) {
    if (!API.isOnline()) { container.innerHTML = '<div class="wrap"><div class="empty">需要后端</div></div>'; return; }
    container.innerHTML = '<div class="wrap"><div class="loading">加载中…</div></div>';

    Promise.all([API.users.profile(id), API.users.skills(id)]).then(function (res) {
      var p = res[0], skills = res[1] || [];
      var u = p.user;

      container.innerHTML = '<div class="wrap">' +
        '<div class="profile-head"><div class="avatar-lg">' + esc(u.display_name.slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="profile-id"><h1>' + esc(u.display_name) + '</h1>' +
        '<div class="profile-meta">' +
          (p.school ? '<span class="chip">' + esc(p.school) + '</span>' : '') +
          '<span class="chip">加入于 ' + esc(String(p.created_at).slice(0, 10)) + '</span></div>' +
        (p.bio ? '<p class="dim" style="margin-top:6px">' + esc(p.bio) + '</p>' : '') +
        '</div></div>' +
        '<div class="stat-cards">' +
          '<div class="stat-card"><div class="sc-label">通过题目</div><div class="sc-value">' + p.stats.solved + '</div></div>' +
          '<div class="stat-card"><div class="sc-label">提交次数</div><div class="sc-value">' + p.stats.submissions + '</div></div>' +
          '<div class="stat-card"><div class="sc-label">通过率</div><div class="sc-value">' + p.stats.accept_rate + '%</div></div>' +
          '<div class="stat-card"><div class="sc-label">完成章节</div><div class="sc-value">' + p.stats.chapters_done + '</div></div>' +
        '</div>' +
        '<section class="panel"><div class="panel-head"><h2>知识点掌握度</h2></div>' +
        '<div id="uRadar" class="chart-box"></div></section></div>';

      Charts.radar(el('uRadar'), skills.map(function (s) {
        return { score: s.score, stage_title: s.stage_title };
      }), { size: 320 });
    }).catch(function (e) {
      container.innerHTML = '<div class="wrap"><div class="empty">' + esc(e.message) + '</div></div>';
    });
  }

  window.Pages = {
    login: function (c) { authPage(c, 'login'); },
    register: function (c) { authPage(c, 'register'); },
    profile: profilePage,
    stats: statsPage,
    settings: settingsPage,
    user: userPage,
    toast: toast,
    esc: esc,
    fmtTime: fmtTime,
    statusClass: statusClass
  };
})();
