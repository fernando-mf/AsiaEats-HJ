# EatChinese Backend

NestJS API split into the three layers from the layered design:

- `application`: HTTP controllers, commands and their decorators (authorization, logging), the session guard and the
  app entry point
- `domain`: services, business rules, the order state machine, and the ports the domain needs (repositories,
  `TransactionRunner`, `SeedSource`)
- `infrastructure`: Prisma implementations of those ports, and the reader of the seed file

`AppModule` (in `application/`) declares the controllers and imports `DomainModule` and `InfrastructureModule`. Nest
wires those modules together.

The platform requirements and the full setup are in the [root README](../README.md). The steps below are the backend
part only.

## Setting up the local dev environment

1. From `backend/`, copy the example env file:

   ```sh
   cp .env.example .env
   ```

   That creates a `.env` ready for local development, with `ENV_MANAGER_ENABLED=true` so the operator can restore the
   initial state.

2. Start the database: open a new terminal at `backend/` and keep it running. Skip this if `DATABASE_URL` points at a
   hosted database.

   ```sh
   pnpm deps:up
   ```

3. Apply the migrations:

   ```sh
   pnpm db:deploy
   ```

   **Note:** after changing `integration/prisma/schema.prisma`, run `pnpm db:migrate` to create a new migration, then
   `pnpm db:generate` to regenerate the Prisma client.

4. Load the seed:

   ```sh
   pnpm seed
   ```

   It empties the database and loads [`config/seed.json`](./config/seed.json) in one transaction. The operator's
   **Restore initial state** button runs the same reset.

## Running the API

```sh
pnpm dev
```

The API listens on port 3000. Open `http://localhost:3000/api/status` to confirm it works, or use `curl`:

```sh
curl http://localhost:3000/api/status
```

Should return:

```json
{
  "status": "ok",
  "datetime": "2026-10-13T03:09:00.000Z"
}
```

`pnpm build` and `pnpm openapi` compile into `dist/`, which the running `pnpm dev` also uses: stop `pnpm dev` before
running them.

## Tests

```sh
pnpm test
```

## Project documentation

See the [project documentation](./docs/) for more information on the backend architecture and design decisions, and
[`openapi.yaml`](./openapi.yaml) for every endpoint with the roles allowed to call it.
