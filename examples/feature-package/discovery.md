# Project Health Command Discovery

## Evidence and provenance

| Source | Trust level | Relevant finding |
|---|---|---|
| `scripts/validate_scaffold.py` | executable repository source | canonical structural and public-safety validation already exists |
| `tests/` | executable repository source | canonical regression suite already exists |
| `AGENTS.md` | repository contract | fresh command evidence is required before success claims |

## Constraints and dependencies

- Reuse existing validation logic rather than duplicate it.
- Introduce no network, credential, deployment, or publication dependency.
- Preserve subprocess output and exit status.

## Risks and assumptions

- Shell portability is a design concern.
- This package demonstrates artifact shape only; it does not claim an implementation exists.

## Open questions

None for the example package. Real feature packages must keep unknown facts as `TBD` with an owner.
