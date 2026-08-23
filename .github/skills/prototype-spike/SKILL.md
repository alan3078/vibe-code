---
name: prototype-spike
description: Use for a throwaway test of one high-risk question.
---
# Prototype Spike

Run a disposable experiment that answers one risky question without becoming production by accident.

## Trigger
- Use when intake is classified `spike` and evidence cannot be obtained more cheaply.

## Anti-trigger
- Do not use for production implementation, broad exploration, or multiple unrelated questions.
- Do not use to bypass design, ADR, TDD, review, or verification.

## Lifecycle insertion
A bounded evidence activity before or inside `DISCOVERY`/`DESIGN`; it never skips the canonical lifecycle.

## Inputs
- One falsifiable question, hypothesis, time/resource box, allowed files/tools, stop conditions, and disposal plan.

## Procedure
1. State one question and the evidence threshold that answers it.
2. Choose the smallest safe experiment and isolate it from production paths.
3. Time-box work and prohibit credentials, production data, destructive actions, and hidden dependencies.
4. Run the experiment; record commands, environment, observations, and limitations.
5. Decide supported, rejected, or inconclusive; stop when the threshold or time box is reached.
6. Delete or quarantine prototype code. Carry only the decision and evidence forward.
7. If any code is proposed for retention, restart governed intake for that code and require normal TDD and review.

## Outputs and evidence
- Question, hypothesis, experiment identity, actual result, limitations, decision, and disposal evidence.

## Guardrails
- Prototype code has no production presumption and no automatic promotion path.
- Inconclusive evidence stays inconclusive.
- Retained code is a new governed change, not a refactor of the spike.

## Verification
- Exactly one high-risk question was tested.
- Evidence is reproducible and bounded.
- Prototype code is disposed/quarantined or a new intake is linked.
