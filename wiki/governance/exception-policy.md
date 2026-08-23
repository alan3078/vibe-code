# Exception Policy

Lifecycle controls cannot be skipped implicitly. An exception is valid only when it is narrow, time-bounded, evidence-backed, and approved by a named human with authority over the affected risk.

Each active feature stores exceptions in `exceptions.json`, referenced by `manifest.yaml`. An empty list means no exception.

A manifest gate may use `result: EXCEPTED` only when its `exception_id` names a non-expired record in that package's `exceptions.json`, and that record's `feature_id` and `gate` exactly match the manifest. Non-conditional gates cannot use `NOT_APPLICABLE`.

## Required record

```json
[
  {
    "exception_id": "EXC-001",
    "feature_id": "FTR-001",
    "gate": "documentation-validation",
    "scope": "one documentation-only file",
    "reason": "No executable behavior changes",
    "risk": "low",
    "approved_by": "human:repository-owner",
    "expires": "2099-12-31",
    "compensating_controls": ["structural validator", "independent documentation review"]
  }
]
```

## Invalid exceptions

The validator rejects a record that:

- lacks an ID, feature, gate, narrow scope, rationale, risk, human approver, expiry, or compensating control;
- uses an `approved_by` value that does not begin with `human:`;
- is expired or has an invalid ISO date;
- uses repository-wide/global scope;
- attempts to waive tests for executable production behavior.

An agent may draft an exception but cannot approve it. Expired exceptions block the affected gate until removed or explicitly renewed by a human.
