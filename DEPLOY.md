# 🚀 本地部署指南

## 环境要求

- **Node.js** >= 18（推荐 20+）
- **npm** >= 9

## 一键部署步骤

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/question-bank.git
cd question-bank

# 2. 安装所有依赖
npm install

# 3. 初始化数据库（自动创建 SQLite 文件 + 执行迁移 + 填充示例数据）
cd backend
npx prisma migrate dev
npx tsx src/seed.ts
cd ..

# 4. 启动
npm run dev
```

启动后访问：
- **前端页面**：http://localhost:5173
- **后端 API**：http://localhost:3000

## 仅构建生产版本

```bash
# 构建前端
cd frontend
npm run build
# 产出在 frontend/dist/，可用 nginx 托管

# 构建后端
cd ../backend
npm run build
# 产出在 backend/dist/，用 node dist/index.js 运行
```

## 数据库位置

SQLite 文件在 `backend/prisma/question-bank.db`，单文件，可直接备份复制。

## 升级到 PostgreSQL

修改 `backend/prisma/schema.prisma`：
```
datasource db {
  provider = "postgresql"  # 改这里
  url      = "postgresql://user:password@localhost:5432/questionbank"
}
```
然后执行 `npx prisma migrate dev` 即可。
