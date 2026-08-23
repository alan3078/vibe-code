# Project Health Command Verification Evidence

| Criterion | Command or observation | Expected | Actual | Result |
|---|---|---|---|---|
| Artifact package shape | `uv run --frozen --extra test python scripts/validate_scaffold.py` | package structure accepted | pending implementation revision | PENDING |
| Repository tests | `uv run --frozen --extra test pytest -q` | all tests pass | pending implementation revision | PENDING |
| Failure propagation | controlled subprocess test | non-zero status and preserved output | pending implementation revision | PENDING |

## Environment

- Reviewed revision: `PENDING`
- OS/runtime/dependencies: `PENDING`

## Release decision

This example cannot authorize a release. Separate spec, quality, security, and release-verification evidence must reference the same frozen implementation revision, followed by human approval.
