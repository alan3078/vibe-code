# Project Health Command Acceptance

## Definition of Ready

- [x] Actor, scope, non-goals, risks, dependencies, and acceptance criteria are explicit.
- [x] Design is recorded and no ADR is required for this reversible example.
- [x] Tasks are vertical, testable, and independently reviewable.

## Observable criteria

- [ ] One documented local command invokes the validator and full test suite.
- [ ] The command returns zero only when both checks pass.
- [ ] A controlled failing check produces a non-zero result without hiding its output.
- [ ] No application network, credential, deployment, or publication side effect occurs; environment preparation may download only dependencies already locked in `uv.lock`.

Unchecked criteria are intentional because this is an artifact-shape example, not shipped software.
