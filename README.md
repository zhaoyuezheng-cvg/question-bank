# 📚 专属私人题库系统

一个支持 LaTeX 公式、Markdown 混排、在线答题、错题本、完美打印的私人题库管理系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia |
| 后端 | Express 4 + TypeScript |
| 数据库 | SQLite (Prisma ORM) |
| 渲染 | markdown-it + KaTeX |
| 打印 | CSS @media print |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库 + 填充测试题（30道，覆盖9个学科）
cd backend
npx prisma migrate dev
npx tsx src/seed.ts
cd ..

# 3. 启动
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 功能全景

### 📝 题库管理
- **9 大学科**：语数英理化生政史地
- **6 种题型**：单选 / 多选 / 填空 / 简答 / 论述 / 判断
- **5 级难度**：基础 → 较易 → 中等 → 较难 → 困难
- **多维筛选**：学科 / 题型 / 难度 / 分类 / 关键词
- **批量删除**：勾选多题一键删除

### ✏️ 题目编辑
- **实时预览**：左编辑右预览，所见即所得
- **LaTeX 公式**：`$E=mc^2$` 行内，`$$\int_0^1$$` 块级
- **Markdown**：标题、列表、引用、代码块
- **特殊语法**：`==下划线==`、`___` 填空横线
- **自定义标签**：灵活标记，便于组卷筛选

### 📄 试卷组卷
- 从题库中选题，支持拖拽排序
- 自定义页眉、字号、答题区行数
- 可选显示/隐藏答案和解析
- 一键打印

### 🎯 答题练习
- **随机组卷**：按学科、题数随机抽取
- **即时反馈**：提交后立刻看到对错 + 解析
- **计时功能**：记录答题用时
- **自动错题本**：答错自动收录错题本

### 📝 错题本
- **自动收录**：答题答错自动加入
- **掌握标记**：标记「已掌握」/「未掌握」
- **筛选查看**：按学科、掌握状态筛选
- **复习解析**：查看正确答案和详细解析

### ❤️ 收藏夹
- 答题时一键收藏重要题目
- 按学科筛选查看
- 可添加收藏备注

### 📥 批量导入
- 支持 `【题干】【答案】【解析】` 标记格式
- 支持编号格式（1. 2. 3.）
- 自动识别选择题选项
- 导入结果统计

### 📊 数据统计
- 题目总数 / 试卷数量
- 已答题数 / 正确率
- 学科分布可视化

## UI 设计

### 设计语言
- **配色**：Indigo 主色调（`#6366f1`），搭配渐变色统计卡片
- **圆角**：大圆角卡片（`16px`），按钮 `10px`
- **阴影**：多层次阴影体系（xs → xl），hover 上浮效果
- **动画**：路由过渡、骨架屏加载、toast 滑入、进度条渐变

### 暗色模式
- 支持亮色/暗色主题切换
- 偏好自动保存至 localStorage
- 全部 CSS 变量适配双主题

### 侧边栏
- 深色渐变背景（`#1e1b4b`）
- 分组导航：概览 / 题库 / 练习
- 活跃态左侧指示条 + 背景高亮
- 底部暗色模式切换按钮

### 全局组件
- **Toast 消息提示**：替代原生 `alert()`，支持 success/error/warning/info
- **Confirm 确认弹窗**：替代原生 `confirm()`，带图标 + 模糊遮罩
- **骨架屏**：列表页加载时显示 shimmer 动画占位

### 页面细节
- **仪表盘**：渐变色统计卡片，hover 上浮 + 阴影加深
- **列表页**：sticky 表头、hover 行高亮、ghost 操作按钮
- **编辑页**：双栏布局，预览面板 sticky 固定
- **练习页**：选项卡选中/正确/错误状态鲜明，进度条渐变
- **错题本/收藏夹**：彩色状态标签，答案/解析色块区分

## 项目结构

```
question-bank/
├── shared/              # 共享类型定义
│   └── src/index.ts     # Question, ExamPaper 等接口
├── backend/             # Express 后端
│   ├── prisma/
│   │   ├── schema.prisma    # 数据库模型
│   │   └── question-bank.db # SQLite 数据文件
│   └── src/
│       ├── index.ts         # 入口
│       ├── prisma.ts        # Prisma 客户端
│       ├── routes/
│       │   ├── questions.ts # 题目 CRUD + 筛选 + 统计
│       │   ├── papers.ts    # 试卷 CRUD
│       │   ├── tags.ts      # 标签管理
│       │   ├── categories.ts# 分类树
│       │   ├── import.ts    # 批量导入
│       │   └── practice.ts  # 答题练习 + 错题本 + 收藏 + 随机组卷
│       └── seed.ts          # 种子数据（30题）
└── frontend/            # Vue 3 前端
    └── src/
        ├── App.vue             # 根组件（侧边栏 + 暗色模式 + Toast/Confirm）
        ├── views/
        │   ├── DashboardView.vue      # 仪表盘
        │   ├── QuestionListView.vue   # 题目列表
        │   ├── QuestionEditView.vue   # 题目编辑
        │   ├── PaperListView.vue      # 试卷列表
        │   ├── PaperEditView.vue      # 组卷编辑
        │   ├── PaperDetailView.vue    # 试卷查看/打印
        │   ├── ImportView.vue         # 批量导入
        │   ├── PracticeView.vue       # 答题练习
        │   ├── ErrorBookView.vue      # 错题本
        │   └── FavoritesView.vue      # 收藏夹
        ├── stores/                    # Pinia 状态管理
        ├── utils/
        │   ├── markdown.ts            # Markdown + LaTeX 渲染
        │   └── constants.ts           # 常量映射
        └── assets/main.css            # 全局样式（变量 + 暗色 + 动画）
```

