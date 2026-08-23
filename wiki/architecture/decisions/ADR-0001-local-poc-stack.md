# ADR-0001: Local POC application stack

- Status: Proposed for local POC; human approval required before shared deployment
- Date: 2026-08-22
- Feature: FTR-001-poc-platform

## Context

The repository is an empty delivery scaffold. The requested POC needs a runnable web product with a TypeScript React frontend, NestJS backend, PostgreSQL seed bootstrap, and Docker Compose. External workspace and Git integrations may follow later, but no external runtime or credentials are required for this local POC.

## Decision

Use a root npm workspace containing independently deployable `apps/portal` and `apps/control-plane` applications. Use React/Vite/TypeScript for the portal, NestJS/Fastify with TypeORM for the API, PostgreSQL 16 for platform metadata, and Docker Compose for local orchestration. Use a local JWT named-user path over seeded users so ownership and session flows are testable without passwords or external credentials. Run a real code-server 4.96.4 service locally against the persistent workspace volume, with the Cline extension pinned in the workspace image. Keep Coder and Git behind future integration boundaries; exclude SSO/OIDC and LiteLLM/model gateway integration from this POC.

## Consequences

Positive:

- A new developer can run the POC with one Compose command.
- PostgreSQL behavior is exercised rather than replaced with an in-memory store.
- Backend ownership rules are testable independently of the UI.
- External integrations can be added without mixing generated-app data into platform metadata.

Negative:

- Demo identity is not production authentication.
- The local code-server service is a single Compose IDE runtime for the POC; it does not prove one isolated Kubernetes workload per project.
- TypeORM synchronization is not a migration strategy.

## Alternatives considered

- SQLite: rejected because the current user explicitly requires PostgreSQL.
- FastAPI backend: rejected because the current user explicitly requires NestJS.
- Coder-first implementation: deferred because no Coder endpoint, credentials, or cluster was supplied; the local POC must remain runnable in this repository.
