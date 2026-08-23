---
applyTo: 'wiki/**'
---

# Wiki knowledge control plane

`wiki/` is the only canonical repository knowledge hierarchy.

- Follow `wiki/SCHEMA.md` and navigate from `wiki/index.md`.
- Preserve raw evidence under `wiki/raw/` without rewriting its meaning or provenance.
- Compile one canonical page per durable topic; link rather than duplicate.
- Keep product outcomes, architecture, ADRs, delivery evidence, and governance in their assigned areas.
- Separate observed facts, inference, decisions, and recommendations.
- Use numbered ADRs for consequential architecture decisions.
- Use relative links and verify every changed local link.
- Mark superseded material and link to the replacing decision; do not erase history.
- Update relevant indexes and `wiki/log.md` when structure or canonical knowledge changes.
- Keep public artifacts free of credentials, personal data, private infrastructure, and proprietary material.

Never recreate a competing `docs/wiki/` or legacy root-level knowledge folder.
