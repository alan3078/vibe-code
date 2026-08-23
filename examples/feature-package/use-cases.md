# Project Health Command Use Cases

## UC-01: Run all canonical local health checks

- Actor: repository contributor.
- Trigger: the contributor wants confidence before requesting review.
- Preconditions: supported Python environment and repository checkout are available.
- Success flow: invoke the documented command; validator and tests run; command exits zero.
- Alternate flow: invoke the validator and test commands separately.
- Failure flow: preserve the failing command output and return its non-zero status.
- Postconditions: no tracked source or external application state is changed. Locked environment preparation may create ignored `.venv/` files and populate the package cache.
- Observable acceptance evidence: recorded commands, output, exit statuses, and reviewed revision.
