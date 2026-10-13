# Integration layer

This layer integrates all other layers in `src` and runs the API as a single unit. This is then used to run integration tests that cover the request end-to-end i.e. HTTP controllers, domain services, repository classes, etc.

Unlike the unit tests we find in the `src` directory, integration tests are more expensive to run and are typically slower. For this reason, the focus of these tests are the happy paths and the main flows.

## Docker compose

This layer also contains a docker compose file that lists all the external dependencies our app needs e.g. PostgreSQL. This allows us to quickly spin up a local development environment that mimics production.
