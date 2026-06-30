# ---- 构建阶段 ----
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci

# 复制源码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# 构建
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner

WORKDIR /app

# 安装生产依赖
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/backend/package.json backend/
COPY --from=builder /app/frontend/package.json frontend/

RUN npm ci --omit=dev

# 复制构建产物
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/prisma backend/prisma
COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/frontend/dist frontend/dist
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma node_modules/@prisma

# 初始化数据库
RUN npx prisma db push --schema=backend/prisma/schema.prisma --skip-generate

# 创建数据目录
RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV JWT_SECRET=change-me-in-production
ENV DATABASE_URL=file:/app/data/question-bank.db

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/dist/index.js"]
