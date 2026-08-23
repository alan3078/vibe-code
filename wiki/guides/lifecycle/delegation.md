# Delegation Contract

## Dispatch packet

A valid subagent dispatch contains task ID, role, goal, authoritative context, allowed files/tools/side effects, non-goals, acceptance criteria, exact commands, expected output, evidence schema, and stop conditions.

## Parallelism

Parallelize only independent read scopes or disjoint write scopes. Serialize tasks that share files, schemas, migrations, APIs, or architectural decisions. The orchestrator owns dependency ordering and integration.

## Review separation

The implementer cannot be the sole reviewer. Run spec compliance first; only a PASS may proceed to quality/security review. Release verification uses fresh commands and does not trust summaries without artifacts.

## Required return envelope

```text
status: PASS | FAIL | BLOCKED
scope_completed:
files_changed:
commands_run:
evidence:
risks_or_unknowns:
recommended_next_state:
```
