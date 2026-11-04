/* 把 data/*.js 转成 server/content.json
 *
 * 这些数据文件是浏览器直接加载的 JS（有单引号、String.raw、行内注释），
 * 不是合法 JSON。用 Node 执行一遍再序列化，比在 Python 里写解析器可靠得多。
 *
 * 用法：node tools/export_content.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'server', 'content.json');

global.window = {};

const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.js')).sort();

for (const f of files) {
  const code = fs.readFileSync(path.join(DATA, f), 'utf8');
  try {
    new Function('window', code)(global.window);
  } catch (e) {
    console.error(`[ERROR] ${f}: ${e.message}`);
    process.exit(1);
  }
}

const chapters = global.window.CHAPTERS || [];
const problems = global.window.PROBLEMS || [];

// 阶段信息原本散落在注释里，这里硬编码一份，和 knowledge 文件的分组保持一致
const STAGES = [
  { code: '01', order_no: 1, title: 'C++ 语言基础', subtitle: '环境、类型、函数、指针、STL', icon: '01' },
  { code: '02', order_no: 2, title: '算法工具', subtitle: '复杂度、枚举、排序、二分、前缀和、贪心', icon: '02' },
  { code: '03', order_no: 3, title: '数据结构', subtitle: '单调栈、并查集、堆、哈希、树状数组、线段树', icon: '03' },
  { code: '04', order_no: 4, title: '图论', subtitle: '建图、遍历、拓扑、最短路、最小生成树', icon: '04' },
  { code: '05', order_no: 5, title: '动态规划', subtitle: '线性、背包、区间、树形、状压、数位', icon: '05' },
  { code: '06', order_no: 6, title: '数学', subtitle: '质数筛、快速幂、同余、组合数、容斥', icon: '06' },
  { code: '07', order_no: 7, title: '实战冲刺', subtitle: '折半搜索、分治、倍增、离散化、考场策略', icon: '07' },
];

function normStage(ch) {
  const s = Number(ch.s || 1);
  return String(s).padStart(2, '0');
}

const outChapters = chapters.map((c) => ({
  id: c.id,
  stage_code: normStage(c),
  order_no: c.id,
  title: c.title || '',
  subtitle: c.sub || '',
  min: c.min || 20,
  goals: c.goals || [],
  body: c.body || [],
  key_points: c.key || [],
  difficulty: c.diff || 2,
}));

const outProblems = problems.map((p) => ({
  id: p.id,
  group_name: p.g || '',
  title: p.title || '',
  difficulty: p.diff || 'easy',
  difficulty_name: p.diffName || '简单',
  description: p.desc || '',
  input_format: p.in || '',
  output_format: p.outfmt || '',
  constraints: p.limit || '',
  hint: p.hint || '',
  reference_code: p.code || '',
  pitfall: p.pit || '',
  note_text: p.note || '',
  samples: p.samples || [],
  tags: p.tag ? String(p.tag).split(/[、,，\/]/).map((x) => x.trim()).filter(Boolean) : [],
  ref_chapter: p.ref === undefined ? null : p.ref,
  source: p.src || '',
  time_limit: p.tl || 2000,
  difficulty_score: ({ easy: 1, mid: 2, hard: 3, expert: 4 })[p.diff] || 1,
}));

const payload = {
  generated_at: new Date().toISOString(),
  stages: STAGES,
  chapters: outChapters,
  problems: outProblems,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 1), 'utf8');

console.log(`章节 ${outChapters.length} 节`);
console.log(`题目 ${outProblems.length} 题`);
console.log(`输出 ${OUT}  (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);

// 简单自检
const badRef = outProblems.filter((p) => p.ref_chapter !== null && !outChapters.some((c) => c.id === p.ref_chapter));
if (badRef.length) console.warn('警告：以下题目的 ref_chapter 无效：', badRef.map((p) => p.id));
const noCode = outProblems.filter((p) => !p.reference_code);
if (noCode.length) console.warn('警告：以下题目没有参考代码：', noCode.map((p) => p.id));
