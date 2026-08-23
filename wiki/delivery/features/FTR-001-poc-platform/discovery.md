# Vibe-Code Platform Local POC Discovery

## Evidence and provenance

| Source | Owner | Date | Trust level | Relevant finding |
|---|---|---|---|---|
| Current user instruction | Human requester | 2026-08-22 | Authoritative | TypeScript React, NestJS, PostgreSQL seed bootstrap, Docker Compose, complete POC requested. |
| Pasted POC requirements | Human requester | 2026-08-22 | Authoritative product input | Four portal screens, ownership isolation, workspace lifecycle, progress/error states, and explicit non-goals. |
| Repository `AGENTS.md` and lifecycle guides | Repository contract | 2026-08-22 | Authoritative process input | Proposal/discovery/design/plan/TDD/review/verification evidence is mandatory. |
| Existing repository | Agent inspection | 2026-08-22 | Observed | Scaffold only; no application runtime, package manager, or existing database schema. |

## Actors and workflows

The local POC has two seeded named users and one local platform operator. A user signs in, lists owned projects, creates one, opens detail, and starts/stops a real local code-server workspace backed by the shared Compose volume. Ownership is derived from the verified session token, never from a client-supplied project owner.

## Constraints and dependencies

- The local environment has Node 20, npm, and Docker available.
- SSO/OIDC and AI model gateway integrations are intentionally out of scope. Coder/Git/Kubernetes remain external follow-up work and require operator credentials.
- PostgreSQL is the platform metadata store; generated-app data is out of scope for this vertical slice.

## Risks and assumptions

- A local demo login cannot provide production identity assurance; the design must make this boundary visible.
- Local TypeORM schema synchronization accelerates the POC but is unsafe as a production migration strategy.
- Local Compose proves the real code-server browser IDE path; Coder provisioning remains an external integration path.

## Open questions

| Question | Owner | Due | Status |
|---|---|---|---|
| Which Coder edition and Git provider are approved? | human:platform-owner | Before shared deployment | TBD |
| Should generated application data use PostgreSQL in the next template profile? | human:product-owner | Before template expansion | TBD |
