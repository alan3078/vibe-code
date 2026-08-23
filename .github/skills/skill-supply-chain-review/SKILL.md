---
name: skill-supply-chain-review
description: Use before adding or upgrading any external skill source.
---
# Skill Supply Chain Review

Fail closed before an external skill or reference revision enters the governed catalog.

## Trigger
- Mandatory before adding, upgrading, or expanding an externally sourced skill or adaptation.

## Anti-trigger
- Do not treat a repository name, latest branch, package tag, or prior review as current approval.
- Purely internal wording with no external source may record internal provenance instead.

## Lifecycle insertion
Runs before external skill changes are approved in proposal/design and before their manifest or lock entry changes.

## Inputs
- Source URL, exact candidate revision, skill path/scope, license evidence, files, install/update mechanism, and intended tools/side effects.

## Procedure
1. Resolve and pin a full lowercase 40-character commit SHA; reject branches, tags, floating URLs, and moving releases.
2. Record source URL, skill-level license, and SHA-256 for every imported governed artifact.
3. Inspect scripts, binaries, generated files, installers, hooks, commands, and runtime/tool declarations.
4. Enumerate network endpoints, secret access, write scope, execution scope, and privilege assumptions.
5. Inspect direct and transitive dependencies plus lock/install behavior.
6. Compare requested capabilities with the minimum selective adaptation; reject unrelated runtime plumbing and auto-mutation.
7. Define bounded update, verification, rollback, and removal procedures.
8. Record PASS/FAIL findings before editing `.github/skills/manifest.yaml` or `skills.lock.yaml`.

## Outputs and evidence
- Source URL, pinned revision, license, artifact hashes, risk inventory, accepted/rejected scope, dependency analysis, update plan, rollback plan, and reviewer verdict.

## Guardrails
- Never execute unreviewed installers, hooks, binaries, or scripts.
- Never grant undeclared network, secret, write, browser, or command side effects.
- Reference ideas are attribution, not a claim that upstream code was copied.
- Any source, revision, hash, license, or scope change invalidates the prior review.

## Verification
- URL, immutable revision, skill-level license, and SHA-256 are present.
- Scripts/binaries/network/secrets/writes/hooks/tools/transitive dependencies were explicitly assessed.
- Update and rollback are reproducible; manifest and lock agree.
