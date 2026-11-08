FROM node:24

ENV CI=true
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY backend/integration/prisma backend/integration/prisma

RUN pnpm install --frozen-lockfile --filter backend

COPY backend backend

RUN pnpm --filter backend build

CMD ["pnpm", "--filter", "backend", "start"]
