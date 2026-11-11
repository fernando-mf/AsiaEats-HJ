# EatChinese UI

React and Vite frontend for EatChinese: the customer, restaurant and operator consoles, and the output console that
logs every command and error.

The platform requirements and the full setup are in the [root README](../README.md).

## Scripts

Run from `ui/`:

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | starts the dev server on `http://localhost:5173`         |
| `pnpm build`     | type-checks and builds the app into `dist/`              |
| `pnpm typecheck` | type-checks only                                         |
| `pnpm lint`      | runs oxlint                                              |
| `pnpm preview`   | serves the built app                                     |

In development, Vite forwards every `/api` request to the backend on `http://localhost:3000` (see
[`vite.config.ts`](./vite.config.ts)), so start the backend too, or run `pnpm dev` from the repository root to start
both.
