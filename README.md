# 📚 专属私人题库系统

一个支持 LaTeX 公式、Markdown 混排、在线答题、错题本、完美打印的私人题库管理系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia + ECharts |
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
- **批量修改**：一键修改学科/难度/分类
- **数据导出**：导出为 CSV / Word 格式

### 🔍 全局搜索
- **⌘K / Ctrl+K** 命令面板，模糊搜索题目和试卷
- 搜索结果即时显示，键盘上下选择，回车跳转

### ✏️ 题目编辑
- **实时预览**：左编辑右预览，所见即所得
- **LaTeX 公式**：`$E=mc^2$` 行内，`$$\int_0^1$$` 块级
- **Markdown**：标题、列表、引用、代码块
- **特殊语法**：`==下划线==`、`___` 填空横线
- **自定义标签**：灵活标记，便于组卷筛选
- **图片上传**：题目中插入图片
- **自动保存**：编辑内容自动保存到本地，防丢失

### 📄 试卷组卷
- 从题库中选题，支持**拖拽排序**
- 自定义页眉、字号、答题区行数
- 可选显示/隐藏答案和解析
- 一键打印

### 🎯 答题练习
- **随机组卷**：按学科、题数随机抽取
- **即时反馈**：提交后立刻看到对错 + 解析
- **计时功能**：记录答题用时
- **自动错题本**：答错自动收录错题本
- **答题历史**：14天趋势图表，看正确率变化

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
- **ECharts 图表**：学科分布饼图、难度分布柱图、题型分布柱图

### 💬 全局组件
- **Toast 消息提示**：替代原生 `alert()`，支持操作按钮（撤销删除）
- **Confirm 确认弹窗**：替代原生 `confirm()`，带图标 + 模糊遮罩
- **骨架屏**：列表页加载时显示 shimmer 动画占位
- **题目悬浮预览**：鼠标悬停查看完整题目内容

### ⌨️ 快捷键
- `⌘K` / `Ctrl+K` — 打开全局搜索
- `N` — 新建题目
- `ESC` — 关闭弹窗/面板

### 🌙 暗色模式
- 支持亮色/暗色主题切换
- 偏好自动保存至 localStorage
- 全部 CSS 变量适配双主题

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
│       │   ├── questions.ts # 题目 CRUD + 筛选 + 统计 + 批量更新
│       │   ├── papers.ts    # 试卷 CRUD
│       │   ├── tags.ts      # 标签管理
│       │   ├── categories.ts# 分类树
│       │   ├── import.ts    # 批量导入
│       │   ├── practice.ts  # 答题练习 + 错题本 + 收藏 + 历史
│       │   └── upload.ts    # 图片上传
│       └── seed.ts          # 种子数据（30题）
└── frontend/            # Vue 3 前端
    └── src/
        ├── App.vue             # 根组件（侧边栏 + 暗色模式 + Toast/Confirm + 命令面板）
        ├── components/
        │   ├── CommandPalette.vue  # ⌘K 全局搜索
        │   └── QuestionPopover.vue # 题目悬浮预览
        ├── composables/
        │   ├── useKeyboard.ts      # 快捷键
        │   └── useAutoSave.ts      # 自动保存
        ├── views/
        │   ├── DashboardView.vue      # 仪表盘（ECharts 图表）
        │   ├── QuestionListView.vue   # 题目列表（批量操作 + 导出 + 预览）
        │   ├── QuestionEditView.vue   # 题目编辑（自动保存 + 图片上传）
        │   ├── PaperListView.vue      # 试卷列表
        │   ├── PaperEditView.vue      # 组卷编辑（拖拽排序）
        │   ├── PaperDetailView.vue    # 试卷查看/打印
        │   ├── ImportView.vue         # 批量导入
        │   ├── PracticeView.vue       # 答题练习（历史图表）
        │   ├── ErrorBookView.vue      # 错题本
        │   └── FavoritesView.vue      # 收藏夹
        ├── stores/                    # Pinia 状态管理
        ├── utils/
        │   ├── markdown.ts            # Markdown + LaTeX 渲染
        │   ├── constants.ts           # 常量映射
        │   └── export.ts              # 数据导出（CSV/Word/JSON）
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
| POST | /api/questions/batch-update | 批量修改 |

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
| GET | /api/practice/history | 答题历史（按天汇总） |

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
| POST | /api/upload | 图片上传 |

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
| 数据导出 | ✅ | ❌ | ❌ |
| 全局搜索 | ✅ | ❌ | ❌ |
| 暗色模式 | ✅ | ❌ | ❌ |
| 快捷键 | ✅ | ❌ | ❌ |
| 拖拽排序 | ✅ | ❌ | ❌ |
| 离线使用 | ✅ | ❌ | ❌ |
| 免费无广告 | ✅ | ❌ | ❌ |

## 后续升级方向

- [x] ~~UI 美化（暗色模式 / 动画 / 组件升级）~~ ✅
- [x] ~~全局搜索 ⌘K~~ ✅
- [x] ~~撤销删除~~ ✅
- [x] ~~自动保存草稿~~ ✅
- [x] ~~快捷键系统~~ ✅
- [x] ~~拖拽排序~~ ✅
- [x] ~~数据导出 CSV/Word~~ ✅
- [x] ~~ECharts 统计图表~~ ✅
- [x] ~~题目悬浮预览~~ ✅
- [x] ~~批量操作增强~~ ✅
- [x] ~~答题历史趋势~~ ✅
- [x] ~~图片上传~~ ✅
- [ ] 用户登录（JWT 鉴权）
- [ ] 多设备同步（WebSocket）
- [ ] OCR 拍照识别入库
- [ ] AI 智能出题
- [ ] 自适应难度推荐
- [ ] PWA 离线支持
- [ ] PostgreSQL 迁移（多用户场景）

## 更新日志

### v1.2.0 - 功能大升级（2026-06-25）

**🔍 全局搜索**
- ⌘K / Ctrl+K 命令面板，搜索题目和试卷
- 键盘上下选择，回车跳转

**↩️ 撤销删除**
- 删除题目后 5 秒内可撤销（Toast 带撤销按钮）

**💾 自动保存**
- 编辑题目时自动保存草稿到 localStorage
- 浏览器崩溃/误关闭后可恢复

**⌨️ 快捷键**
- `N` 新建题目、`⌘K` 搜索、`ESC` 关闭

**🖱️ 拖拽排序**
- 试卷选题支持拖拽调整顺序

**📥 数据导出**
- 导出为 CSV / Word 格式

**📊 ECharts 图表**
- 学科分布饼图、难度/题型分布柱图

**👁️ 题目预览**
- 鼠标悬停查看完整题目内容

**⚡ 批量操作**
- 批量修改学科/难度/分类

**📈 答题历史**
- 14天答题趋势图表

**🖼️ 图片上传**
- 题目编辑支持插入图片

### v1.1.0 - UI 全面美化（2026-06-25）
- 全局 CSS 变量体系重构
- 侧边栏深色渐变重设计
- 暗色模式完整适配
- Toast/Confirm 全局组件
- 路由切换过渡动画
- 骨架屏加载

### v1.0.0 - 初始版本
- 题库管理（9学科 6题型 5难度）
- 试卷组卷 + 打印
- 答题练习 + 错题本 + 收藏夹
- 批量导入

## 本地部署

详见 [DEPLOY.md](./DEPLOY.md)
