/* ==========================================================
   图表模块
   ----------------------------------------------------------
   纯 SVG 手写，不依赖任何图表库。
   理由：整个项目从第一天起就是零依赖、断网可用，
   为了四张图引一个 200KB 的 CDN 库不值当。
   ========================================================== */
(function () {
  'use strict';

  var C = {
    accent: '#7c8cff',
    accent2: '#2dd4bf',
    accent3: '#f5b544',
    grid: 'rgba(255, 255, 255, .08)',
    track: 'rgba(255, 255, 255, .06)',
    text: '#a4adc0',
    textDim: '#6b748a',
    ok: '#4ade80',
    warn: '#f5b544',
    bad: '#fb7185'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function svgEl(tag, attrs, children) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  function textEl(x, y, str, opts) {
    opts = opts || {};
    var t = svgEl('text', {
      x: x, y: y,
      'font-size': opts.size || 11,
      'fill': opts.fill || C.text,
      'text-anchor': opts.anchor || 'middle',
      'font-family': opts.mono ? 'ui-monospace, Consolas, monospace' : 'inherit',
      'font-weight': opts.weight || 400,
      'dominant-baseline': opts.baseline || 'auto'
    });
    t.textContent = str;
    return t;
  }

  function mount(container, svg) {
    container.innerHTML = '';
    container.appendChild(svg);
  }

  /* ------------------------------------------------------
     雷达图：知识点掌握度
     ------------------------------------------------------ */
  function radar(container, data, options) {
    options = options || {};
    var size = options.size || 320;
    var cx = size / 2;
    var cy = size / 2;
    var R = size * 0.33;
    var n = data.length;

    if (!n) {
      container.innerHTML = '<div class="chart-empty">还没有数据，做完几道题再看</div>';
      return;
    }

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + size + ' ' + size,
      width: '100%',
      height: size,
      role: 'img'
    });

    // 背景网格：4 圈
    [0.25, 0.5, 0.75, 1].forEach(function (ratio) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        pts.push((cx + Math.cos(ang) * R * ratio).toFixed(2) + ',' + (cy + Math.sin(ang) * R * ratio).toFixed(2));
      }
      svg.appendChild(svgEl('polygon', {
        points: pts.join(' '),
        fill: ratio === 1 ? 'rgba(91, 141, 239, .04)' : 'none',
        stroke: C.grid,
        'stroke-width': 1
      }));
    });

    // 轴线
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n - Math.PI / 2;
      svg.appendChild(svgEl('line', {
        x1: cx, y1: cy,
        x2: cx + Math.cos(a) * R,
        y2: cy + Math.sin(a) * R,
        stroke: C.grid,
        'stroke-width': 1
      }));
    }

    // 数据多边形
    var points = [];
    data.forEach(function (d, idx) {
      var ang = (Math.PI * 2 * idx) / n - Math.PI / 2;
      var v = Math.max(0, Math.min(100, d.score || 0)) / 100;
      var x = cx + Math.cos(ang) * R * v;
      var y = cy + Math.sin(ang) * R * v;
      points.push(x.toFixed(2) + ',' + y.toFixed(2));
    });

    svg.appendChild(svgEl('polygon', {
      points: points.join(' '),
      fill: 'rgba(124, 140, 255, .25)',
      stroke: C.accent,
      'stroke-width': 2,
      'stroke-linejoin': 'round'
    }));

    // 数据点 + 标签
    data.forEach(function (d, idx) {
      var ang = (Math.PI * 2 * idx) / n - Math.PI / 2;
      var v = Math.max(0, Math.min(100, d.score || 0)) / 100;
      svg.appendChild(svgEl('circle', {
        cx: cx + Math.cos(ang) * R * v,
        cy: cy + Math.sin(ang) * R * v,
        r: 3.5,
        fill: '#12151d',
        stroke: C.accent,
        'stroke-width': 2
      }));

      var lx = cx + Math.cos(ang) * (R + 26);
      var ly = cy + Math.sin(ang) * (R + 26);
      var anchor = Math.abs(Math.cos(ang)) < 0.3 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      var label = d.short || d.stage_title || d.stage_code;
      svg.appendChild(textEl(lx, ly, label, { size: 10.5, fill: C.text, anchor: anchor }));
      svg.appendChild(textEl(lx, ly + 12, (d.score || 0).toFixed(0) + '分', {
        size: 9.5, fill: C.textDim, anchor: anchor, mono: true
      }));
    });

    mount(container, svg);
  }

  /* ------------------------------------------------------
     折线图：学习曲线（双序列：提交 / 通过）
     ------------------------------------------------------ */
  function line(container, data, options) {
    options = options || {};
    var w = 640, h = options.height || 200;
    var padL = 34, padR = 12, padT = 12, padB = 24;
    var iw = w - padL - padR;
    var ih = h - padT - padB;

    if (!data || !data.length) {
      container.innerHTML = '<div class="chart-empty">暂无数据</div>';
      return;
    }

    var maxV = 1;
    data.forEach(function (d) {
      maxV = Math.max(maxV, d.submissions || 0, d.accepted || 0);
    });
    maxV = Math.ceil(maxV * 1.15);

    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img' });

    // 横向网格 + Y 轴刻度
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (ih * g) / 4;
      svg.appendChild(svgEl('line', {
        x1: padL, y1: gy, x2: w - padR, y2: gy,
        stroke: C.grid, 'stroke-width': 1,
        'stroke-dasharray': g === 4 ? '' : '3 3'
      }));
      svg.appendChild(textEl(padL - 8, gy + 3, String(Math.round(maxV * (1 - g / 4))), {
        size: 9.5, fill: C.textDim, anchor: 'end', mono: true
      }));
    }

    function path(key) {
      var pts = data.map(function (d, i) {
        var x = padL + (iw * i) / Math.max(1, data.length - 1);
        var y = padT + ih * (1 - (d[key] || 0) / maxV);
        return { x: x, y: y };
      });
      var d0 = pts.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
      }).join(' ');
      return { d: d0, pts: pts };
    }

    var sub = path('submissions');
    var acc = path('accepted');

    // 提交量面积
    var area = sub.d + ' L' + (padL + iw) + ' ' + (padT + ih) + ' L' + padL + ' ' + (padT + ih) + ' Z';
    svg.appendChild(svgEl('path', {
      d: area, fill: 'rgba(124, 140, 255, .14)', stroke: 'none'
    }));

    svg.appendChild(svgEl('path', {
      d: sub.d, fill: 'none', stroke: C.accent, 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: acc.d, fill: 'none', stroke: C.ok, 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      'stroke-dasharray': '4 3'
    }));

    // X 轴标签：只标首、中、尾，避免拥挤
    [0, Math.floor(data.length / 2), data.length - 1].forEach(function (i) {
      if (i < 0 || i >= data.length) return;
      var x = padL + (iw * i) / Math.max(1, data.length - 1);
      var label = String(data[i].stat_date || '').slice(5);
      svg.appendChild(textEl(x, h - 6, label, { size: 9.5, fill: C.textDim, mono: true }));
    });

    // 图例
    svg.appendChild(svgEl('rect', { x: padL, y: 2, width: 14, height: 3, rx: 1.5, fill: C.accent }));
    svg.appendChild(textEl(padL + 18, 6, '提交', { size: 10, fill: C.text, anchor: 'start' }));
    svg.appendChild(svgEl('rect', { x: padL + 58, y: 2, width: 14, height: 3, rx: 1.5, fill: C.ok }));
    svg.appendChild(textEl(padL + 76, 6, '通过', { size: 10, fill: C.text, anchor: 'start' }));

    mount(container, svg);
  }

  /* ------------------------------------------------------
     热力图：学习日历
     ------------------------------------------------------ */
  function heatmap(container, data, options) {
    options = options || {};
    if (!data || !data.length) {
      container.innerHTML = '<div class="chart-empty">暂无数据</div>';
      return;
    }

    var cell = 11, gap = 3;
    var weeks = Math.ceil(data.length / 7);
    var w = weeks * (cell + gap) + 24;
    var h = 7 * (cell + gap) + 20;

    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img' });

    var COLORS = ['#151922', '#26304a', '#3c5bb0', '#5f75d8', '#8fa0ff'];

    data.forEach(function (d, i) {
      var col = Math.floor(i / 7);
      var row = i % 7;
      var x = 24 + col * (cell + gap);
      var y = row * (cell + gap);
      var rect = svgEl('rect', {
        x: x, y: y, width: cell, height: cell, rx: 2,
        fill: COLORS[Math.max(0, Math.min(4, d.level || 0))],
        'data-day': d.day,
        'data-value': d.value
      });
      rect.appendChild(svgEl('title', {}, []));
      rect.firstChild.textContent = d.day + '：' + d.value;
      svg.appendChild(rect);
    });

    ['一', '三', '五', '日'].forEach(function (label, idx) {
      var rows = [1, 3, 5, 6];
      svg.appendChild(textEl(10, rows[idx] * (cell + gap) + 9, label, { size: 9, fill: C.textDim, anchor: 'end' }));
    });

    mount(container, svg);
  }

  /* ------------------------------------------------------
     横向条形图：分组进度
     ------------------------------------------------------ */
  function bars(container, data, options) {
    options = options || {};
    if (!data || !data.length) {
      container.innerHTML = '<div class="chart-empty">暂无数据</div>';
      return;
    }

    var rowH = 26;
    var w = 520;
    var labelW = options.labelWidth || 130;
    var h = data.length * rowH + 8;
    var barW = w - labelW - 46;

    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img' });

    data.forEach(function (d, i) {
      var y = i * rowH + 6;
      var pct = Math.max(0, Math.min(100, d.percent || 0));

      svg.appendChild(textEl(0, y + 13, String(d.label || ''), {
        size: 10.5, fill: C.text, anchor: 'start'
      }));

      svg.appendChild(svgEl('rect', {
        x: labelW, y: y + 5, width: barW, height: 9, rx: 4.5, fill: C.track
      }));

      if (pct > 0) {
        svg.appendChild(svgEl('rect', {
          x: labelW, y: y + 5,
          width: Math.max(3, barW * pct / 100),
          height: 9, rx: 4.5,
          fill: pct >= 100 ? C.ok : C.accent
        }));
      }

      svg.appendChild(textEl(labelW + barW + 8, y + 13, d.done + '/' + d.total, {
        size: 10, fill: C.textDim, anchor: 'start', mono: true
      }));
    });

    mount(container, svg);
  }

  /* ------------------------------------------------------
     小圆环：单项完成度
     ------------------------------------------------------ */
  function donut(container, percent, options) {
    options = options || {};
    var size = options.size || 96;
    var r = size / 2 - 7;
    var c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(100, percent || 0));

    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, role: 'img' });
    svg.appendChild(svgEl('circle', {
      cx: size / 2, cy: size / 2, r: r, fill: 'none',
      stroke: C.track, 'stroke-width': 8
    }));
    svg.appendChild(svgEl('circle', {
      cx: size / 2, cy: size / 2, r: r, fill: 'none',
      stroke: options.color || C.accent, 'stroke-width': 8,
      'stroke-linecap': 'round',
      'stroke-dasharray': (c * p / 100).toFixed(1) + ' ' + c.toFixed(1),
      transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'
    }));
    svg.appendChild(textEl(size / 2, size / 2 + 1, Math.round(p) + '%', {
      size: 15, fill: C.text, weight: 700, mono: true, baseline: 'middle'
    }));
    mount(container, svg);
  }

  window.Charts = {
    radar: radar,
    line: line,
    heatmap: heatmap,
    bars: bars,
    donut: donut,
    colors: C
  };
})();
