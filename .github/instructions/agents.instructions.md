---
applyTo: '**/.github/agents/*.agent.md'
---

# Custom agent profiles

Use lowercase kebab-case filenames ending in `.agent.md`.

Every agent must:

- declare `name`, a specific `description`, and explicit least-privilege `tools`;
- omit `target` for a portable profile unless the role intentionally supports only `vscode` or `github-copilot`;
- define one role with clear use cases and non-goals;
- include mission, responsibilities, inputs, workflow, decision rules, output contract, guardrails, handoff, and completion criteria;
- distinguish evidence from agent claims;
- state when to return PASS, FAIL, or BLOCKED where the role is a gate;
- avoid model-specific behavior unless the repository intentionally requires it;
- remain below GitHub's current 30,000-character agent-body limit;
- avoid unrestricted tools when read-only or review work is sufficient.

Do not let an implementation agent self-approve its own revision. Do not create overlapping roles with unclear ownership. Update `.github/agents/README.md`, tests, and validator requirements when adding or removing a role.
