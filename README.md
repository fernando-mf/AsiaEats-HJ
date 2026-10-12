# EatChinese

EatChinese is a SOEN 343 food-delivery simulator focused specifically on Chinese food. It models authenticated customers, restaurant staff, couriers, and platform operators while emphasizing clear architecture, enforceable business rules, and repeatable demonstrations.

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
EatChinese/
  frontend/                 # React application (not scaffolded yet)
  backend/                  # NestJS application (not scaffolded yet)
  AGENTS.md                 # Repository conventions for contributors and agents
  package.json              # Root npm workspace configuration
```

The finalized planned backend layout is:

```text
backend/
  prisma/
    schema.prisma

  config/
    seed.json

  src/
    modules/
      reg.module.ts
      ord.module.ts

    presentation/
      reg/
        controllers/
        dto/
      ord/
        controllers/
        dto/
      shared/
        guards/

    application/
      reg/
        commands/
        services/
      ord/
        commands/
        services/
        observers/
      shared/
        command-runner/

    domain/
      shared/
        identity/
      reg/
        user/
        repositories/
      ord/
        order/
          states/
        restaurant/
        menu-item/
        events/
        repositories/

    infrastructure/
      prisma/
        repositories/
          reg/
          ord/
      seed/
```

This is a documented plan only; these paths have not been created yet.

## Module mapping

- `DASH` = the React frontend/dashboard surface
- `REG` = registration, authentication, profiles, sessions, and roles across the backend layers
- `ORD` = restaurant, menu, order lifecycle, state rules, and preparation queue across the backend layers

REG and ORD are separated inside each relevant backend layer. The responsibilities are:

- `presentation` handles controllers, DTOs, guards, and transport-facing concerns.
- `application` coordinates commands and use cases, permissions, command logging, application services, and observers.
- `domain` owns business rules and must not depend on NestJS, Prisma, HTTP types, React, or generated database types.
- `infrastructure` owns Prisma persistence, configuration loading, and seed loading.
- `src/modules/reg.module.ts` and `src/modules/ord.module.ts` are NestJS composition and wiring files, not business-logic layers.

Controllers must not access Prisma directly. Business rules must remain in the domain layer.

## Shared identity boundary

`domain/shared/identity` will contain shared identity and role contracts such as `AuthenticatedUser` and `Role`. REG establishes and authenticates identities, while ORD may consume these shared contracts. ORD must not depend directly on REG services or controllers.

## Phase II scope

Phase II will implement the REG and ORD modules and only enough of the DASH module to demonstrate their use cases.

Included:

- Registration, login, profiles, and one role per user
- Authenticated access for every command, including menu browsing
- Seeded demo accounts and initial ORD data loaded from configuration
- Menu browsing and order placement
- Restaurant state: `OPEN` / `PAUSED` / `CLOSED`
- Menu item state: `AVAILABLE` / `SOLD_OUT`
- R-ORD-02: refuse placement at a `PAUSED` or `CLOSED` restaurant and refuse any order containing a `SOLD_OUT` item
- Order acceptance, preparation, readiness, and cancellation while placed
- Restaurant rejection requires a reason
- `REJECTED` and `CANCELLED` are terminal order branches
- FIFO restaurant preparation queues
- Permission checking on every command
- Persistent transition-event records for state changes to Order, Restaurant, and Menu Item
- Output-console logging for every command and every error

Deferred:

- Courier dispatch, pickup, and delivery workflow
- City map and queue-colour visualization
- SSE and WebSockets
- Payment integration
- Full pricing and billing functionality

## Architecture and design patterns

The backend will use presentation, application, domain, and infrastructure layers with explicit REG and ORD separation. The repository structure must remain aligned with the finalized package diagram.

The planned object-oriented patterns are:

- State for order lifecycle rules and prevention of skipped transitions
- Command for command execution, authorization, and logging
- Observer for post-domain-change side effects, such as output-console and read-model updates

## Command design intent

`RegisterCommand` and `LoginCommand` are the only public entry commands because they establish authentication. Every other user-facing command, including `BrowseMenuCommand`, requires an authenticated identity. Commands execute through the shared `CommandRunner` so permission checking and command/error logging remain centralized.

Expected future ORD commands are:

- `BrowseMenuCommand`
- `PlaceOrderCommand`
- `AcceptOrderCommand`
- `RejectOrderCommand`
- `CancelOrderCommand`
- `StartPreparingCommand`
- `MarkReadyCommand`
- `PauseRestaurantCommand`
- `ReopenRestaurantCommand`
- `MarkMenuItemSoldOutCommand`
- `MarkMenuItemAvailableCommand`

These commands are design intent only and have not been created. `ResetSystemCommand` may be a useful operator/demo command later, but it is not mandatory Phase II scope.

## FIFO preparation behavior

Each restaurant has a FIFO preparation queue. A future `PreparationQueue` domain object will own this invariant. `StartPreparingCommand` will succeed only for the order at the head of the queue; attempting to prepare a later order must fail and be logged. `MarkReadyCommand` completes the currently preparing order and allows the next accepted order to be prepared.

## Transition-event persistence

The design uses a generic `TransitionEvent` for state transitions of Order, Restaurant, and Menu Item. Every such transition must be recorded with an event ID under R-ORD-05; the ID generation mechanism is not fixed yet.

The domain contract belongs under `domain/ord/events`, and its Prisma repository implementation belongs under `infrastructure/prisma/repositories/ord`. Expected event data may include:

- `eventId`
- `entityType`
- `entityId`
- `fromState`
- `toState`
- `occurredAt`
- `actorId`
- Optional `reason`

The database model has not been implemented.

## Seed and configuration behavior

Seeded accounts and initial ORD data must be loaded from `backend/config/seed.json`. The initial demo state must not be hardcoded directly in TypeScript.

## Observer intent

Observer supports post-domain-change side effects such as updating the DASH output console or read model. Required transition-event persistence must remain reliable and must not depend solely on an Observer. SSE and WebSockets remain outside Phase II scope.

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

---

hello world