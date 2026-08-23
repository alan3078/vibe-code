---
applyTo: 'apps/**'
---

# Deployable application boundaries

Content under `apps/` is independently deployable.

- Give each app an explicit runtime entry point, configuration contract, health behavior, tests, and deployment boundary.
- Keep reusable business logic, shared schemas, and shared UI in `packages/` when two or more apps actually need them.
- Do not import another app's private source through relative paths.
- Define startup, readiness, shutdown, timeout, retry, idempotency, and degraded behavior where relevant.
- Keep secrets out of source and logs; use placeholders in public examples.
- Add a local `AGENTS.md` when an app needs commands or constraints beyond the root contract.
- Include accessibility evidence for user-facing apps and operational-readiness evidence for deployable changes.
- Document new application boundaries in the architecture baseline and delivery artifacts.

Do not create speculative empty apps. Every added app must have a named purpose and owner.
