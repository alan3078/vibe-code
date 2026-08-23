# Lifecycle State Machine

| State | Owner | Required exit evidence | Next |
|---|---|---|---|
| INTAKE | Orchestrator | problem, requester, constraints, source links | PROPOSAL |
| PROPOSAL | Product manager | outcome, scope/non-goals, actors, risks, approval | DISCOVERY |
| DISCOVERY | Discovery analyst / product manager | evidence packet, rules, unknowns, provenance; Knowledge curator persists approved evidence | DESIGN |
| DESIGN | Architect | approved design, threat model, ADRs | PLANNED |
| PLANNED | Planner | ordered vertical tasks and exact tests | IMPLEMENTING |
| IMPLEMENTING | TDD developer | RED and GREEN evidence per task | SPEC_REVIEW |
| SPEC_REVIEW | Independent spec reviewer | requirement-by-requirement PASS | QUALITY_SECURITY_REVIEW |
| QUALITY_SECURITY_REVIEW | Independent quality, security, and triggered conditional reviewers | separate PASS verdicts plus accessibility and operational PASS or justified NOT_APPLICABLE | VERIFYING |
| VERIFYING | Release verifier | canonical independent evidence | RELEASE_READY |
| RELEASE_READY | Human approver | release and rollback approval | RELEASED |
| RELEASED | Knowledge curator / product owner | retrospective, measured outcome, separate documentation-candidate write-back, closure evidence | CLOSED |

Any gate failure returns to the artifact-owning state according to this exact matrix: proposal -> `PROPOSAL`; discovery -> `DISCOVERY`; design -> `DESIGN`; plan -> `PLANNED`; TDD, spec, quality, security, accessibility, operational-readiness, and verification -> `IMPLEMENTING`; release -> `RELEASE_READY`. Scope or risk changes return to `PROPOSAL` or `DESIGN` through a new governed transition, not by overriding the gate matrix.

A stop condition moves work to `BLOCKED`. The manifest then records exactly one failed gate plus blocker reason, named `human:` resolver, canonical evidence, and the artifact-owning resume state. Every later gate remains `PENDING` until resolution.
