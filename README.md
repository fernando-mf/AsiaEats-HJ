# AsiaEats-HJ

ChinaEats-HJ is a SOEN 343 food-delivery simulator. It models authenticated customers, restaurant staff, couriers, and platform operators while emphasizing clear architecture, enforceable business rules, and repeatable demonstrations.

## Current status

The repository is in the project-foundation stage. The frontend and backend have not been scaffolded, and there are no application dependencies or runnable services yet.

## Planned technology stack

- Frontend: React, TypeScript, and Vite
- Backend: Node.js, NestJS, and TypeScript
- Database: PostgreSQL hosted on Neon
- ORM: Prisma
- Package manager: npm workspaces

## Planned repository layout

```text
AsiaEats-HJ/
  frontend/                 # React application (not scaffolded yet)
  backend/                  # NestJS application (not scaffolded yet)
  AGENTS.md                 # Repository conventions for contributors and agents
  package.json              # Root npm workspace configuration
```

The intended backend source layout is:

```text
backend/src/
  presentation/
    controllers/
    guards/
    dto/
  application/
    commands/
    command-runner/
    services/
  domain/
    order/
      states/
    restaurant/
    user/
    repositories/
    events/
  infrastructure/
    prisma/
    seed/
```

`presentation` is the backend inbound layer and is distinct from the React frontend. Business rules belong in the domain layer, while Prisma remains in infrastructure. Controllers must not access Prisma directly.

## Module mapping

- `DASH` = React frontend/dashboard surface
- `REG` = registration, authentication, profiles, sessions, and roles across the backend layers
- `ORD` = restaurant, menu, order lifecycle, state rules, and preparation queue across the backend layers

## Phase II scope

Phase II will implement the REG and ORD modules and only enough of the DASH module to demonstrate their use cases.

Included:

- Registration, login, profiles, and one role per user
- Authenticated access for every command, including menu browsing
- Seeded demo accounts and data
- Menu browsing and order placement
- Restaurant state: `OPEN` / `PAUSED` / `CLOSED`
- Menu item state: `AVAILABLE` / `SOLD_OUT`
- R-ORD-02: refuse placement at a `PAUSED` or `CLOSED` restaurant and refuse any order containing a `SOLD_OUT` item
- Order acceptance, preparation, readiness, and cancellation while placed
- Restaurant rejection requires a reason
- `REJECTED` and `CANCELLED` are terminal order branches
- FIFO restaurant preparation queues
- Permission checking on every command
- Every state transition of an Order, Restaurant, or Menu Item must be recorded with an event ID (R-ORD-05). The ID generation mechanism is not fixed yet.
- Output-console logging for every command and every error

Deferred:

- Courier dispatch, pickup, and delivery workflow
- City map and queue-colour visualization
- SSE and WebSockets
- Payment integration
- Full pricing and billing functionality

## Architecture and design patterns

The backend will use presentation, application, domain, and infrastructure layers. The team is finalizing the official package diagram; the repository structure must remain aligned with that approved diagram.

The planned object-oriented patterns are:

- State for order lifecycle rules and prevention of skipped transitions
- Command for command execution, authorization, and logging
- Observer for side effects after domain changes, such as output-console messages

Every state transition of an Order, Restaurant, or Menu Item must be recorded with an event ID (R-ORD-05). The ID generation mechanism is not fixed yet.

## Prerequisites

- Node.js 24 (the repository currently pins `24.15.0`)
- npm 11
- Git

Setup, build, test, and deployment instructions will be added when the frontend and backend scaffolds exist.

## Development workflow

- Do not work directly on `main`.
- Use small, focused commits on descriptive branches.
- Keep secrets in untracked environment files.
- Use one root `package-lock.json` after dependencies are introduced.
- See [AGENTS.md](./AGENTS.md) for detailed repository conventions.
