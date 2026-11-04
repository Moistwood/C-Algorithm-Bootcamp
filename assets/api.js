/* ==========================================================
   API 层
   ----------------------------------------------------------
   设计原则：后端不可用时整个站点必须还能当纯静态文档看。
   所以这里的每个调用失败都返回 null / 抛 APIError，
   由调用方决定是否降级到 localStorage。
   ========================================================== */
(function () {
  'use strict';

  var TOKEN_KEY = 'lqcpp_token_v2';
  var REFRESH_KEY = 'lqcpp_refresh_v2';

  var state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    online: false,      // 后端是否可用
    checking: true,
    judgeEnabled: false,
    compiler: '',
    version: ''
  };

  function APIError(message, code, payload) {
    this.name = 'APIError';
    this.message = message || '请求失败';
    this.code = code || 0;
    this.payload = payload || null;
  }
  APIError.prototype = Object.create(Error.prototype);

  function baseURL() {
    // 同源部署时为空；用 file:// 打开时后端不可用
    if (location.protocol === 'file:') return '';
    return '';
  }

  function buildQuery(params) {
    if (!params) return '';
    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  function request(method, path, options) {
    options = options || {};
    var url = baseURL() + path + buildQuery(options.params);

    var headers = { 'Accept': 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

    var init = { method: method, headers: headers };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);

    return fetch(url, init).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); } catch (e) { data = { detail: text }; }
        }

        if (res.ok) return data;

        if (res.status === 401) {
          clearToken();
        }
        var msg = (data && (data.detail || data.message)) || ('HTTP ' + res.status);
        throw new APIError(msg, res.status, data);
      });
    });
  }

  function get(path, params) { return request('GET', path, { params: params }); }
  function post(path, body) { return request('POST', path, { body: body === undefined ? {} : body }); }
  function put(path, body) { return request('PUT', path, { body: body || {} }); }
  function patch(path, body) { return request('PATCH', path, { body: body || {} }); }
  function del(path, body) { return request('DELETE', path, { body: body }); }

  function setToken(access, refresh, user) {
    state.token = access || '';
    if (access) localStorage.setItem(TOKEN_KEY, access);
    else localStorage.removeItem(TOKEN_KEY);
    if (refresh !== undefined) {
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
      else localStorage.removeItem(REFRESH_KEY);
    }
    if (user !== undefined) state.user = user;
  }

  function clearToken() {
    state.token = '';
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  function getRefresh() {
    return localStorage.getItem(REFRESH_KEY) || '';
  }

  /* -------------------------------------------------------
     启动探测：后端在不在？
     ------------------------------------------------------- */
  function probe() {
    return fetch(baseURL() + '/api/health', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        state.checking = false;
        if (!data || !data.ok) {
          state.online = false;
          return state;
        }
        state.online = true;
        state.version = data.version || '';
        state.judgeEnabled = !!(data.judge && data.judge.enabled);
        state.compiler = (data.judge && data.judge.compiler) || '';
        return state.online && state.token ? refreshMe() : state;
      })
      .catch(function () {
        state.checking = false;
        state.online = false;
        return state;
      });
  }

  function refreshMe() {
    return get('/api/auth/me')
      .then(function (user) { state.user = user; return state; })
      .catch(function () { clearToken(); return state; });
  }

  /* -------------------------------------------------------
     认证
     ------------------------------------------------------- */
  var auth = {
    login: function (account, password) {
      return post('/api/auth/login', { account: account, password: password })
        .then(function (data) {
          setToken(data.access_token, data.refresh_token, data.user);
          return data.user;
        });
    },
    register: function (payload) {
      return post('/api/auth/register', payload).then(function (data) {
        setToken(data.access_token, data.refresh_token, data.user);
        return data.user;
      });
    },
    logout: function () {
      clearToken();
    },
    me: function () {
      return get('/api/auth/me').then(function (u) { state.user = u; return u; });
    },
    updateProfile: function (payload) {
      return put('/api/auth/me', payload).then(function (u) { state.user = u; return u; });
    },
    changePassword: function (oldPwd, newPwd) {
      return post('/api/auth/password', { old_password: oldPwd, new_password: newPwd });
    }
  };

  /* -------------------------------------------------------
     内容
     ------------------------------------------------------- */
  var content = {
    stages: function () { return get('/api/stages'); },
    chapters: function (params) { return get('/api/chapters', params); },
    chapter: function (id) { return get('/api/chapters/' + id); },
    neighbors: function (id) { return get('/api/chapters/' + id + '/neighbors'); },
    problems: function (params) { return get('/api/problems', params); },
    problem: function (id) { return get('/api/problems/' + id); },
    groups: function () { return get('/api/problems/groups'); },
    random: function (params) { return get('/api/problems/random', params); },
    bookmark: function (id) { return post('/api/problems/' + id + '/bookmark'); },
    bookmarks: function () { return get('/api/bookmarks'); },
    meta: function () { return get('/api/meta'); }
  };

  /* -------------------------------------------------------
     评测
     ------------------------------------------------------- */
  var judge = {
    info: function () { return get('/api/judge/info'); },
    run: function (code, stdin, timeLimit) {
      return post('/api/judge/run', { code: code, stdin: stdin || '', time_limit: timeLimit || 2000 });
    },
    submit: function (problemId, code) {
      return post('/api/judge/submit', { problem_id: problemId, code: code, language: 'cpp' });
    },
    submission: function (id) { return get('/api/judge/submissions/' + id); },
    mine: function (params) { return get('/api/judge/submissions', params); },
    recent: function (params) { return get('/api/judge/recent', params); },

    /** 轮询直到评测结束。返回 promise，成功时给出最终提交对象。 */
    waitFor: function (submissionId, onTick) {
      var tries = 0;
      return new Promise(function (resolve, reject) {
        function tick() {
          tries += 1;
          if (tries > 90) { reject(new APIError('评测超时，请稍后在提交记录里查看')); return; }
          judge.submission(submissionId).then(function (sub) {
            if (onTick) onTick(sub);
            if (sub.status === 'pending' || sub.status === 'compiling' || sub.status === 'running') {
              setTimeout(tick, 900);
            } else {
              resolve(sub);
            }
          }).catch(reject);
        }
        setTimeout(tick, 700);
      });
    }
  };

  /* -------------------------------------------------------
     进度
     ------------------------------------------------------- */
  var progress = {
    list: function () { return get('/api/progress'); },
    get: function (chapterId) { return get('/api/progress/' + chapterId); },
    save: function (payload) { return post('/api/progress', payload); },
    quiz: function (payload) { return post('/api/progress/quiz', payload); },
    reset: function (chapterId) { return del('/api/progress/' + chapterId); }
  };

  /* -------------------------------------------------------
     统计
     ------------------------------------------------------- */
  var stats = {
    overview: function () { return get('/api/stats/overview'); },
    skills: function () { return get('/api/stats/skills'); },
    daily: function (days) { return get('/api/stats/daily', { days: days || 30 }); },
    heatmap: function (weeks) { return get('/api/stats/heatmap', { weeks: weeks || 26 }); },
    ranking: function (limit) { return get('/api/stats/ranking', { limit: limit || 20 }); },
    wrong: function () { return get('/api/stats/wrong'); },
    tips: function () { return get('/api/stats/tips'); },
    dashboard: function () { return get('/api/stats/dashboard'); }
  };

  /* -------------------------------------------------------
     社区
     ------------------------------------------------------- */
  var comments = {
    list: function (params) { return get('/api/comments', params); },
    create: function (payload) { return post('/api/comments', payload); },
    like: function (id) { return post('/api/comments/' + id + '/like'); },
    remove: function (id) { return del('/api/comments/' + id); },
    mine: function () { return get('/api/comments/mine'); }
  };

  /* -------------------------------------------------------
     管理后台
     ------------------------------------------------------- */
  var admin = {
    overview: function () { return get('/api/admin/overview'); },
    users: function (params) { return get('/api/admin/users', params); },
    updateUser: function (id, payload) { return patch('/api/admin/users/' + id, payload); },
    chapters: function () { return get('/api/admin/chapters'); },
    saveChapter: function (id, payload) {
      return id ? put('/api/admin/chapters/' + id, payload) : post('/api/admin/chapters', payload);
    },
    removeChapter: function (id) { return del('/api/admin/chapters/' + id); },
    saveProblem: function (id, payload) {
      return id ? put('/api/admin/problems/' + id, payload) : post('/api/admin/problems', payload);
    },
    removeProblem: function (id) { return del('/api/admin/problems/' + id); },
    testcases: function (pid) { return get('/api/admin/problems/' + pid + '/testcases'); },
    saveTestcases: function (pid, items) { return post('/api/admin/problems/' + pid + '/testcases', items); },
    announcements: function () { return get('/api/admin/announcements'); },
    createAnnouncement: function (payload) { return post('/api/admin/announcements', payload); },
    removeAnnouncement: function (id) { return del('/api/admin/announcements/' + id); },
    configs: function () { return get('/api/admin/configs'); },
    saveConfig: function (payload) { return post('/api/admin/configs', payload); },
    logs: function (params) { return get('/api/admin/audit-logs', params); },
    comments: function (params) { return get('/api/admin/comments', params); },
    pinComment: function (id) { return post('/api/admin/comments/' + id + '/pin'); }
  };

  /* -------------------------------------------------------
     用户
     ------------------------------------------------------- */
  var users = {
    profile: function (id) { return get('/api/users/' + id); },
    skills: function (id) { return get('/api/users/' + id + '/skills'); },
    search: function (q) { return get('/api/users/search/name', { q: q }); }
  };

  window.API = {
    state: state,
    probe: probe,
    refreshMe: refreshMe,
    setToken: setToken,
    clearToken: clearToken,
    getRefresh: getRefresh,
    Error: APIError,
    get: get, post: post, put: put, patch: patch, del: del,
    auth: auth,
    content: content,
    judge: judge,
    progress: progress,
    stats: stats,
    comments: comments,
    admin: admin,
    users: users,
    isOnline: function () { return state.online; },
    isLogged: function () { return !!(state.token && state.user); },
    user: function () { return state.user; },
    isAdmin: function () { return state.user && state.user.role === 'admin'; }
  };
})();
