# Retrospective

## Entry criteria

- Active lifecycle state is `RELEASED` or its first state.
- Prior phase exit evidence is linked and no abort condition is open.
- Owner, scope, and decision authority are named.

## Activities

Compare outcome to target, record incidents and proposed learning, identify candidate knowledge or architecture updates, and assign follow-ups. Do not mutate canonical knowledge or the released revision in this phase.

## Required artifacts

- Completed retrospective with evidence and owned follow-ups.
- Knowledge-writeback handoff packet containing approved learnings, evidence, proposed canonical destinations, and unresolved decisions.
- Proposed feature-status and traceability-link updates recorded only in the writeback handoff; do not mutate the canonical feature package during retrospective.
- Gate record with owner and timestamp.

## Exit evidence

- Artifact reviewed against its explicit checklist.
- Open risks and unknowns have owners and resolution gates.
- Remain in `RELEASED`; next required step is `97-knowledge-writeback` using a separate documentation-only candidate.
- `CLOSED` is permitted only after writeback validation and closure evidence are recorded without mutating the released revision.

## Failure and revision

Return to the phase that owns the failed artifact. Escalate authority, risk, credential, production, or material ambiguity decisions to a human. Abort on secret exposure, destructive scope mismatch, or loss of rollback.
