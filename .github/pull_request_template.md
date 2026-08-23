## Why this change is needed

Describe the user or operational problem, the intended outcome, and why this revision is the smallest useful scope.

## Linked control-plane artifacts

- Issue / agent task:
- Product proposal / feature:
- Discovery evidence:
- Design / ADRs:
- Implementation task IDs:
- Candidate revision:

## Scope

### Included

_List included changes._

### Explicitly excluded

_List excluded changes._

## Contract and impact assessment

- [ ] Public API, schema, event, or serialized-data impact documented
- [ ] Compatibility and migration behavior documented
- [ ] Security and privacy boundaries reviewed
- [ ] Performance or capacity impact measured or marked not applicable
- [ ] Accessibility impact reviewed or marked not applicable
- [ ] Deployment, configuration, observability, and rollback impact documented

Explain every checked impact or `not applicable` decision:

## TDD and verification evidence

| Gate | Exact command | Actual result | Evidence link or excerpt |
|---|---|---|---|
| Baseline |  |  |  |
| RED |  |  |  |
| Focused GREEN |  |  |  |
| Regression suite |  |  |  |
| Lint / build / package |  |  |  |
| Repository validator |  |  |  |

List skipped checks and why they could not run:

## Independent reviews for this exact revision

- [ ] Specification review PASS
- [ ] Code-quality review PASS
- [ ] Security review PASS
- [ ] Accessibility review PASS or not triggered
- [ ] Operational-readiness review PASS or not triggered
- [ ] Independent release verification PASS

Link each review and confirm it references the candidate revision:

## Public repository safety

- [ ] No credentials, tokens, cookies, private keys, or connection strings
- [ ] No personal, customer, or proprietary data
- [ ] No private domains, addresses, account IDs, host paths, or infrastructure details
- [ ] Fixtures and examples use unmistakable synthetic placeholders
- [ ] Generated files, archives, images, metadata, and Git history were considered

## Deployment, migration, and rollback

Describe required ordering, compatibility window, recovery steps, and named operator. Write `not applicable` with a reason for documentation-only changes.

## Documentation and knowledge writeback

- [ ] Product, architecture, ADR, delivery, and runbook documents updated where applicable
- [ ] Immutable evidence added to `wiki/raw/` with provenance where applicable
- [ ] Canonical indexes and `wiki/log.md` updated where applicable
- [ ] Local links and referenced paths validated

## Residual risks and human decisions

List open risks, accepted deviations, accountable owners, expiry dates, and the exact human decision requested. Do not request merge or release approval while a required gate is missing or stale.
