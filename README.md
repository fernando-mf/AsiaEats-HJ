# Eat Chinese

SOEN 343 (Fall 2026) food-delivery simulator focused exclusively on Chinese food.
Customers browse and order from local Chinese restaurants, staff manage menus and
orders, and operators oversee the platform.

## Tech stack
React + TypeScript + Vite · NestJS + TypeScript · PostgreSQL (Neon) + Prisma · npm workspaces

## Prerequisites
- Node.js 24 (see `.nvmrc`)
- npm 11

## Getting started
```bash
npm install                      # from the repo root, installs both workspaces
npm run dev -w frontend          # http://localhost:5173
npm run start:dev -w backend     # http://localhost:3000/api/health
```

## Build & test
```bash
npm run build -w frontend
npm run build -w backend
npm run test:e2e -w backend
```

## Repository structure
- `frontend/`: React dashboard (DASH)
- `backend/`: NestJS API, layered into presentation / application / domain / infrastructure,
  with REG and ORD separated inside each layer
- `AGENTS.md`: architecture rules and conventions

## Team
Madona Beshara · Ramy Belhadj Bouchaib · Hadile Magramane ·
Fernando Mamani Feliciano · Saib Merabet · Neil Bryan Moukam-Tchuangou
