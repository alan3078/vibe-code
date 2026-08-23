# Vibe-Code Platform Local POC

- Feature ID: FTR-001-poc-platform
- Owner: human:product-owner
- Phase: Implementation
- Status: APPROVED FOR LOCAL POC IMPLEMENTATION

## Problem and outcome

The scaffold has no runnable product. A named user needs a small, repeatable portal journey that demonstrates authenticated project ownership, project creation, an isolated persistent workspace, a generated app preview, and continuation against PostgreSQL-backed platform metadata without manual database setup.

## Actors

- Member: signs in, views owned projects, creates a project, and starts/stops/deletes/opens it.
- Administrator: manages platform resource policy, views governed project state, and reviews audit events.
- Platform engineer: runs the local Compose stack and inspects health/logs.
- Workspace operator: supplies Coder configuration for the cluster-backed path.
- Human product owner: approves the local POC scope and later approves external integrations.

## Scope

- TypeScript React/Vite portal with Login, My Projects, Create Project, and Project Detail views.
- NestJS/Fastify control plane with JWT session seam, project ownership enforcement, CRUD/lifecycle endpoints, and health endpoint.
- PostgreSQL metadata store with deterministic bootstrap users and template seed data.
- Idempotent project creation using `Idempotency-Key`.
- Local workspace adapter with one directory, SQLite application data file, Git initial commit, and persisted request-tracker data per project.
- Coder REST provider boundary plus a pinned Kubernetes/K3s code-server workspace template, one Deployment/PVC per workspace, and FastAPI/SQLite golden app source.
- Authenticated preview API and portal request-tracker journey using seeded local named-user identity.
- Docker Compose for PostgreSQL, control plane, and portal.
- Loading, empty, error, retry, and stopped/running states.
- Governed asynchronous workspace transitions, configurable active-workspace and idle-time policies, soft deletion, administrator controls, and durable audit events as defined in [governance-extension.md](governance-extension.md).

## Non-goals

- SSO/OIDC and AI model gateway integrations are explicitly removed from this POC.
- Live Coder control plane, Git remote, or Kubernetes cluster require supplied endpoints, credentials, and human operational review.
- Arbitrary user-supplied Docker Compose or unrestricted host Docker access.
- Production auth, production secrets, team sharing, or production release.

## Requirements and business rules

- FR-01/FR-02: an authenticated session is required for project APIs; project queries and direct detail access are owner-scoped in the backend.
- FR-03: duplicate submissions with the same idempotency key return the original project and do not create a second record.
- FR-04: lifecycle actions update persisted project status and are reflected by the portal.
- FR-11: API errors expose a request/correlation ID through `x-request-id`.
- FR-12: no external identity provider or AI gateway is required by the POC; the portal clearly presents the seeded local identity boundary.
- Seed data must be available after a clean Compose startup without manual SQL.

## Dependencies and risks

- Node 20+, npm, and Docker Compose are required for the local path.
- The seeded named-user login is the only identity path in this POC and is disabled when `NODE_ENV=production`.
- TypeORM synchronization is local-POC-only and must be replaced with reviewed migrations before production use.
- Coder, Git remotes, and Kubernetes require human-approved credentials and environment decisions.

## Acceptance criteria

1. A clean `docker compose up --build` starts PostgreSQL, API, and portal; the API health check succeeds after the database is ready.
2. A named seeded user can sign in, see the empty state, create a project, and see it in the owned project list.
3. A second seeded user cannot retrieve the first user’s project through the API or portal.
4. Start/stop actions persist and return the expected status.
5. Repeating a create request with one idempotency key returns one project.
6. Project and API failures render actionable error/retry states rather than a blank screen.
7. The focused backend tests, frontend tests, Compose configuration validation, and scaffold validator pass.
8. Resource policy, administrator authorization, deletion, asynchronous lifecycle transitions, and audit-event persistence satisfy [governance-extension.md](governance-extension.md).
9. The administrator portal satisfies the Administration CMS contract in [governance-extension.md](governance-extension.md): unified group/item configuration, Projects, Users & roles, corrected audit semantics, three-field basic search with advanced filters, bounded server-side pagination, and administrator project creation.

## Evidence and traceability

- Source requirements: current human instruction and the provided `pasted-text-1.txt` attachment.
- Design: [design.md](design.md) and [ADR-0001](../../../architecture/decisions/ADR-0001-local-poc-stack.md).
- Implementation tasks: [tasks.md](tasks.md).
