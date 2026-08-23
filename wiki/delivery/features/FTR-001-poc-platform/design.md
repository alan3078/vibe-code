# Vibe-Code Platform Local POC Design

## Constraints and assumptions

This design optimizes for a one-command local POC while preserving a seam for the external workspace runtime. Docker Compose runs a real code-server service against the persistent workspace volume; the Coder template targets Kubernetes/K3s with one Deployment and persistent volume claim per workspace. Neither path claims production readiness for credentials, cluster operations, or migrations. SSO/OIDC and LiteLLM/model gateway integration are deliberately excluded.

## Proposed design

```text
Browser
  └── React/Vite portal
        └── Bearer JWT (local demo identity seam)
              └── NestJS/Fastify control plane
              └── PostgreSQL (users, templates, projects)
                    └── WorkspaceProvider
                          ├── local adapter (Compose volume, Git + SQLite)
                          └── code-server (browser IDE + pinned Cline extension)
                          └── Coder adapter (operator-configured API)
```

The portal has four views represented by client state and URL routes. The control plane exposes an authenticated API. A global request-ID middleware returns or generates `x-request-id` so errors can be correlated in local logs.

## Interfaces and data

- `POST /api/auth/demo-login` accepts a seeded user ID only when `NODE_ENV` is not `production` and returns a short-lived JWT.
- `GET /api/auth/me` returns the authenticated seeded user.
- `GET /api/projects` returns owner-scoped projects.
- `POST /api/projects` accepts `{ name, description? }` plus `Idempotency-Key`; it creates a `Creating` project and completes local provisioning to `Running`.
- `GET /api/projects/:id` returns an owner-scoped project or `404`.
- `POST /api/projects/:id/start` and `/stop` persist lifecycle state.
- `GET /api/projects/:id/workspace` returns the owner-scoped source tree, Git commit, and app data file.
- `GET/POST/PATCH /api/preview/projects/:id/requests` serves the authenticated request-tracker preview against the per-project SQLite database.
- `GET /health` verifies process health and database connectivity.

PostgreSQL tables:

- `users`: seeded stable identities plus optional per-user Coder username mappings.
- `templates`: the fixed React + Vite / Python + FastAPI `golden-react-nest-postgres` compatibility ID and version.
- `projects`: owner, name, description, status, template version, workspace mapping, preview placeholders, timestamps, and last error.

## Failure modes

- Invalid/missing JWT: `401`.
- Cross-user project access: `404` to avoid ownership disclosure.
- Invalid name: `400` with field validation details.
- Duplicate idempotency key: original project response.
- Database unavailable: health failure and portal retry state.
- Lifecycle transition failure: stable API error with request ID.

## Security and privacy

- No passwords or provider keys are stored in the repository.
- JWT secret is supplied through environment configuration and has a local-only default in non-production mode.
- Project owner is taken from the verified JWT subject.
- CORS is restricted to the configured portal origin.
- The local named-user login route is disabled in production. No external identity, LiteLLM, or AI gateway credentials are accepted by the local Compose contract; Cline is installed but configured by the IDE user.

## Operations and rollback

Compose health checks gate API startup on PostgreSQL readiness. API and portal use explicit environment contracts. Local rollback is rebuilding the previous image/source; no destructive migration is included. TypeORM synchronization is explicitly local-only.

## ADR links

- [ADR-0001: local POC stack](../../../architecture/decisions/ADR-0001-local-poc-stack.md)

## Test strategy

- Backend unit tests cover identity, ownership, idempotency, validation, lifecycle transitions, and local workspace persistence with repository/filesystem doubles.
- Frontend tests cover login/list/create/error rendering using mocked API calls.
- Compose and Dockerfile checks are static/configuration validation in the release verifier. The local `workspace-ide` service runs code-server 4.96.4 with the pinned Cline extension and mounts the same named volume as the local provider.
- The Coder adapter uses workspace build transitions for start/stop and refreshes provider build/agent state before persisting the project lifecycle. The Kubernetes Coder template creates one Deployment and PVC per workspace, applies 2 CPU / 4 GiB limits, exposes owner-only code-server/generated-app Coder Apps, and has no host Docker socket. It pins code-server, includes the Node/Python/Git toolchain, and prebuilds the React/Vite frontend. Live Coder, Git remote, and Kubernetes operations remain operator-owned environment tests.
- The scaffold validator and existing Python suite remain regression gates.
