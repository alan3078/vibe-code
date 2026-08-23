# Plan And Tasks

## Entry criteria

- Active lifecycle state is `PLANNED` or its first state.
- Prior phase exit evidence is linked and no abort condition is open.
- Owner, scope, and decision authority are named.

## Activities

Decompose into ordered vertical slices with exact files, RED/GREEN commands, dependencies, risks, and commit boundaries.

## Required artifacts

- Approved implementation plan and task table.
- Updated feature status and traceability links.
- Gate record with owner and timestamp.

## Exit evidence

- Artifact reviewed against its explicit checklist.
- Open risks and unknowns have owners and resolution gates.
- Next permitted state: `IMPLEMENTING`.

## Failure and revision

Return to the phase that owns the failed artifact. Escalate authority, risk, credential, production, or material ambiguity decisions to a human. Abort on secret exposure, destructive scope mismatch, or loss of rollback.
