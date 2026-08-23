# Knowledge Compilation Schema

## Intake

Place immutable source evidence in `wiki/raw/`. Register source, owner, date, trust level, and intended use in `wiki/raw/index.md`. Never rewrite raw evidence; add a newer source or correction note.

## Durable knowledge

Compile evidence into `wiki/knowledge-base/` with provenance links. One canonical page exists per concept or business rule. Contradictions remain visible until a human resolves them.

## Traceability

Every material delivery decision should link:

`outcome -> evidence -> requirement -> feature/use case -> business rule -> architecture/ADR -> task -> test -> verification -> measured result`

## Page creation rules

Create a new page only when information has a stable owner, distinct lifecycle, or enough content to justify independent navigation. Otherwise extend the canonical page. Update `index.md`, the relevant section index, and append to `log.md`.

## Placeholders

Templates use `{{PLACEHOLDER}}`. A generated feature must replace all required placeholders or explicitly mark unknowns `TBD` with an owner and resolution gate.
