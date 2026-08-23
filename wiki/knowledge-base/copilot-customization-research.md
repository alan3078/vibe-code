# GitHub Copilot customization research

## Scope

This note records the evidence used to redesign this scaffold's `.github/` agent customization control plane. The research focused on official GitHub and VS Code behavior plus the commit-pinned `github/awesome-copilot` collection.

## Verified platform contracts

GitHub recognizes repository-wide instructions at `.github/copilot-instructions.md` and path-specific files named `NAME.instructions.md` under `.github/instructions/`.[1]

The repository-wide file should explain how to build, test, and validate the repository; path-specific instructions refine behavior for matched files.[1]

A custom agent profile requires a `description`; GitHub also supports `name`, `target`, `tools`, model controls, and MCP configuration.[2]

The agent Markdown body has a 30,000-character maximum.[2]

Omitting `tools` grants all available tools, while an explicit list enables only those tools and `tools: []` disables all tools.[2]

This scaffold therefore declares explicit least-privilege tool aliases for every role.[2]

VS Code workspace prompt files live under `.github/prompts/` and use the `.prompt.md` suffix.[3] Supported frontmatter includes `name`, `description`, `argument-hint`, `agent`, `model`, and `tools`; the body can reference repository files with relative Markdown links.[3]

Prompt files are a VS Code customization surface and must not be assumed to execute in GitHub.com's coding agent.[3] Custom-agent tool availability is also surface-specific; GitHub's current reference marks the `web` alias as not applicable to its coding agent, so roles must degrade explicitly instead of claiming unavailable external research.[2]

In a monorepo opened from a subfolder, VS Code can discover root instructions, prompts, agents, skills, and hooks when parent-repository customization discovery is enabled.[4] This matters because template users may open only `apps/<name>/` or `packages/<name>/` while the customization catalog remains at the repository root.[4]

## Public repository observations

At commit `83561bd7d8a46fcda0581aedabdf8eac7cb196b6`, `github/awesome-copilot` contains a large role and instruction catalog rather than one universal prompt.[5] Its agent collection includes planning, architecture, review, security, testing, debugging, governance, and orchestration roles.[5]

The commit-pinned custom-agent authoring guide is a substantial path-specific contract covering naming, frontmatter, tools, structure, quality, and validation rather than a short role description.[6] Its plan agent is also a full workflow with principles, capabilities, process, constraints, and outputs rather than a few generic sentences.[7]

## Adopted design

The scaffold adopts the following transferable patterns:

1. Keep one comprehensive repository contract in `.github/copilot-instructions.md`.[1]
2. Split automatic rules by path instead of putting every detail into the always-on file.[1]
3. Use narrow specialist agents with explicit tool allowlists and role separation.[2][5]
4. Use ordered prompt files as reusable lifecycle entry points.[3]
5. Give every agent a mission, use cases, non-goals, inputs, workflow, decision rules, output contract, guardrails, handoff, and completion criteria.[6][7]
6. Give every prompt required inputs, preconditions, procedure, output schema, validation, and stop conditions.[3]
7. Keep independent spec, quality, security, accessibility, operational, and release gates distinct.
8. Preserve human authority for risk acceptance, merge, release, deployment, publication, and irreversible actions.
9. Enforce the catalog through tests and the repository validator.

## Patterns deliberately not copied

- Model pins are omitted so the public template remains vendor- and subscription-portable.
- MCP servers are not embedded because a generic scaffold cannot safely assume credentials, endpoints, or organizational trust policy.
- Hundreds of technology-specific roles are not copied; template users should add only roles justified by their stack.
- All-tool agents are avoided because explicit least privilege is safer and makes role boundaries inspectable.
- Length is not treated as quality by itself. Always-on instructions stay structured, while detailed specialist workflows live in agents and prompts to reduce irrelevant context.

## Resulting catalog

- 15 custom agents covering orchestration, product, discovery, architecture, planning, TDD, debugging, testing, accessibility, specification, quality, security, operations, release verification, and knowledge curation.
- 18 ordered lifecycle prompt files from intake through retrospective.
- 10 path-specific instruction contracts.
- Catalog READMEs for agent, prompt, and instruction selection.
- Regression tests and validator rules for minimum structure, required fields, legacy-path prevention, links, and public-repository safety.
- A least-privilege validation workflow with immutable action pins, concurrency cancellation, timeout bounds, and monthly Dependabot maintenance.

## Sources

[1] https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
[2] https://docs.github.com/en/copilot/reference/custom-agents-configuration
[3] https://code.visualstudio.com/docs/copilot/customization/prompt-files
[4] https://code.visualstudio.com/docs/copilot/customization/overview
[5] https://github.com/github/awesome-copilot/tree/83561bd7d8a46fcda0581aedabdf8eac7cb196b6/agents
[6] https://github.com/github/awesome-copilot/blob/83561bd7d8a46fcda0581aedabdf8eac7cb196b6/instructions/agents.instructions.md
[7] https://github.com/github/awesome-copilot/blob/83561bd7d8a46fcda0581aedabdf8eac7cb196b6/agents/plan.agent.md
