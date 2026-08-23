---
name: visual-browser-qa
description: Use in quality review for report-only browser evidence.
---
# Visual Browser QA

Perform independent, report-only browser QA against one frozen revision.

## Trigger
- Use at `QUALITY_SECURITY_REVIEW` for user-facing web changes or when visual/browser regressions are plausible.

## Anti-trigger
- Skip non-browser changes with a concrete N/A rationale.
- Never auto-fix, commit, push, merge, or mutate the reviewed candidate.

## Lifecycle insertion
Independent conditional evidence inside `QUALITY_SECURITY_REVIEW`, after spec PASS and against the same frozen revision.

## Inputs
- Frozen revision/build identity, approved routes, safe test accounts/fixtures, acceptance criteria, supported desktop/mobile viewports, and environment.

## Procedure
1. Verify revision/build identity and use only approved non-production accounts and routes.
2. Record route, account role, prerequisites, and deterministic reproduction steps.
3. Capture desktop and mobile screenshots for primary, loading, empty, error, permission, and recovery states as applicable.
4. Inspect console and network failures without exposing secrets or personal data.
5. Exercise forms, validation, navigation, refresh/back behavior, and interrupted flows.
6. Check keyboard order, focus visibility, semantics, labels, zoom/reflow, and obvious contrast issues; route formal approval to the accessibility reviewer.
7. Produce findings with severity, expected/actual behavior, evidence, and reproduction. Do not edit files.

## Outputs and evidence
- Frozen revision, environment, route/account matrix, reproduction steps, screenshots, console/network notes, state/form/keyboard findings, and report-only verdict.

## Guardrails
- Read and observe only; no auto-fix or auto-commit runtime plumbing.
- Redact secrets, tokens, cookies, personal data, and private infrastructure.
- Do not bypass permission prompts or access unauthorized routes/accounts.
- A changed revision invalidates the report.

## Verification
- Desktop/mobile, console/network, forms/states, keyboard, and accessibility evidence are present or explicitly N/A.
- Every finding is reproducible and bound to the frozen revision.
- Working tree and candidate remain unchanged by QA.
