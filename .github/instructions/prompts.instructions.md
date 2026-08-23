---
applyTo: '**/.github/prompts/*.prompt.md'
---

# Reusable prompt files

Use ordered lowercase filenames ending in `.prompt.md`. Numbers represent lifecycle order rather than priority.

Every prompt must:

- declare `name`, `description`, `argument-hint`, and the narrowest suitable `agent`;
- state required inputs and label missing values rather than inventing them;
- define preconditions, ordered procedure, required output, validation, and stop conditions;
- require revision identity, direct evidence, risks, and handoff ownership;
- stop before destructive, production, merge, release, or publication actions without human approval;
- use relative Markdown links when referring to repository files;
- remain reusable: do not hard-code private projects, credentials, domains, or local paths.

A prompt is a repeatable entry point, not a substitute for the selected agent's role contract or repository instructions. Update `.github/prompts/README.md`, tests, and validator requirements when the lifecycle catalog changes.
