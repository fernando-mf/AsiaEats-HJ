# AsiaEats-HJ Contributor Guidance

This file applies to the entire repository. It records the conventions that all contributors and AI assistants—including Codex, Claude, and similar tools—should follow. Course requirements and team-approved architecture remain the source of truth if this file ever becomes outdated.

## Project context

AsiaEats-HJ is a SOEN 343 food-delivery simulator. Its submitted Phase I specialization states that the product "is focused on specifically chinese food." The planned stack is:

- Frontend: React, TypeScript, and Vite
- Backend: Node.js, NestJS, and TypeScript
- Database: PostgreSQL hosted on Neon
- ORM: Prisma
- Package manager: npm

The repository is currently in its project-foundation stage. Do not add application features while working on foundation or scaffold tasks.

## Planned repository layout

The frontend and backend will eventually live in separate npm workspaces:

```text
frontend/
backend/
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

Do not create placeholder source directories before the relevant scaffold or implementation task.

## Module mapping

- `DASH` = React frontend/dashboard surface
- `REG` = registration, authentication, profiles, sessions, and roles across the backend layers
- `ORD` = restaurant, menu, order lifecycle, state rules, and preparation queue across the backend layers

## Layering conventions

- `presentation` is the backend inbound layer. It contains controllers, guards, and transport-facing DTOs; it is separate from the React frontend.
- `application` coordinates use cases, commands, permission checks, and application services.
- `domain` owns business rules, entities, value objects, lifecycle rules, repository contracts, and domain events.
- `infrastructure` owns technical implementations such as Prisma persistence and seed loading.
- Business rules must not be implemented in controllers or Prisma repositories.
- Controllers must not access Prisma directly. The flow must pass through the application and domain layers.
- Domain code must not depend on NestJS, Prisma, HTTP request/response types, or generated database types.
- Prisma code must remain under `infrastructure/prisma`.
- The folder structure and dependency direction must continue to reflect the team-approved package diagram as it is finalized.

## Phase II design intent

The planned object-oriented patterns are:

- State for enforcing the order lifecycle and preventing skipped transitions.
- Command for command execution, permission checks, and command/error logging.
- Observer for side effects after domain changes, including state-change messages in the output console.

Do not add pattern abstractions merely to satisfy a name. Each implementation must serve a stated requirement, remain consistent with the finalized architecture, and be explainable during the demonstration.

Every state transition of an Order, Restaurant, or Menu Item must be recorded with an event ID (R-ORD-05). The ID generation mechanism is not fixed yet.

## Phase II scope

Phase II includes:

- Registration, login, profiles, and exactly one role per user: `CUSTOMER`, `RESTAURANT`, `COURIER`, or `OPERATOR`.
- Authentication for every command, including browsing menus; there is no guest access.
- Seeded demo accounts and deterministic demo data.
- Menu browsing and order placement.
- Restaurant state: `OPEN` / `PAUSED` / `CLOSED`.
- Menu item state: `AVAILABLE` / `SOLD_OUT`.
- R-ORD-02: refuse placement at a `PAUSED` or `CLOSED` restaurant and refuse any order containing a `SOLD_OUT` item.
- Restaurant acceptance or rejection of placed orders.
- Restaurant rejection requires a reason.
- The `PLACED -> ACCEPTED -> PREPARING -> READY` lifecycle without skipped transitions.
- `REJECTED` and `CANCELLED` are terminal order branches.
- Customer cancellation while an order is `PLACED`.
- A FIFO preparation queue per restaurant.
- Permission checking on every command.
- Output-console logging for every command and every error.
- Enough dashboard functionality to demonstrate REG and ORD use cases.

Do not implement during Phase II unless the scope is explicitly changed:

- Courier dispatch, pickup, or delivery workflow
- A city map or queue-colour visualization
- SSE or WebSockets
- Payment integration
- Full pricing and billing functionality

## Development conventions

- Use TypeScript for application code.
- Keep changes small, focused, and independently reviewable.
- Add or update tests with behavior changes once test tooling exists.
- Do not commit generated build output, dependency directories, logs, caches, or secrets.
- Environment-variable templates may document names and safe examples only; never include real credentials.
- Keep a single root `package-lock.json` after dependencies are introduced; do not create independent workspace lockfiles.
- Update the README with accurate setup, build, test, and deployment commands as those commands become available.
- Record GenAI assistance for the Phase II disclosure, including which code or documentation it helped produce.

## Git workflow

- Do not develop directly on `main`.
- Use descriptive branches such as `setup/project-foundation`.
- Prefer small, meaningful commits whose messages describe one coherent change.
- AI assistants must not commit, push, tag, rewrite history, or open a pull request unless explicitly requested.
- Preserve unrelated work already present in the working tree.
