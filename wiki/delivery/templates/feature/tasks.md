# {{FEATURE_NAME}} Tasks

Each behavior task records a replayable RED-GREEN cycle. Do not replace evidence with a summary such as “tests passed.”

| ID | Vertical slice | Files | Dependencies | Owner | Status |
|---|---|---|---|---|---|
| TASK-001 | {{BEHAVIOR}} | {{FILES}} | None | Unassigned | READY |

## TASK-001 TDD evidence

- Exact files: `{{EXACT_FILE_PATHS}}`
- Exact command: `{{EXACT_TEST_COMMAND}}`
- Expected RED failure: {{FAILURE_CAUSED_BY_MISSING_BEHAVIOR}}
- Actual RED result / exit status: PENDING — record after the focused RED run.
- GREEN result / exit status: PENDING — record after the focused GREEN run.
- Full-suite evidence: PENDING — record after the canonical suite runs.
- Environment: PENDING — include OS, runtime, dependencies, and relevant configuration.
- Artifact/link: PENDING — add the immutable evidence location.
- Recorded by: PENDING — assign the executing agent or human.
- Timestamp: PENDING — ISO 8601 UTC.
- Commit/revision: PENDING — bind all evidence to one revision.
- Dependencies: {{TASK_DEPENDENCIES}}
- Risks: {{TASK_RISKS}}
- Commit boundary: {{FILES_AND_BEHAVIOR_EXCLUDED_FROM_THIS_COMMIT}}
