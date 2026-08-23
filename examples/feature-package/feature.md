# Example: Project Health Command

- Feature ID: EXAMPLE-HEALTH-001
- Status: EXAMPLE ONLY

## Problem and outcome

A contributor needs one local command that reports whether scaffold structure and tests pass. Success is an exit code of zero only when all canonical validation checks pass.

## Scope

- Run the structural validator.
- Run repository tests.
- Return the first non-zero exit code.

## Non-goals

- Installing dependencies.
- Repairing failures automatically.
- Deploying software.

## Acceptance criteria

1. A healthy repository returns zero and prints both check summaries.
2. A validator failure returns non-zero and does not claim success.
3. A test failure returns non-zero and preserves the failing output.
