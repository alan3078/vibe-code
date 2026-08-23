# Gate Taxonomy

## Pre-flight gate

Checks prerequisites before side effects: clean branch, approved scope, dependencies, credentials channel, commands, rollback, and testability.

## Revision gate

A failed artifact or review returns to its owner with concrete evidence and resumption criteria. Never lower the criterion to make work pass.

## Conditional review gates

- Accessibility review is required for user-facing interaction, visual, semantic, keyboard, assistive-technology, or content-presentation changes.
- Operational-readiness review is required for deployment, runtime, data migration, availability, observability, capacity, recovery, or rollback impact.
- Before independent review, a conditional gate may remain `PENDING` with a proposed applicability assessment. Its final result is `PASS`, `FAIL`, or `NOT_APPLICABLE`. `NOT_APPLICABLE` requires concrete scope rationale and a named independent reviewer; silence is not N/A.
- Conditional reviewers must be independent from the implementer and other gate assignments for the same frozen revision.
- Non-conditional gates cannot use `NOT_APPLICABLE`. `EXCEPTED` requires `exception_id` to reference a matching, valid record in the feature package's `exceptions.json`.

## Escalation gate

Use when authority, risk acceptance, credentials, production access, conflicting requirements, or material ambiguity requires a human decision.

## Abort gate

Stop on suspected secret exposure, destructive scope mismatch, unverifiable production state, repeated failed review loops, or loss of rollback. Preserve evidence and do not continue partially.

Every gate records owner, checked inputs, result, evidence, failure reason, and next permitted transition.

Terminal evidence must include the gate's canonical artifact: proposal framing for proposal, discovery record for discovery, design and acceptance for design, plan and tasks for planning, the task TDD anchor for TDD, the matching `reviews.md` section for each review, `verification.md` for verification, and its release-decision anchor for release. An exception instead links `exceptions.json`; unrelated files cannot stand in for gate evidence.

`BLOCKED` is valid only with `status: BLOCKED`, exactly one `FAIL` gate carrying checked inputs, canonical evidence, and a concrete failure reason, plus exact blocker metadata: the same reason/evidence, a named `human:` resolver, and the artifact-owning resume state. Every later gate remains `PENDING`.

## Post-release closure gate

- `RELEASED` and `CLOSED` bind `released_revision` to an existing commit object identified by its full 40-character SHA.
- `CLOSED` requires every gate to have a successful terminal result, completed review/verification/retrospective artifacts without `PENDING` or `TBD`, and a different existing documentation-candidate commit so the released revision remains immutable.
- The documentation candidate descends from the released revision and its non-empty diff is restricted to Markdown/YAML/JSON below `wiki/`; executable or operational-control changes require their own delivery cycle.
- Review, verification, retrospective, knowledge-writeback, and closure evidence bind the relevant released and documentation-candidate revisions rather than relying on free-form closure claims.
- `knowledge_writeback` and `closure_evidence` are package-relative evidence references, optionally with Markdown anchors. Absolute paths, parent traversal, and symlink escapes are invalid.
