# Applications

Place independently deployable applications in this directory, for example `apps/web`, `apps/api`, or `apps/worker`.

Each application should own its runtime configuration, tests, deployment boundary, and local `AGENTS.md` when it needs rules beyond the repository-wide contract. Shared code belongs in `packages/`, not by copying between applications.
