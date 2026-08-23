# Example: Project Health Command Tasks

This is a planned example. Evidence fields remain `PENDING` until implementation runs against one frozen revision; the document does not claim that the behavior exists.

| ID | Vertical slice | Exact files | Dependencies | Risks | Owner | Status | Commit boundary |
|---|---|---|---|---|---|---|---|
| TASK-001 | Propagate validator failure | `scripts/project_health.py`, `tests/test_project_health.py` | approved design and test fixture | subprocess output or exit status could be swallowed | `example:tdd-developer` | READY | wrapper plus focused failing-path test |
| TASK-002 | Run tests only after validator success and propagate test failure | `scripts/project_health.py`, `tests/test_project_health.py` | TASK-001 | accidental test invocation after validator failure; environment setup side effects | `example:tdd-developer` | BLOCKED | success-path orchestration plus focused ordering test |

## TASK-001 TDD evidence

- Exact files: `scripts/project_health.py`, `tests/test_project_health.py`
- Exact command: `uv run --frozen --extra test pytest tests/test_project_health.py::test_validator_failure_is_propagated -q`
- Expected RED failure: import or command-entry failure because `scripts/project_health.py` does not exist.
- Actual RED result / exit status: PENDING — implementation is outside this example package.
- GREEN result / exit status: PENDING.
- Full-suite evidence: PENDING.
- Environment: Python 3.11+, locked dependencies from `uv.lock`; `uv` may create `.venv/` and populate its package cache.
- Artifact/link: PENDING — attach immutable CI or command output for the frozen revision.
- Recorded by: `example:tdd-developer`
- Timestamp: PENDING — ISO 8601 UTC.
- Commit/revision: PENDING.
- Dependencies: approved feature, design, and acceptance artifacts.
- Risks: subprocess output or non-zero status could be hidden.
- Commit boundary: only the wrapper and focused TASK-001 test; no TASK-002 behavior.

## TASK-002 TDD evidence

- Exact files: `scripts/project_health.py`, `tests/test_project_health.py`
- Exact command: `uv run --frozen --extra test pytest tests/test_project_health.py::test_tests_run_after_validator_success -q`
- Expected RED failure: focused orchestration expectation fails because test-runner invocation is not implemented.
- Actual RED result / exit status: PENDING — blocked by TASK-001.
- GREEN result / exit status: PENDING.
- Full-suite evidence: PENDING.
- Environment: Python 3.11+, locked dependencies from `uv.lock`; `uv` may create `.venv/` and populate its package cache.
- Artifact/link: PENDING — attach immutable CI or command output for the frozen revision.
- Recorded by: `example:tdd-developer`
- Timestamp: PENDING — ISO 8601 UTC.
- Commit/revision: PENDING.
- Dependencies: TASK-001 PASS on the same candidate.
- Risks: tests could run after a failed validator or their failure status could be hidden.
- Commit boundary: TASK-002 orchestration and focused test only; no unrelated refactor.
