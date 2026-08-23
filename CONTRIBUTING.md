# Contributing

1. Start from an approved feature package and task.
2. Create a focused branch; never push feature work directly to `main`.
3. Follow RED-GREEN-REFACTOR for behavior changes.
4. Run `uv run --frozen --extra test python scripts/validate_scaffold.py` and `uv run --frozen --extra test pytest`.
5. Open a PR with scope, evidence, risks, rollback, and unresolved questions.
6. Require spec review before quality/security review and human merge approval.
