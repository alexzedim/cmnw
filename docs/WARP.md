# WARP Rules for CMNW Project

This file contains project-specific rules for the CMNW project. These rules take precedence over personal WARP rules.

## Project Overview
- **Type**: NestJS monorepo application
- **Package Manager**: pnpm (version 10.16.0+)
- **Node Version**: >=18.0.0
- **Framework**: NestJS
- **Testing**: Jest with ts-jest
- **License**: MPL 2.0

## Code Organization
- **Apps**: Located in `apps/` directory
- **Libraries**: Located in `libs/` directory
- **Tests**: Co-located with source files as `*.spec.ts`

## Testing Rules
- Use Jest for all tests
- Test files must be named `*.spec.ts`
- Use `expect` instead of `expected` in assertions
- Place test mock constants in `apps/{app-name}/test/__mocks__/const.mock.ts`
- Complex if conditions (2+ combined conditions) should be extracted to a variable named `isCondition` before use

## Code Style
- Use TypeScript for all source files
- Follow NestJS conventions and patterns
- Use class-validator and class-transformer for DTOs
- Use conventional commits standard for all commit messages
- Format code with Prettier: `pnpm format`
- Lint code with ESLint: `pnpm lint`

## Dependencies
- Use `pnpm` exclusively for package management (not npm or yarn)
- Reference pnpm in Dockerfiles and CI/CD configurations
- Respect the `packageManager` field in package.json

## Path Aliases
The project uses TypeScript path aliases (configured in jest.config):
- `@app/configuration` → `libs/configuration/src`
- `@app/mongo` → `libs/mongo/src`
- `@app/pg` → `libs/pg/src`
- `@app/resources` → `libs/resources/src`
- `@app/logger` → `libs/logger/src`
- `@app/s3` → `libs/s3/src`

## Development Commands
- Start dev server: `pnpm start:dev`
- Build: `pnpm build` (automatically cleans dist first)
- Run tests: `pnpm test`
- Run tests with coverage: `pnpm test:cov`
- Format code: `pnpm format`
- Lint code: `pnpm lint`

## Docker
- Dockerfile located at: `docker/local.Dockerfile`
- Build command: `pnpm docker:build`
- Always use pnpm in Docker configurations

## Architecture Notes
- Monorepo structure with multiple apps and shared libraries
- Uses BullMQ for job queues
- MongoDB via Mongoose for data persistence
- PostgreSQL via TypeORM for relational data
- Redis/IORedis for caching and queues
- AWS S3 for object storage
- Prometheus metrics integration
- Swagger API documentation

## Documentation

### Operational Documentation
Located in `docs/`:
- [Job Status Monitoring](docs/JOB_STATUS_MONITORING.md) - Status codes and Prometheus queries
- [Queue Monitoring Guide](docs/QUEUE_MONITORING_GUIDE.md) - Complete monitoring setup
- [Queue Monitoring Quickstart](docs/QUEUE_MONITORING_QUICKSTART.md) - Quick reference
- [Quick Status Reference](docs/QUICK_STATUS_REFERENCE.md) - Status code cheat sheet
- [Worker ID Implementation](docs/WORKER_ID_IMPLEMENTATION.md) - Worker identification

### Module-Specific Documentation
- [Auth Module README](apps/api/src/auth/README.md) - OAuth authentication
- [Queue Module README](apps/api/src/queue/README.md) - Queue monitoring API

### Historical Documentation
Archived documentation in `docs/archive/`:
- [Constants Migration](docs/archive/CONSTANTS_MIGRATION.md)
- [Entity-Based Refactoring](docs/archive/ENTITY_BASED_REFACTORING.md)
- [Refactoring Complete](docs/archive/REFACTORING_COMPLETE.md)
- [Refactoring Summary](docs/archive/REFACTORING_SUMMARY.md)

## Infrastructure & Deployment
- **Infrastructure location**: Docker Compose files are in `/alexzedim/core` repository
- **Deployment server**: Running on `ssh root@128.0.0.255`
- **CI/CD Pipeline**: Triggered automatically on each git tag push

## Git Workflow
- **Commit frequency**: Prefer small, incremental commits
- **Versioning**: Create git tags with package.json patch version after each push
- **Tag format**: Follow semantic versioning from package.json (e.g., `v6.9.8`)
- **Pipeline trigger**: Each tag push triggers the CI/CD pipeline
- **Commit standard**: Use conventional commits format
