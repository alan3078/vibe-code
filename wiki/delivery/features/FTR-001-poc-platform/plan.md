# Vibe-Code Platform Local POC Implementation Plan

## Goal

Deliver a runnable local four-screen POC with React/Vite, NestJS/Fastify, PostgreSQL seed bootstrap, and Docker Compose.

## Architecture

See [design.md](design.md) and [ADR-0001](../../../architecture/decisions/ADR-0001-local-poc-stack.md).

## Technology

- Node.js 20 and npm workspaces.
- React 18, Vite, TypeScript, React Router, Vitest, Testing Library.
- NestJS 10, Fastify, TypeORM, PostgreSQL, class-validator, JWT.
- Docker Compose v2 with `postgres`, `control-plane`, and `portal` services.

## Ordered tasks

1. TASK-001 — establish workspace manifests and a focused backend ownership/idempotency test (RED first), then implement the NestJS API skeleton and entities.
2. TASK-002 — add PostgreSQL bootstrap, health/readiness, lifecycle endpoints, Compose files, and backend verification.
3. TASK-003 — add focused React route/state tests (RED first), then implement the four portal screens and error/retry states.
4. TASK-004 — add Docker builds, root developer commands, documentation, and run the full verification matrix.
5. TASK-005 — add the persistent generated-app workspace, authenticated preview, Coder/Kubernetes template, and provider-reflected lifecycle continuation path.

Each task is deliberately vertical and bounded to its listed files in [tasks.md](tasks.md).
