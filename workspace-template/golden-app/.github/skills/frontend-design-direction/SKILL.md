---
name: frontend-design-direction
description: Use in DESIGN to define a distinctive visual direction.
---
# Frontend Design Direction

Translate an approved UX into a coherent visual system without auto-implementing it.

## Trigger
- Use for new or materially changed user-facing visual presentation.

## Anti-trigger
- Do not use for journey/IA discovery or as accessibility sign-off.
- Skip changes that preserve existing approved components and visual rules.

## Lifecycle insertion
Conditional substage inside `DESIGN`, after UX state requirements are known and before implementation planning.

## Inputs
- Approved UX flows and states, brand constraints, existing design system, content, platforms, and accessibility constraints.

## Procedure
1. Establish a clear visual concept tied to product purpose and audience.
2. Define hierarchy across page, region, component, action, and feedback.
3. Prefer existing semantic tokens; propose named color, type, spacing, radius, elevation, and motion roles only when missing.
4. Specify typography scale, density, rhythm, responsive composition, and state emphasis.
5. Test direction against loading, empty, error, permission, long-copy, localization, and narrow-screen states.
6. Reject generic AI UI: gratuitous gradients, interchangeable card grids, excessive pills, weak hierarchy, and decorative clutter without product rationale.
7. Hand off an implementation-ready direction while preserving independent accessibility review.

## Outputs and evidence
- Visual concept, hierarchy, semantic-token map, type/spacing direction, responsive rules, and rejected generic patterns.
- References to UX states and acceptance criteria.

## Guardrails
- Selectively adapted design ideas only; no upstream CLI, engine, datasets, installer, hooks, or auto-implementation.
- Do not invent a brand or overwrite an established design system.
- Contrast and semantics are constraints, not a substitute for accessibility testing.

## Verification
- Direction is distinctive, purpose-linked, token-based, responsive, and state-complete.
- UX, visual design, and accessibility-review responsibilities remain separate.
