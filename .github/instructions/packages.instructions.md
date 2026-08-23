---
applyTo: 'packages/**'
---

# Shared package boundaries

Content under `packages/` must be reusable and non-deployable by itself.

- Define the package's public contract and intended consumers.
- Keep dependency direction acyclic and avoid importing private app code.
- Add a package only when reuse or boundary value is demonstrated; do not pre-build speculative abstractions.
- Preserve compatibility or document and approve breaking changes.
- Test public behavior, serialization, errors, and consumer-facing types.
- Keep environment-specific runtime configuration in consuming apps.
- Document ownership, versioning, and migration expectations when the package is externally consumed.
- Update architecture and ADR artifacts when a package creates a consequential new boundary.

Prefer duplication of a tiny unstable detail over a premature shared package that couples unrelated apps.
