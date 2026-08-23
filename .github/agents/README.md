# Custom agent catalog

Custom agents define specialist roles. Select the narrowest role that owns the current lifecycle state; do not use a broad agent when a read-only specialist is sufficient.

## Role matrix

| Agent | Primary responsibility | Mutates files | Typical handoff |
|---|---|---:|---|
| `orchestrator` | Lifecycle state, delegation, evidence gates | No | accountable specialist |
| `product-manager` | Outcomes, actors, scope, acceptance criteria | No | architect |
| `discovery-analyst` | Repository and external evidence | No | product or architecture owner |
| `architect` | Boundaries, contracts, failure and migration design | No | implementation planner |
| `implementation-planner` | File-specific test-first task packets | No | implementer |
| `tdd-developer` | Red-green-refactor implementation | Yes | spec reviewer |
| `debugger` | Reproduction, root cause, minimal fix | Yes | independent reviewers |
| `test-specialist` | Risk-based strategy and automated tests | Yes | implementer or verifier |
| `accessibility-reviewer` | User-facing accessibility gate | No | implementer or verifier |
| `spec-reviewer` | Requirement conformance gate | No | quality reviewers |
| `code-reviewer` | Correctness and maintainability gate | No | release verifier |
| `security-reviewer` | Threat and security gate | No | release verifier |
| `operational-readiness-reviewer` | Deploy, observe, recover, rollback gate | No | release verifier |
| `release-verifier` | Fresh final evidence packet | No | human approver |
| `knowledge-curator` | Canonical wiki and provenance | Yes | orchestrator |

## Selection rules

1. Start with `orchestrator` only when multiple phases or roles are required.
2. Use `discovery-analyst` when a decision depends on evidence not already canonical.
3. Do not ask `architect` to define product outcomes or `product-manager` to accept technical risk.
4. Use `tdd-developer` for approved behavior changes and `debugger` for observed failures.
5. Freeze the revision before independent review.
6. Run `spec-reviewer` before quality and security gates.
7. Add accessibility review for user-facing changes.
8. Add operational review for deployable, stateful, configuration, workflow, dependency, or infrastructure changes.
9. Use `release-verifier` only after all required independent gates pass for the same revision.
10. Human approval remains mandatory for risk acceptance, merge, release, deployment, publication, and irreversible actions.

## Agent file contract

Each `.agent.md` file contains YAML frontmatter and a self-contained role prompt. Tool lists follow least privilege. Review agents do not have edit tools. The Markdown body defines use cases, non-goals, inputs, workflow, decision rules, output contract, guardrails, handoff, and completion criteria.

GitHub currently supports a required `description`, optional `name`, `target`, `tools`, and model controls. Omitting `target` keeps a profile available to both supported environments, while omitting `tools` grants all available tools. This scaffold therefore omits `target` for portability and declares tools explicitly for least privilege. Tool availability still differs by surface: for example, `web` is not currently available to GitHub.com's coding agent, so `discovery-analyst` must record that capability gap and hand external lookup to a capable environment rather than claiming coverage.

When adding or removing a role, update this catalog, `tests/test_scaffold.py`, and `scripts/validate_scaffold.py` in the same revision.
