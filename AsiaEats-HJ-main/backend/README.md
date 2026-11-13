# EatChinese Backend

NestJS API split into the three layers from the layered design:

- `application`: HTTP controllers and the app entry point
- `domain`: services, business rules, and repository ports
- `infrastructure`: repository implementations and other providers

`AppModule` imports `InfrastructureModule`, `DomainModule`, and `ApplicationModule`. Nest wires those modules together.

## Setting up the local dev environment

1. From `backend/`, copy the example env file:

```sh
cp .env.example .env
```

That should create a `.env` ready to use for local development.


## Running the API

1. Run the dependencies: open a new terminal at `backend/` and run the following command, keep this terminal open and running.

```sh
pnpm deps:up
```

1. Run the migrations: open a separate terminal at `backend/` and apply the migrations. You can skip this step if the data model hasn't changed.

```sh
pnpm db:migrate
```

**Note:** after changing `integration/prisma/schema.prisma`, run `pnpm db:migrate` again to create a new migration, then `pnpm db:generate` to regenerate the Prisma client.

1. Start the API: run the following command:

```sh
pnpm dev
```

---

The API listens on port 3000. Once the server is running, you can open your browser and navigate to `http://localhost:3000/api/status` to confirm it works as expected.

You may also use the `curl` command to test the API.

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



## Project documentation

See the [project documentation](./docs/) for more information on the backend architecture and design decisions.
