# Backend layered design

Our backend is split into three layers. Each layer is a folder and export a single NestJS module. REG and ORD are folders inside every layer.

## Layers and file layout

_Note: this is a simplified view of the file layout aiming to show the main components of the backend._

```
application/                  application layer
  controllers/
    reg/                        REG controllers
    ord/                        ORD controllers
    <otherModule>/              other modules get their own folder

  app.module.ts               main module, wires all layers together
  main.ts                     app entrypoint

domain/                       domain layer
  reg/                          REG business rules
  ord/                          ORD business rules
  <otherModule>/                other modules get their own folder

  domain.module.ts              domain module, lists all components in this layer

infrastructure/               infrastructure layer
  reg/                          account repository implementation
  ord/                          order repository implementation
  <otherModule>/                other modules get their own folder

  infrastructure.module.ts      infrastructure module, lists all components in this layer
```

| Layer                   | Owns                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Application             | HTTP controllers, request mappers, enforcing authentication session. Also contains the entrypoint of our app. |
| Domain                  | Services, business rules, validation, repository ports, domain errors.                                        |
| Business Infrastructure | Repository implementations, Prisma, JWT signer, other providers.                                              |

## Dependency injection: how do layers talk to each other?

To keep our **Domain Layer** abstract and avoid having any reference to third party implementations. We decided to describe our dependencies using abstract classes. Here's an example for describing a `Repository` definition for the Orders Module.

```ts
// domain/orders/orders.ts

// OrdersRepository describes the operations that can be performed on the data.
// There are no SQL concepts here.
export abstract class OrdersRepository {
  abstract save(order: Order): Promise<void>;
  abstract findById(id: string): Promise<Order | null>;
}

@Injectable()
export class OrdersService {
  constructor(private readonly orders: OrdersRepository) {}
}
```

The repository is then implemented in the `infrastructure` layer.

```ts
// infrastructure/orders/prisma.repository.ts

// PrismaOrdersRepository is the implementation of the OrdersRepository.
// It interacts with PostgreSQL using Prisma.
@Injectable()
export class PrismaOrdersRepository extends OrdersRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  // DB access code lives here (SQL queries, Postgres errors, etc)
  // the Domain layer remains "clean"
}
```

## Wiring the layers together

Each layer exports its own module. In the `main` file we wire the layers together.

```ts
@Module({
  imports: [InfrastructureModule, DomainModule, ApplicationModule],
})
export class AppModule {}
```

NestJS reads the `module` definitions and uses them to do all the dependency injection wiring automatically. The end result are loosely coupled layers that contain no direct reference to each other's implementations.
