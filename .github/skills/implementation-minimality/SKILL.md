---
name: implementation-minimality
description: Use before IMPLEMENTING to choose the smallest safe seam.
---
# Implementation Minimality

Require a pre-implementation choice that minimizes change while preserving non-negotiable controls.

## Trigger
- Use at `PLANNED -> IMPLEMENTING` for every executable behavior task.

## Anti-trigger
- Do not use to remove tests, security, accessibility, rollback, validation, or data-loss controls.
- Do not create a new reviewer; the existing quality reviewer rechecks the evidence.

## Lifecycle insertion
Mandatory evidence at the `PLANNED -> IMPLEMENTING` transition and rechecked during quality review.

## Inputs
- Approved task/design, current seams, standard library/native capabilities, installed dependencies, constraints, and controls.

## Procedure
1. Prefer reuse of an existing seam that already owns the behavior.
2. Otherwise prefer the standard library.
3. Otherwise prefer platform/framework-native capability.
4. Otherwise use an already-installed dependency within its existing role.
5. Otherwise write a small direct implementation.
6. Add a new abstraction or dependency only last, with explicit evidence that earlier rungs fail.
7. Record chosen rung, rejected earlier rungs, changed surface, and controls preserved before writing production code.
8. Have the existing quality reviewer recheck minimality against the frozen revision.

## Outputs and evidence
- Chosen ladder rung, alternatives rejected with evidence, estimated change surface, preserved controls, and quality-review link.

## Guardrails
- Minimality means smallest safe maintainable change, not fewest lines.
- Never weaken security, tests, accessibility, data integrity, observability, or rollback.
- New dependencies also require supply-chain review.

## Verification
- Evidence exists before implementation starts.
- Every earlier rung was used or rejected concretely.
- Quality review confirms no speculative abstraction or control removal.
