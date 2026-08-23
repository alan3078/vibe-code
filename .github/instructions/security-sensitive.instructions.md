---
applyTo: '**/*.{yml,yaml,json,toml,env,sh,ps1},**/Dockerfile,**/Dockerfile.*'
---

# Security-sensitive configuration and automation

Configuration and automation files cross trust and execution boundaries.

- Use least privilege, safe defaults, explicit allowlists, and bounded resource behavior.
- Keep secrets external; examples must use unmistakable placeholders.
- Validate and quote untrusted values before shell, path, query, template, or network use.
- Avoid dynamic execution, unsafe deserialization, broad filesystem access, and world-writable permissions.
- Define timeout, retry, backoff, idempotency, and failure behavior for network operations.
- Pin or constrain dependencies and base images according to repository policy.
- Do not expose private domains, addresses, accounts, or infrastructure topology in this public repository.
- Include rollback and recovery treatment for stateful changes.
- Require independent security review for changed trust boundaries, privileges, dependencies, or secret handling.

Fail closed when configuration is missing, malformed, ambiguous, or outside the approved environment.
