# Tdd Implementation

## Entry criteria

- Active lifecycle state is `IMPLEMENTING` or its first state.
- Prior phase exit evidence is linked and no abort condition is open.
- Owner, scope, and decision authority are named.

## Activities

For each task, prove RED, implement minimum GREEN, rerun focused and full tests, refactor while green, and record evidence.

## Required artifacts

- Task-level red/green evidence and commit.
- Updated feature status and traceability links.
- Gate record with owner and timestamp.

## Exit evidence

- Artifact reviewed against its explicit checklist.
- Open risks and unknowns have owners and resolution gates.
- Next permitted state: `SPEC_REVIEW`.

## Failure and revision

Return to the phase that owns the failed artifact. Escalate authority, risk, credential, production, or material ambiguity decisions to a human. Abort on secret exposure, destructive scope mismatch, or loss of rollback.
