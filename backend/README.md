# EatChinese Backend

NestJS API split into the three layers from the layered design:

- `application`: HTTP controllers and the app entry point
- `domain`: services, business rules, and repository ports
- `infrastructure`: repository implementations and other providers

`AppModule` imports `InfrastructureModule`, `DomainModule`, and `ApplicationModule`. Nest wires those modules together.

## Running the API

From the repository root, with Node.js 24:

```sh
pnpm install
pnpm start:dev
```

The API listens on port 3000 unless `PORT` is set. Once the server is running, you can open your browser and navigate to `http://localhost:3000/api/status` to confirm it works as expected.

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