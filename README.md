# 📚 专属私人题库系统

一个支持 LaTeX 公式、Markdown 混排、完美打印的私人题库管理系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia |
| 后端 | Express 4 + TypeScript |
| 数据库 | SQLite (Prisma ORM) |
| 渲染 | markdown-it + KaTeX |
| 打印 | Paged.js + CSS @media print |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
cd backend && npx prisma migrate dev && npx tsx src/seed.ts && cd ..

# 3. 启动开发服务器
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 项目结构

```
question-bank/
├── shared/          # 共享类型定义
│   └── src/index.ts # Question, ExamPaper 等接口
├── backend/         # Express 后端
│   ├── prisma/      # 数据库 Schema
│   └── src/
│       ├── index.ts           # 入口
│       ├── prisma.ts          # Prisma 客户端
│       ├── routes/
│       │   ├── questions.ts   # 题目 CRUD + 筛选
│       │   ├── papers.ts      # 试卷 CRUD
│       │   ├── tags.ts        # 标签管理
│       │   ├── categories.ts  # 分类树
│       │   └── import.ts      # 批量导入
│       └── seed.ts            # 种子数据
└── frontend/        # Vue 3 前端
    └── src/
        ├── views/
        │   ├── DashboardView.vue      # 仪表盘
        │   ├── QuestionListView.vue   # 题目列表
        │   ├── QuestionEditView.vue   # 题目编辑（实时预览）
        │   ├── PaperListView.vue      # 试卷列表
        │   ├── PaperEditView.vue      # 组卷编辑
        │   ├── PaperDetailView.vue    # 试卷查看/打印
        │   └── ImportView.vue         # 批量导入
        ├── stores/                    # Pinia 状态管理
        ├── utils/
        │   ├── markdown.ts            # Markdown + LaTeX 渲染
        │   └── constants.ts           # 常量映射
        └── assets/main.css            # 全局样式
```

## 功能模块

### 📝 题目管理
- 按学科/题型/难度/关键词多维筛选
- 支持 9 个学科（语数英理化生政史地）
- 6 种题型（单选/多选/填空/简答/论述/判断）
- 5 级难度分级
- 批量删除

### ✏️ 题目编辑
- Markdown + LaTeX 实时预览
- 支持 `$...$` 行内公式和 `$$...$$` 块级公式
- 支持 `==下划线==` 和 `___` 填空标记
- 自定义标签系统

### 📄 试卷组卷
- 从题库中选题组卷
- 拖拽排序（上移/下移）
- 自定义页眉、字号、答题区行数
- 可选显示/隐藏答案和解析

### 🖨️ 打印排版
- Paged.js 驱动的完美分页
- 答题横线不被截断
- 大段材料题不跨页断裂
- 打印时自动隐藏操作按钮

### 📥 批量导入
- 支持 `【题干】【答案】【解析】` 标记格式
- 支持编号格式（1. 2. 3.）
- 自动识别选择题选项
- 导入结果统计

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/questions | 查询题目（支持筛选+分页） |
| POST | /api/questions | 创建题目 |
| PUT | /api/questions/:id | 更新题目 |
| DELETE | /api/questions/:id | 删除题目 |
| POST | /api/questions/batch-delete | 批量删除 |
| GET | /api/papers | 查询试卷 |
| POST | /api/papers | 创建试卷 |
| PUT | /api/papers/:id | 更新试卷 |
| DELETE | /api/papers/:id | 删除试卷 |
| GET | /api/tags | 获取标签 |
| POST | /api/tags | 创建标签 |
| GET | /api/categories | 获取分类树 |
| POST | /api/import/text | 批量导入 |

## 后续升级

当需要多设备同步时：
1. 将 SQLite 替换为 PostgreSQL（修改 `prisma/schema.prisma` 的 `provider`）
2. 添加 JWT 鉴权中间件
3. 添加 WebSocket 实时同步
