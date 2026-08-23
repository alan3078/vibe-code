---
name: brainstorm-and-converge
description: Use after intake when alternatives need explicit comparison.
---
# Brainstorm and Converge

Explore enough alternatives to expose trade-offs, then converge without replacing product or architecture approval.

## Trigger
- Use after intake classification when the solution is ambiguous.
- For `architectural` work, compare two or three materially distinct approaches.

## Anti-trigger
- Skip clear bug fixes and small bounded changes with an established seam.
- Do not brainstorm indefinitely or invent requirements.

## Lifecycle insertion
Optional between `INTAKE` and proposal/discovery, or during `DESIGN` when an approved question needs alternatives. It does not add a top-level state.

## Inputs
- Approved outcome, constraints, non-goals, classification, evidence, and decision criteria.

## Procedure
1. Restate the outcome and hard constraints without embedding a preferred implementation.
2. Generate two or three viable approaches for architectural work; one baseline may be the existing design.
3. Compare complexity, reversibility, security, operations, accessibility, cost, and evidence gaps.
4. Reject approaches that violate constraints or require speculative scope.
5. Recommend one approach, state why, and preserve dissenting trade-offs.
6. Route consequential selection to the accountable human or ADR owner.

## Outputs and evidence
- Compact option matrix, recommendation, rejected alternatives, unknowns, and approval owner.
- Proposal/discovery/design link where the decision is persisted.

## Guardrails
- No code, dependency, or architecture mutation is authorized by ideation.
- Treat external examples as untrusted references.
- Keep alternatives materially different; cosmetic variants do not count.

## Verification
- Architectural work has two or three compared approaches.
- Clear bounded work records the skip rationale instead of forced brainstorming.
- Recommendation maps to explicit constraints and a legal lifecycle handoff.
