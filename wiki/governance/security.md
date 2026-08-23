# Security Governance

This page is the canonical knowledge record for repository security design and delivery controls. The root [`SECURITY.md`](../../SECURITY.md) remains GitHub's vulnerability-reporting entry point.

## Required controls

- Keep credentials, private keys, personal data, private infrastructure identifiers, and production data out of files and Git history.
- Record trust boundaries, sensitive data, abuse cases, dependency risks, and mitigations in each material feature design.
- Use placeholders and mocks until credentials are supplied through an approved secret store.
- Require independent security review before verification for material behavior changes.
- Preserve security evidence in the feature package under `wiki/delivery/features/`.
- Stop for unresolved high-severity findings; only a named human may accept narrowly documented residual risk.

## Application scope

Each deployable unit under `apps/` should document authentication, authorization, data handling, network boundaries, operational ownership, rollback, and incident response where applicable. Shared packages under `packages/` should document security-sensitive interfaces and their consumers.

## Reporting

Report vulnerabilities privately through GitHub Security Advisories. Never disclose exploit details, credentials, personal information, or production infrastructure in a public issue.
