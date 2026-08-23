# Role and Separation-of-Duties Matrix

The `.github/agents/` catalog defines the executable role contracts. This table is the canonical lifecycle ownership summary; the exact tool allowlist remains governed and regression-tested in the agent catalog.

| Role | Owns | May edit | Must not approve |
|---|---|---|---|
| Orchestrator | lifecycle state, dependencies, dispatch, integration | none; emits coordination packets | implementation or any independent gate |
| Product manager | proposal, actors, outcomes, scope | none; emits product contract drafts | architecture or security risk |
| Discovery analyst | evidence questions, provenance, confidence, contradictions | none; hands persistence to curator | product, architecture, security, or release decisions |
| Architect | design, alternatives, trust boundaries, rollback, ADR drafts | none; hands canonical persistence to curator | product scope, implementation quality, or residual risk |
| Implementation planner | vertical tasks, dependencies, test commands | none; emits plan and task drafts | code changes or review gates |
| TDD developer | RED-GREEN-REFACTOR implementation | approved task files | own spec, quality, security, accessibility, or operational gate |
| Debugger | reproduction, root cause, regression test, minimal fix | approved debug scope | own review or risk acceptance |
| Test specialist | test strategy, risk coverage, fixtures, gaps | tests when explicitly assigned | production or residual-risk acceptance |
| Spec reviewer | requirement-by-requirement compliance | none; emits independent verdict | quality, security, accessibility, or operational gate |
| Code reviewer | correctness, maintainability, test quality | none; emits independent verdict | spec, security, accessibility, or operational gate |
| Security reviewer | threats, trust boundaries, secrets, unsafe defaults | none; emits independent verdict | human residual-risk acceptance |
| Accessibility reviewer | keyboard, semantics, focus, contrast, reflow, assistive behavior | none; emits independent conditional verdict | own implementation or N/A without rationale |
| Operational readiness reviewer | deployability, observability, recovery, rollback, capacity | none; emits independent conditional verdict | release authority or operational-risk acceptance |
| Release verifier | fresh same-revision gate and command evidence | none; emits verification packet | business release authority |
| Knowledge curator | provenance, canonical persistence, indexes, post-release writeback | knowledge, index, log, and approved documentation files | product, architecture, risk, or release decisions |

## Conditional role rules

- `debugger` is dispatched during implementation or verification when a reproducible defect blocks a gate; it does not create a separate lifecycle state.
- Accessibility review is required for user-facing interaction, visual, semantic, keyboard, assistive-technology, or content-presentation changes. Otherwise record `NOT_APPLICABLE` with rationale.
- Operational readiness review is required for deployment, runtime, data migration, availability, observability, capacity, recovery, or rollback impact. Otherwise record `NOT_APPLICABLE` with rationale.
- `knowledge-curator` persists discovery and architecture drafts only after the accountable owner approves their content.
- Implementer, spec reviewer, quality reviewer, security reviewer, conditional reviewers, and release verifier must be different assignments for the same frozen revision.
