# Discovery

## Entry criteria

- Active lifecycle state is `DISCOVERY` or its first state.
- Prior phase exit evidence is linked and no abort condition is open.
- Owner, scope, and decision authority are named.

## Activities

Compile evidence, business rules, system constraints, contradictions, and owned unknowns.

## Required artifacts

- Provenance-backed knowledge and resolved blockers.
- Updated feature status and traceability links.
- Gate record with owner and timestamp.

## Exit evidence

- Artifact reviewed against its explicit checklist.
- Open risks and unknowns have owners and resolution gates.
- Next permitted state: `DESIGN`.

## Failure and revision

Return to the phase that owns the failed artifact. Escalate authority, risk, credential, production, or material ambiguity decisions to a human. Abort on secret exposure, destructive scope mismatch, or loss of rollback.
