# Traceability and Separation Policy

## Canonical lifecycle state

Each real feature package has one `manifest.yaml`. It is the single machine-readable source for lifecycle state, owners, artifact links, gates, ADR assessment, and exceptions. Markdown artifacts describe work but must not independently override the manifest state.

## Required chain

`outcome -> evidence -> requirement -> use case -> rule -> design/ADR -> task -> test -> verification -> measured result`

A missing link is an owned gap, not an invitation to infer.

## Separation of duties

For material behavior changes, the implementer, spec reviewer, quality reviewer, security reviewer, and release verifier must be different assignments. The orchestrator coordinates but cannot be the sole implementer or reviewer. Only a human or enforced branch policy supplies final merge/release authority.

Every review records reviewed revision, artifact versions, findings, evidence, verdict, and reviewer identity.
