# 蓝桥杯 C++ 算法学习与在线评测系统

一个从零基础到省一等奖的完整学习平台。**51 个知识专题 + 80 道配套题目 + 真实编译运行的在线评测**。

不是又一个刷题网站，是把「学什么、怎么学、学到什么程度」串成一条线：每个知识点配自测题，每道题关联回对应章节，做题数据反过来生成知识点掌握度雷达图。

---

## 功能

**学习端**

| 模块 | 说明 |
|---|---|
| 知识体系 | 7 个阶段 51 个专题，206 段可编译代码，87 道章末自测题 |
| 题库 | 80 题，分 10 组，从 A+B 到直方图最大矩形、数位 DP |
| 在线评测 | 提交代码 → 服务器编译运行 → 按测试点判分，AC/WA/TLE/RE/CE |
| 代码运行器 | 不判分，秒出结果，适合调试和验证语法 |
| 学习进度 | 章节完成度、停留时长、自测正确率，云端同步 |
| 数据统计 | 掌握度雷达图、30 天学习曲线、提交热力图、排行榜、错题本 |
| 题解讨论 | 通过题目后才能发题解，支持点赞与回复 |

**管理端**

用户管理（角色、封禁）、题库管理、测试点配置、章节管理、公告发布、操作审计日志。

**权限**

三种角色：`student` 学员 / `teacher` 教师 / `admin` 管理员。教师可维护内容，管理员另有用户与配置权限。

---

## 技术栈

```
前端  原生 JavaScript + CSS，零依赖、零构建、断网可用
      手写 SVG 图表（雷达图 / 折线图 / 热力图 / 条形图）
后端  FastAPI + SQLAlchemy 2.1 + Pydantic 2
数据库 SQLite（默认，零配置）/ PostgreSQL / MySQL 均可切换
认证  JWT + bcrypt，登录失败 5 次锁定 10 分钟
评测  subprocess 隔离 + 落库队列 + 并发信号量
```

没有用 React/Vue，没有用 Celery/Redis。理由：这个项目要让朋友 clone 下来只装一个 Python 依赖就能跑全流程。代码组织上该分层的地方照样分层（router / service / model 三层）。

---

## 快速开始

**环境要求**：Python 3.9+，Windows / macOS / Linux 均可。

```bash
git clone https://github.com/Moistwood/C-Algorithm-Bootcamp.git
cd C-Algorithm-Bootcamp
```

**Windows**：双击 `启动.bat`

**macOS / Linux**：
```bash
chmod +x run.sh && ./run.sh
```

首次运行会自动装依赖。浏览器打开 **http://127.0.0.1:8000**

默认账号：

| 账号 | 密码 | 角色 |
|---|---|---|
| `admin` | `admin123` | 管理员 |
| `demo` | `demo123` | 学员 |

**登录后第一件事：改密码。**

### 在线评测需要 C++ 编译器

系统会自动探测以下位置，找到就用：

1. `toolchain/w64devkit/bin/g++.exe`（项目内置）
2. 系统 PATH 里的 `g++`
3. Dev-C++ / CodeBlocks / MSYS2 / MinGW 的常见安装目录

都没有的话，跑一次自动安装：

```bash
python setup-toolchain.py
```

下载约 69MB 的 w64devkit（GCC），解压到 `toolchain/`，不污染系统环境。

---

## 目录结构

```
├── index.html              前端入口（单页应用）
├── assets/
│   ├── app.js              路由、渲染、Markdown、代码高亮、提交面板
│   ├── api.js              API 封装（含离线降级）
│   ├── charts.js           手写 SVG 图表
│   ├── judge.js            本地运行器组件
│   ├── pages-user.js       登录/注册/个人中心/统计
│   ├── pages-admin.js      管理后台
│   ├── style.css           基础样式
│   └── style2.css          新增模块样式
├── server/
│   ├── main.py             FastAPI 入口、静态托管、异常处理
│   ├── config.py           配置（环境变量覆盖）
│   ├── database.py         引擎与会话，SQLite WAL 模式
│   ├── models.py           18 张表的 ORM 定义
│   ├── schemas.py          Pydantic 请求/响应模型
│   ├── security.py         bcrypt + JWT + 弱密码拦截
│   ├── deps.py             依赖注入、RBAC、分页、审计
│   ├── seed.py             从 content.json 导入种子数据
│   ├── content.json        章节与题目的结构化数据
│   ├── routers/            auth / content / judge / progress / stats / comments / users / admin
│   └── services/           judge（编译运行）/ runner（队列）/ analytics（掌握度算法）
├── data/                   原始内容数据（前端离线模式直接读取）
├── tools/export_content.js data/*.js → server/content.json
└── 启动.bat / run.sh
```

---

## 掌握度是怎么算的

雷达图上每个阶段一个点，分数由三部分加权：

```
章节完成度 × 40  +  自测正确率 × 40  +  关联题目通过率 × 20
```

**为什么这么配比**：看完一节课不等于会了，所以完成度只给 40 分；自测题能验证概念是否真的理解，同权重；题目通过率最难掺水，但样本量小时波动大，给 20 分。

权重在 `server/services/analytics.py` 的 `compute_skills()` 里，想调直接改。

---

## API

启动后访问 **http://127.0.0.1:8000/api/docs** 看完整交互式文档（Swagger UI）。

主要接口：

```
POST   /api/auth/register          注册
POST   /api/auth/login             登录
GET    /api/auth/me                当前用户

GET    /api/stages                 阶段列表
GET    /api/chapters               章节目录
GET    /api/chapters/{id}          章节详情
GET    /api/problems               题目列表（分页/筛选/搜索）
GET    /api/problems/{id}          题目详情

POST   /api/judge/submit           提交判分
GET    /api/judge/submissions/{id} 查询评测结果
POST   /api/judge/run              自由运行（不判分）

POST   /api/progress               上报学习进度
POST   /api/progress/quiz          提交自测答案
GET    /api/stats/overview         学习总览
GET    /api/stats/skills           掌握度
GET    /api/stats/heatmap          提交热力图
```

---

## 部署到公网

默认配置是本地开发用的，上线前必须改两处：

1. **换掉 JWT 密钥**（`ALGO_SECRET_KEY`），否则别人能伪造 token
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
2. **关闭评测或加访问控制**。任意用户能提交代码并被编译执行，
   单人本地用没问题，开放给公网就要考虑隔离（Docker 容器 / nsjail）。

复制 `.env.example` 为 `.env` 后修改。换 PostgreSQL：

```bash
ALGO_DATABASE_URL=postgresql+psycopg://user:pass@127.0.0.1:5432/algo
```

---

## 内容更新

知识点和题目的源数据在 `data/*.js`，改完重新生成：

```bash
node tools/export_content.js
```

然后重启服务，`ensure_seed_data()` 会按主键更新已有记录。

---

## 许可

MIT。拿去改、拿去用、拿去交作业都行，不用署名。
