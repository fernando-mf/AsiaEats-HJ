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

2. Install the dependencies:

```sh
pnpm install
```

## Running the API

1. Run the dependencies: in a new terminal, from `backend/integration`, run:

```sh
docker compose up
```

2. Start the API: in a separate terminal,from `backend/`, run:

```sh
pnpm start:dev
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
