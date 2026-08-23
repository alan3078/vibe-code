# Architecture Baseline

## Current local POC baseline

The POC consists of a React/Vite/TypeScript portal and a NestJS/Fastify TypeScript control plane, backed by PostgreSQL 16. Docker Compose runs the portal, API, and database locally. The API owns users, templates, projects, ownership, status, and request correlation; the portal does not access PostgreSQL directly.

The local trust boundary is Browser -> Portal API. A signed JWT identifies the seeded local user; the API derives project ownership from the verified subject. The local named-user login is disabled in production mode. SSO/OIDC and AI gateway integrations are outside this POC. Provider secrets, live Coder/Git endpoints, and Kubernetes remain `TBD` with human:platform-owner as decision owner.

The database uses local-only TypeORM schema synchronization and deterministic bootstrap seed data. Each local project has an isolated workspace directory with a generated React/Vite/TypeScript + FastAPI/SQLAlchemy/SQLite app, an initial Git commit, and persistent request data. A shared deployment requires reviewed migrations, external identity, secret management, a live Coder template, Git recovery test, and operational readiness evidence.

See [ADR-0001](../decisions/ADR-0001-local-poc-stack.md) and [FTR-001](../../delivery/features/FTR-001-poc-platform/feature.md).
