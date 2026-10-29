# 作者：周梓润
# server.js 只用 Node 内置模块，无需 npm install
FROM node:20-alpine

WORKDIR /app
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

# .env 不打进镜像，用 docker run --env-file .env 在运行时注入
CMD ["node", "server.js"]
