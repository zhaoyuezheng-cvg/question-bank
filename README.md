# 📚 私人题库系统 (Question Bank System)

一个功能完善的个人题库管理系统，支持多学科题目管理、智能练习、考试模拟、闪卡记忆等功能。

## ✨ 功能特性

### 📝 题库管理
- **多学科支持**：语文、数学、英语、历史、物理、化学、生物、地理、政治
- **多种题型**：单选、多选、填空、简答、论述、判断
- **批量导入**：支持文本粘贴导入、Excel (.xlsx/.xls/.csv) 文件导入
- **智能去重**：导入时自动检测重复题目
- **阅读材料**：支持关联阅读材料（阅读理解、文言文等）
- **教材目录**：按教材版本组织题目（鲁教版、人教版等）

### 🎯 练习系统
- **随机练习**：按学科、分类、难度、题型筛选出题
- **错题本**：自动收录错题，支持标记已掌握
- **收藏夹**：收藏重点题目
- **答题统计**：正确率、答题趋势、学科能力雷达图

### 📄 试卷系统
- **试卷组卷**：手动选题或随机组卷
- **打印导出**：支持打印预览，可导出为 PDF（Ctrl+P）
- **考试模拟**：限时考试，自动评分

### 🃏 闪卡记忆
- **SM-2 算法**：基于遗忘曲线的间隔重复
- **自动调度**：根据掌握程度自动安排复习时间

### 📊 数据分析
- **学科正确率**：各学科答题正确率统计
- **薄弱知识点**：自动识别薄弱环节并推荐练习
- **学习趋势**：每日答题量和正确率趋势图

### 🤖 AI 智能导入
- 支持通过 AI 自动解析题目文本
- 智能识别题型、难度、分类

### 🔒 用户系统
- **多用户支持**：管理员 + 普通用户
- **数据隔离**：每个用户的答题记录、错题本、收藏夹独立
- **JWT 认证**：7天自动过期的安全认证
- **审计日志**：记录关键操作（登录、删除等）

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/zhaoyuezheng-cvg/question-bank.git
cd question-bank

# 安装后端依赖
cd backend
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 可选：导入种子数据
npm run db:seed

# 安装前端依赖
cd ../frontend
npm install
```

### 启动

```bash
# 启动后端 (默认端口 3000)
cd backend
npm run dev

# 启动前端 (另一个终端)
cd frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173`，首次使用会引导创建管理员账号。

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | `3000` |
| `JWT_SECRET` | JWT 密钥（生产环境务必修改） | `question-bank-secret-key-change-in-production` |

## 📁 项目结构

```
question-bank/
├── backend/                 # 后端 (Express + Prisma + SQLite)
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型定义
│   ├── src/
│   │   ├── index.ts        # 入口
│   │   ├── prisma.ts       # Prisma 客户端
│   │   ├── routes/         # API 路由
│   │   │   ├── auth.ts     # 认证（登录/注册/用户管理/审计日志）
│   │   │   ├── questions.ts # 题目 CRUD
│   │   │   ├── papers.ts   # 试卷管理 + PDF 导出
│   │   │   ├── practice.ts # 练习（错题/收藏/答题）
│   │   │   ├── import.ts   # 导入（文本/Excel）
│   │   │   ├── recommend.ts # 智能推荐
│   │   │   ├── exam.ts     # 考试模拟
│   │   │   ├── flashcard.ts # 闪卡
│   │   │   ├── study.ts    # 学习计划
│   │   │   ├── words.ts    # 单词本
│   │   │   └── ...
│   │   └── utils/
│   │       └── audit.ts    # 审计日志工具
│   └── package.json
├── frontend/                # 前端 (Vue 3 + Vite + TypeScript)
│   ├── src/
│   │   ├── router/         # 路由 + 守卫
│   │   ├── utils/
│   │   │   ├── api.ts      # 统一 API 封装
│   │   │   ├── constants.ts # 常量定义
│   │   │   └── ...
│   │   ├── components/     # 公共组件
│   │   │   ├── LoadingEmpty.vue  # 加载/空状态
│   │   │   ├── CommandPalette.vue # 命令面板
│   │   │   └── ...
│   │   ├── views/          # 页面
│   │   └── stores/         # 状态管理
│   └── package.json
└── shared/                  # 共享类型定义
```

## 📖 使用指南

### 导入题目

#### 文本导入
1. 进入「批量导入」页面
2. 选择默认学科、分类
3. 粘贴包含标记的文本，支持三种格式：
   - **标记格式**：`【题干】...【答案】...【解析】...`
   - **编号格式**：`1. 题目内容`
   - **空行分隔**：多题之间用空行隔开
4. 点击「开始导入」

#### Excel 导入
1. 准备 Excel 文件，表头支持中英文：
   - 学科/subject、题型/type、分类/category、难度/difficulty
   - 题干/content、选项/options、答案/answer、解析/analysis
   - 标签/tags、来源/source
2. 上传文件，点击「开始导入」
3. 系统自动去重，跳过已存在的题目

### 打印/导出 PDF
1. 进入试卷详情页
2. 点击「导出 PDF」按钮打开打印页面
3. 按 `Ctrl+P`（Mac: `⌘+P`）选择「保存为 PDF」

### 快捷键
- `N`：新建题目
- `⌘K` / `Ctrl+K`：打开搜索面板

## 🔧 技术栈

- **后端**：Express + TypeScript + Prisma ORM + SQLite
- **前端**：Vue 3 + TypeScript + Vite + ECharts
- **认证**：自实现 JWT（无外部依赖）
- **数据库**：SQLite（零配置，单文件）

## 📝 更新日志

### v2.1.0（安全与功能增强）
- 🔒 **安全**：认证中间件全局生效，JWT 7天过期，密码强度校验
- 👥 **多用户隔离**：错题本/收藏/答题记录按用户隔离
- 📋 **审计日志**：记录登录、删除等关键操作
- 📊 **Excel 导入**：支持 .xlsx/.xls/.csv 文件直接导入
- 📄 **PDF 导出**：试卷支持生成可打印的 HTML 页面
- 🛡️ **删除保护**：删除题目前检查关联数据（试卷/错题/收藏/闪卡）
- 🔄 **导入去重**：自动检测并跳过重复题目
- 📱 **移动端适配**：侧边栏可折叠，响应式布局
- ⚡ **前端优化**：统一 API 封装、路由守卫、401 自动跳转

### v2.0.0
- 英语单词本
- 文言文显示优化
- 数学题型扩充

## 📄 License

MIT
