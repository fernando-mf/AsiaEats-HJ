# Integration layer

This layer integrates all other layers in `src` and runs the API as a single unit. This is then used to run integration tests that cover the request end-to-end i.e. HTTP controllers, domain services, repository classes, etc.

Unlike the unit tests we find in the `src` directory, integration tests are more expensive to run and are typically slower. For this reason, the focus of these tests are the happy paths and the main flows.

## Prisma

Prisma is used to interact with the PostgreSQL database. The Prisma config, schema and migrations live in `./prisma/`.

## Docker compose

This layer also contains a docker compose file that lists all the external dependencies our app needs e.g. PostgreSQL. This allows us to quickly spin up a local development environment that mimics production. Run it from `backend/` with `pnpm deps:up` and `pnpm deps:down`.

## Integration tests

The tests live in `./tests/` and treat the API as a black box: they only talk to it over HTTP using the base URL in `API_URL` (default `http://localhost:3000/api`). They don't import anything from `src`.

### Run everything with Docker

From `backend/`:

```sh
pnpm test:e2e
```

### Run against a local server

To skip Docker and test a local server that is already running:

```sh
API_URL=https://my-server.example.com/api pnpm test:e2e:local
```