## API 接口

### 题目管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/questions | 查询题目（支持筛选+分页） |
| GET | /api/questions/stats/summary | 统计概览 |
| POST | /api/questions | 创建题目 |
| PUT | /api/questions/:id | 更新题目（白名单字段） |
| DELETE | /api/questions/:id | 删除题目 |
| POST | /api/questions/batch-delete | 批量删除 |

### 试卷管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/papers | 查询试卷 |
| POST | /api/papers | 创建试卷 |
| PUT | /api/papers/:id | 更新试卷 |
| DELETE | /api/papers/:id | 删除试卷 |

### 答题练习
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/practice/random-paper | 随机组卷 |
| POST | /api/practice/submit | 提交答案（自动判分+入错题本） |
| GET | /api/practice/stats | 答题统计 |

### 错题本
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/practice/errors | 错题列表 |
| POST | /api/practice/errors | 加入错题本 |
| PUT | /api/practice/errors/:id | 标记掌握状态 |
| DELETE | /api/practice/errors/:id | 移除错题 |

### 收藏夹
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/practice/favorites | 收藏列表 |
| POST | /api/practice/favorites | 收藏题目 |
| DELETE | /api/practice/favorites/:questionId | 取消收藏 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tags | 获取标签 |
| GET | /api/categories | 获取分类树 |
| POST | /api/import/text | 批量导入 |

## 与市面同类软件对比

| 功能 | 本系统 | 猿题库 | 作业帮 |
|------|--------|--------|--------|
| 私有部署 | ✅ | ❌ | ❌ |
| 数据完全掌控 | ✅ | ❌ | ❌ |
| LaTeX 公式 | ✅ | ✅ | ✅ |
| 自定义标签 | ✅ | ❌ | ❌ |
| 答题练习 | ✅ | ✅ | ✅ |
| 错题本 | ✅ | ✅ | ✅ |
| 收藏夹 | ✅ | ✅ | ✅ |
| 随机组卷 | ✅ | ✅ | ❌ |
| 打印排版 | ✅ | ❌ | ❌ |
| 批量导入 | ✅ | ❌ | ❌ |
| 离线使用 | ✅ | ❌ | ❌ |
| 免费无广告 | ✅ | ❌ | ❌ |
| 暗色模式 | ✅ | ❌ | ❌ |
| Toast 消息 | ✅ | ✅ | ✅ |

## 后续升级方向

- [x] ~~UI 美化（暗色模式 / 动画 / 组件升级）~~ ✅ 已完成
- [ ] 用户登录（JWT 鉴权）
- [ ] 多设备同步（WebSocket）
- [ ] 图片上传（题目插图）
- [ ] OCR 拍照识别入库
- [ ] AI 智能出题
- [ ] 自适应难度推荐
- [ ] PWA 离线支持
- [ ] PostgreSQL 迁移（多用户场景）

## 更新日志

### v1.1.0 - UI 全面美化（2026-06-25）

**🎨 视觉升级**
- 全局 CSS 变量体系重构，新增 50+ 设计 token
- 侧边栏深色渐变重设计，分组导航 + 活跃态指示条
- 仪表盘统计卡片渐变色 + hover 上浮动画
- 列表页骨架屏加载、表格 sticky 表头、ghost 操作按钮

**🌙 暗色模式**
- 完整 `[data-theme="dark"]` 适配
- 一键切换，偏好自动保存

**💬 全局组件**
- Toast 消息提示替代原生 `alert()`
- Confirm 确认弹窗替代原生 `confirm()`
- 路由切换过渡动画

**📦 依赖优化**
- 修复 TypeScript 类型错误（markdown.ts、各 View 组件）
- 修复 tsconfig.node.json `composite` 配置

**🔧 代码质量**
- 统一 fetch 错误处理
- 组件类型安全增强

## 本地部署

详见 [DEPLOY.md](./DEPLOY.md)
