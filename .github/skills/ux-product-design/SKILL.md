---
name: ux-product-design
description: Use in DESIGN for user-facing journeys and interaction states.
---
# UX Product Design

Define how people complete the approved journey before visual styling or implementation.

## Trigger
- Use for user-facing screens, flows, forms, navigation, permissions, or content-state changes.

## Anti-trigger
- Skip backend-only and documentation-only changes with no user interaction impact.
- Do not use as a substitute for frontend visual direction or accessibility review.

## Lifecycle insertion
Conditional substage inside `DESIGN`; it does not create a new top-level lifecycle state.

## Inputs
- Actors, use cases, outcome, scope/non-goals, constraints, content, devices, locales, and trust boundaries.

## Procedure
1. Map entry, success, alternate, failure, recovery, and return journeys.
2. Define information architecture, navigation, content hierarchy, and ownership.
3. Specify interaction states: loading, empty, error, offline/partial, permission denied, and retry.
4. Define form validation, destructive confirmation, progress, and interruption recovery.
5. Record responsive, localization, keyboard, assistive-technology, and reduced-motion constraints.
6. Trace each state to acceptance evidence and hand visual choices to frontend design direction.

## Outputs and evidence
- Journey map, IA, state matrix, interaction rules, constraints, and acceptance links.
- Explicit accessibility-review trigger for the frozen revision.

## Guardrails
- Do not fabricate research findings, user preferences, or product facts.
- Security and permission states fail closed and never expose protected information.
- Accessibility review remains independent; this skill cannot self-approve it.

## Verification
- Every journey has success, empty/loading, error, permission, and recovery coverage where applicable.
- Responsive, localization, and accessibility constraints are explicit.
- UX and visual-direction decisions are recorded separately.
