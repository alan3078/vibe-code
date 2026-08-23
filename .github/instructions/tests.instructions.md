---
applyTo: 'tests/**'
---

# Test code

Tests must provide observable regression evidence rather than mirror implementation details.

- Start behavior changes with a focused failing test and capture why it is RED.
- Choose the lowest-cost test level that proves the behavior.
- Cover primary, alternate, failure, recovery, boundary, and abuse paths according to risk.
- Use deterministic fixtures, isolated state, explicit cleanup, and stable assertions.
- Avoid sleeps, mutable live third parties, test-order dependence, and broad exception assertions.
- Never weaken or skip a test simply to make a change pass.
- Make failure messages identify the broken contract.
- Keep public fixtures synthetic and free of secrets or personal data.
- Run focused tests before the relevant broader suite.
- Record unavailable environments or manual checks instead of claiming coverage.

A passing test count alone is not evidence of meaningful coverage.
