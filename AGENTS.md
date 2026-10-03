# EatChinese Contributor Guidance

This file applies to the entire repository. It records the conventions that all contributors and AI assistants—including Codex, Claude, and similar tools—should follow. Course requirements and team-approved architecture remain the source of truth if this file ever becomes outdated.

## Project context

EatChinese is a SOEN 343 food-delivery simulator focused specifically on Chinese food. The planned stack is:

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

Do not create placeholder source directories before the relevant scaffold or implementation task.

## Module mapping

- `DASH` = the React frontend/dashboard surface
- `REG` = registration, authentication, profiles, sessions, and roles across the backend layers
- `ORD` = restaurant, menu, order lifecycle, state rules, and preparation queue across the backend layers

## Layering conventions

- REG and ORD remain separated inside each relevant backend layer.
- `presentation` handles controllers, DTOs, guards, and other transport-facing concerns; it is separate from the React frontend.
- `application` coordinates commands and use cases, permissions, command logging, application services, and observers.
- `domain` owns business rules, entities, value objects, lifecycle rules, repository contracts, and domain events.
- `infrastructure` owns Prisma persistence, configuration loading, and seed loading.
- `src/modules/reg.module.ts` and `src/modules/ord.module.ts` are NestJS composition and wiring files, not business-logic layers.
- Business rules must not be implemented in controllers or Prisma repositories.
- Controllers must not access Prisma directly. The flow must pass through the application and domain layers.
- Domain code must not depend on NestJS, Prisma, HTTP request/response types, React, or generated database types.
- Prisma repository implementations must remain under `infrastructure/prisma/repositories`.
- The folder structure and dependency direction must reflect the finalized team-approved package diagram.

## Shared identity boundary

- `domain/shared/identity` will contain shared identity and role contracts such as `AuthenticatedUser` and `Role`.
- REG establishes and authenticates identities.
- ORD may consume the shared identity contracts.
- ORD must not depend directly on REG services or controllers.

## Phase II design intent

The planned object-oriented patterns are:

- State for enforcing the order lifecycle and preventing skipped transitions.
- Command for command execution, permission checks, and command/error logging.
- Observer for side effects after domain changes, including state-change messages in the output console.

Do not add pattern abstractions merely to satisfy a name. Each implementation must serve a stated requirement, remain consistent with the finalized architecture, and be explainable during the demonstration.

## Command design intent

- `RegisterCommand` and `LoginCommand` are the only public entry commands because they establish authentication.
- Every other user-facing command, including `BrowseMenuCommand`, requires an authenticated identity.
- Commands execute through the shared `CommandRunner` so permission checking and command/error logging remain centralized.

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

These names document design intent only. Do not create the commands during foundation work. `ResetSystemCommand` may be a useful operator/demo command later, but it is not mandatory Phase II scope.

## FIFO preparation behavior

- Each restaurant has a FIFO preparation queue.
- A future `PreparationQueue` domain object will own this invariant.
- `StartPreparingCommand` will succeed only for the order currently at the head of the queue.
- Attempting to prepare a later order must fail and be logged.
- `MarkReadyCommand` completes the currently preparing order and allows the next accepted order to be prepared.

## Transition-event persistence

- Use a generic `TransitionEvent` concept for state transitions of Order, Restaurant, and Menu Item.
- Every state transition of an Order, Restaurant, or Menu Item must be recorded with an event ID (R-ORD-05). The ID generation mechanism is not fixed yet.
- The domain contract belongs under `domain/ord/events`.
- Its Prisma repository implementation belongs under `infrastructure/prisma/repositories/ord`.
- Expected event data may include `eventId`, `entityType`, `entityId`, `fromState`, `toState`, `occurredAt`, `actorId`, and an optional `reason`.
- Do not implement the database model during foundation work.

## Seed and configuration behavior

- Seeded accounts and initial ORD data must be loaded from a configuration file.
- The planned configuration file is `backend/config/seed.json`.
- Do not hardcode the initial demo state directly in TypeScript.

## Observer intent

- Observer is used for post-domain-change side effects such as updating the DASH output console or read model.
- Required transition-event persistence must remain reliable and must not depend solely on an Observer.
- SSE and WebSockets remain outside Phase II scope.

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
