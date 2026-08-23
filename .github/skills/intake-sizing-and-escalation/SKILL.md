---
name: intake-sizing-and-escalation
description: Use at intake to size work and escalate it one way.
---
# Intake Sizing and Escalation

Classify delivery effort without creating a shortcut around the canonical lifecycle.

## Trigger
- Invoke for every new change request during `INTAKE`.
- Re-run when discovery exposes wider scope, risk, or architectural impact.

## Anti-trigger
- Do not use to waive proposal, design, planning, TDD, review, verification, or human approval.
- Do not downgrade work after implementation begins merely to reduce controls.

## Lifecycle insertion
Runs inside `INTAKE`, before the proposal handoff. Classification may escalate `spike -> bounded -> architectural`, never the reverse within the same feature cycle.

## Inputs
- Requested outcome, affected surfaces, constraints, risk, reversibility, and known unknowns.
- Current repository and lifecycle evidence.

## Procedure
1. Classify `spike` only when one high-risk question needs disposable evidence before a production design.
2. Classify `bounded` when behavior and seams are known, change is reversible, and no consequential boundary changes.
3. Classify `architectural` when interfaces, data, trust boundaries, dependencies, migration, operations, or broad UX direction change.
4. Record rationale and uncertainty. Choose the higher class when evidence is insufficient.
5. Escalate one way when later evidence crosses a class boundary; update proposal, design, and tasks before continuing.
6. Hand off to the next canonical lifecycle state; never jump directly to implementation.

## Outputs and evidence
- Classification, rationale, escalation triggers, accountable owner, and next legal state.
- Links to the intake/feature package artifacts carrying the decision.

## Guardrails
- Classification changes depth, not required lifecycle states.
- Human authority remains mandatory for scope, risk, architecture, release, and merge.
- A spike produces evidence only; retained code restarts governed intake.

## Verification
- Classification is exactly `spike`, `bounded`, or `architectural`.
- Rationale cites direct scope/risk evidence and names escalation conditions.
- Next state follows the canonical lifecycle.
