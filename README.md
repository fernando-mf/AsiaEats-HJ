# EatChinese

EatChinese is a SOEN 343 food-delivery simulator focused on Chinese food in Montréal. Customers order from
restaurants, restaurant staff run their kitchen, and a platform operator watches over everything, with clear
architecture, enforced business rules and repeatable demonstrations.

**Live:** [eatchinese.vercel.app](https://eatchinese.vercel.app/)

## Team

- Madona Beshara
- Ramy Belhadj Bouchaib
- Hadile Magramane
- Fernando Mamani Feliciano
- Saib Merabet
- Neil Bryan Moukam-Tchuangou

## Phase II scope

Phase II implements two modules end to end, plus the part of the dashboard (DASH) that drives them:

- **REG** (registration, login and profiles): accounts with exactly one role (customer, restaurant, courier,
  operator), an authenticated session for every command except registration and login, including browsing a menu,
  and seeded accounts loaded from a configuration file.
- **ORD** (order and restaurant core): restaurants (`open`, `paused`, `closed`), menu items (`available`,
  `sold_out`) and the order lifecycle (`placed → accepted → preparing → ready`, with `rejected` and `cancelled` as
  terminal branches), a preparation queue per restaurant in arrival order, a permission check on every command, and an
  event with its own id recorded for every state change.
- **DASH**: customer, restaurant and operator consoles, and an output console that logs every command and every error.

Courier delivery (DLV), pricing and billing (PRC), and the city map come in later phases. Couriers can sign in, but
their console is a placeholder for now.

## Platform requirements

| Tool                  | Version                                 | Notes                                                    |
| --------------------- | --------------------------------------- | -------------------------------------------------------- |
| Node.js               | 24 (`24.15.0`, pinned in `.nvmrc`)      | `nvm install && nvm use` selects it                      |
| pnpm                  | 12                                      | the workspace package manager                            |
| PostgreSQL            | 18                                      | run locally with Docker, or use a hosted database (Neon) |
| Docker and Compose    | any recent version                      | only to run PostgreSQL locally                           |
| Git                   | any recent version                      |                                                          |

The commands below are for a Unix shell (macOS, Linux, or Git Bash on Windows). Every command in this section runs
from the repository root; `pnpm --filter backend <script>` runs a backend script from there.

## Getting started

1. **Clone the repository and install the dependencies:**

   ```sh
   git clone https://github.com/fernando-mf/AsiaEats-HJ.git
   cd AsiaEats-HJ
   nvm install && nvm use     # Node.js 24
   pnpm install               # also generates the Prisma client
   ```

2. **Create the backend's environment file** from the example:

   ```sh
   cp backend/.env.example backend/.env
   ```

   | Variable                 | Required | Default | Purpose                                                                    |
   | ------------------------ | -------- | ------- | -------------------------------------------------------------------------- |
   | `DATABASE_URL`           | yes      |         | PostgreSQL connection string. The example points at the local Docker database |
   | `JWT_SECRET`             | yes      |         | Secret that signs session tokens, at least 32 characters                   |
   | `PORT`                   | no       | `3000`  | Port the API listens on                                                    |
   | `JWT_EXPIRES_IN_SECONDS` | no       | `3600`  | How long a session lasts                                                   |
   | `ENV_MANAGER_ENABLED`    | no       | `false` | Allows the operator to restore the initial state. The example sets `true`  |

3. **Start PostgreSQL.** Either run it locally with Docker, in a terminal you keep open:

   ```sh
   pnpm --filter backend deps:up
   ```

   or set `DATABASE_URL` in `backend/.env` to a hosted database, such as a [Neon](https://neon.tech/) connection
   string.

4. **Create the tables and load the seed:**

   ```sh
   pnpm --filter backend db:deploy   # applies the migrations in backend/integration/prisma/migrations
   pnpm --filter backend seed        # empties the database and loads backend/config/seed.json
   ```

5. **Run the app:**

   ```sh
   pnpm dev
   ```

   This starts the API on [localhost:3000](http://localhost:3000/api/status) and the UI on
   [localhost:5173](http://localhost:5173). The UI sends `/api` requests to the API.

## Seeded accounts

The initial state comes from [`backend/config/seed.json`](./backend/config/seed.json): every account, restaurant,
menu, customer address and courier position. Every seeded account uses the password **`password123`**.

| Username        | Role       | What it shows                                                  |
| --------------- | ---------- | -------------------------------------------------------------- |
| `alice`         | customer   | Discover, ordering, checkout, order tracking, profile          |
| `bob`           | customer   | A second customer, to check one cannot see the other's orders  |
| `golden-dragon` | restaurant | Golden Dragon (open), with a sold-out dish                     |
| `jade-garden`   | restaurant | Jade Garden (open)                                             |
| `lotus-house`   | restaurant | Lotus House (closed), so orders to it are refused              |
| `operator1`     | operator   | Platform overview, all orders with their event history         |
| `courier`       | courier    | Sign in only; delivery comes in a later phase                  |

To start a demo from this state again, sign in as `operator1` and press **Restore initial state**. It runs the same
reset as `pnpm seed` and needs `ENV_MANAGER_ENABLED=true`. Editing `seed.json` changes the next restore; no rebuild is
needed.

## Pricing

An order's fare is computed from its lines and the `pricing` values in
[`backend/config/seed.json`](./backend/config/seed.json), which are not written into the code (R-PRC-01). The API reads
them when it starts and refuses to start if one is missing or invalid; restart it after changing them.

| Value                   | Amount |
| ----------------------- | ------ |
| `deliveryFee`           | $3.00  |
| `serviceFee`            | $2.00  |
| `smallOrderThreshold`   | $15.00 |
| `smallOrderSurcharge`   | $2.50  |

**Total = subtotal of the lines + delivery fee + service fee + small-order surcharge**, where the surcharge applies only
when the subtotal is below the threshold. An order exactly at the threshold pays none. Amounts are added in cents, so
the total is exact. For example:

- Mapo Tofu ($12.75): 12.75 + 3.00 + 2.00 + 2.50 = **$20.25**
- Pork Dumplings × 2 ($19.00): 19.00 + 3.00 + 2.00 = **$24.00**

## Building and checking

```sh
# Backend (from backend/)
pnpm build        # generates the Prisma client and compiles to dist/
pnpm start        # runs the compiled API
pnpm test         # unit tests (Vitest)

# UI (from ui/)
pnpm build        # type-checks and builds to dist/
pnpm typecheck
pnpm lint

# Whole repository (from the root)
pnpm format:check
```

The API documentation is in [`backend/openapi.yaml`](./backend/openapi.yaml).

## Deployment

The app is deployed on [Vercel](https://vercel.com/) from this repository, as two services on one domain
([`vercel.json`](./vercel.json)):

- `web` builds `ui/` with Vite and serves it.
- `api` builds `backend/` with `nest build` and runs it through `backend/server.js`.
- Requests to `/api/*` go to the API; everything else goes to the UI.

The API's environment variables (above) are set in the Vercel project, with `DATABASE_URL` pointing at the Neon
database. After a schema change, apply the migrations to that database with `pnpm --filter backend db:deploy`, with
`DATABASE_URL` in `backend/.env` set to it.

## Repository layout

The code is split by layer, and inside the backend layers by module (REG, ORD):

```text
ui/                         UI layer (DASH): React and Vite
  src/pages/                login, registration and the dashboard page
  src/components/           customer, restaurant and operator consoles, shared components
  src/shared/               API client, output console, browser storage

backend/                    NestJS API
  src/application/          application layer: HTTP controllers, commands and their decorators, session guard
    commands/reg, commands/ord
    controllers/reg, controllers/ord
  src/domain/               domain layer: services, business rules, the order state machine, ports
    reg/                    accounts, roles, customer profiles
    ord/                    restaurants, menus, orders, preparation queue
    env/                    reset and seed of the initial state
  src/infrastructure/       infrastructure layer: Prisma repositories, transactions, the seed file reader
    reg/, ord/, env/, events/
  config/seed.json          the initial demo state
  integration/              Prisma schema and migrations, the seed script, Docker Compose for PostgreSQL
  docs/                     design notes (layered design, validation, errors)
```

The application layer calls the domain. The domain defines ports (repositories, `TransactionRunner`, `SeedSource`)
and the infrastructure layer implements them, so the domain never imports Prisma or the infrastructure layer. See
[`backend/docs`](./backend/docs) for the reasoning.

---

## Development workflow

Follow the following steps to work on new features or bug fixes:

1. First of all, make sure there's an existing issue for the feature or bug you're working on. If not, create one. Make sure to assign it to yourself.

2. Start from the latest `main` branch.

   ```sh
   git checkout main
   git fetch
   git pull
   ```

3. Create a new branch for your feature or fix. Use the followig format: `<type>/<issue-number>-<short-description>`, for example:

   ```sh
   # new feature
   git checkout -b feat/123-implement-account-creation

   # big fix
   git checkout -b fix/123-fix-account-creation

   # other type of work
   git checkout -b chore/123-update-readme
   ```

   Don't forget to use `feat` or `fix` or `chore` prefixes.

4. Implement your changes i.e. write code, tests, etc.

5. Once you're ready, commit your changes and push them to GitHub

   ```sh
   git add .
   git commit -m "implemented account creation"
   git push
   ```

6. Open a pull request. Other teammates will review your changes and provide feedback. Once you get an approval, you can merge your changes into `main`.

7. You can pick up another issue and repeat the process.

See [AGENTS.md](./AGENTS.md) for detailed repository conventions.
