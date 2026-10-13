# EatChinese

EatChinese is a SOEN 343 food-delivery simulator focused specifically on Chinese food. It models authenticated customers, restaurant staff, couriers, and platform operators while emphasizing clear architecture, enforceable business rules, and repeatable demonstrations.


## Technology stack

- Frontend: React, TypeScript, and Vite
- Backend: Node.js, NestJS, and TypeScript
- Database: PostgreSQL hosted on Neon
- ORM: Prisma
- Package manager: pnpm


## Prerequisites

- Node.js 24 (the repository currently pins `24.15.0`)
- pnpm 12
- Git


## Project setup

1. Clone this repository

2. Install [nvm](https://github.com/nvm-sh/nvm)
    ```sh
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
    ```

3. Use `nvm` to install and select this project's Node.js version
    ```sh
    # Install node
    nvm install # skip if already installed

    # Select correct node version
    nvm use
    ```

4. Install [pnpm](https://pnpm.io/)
    ```sh
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```

5. Then install dependencies from the repository root
    ```sh
    pnpm install
    ```

6. Project setup is complete. To run each component, navigate to the `ui` or `backend` directories and follow the instructions in their README files.
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

---


## Repository layout

TODO: update this

```text
/
  ui/                       # UI layer: React app
  backend/                  # Backend: NestJS REST API
  backend/application/      # Application layer: HTTP controllers, middlewares, session verifiers
  backend/domain/           # Domain layer: business rules, models, invariants and provider ports
  backend/infrastructure/   # Infrastructure layer: Prisma implementation, PostgresSQL integration
  AGENTS.md                 # Repository conventions for contributors and agents
  package.json              # Root npm workspace configuration
```

The finalized planned backend layout is:

TODO: update this


## Modules covered

- `DASH` = the React frontend/dashboard surface
- `REG` = registration, authentication, profiles, sessions, and roles across the backend layers
- `ORD` = restaurant, menu, order lifecycle, state rules, and preparation queue across the backend layers


<!-- 
TODO: THIS COULD BE MOVED TO THE REPORT. SOME SECTIONS ARE OUTDATED, UPDATE AS WE MAKE PROGRESS.
TODO: THIS COULD BE MOVED TO THE REPORT. SOME SECTIONS ARE OUTDATED, UPDATE AS WE MAKE PROGRESS.
TODO: THIS COULD BE MOVED TO THE REPORT. SOME SECTIONS ARE OUTDATED, UPDATE AS WE MAKE PROGRESS.

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

Observer supports post-domain-change side effects such as updating the DASH output console or read model. Required transition-event persistence must remain reliable and must not depend solely on an Observer. SSE and WebSockets remain outside Phase II scope. -->
