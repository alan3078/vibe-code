# Lifecycle prompt catalog

Prompt files are reusable entry points for common lifecycle tasks. They complement, but never replace, repository instructions and agent role contracts.

## Ordered workflow

| Prompt | Agent | Outcome |
|---|---|---|
| `00-intake` | orchestrator | classify request and create first dispatch |
| `10-proposal` | product-manager | approval-ready feature contract |
| `15-discovery` | discovery-analyst | evidence-backed findings plus persistence handoff |
| `20-design` | architect | component, contract, failure, and migration design |
| `25-threat-model` | security-reviewer | pre-implementation threats and controls |
| `30-adr` | architect | numbered ADR draft for curator persistence |
| `40-plan` | implementation-planner | dependency-aware test-first packets |
| `45-test-strategy` | test-specialist | risk-to-test matrix |
| `50-implement-tdd` | tdd-developer | red-green-refactor implementation |
| `55-debug` | debugger | proven root cause and regression-tested fix |
| `60-delegate-subagents` | orchestrator | safe parallel dispatch matrix |
| `70-spec-review` | spec-reviewer | requirement conformance verdict |
| `80-quality-security-review` | orchestrator | independent review coordination |
| `82-security-review` | security-reviewer | dedicated fail-closed security verdict |
| `85-operational-readiness` | operational-readiness-reviewer | deploy, observe, recover, rollback verdict |
| `90-verify-release` | release-verifier | fresh release evidence packet |
| `95-retrospective` | orchestrator | owned process improvements |
| `97-knowledge-writeback` | knowledge-curator | post-retrospective documentation-only candidate and closure evidence |

## Usage

In supported VS Code Copilot Chat environments, invoke a prompt by its slash-command name. Supply the values described by `argument-hint`; missing required context must be reported rather than fabricated. Do not assume prompt files are executed by GitHub Copilot coding agent on GitHub.com.

For monorepos opened from an app or package subfolder, enable parent-repository customization discovery so the root `.github/prompts/` catalog remains available.

## Prompt contract

Every prompt defines:

- named inputs and missing-value behavior;
- capability-aware preconditions and repository-state evidence requirements;
- an ordered, role-specific procedure;
- a structured required output;
- validation of evidence, links, revision, and public safety;
- stop conditions for missing authority or risky actions.

The lifecycle number does not authorize skipping earlier gates. Start at the state justified by current approved artifacts.

When adding, renaming, or removing a prompt, update this catalog, the selected agent contract, tests, validator, and any linked lifecycle documentation.
