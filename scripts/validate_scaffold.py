#!/usr/bin/env python3
"""Validate scaffold structure, contracts, links, and public-repository safety."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = {
    "AGENTS.md",
    ".github/copilot-instructions.md",
    ".github/dependabot.yml",
    ".github/agents/README.md",
    ".github/prompts/README.md",
    ".github/instructions/README.md",
    ".github/workflows/validate-scaffold.yml",
    "apps/README.md",
    "packages/README.md",
    "wiki/README.md",
    "wiki/SCHEMA.md",
    "wiki/architecture/decisions/README.md",
    "wiki/index.md",
    "wiki/log.md",
    "wiki/raw/index.md",
    "wiki/delivery/features/README.md",
    "wiki/guides/lifecycle/state-machine.md",
    "wiki/guides/lifecycle/gates.md",
    "wiki/guides/lifecycle/delegation.md",
    "wiki/governance/exception-policy.md",
    "wiki/governance/security.md",
    "wiki/governance/traceability-policy.md",
    "wiki/delivery/templates/feature/manifest.yaml",
    "wiki/delivery/templates/feature/discovery.md",
    "wiki/delivery/templates/feature/delegations.yaml",
    "wiki/delivery/templates/feature/exceptions.json",
    "wiki/delivery/templates/feature/reviews.md",
    "workflows/00-intake.md",
    "workflows/10-proposal.md",
    "workflows/20-discovery.md",
    "workflows/30-design-and-adr.md",
    "workflows/40-plan-and-tasks.md",
    "workflows/50-tdd-implementation.md",
    "workflows/60-review.md",
    "workflows/70-verification.md",
    "workflows/80-release.md",
    "workflows/90-retrospective.md",
    ".github/prompts/15-discovery.prompt.md",
}

AGENT_HEADINGS = (
    "## Mission",
    "## When to use this agent",
    "## Responsibilities",
    "## Inputs",
    "## Workflow",
    "## Decision rules",
    "## Output contract",
    "## Guardrails",
    "## Handoff",
    "## Completion criteria",
)
PROMPT_HEADINGS = (
    "## Inputs",
    "## Preconditions",
    "## Procedure",
    "## Required output",
    "## Validation",
    "## Stop conditions",
)
AGENT_TOOLS = {
    "orchestrator": "['read', 'search', 'agent', 'todo']",
    "product-manager": "['read', 'search']",
    "discovery-analyst": "['read', 'search', 'web']",
    "architect": "['read', 'search']",
    "implementation-planner": "['read', 'search']",
    "tdd-developer": "['read', 'search', 'edit', 'execute']",
    "debugger": "['read', 'search', 'edit', 'execute']",
    "test-specialist": "['read', 'search', 'edit', 'execute']",
    "accessibility-reviewer": "['read', 'search', 'execute']",
    "security-reviewer": "['read', 'search', 'execute']",
    "spec-reviewer": "['read', 'search', 'execute']",
    "code-reviewer": "['read', 'search', 'execute']",
    "operational-readiness-reviewer": "['read', 'search', 'execute']",
    "release-verifier": "['read', 'search', 'execute']",
    "knowledge-curator": "['read', 'search', 'edit', 'execute']",
}
PROMPT_AGENTS = {
    "00-intake": "orchestrator",
    "10-proposal": "product-manager",
    "15-discovery": "discovery-analyst",
    "20-design": "architect",
    "25-threat-model": "security-reviewer",
    "30-adr": "architect",
    "40-plan": "implementation-planner",
    "45-test-strategy": "test-specialist",
    "50-implement-tdd": "tdd-developer",
    "55-debug": "debugger",
    "60-delegate-subagents": "orchestrator",
    "70-spec-review": "spec-reviewer",
    "80-quality-security-review": "orchestrator",
    "82-security-review": "security-reviewer",
    "85-operational-readiness": "operational-readiness-reviewer",
    "90-verify-release": "release-verifier",
    "95-retrospective": "orchestrator",
    "97-knowledge-writeback": "knowledge-curator",
}
CANONICAL_LIFECYCLE = (
    "intake -> proposal -> discovery -> design/ADR -> plan/tasks -> "
    "TDD implementation -> spec review -> quality/security review -> "
    "verification -> release -> retrospective -> knowledge write-back"
)
INSTRUCTIONS = {
    "agents",
    "apps",
    "documentation",
    "packages",
    "prompts",
    "security-sensitive",
    "source",
    "tests",
    "wiki",
    "workflows",
}
FEATURE_PACKAGE_FILES = {
    "manifest.yaml",
    "feature.md",
    "use-cases.md",
    "discovery.md",
    "design.md",
    "plan.md",
    "tasks.md",
    "acceptance.md",
    "verification.md",
    "reviews.md",
    "retrospective.md",
    "delegations.yaml",
    "exceptions.json",
}
CANONICAL_ROLE_LABELS = (
    "Orchestrator",
    "Product manager",
    "Discovery analyst",
    "Architect",
    "Implementation planner",
    "TDD developer",
    "Debugger",
    "Test specialist",
    "Spec reviewer",
    "Code reviewer",
    "Security reviewer",
    "Accessibility reviewer",
    "Operational readiness reviewer",
    "Release verifier",
    "Knowledge curator",
)
MANIFEST_OWNER_FIELDS = (
    "orchestrator",
    "product_manager",
    "discovery_analyst",
    "architect",
    "implementation_planner",
    "implementer",
    "debugger",
    "test_specialist",
    "spec_reviewer",
    "quality_reviewer",
    "security_reviewer",
    "accessibility_reviewer",
    "operational_readiness_reviewer",
    "verifier",
    "knowledge_curator",
)
CONDITIONAL_GATES = ("accessibility_review", "operational_readiness_review")
REQUIRED_GATES = (
    "proposal",
    "discovery",
    "design",
    "plan",
    "tdd",
    "spec_review",
    "quality_review",
    "security_review",
    *CONDITIONAL_GATES,
    "verification",
    "release",
)
GATE_FIELDS = {
    "owner",
    "checked_inputs",
    "result",
    "evidence",
    "failure_reason",
    "exception_id",
    "next_transition",
}
POST_RELEASE_FIELDS = {
    "released_revision",
    "retrospective",
    "documentation_candidate_revision",
    "knowledge_writeback",
    "closure_evidence",
}
LIFECYCLE_STATES = {
    "INTAKE",
    "PROPOSAL",
    "DISCOVERY",
    "DESIGN",
    "PLANNED",
    "IMPLEMENTING",
    "SPEC_REVIEW",
    "QUALITY_SECURITY_REVIEW",
    "VERIFYING",
    "RELEASE_READY",
    "RELEASED",
    "CLOSED",
    "BLOCKED",
}
ARTIFACT_MAP = {
    "proposal": "feature.md",
    "use_cases": "use-cases.md",
    "discovery": "discovery.md",
    "design": "design.md",
    "plan": "plan.md",
    "tasks": "tasks.md",
    "acceptance": "acceptance.md",
    "verification": "verification.md",
    "reviews": "reviews.md",
    "retrospective": "retrospective.md",
    "delegations": "delegations.yaml",
    "exceptions": "exceptions.json",
}
EVIDENCE_MAP = {
    "tdd_cycles": "tasks.md#task-001-tdd-evidence",
    "full_suite": "verification.md",
    "verification": "verification.md",
}
GATE_FINAL_EVIDENCE = {
    "proposal": ("feature.md", "use-cases.md"),
    "discovery": ("discovery.md",),
    "design": ("design.md", "acceptance.md"),
    "plan": ("plan.md", "tasks.md"),
    "tdd": ("tasks.md#task-001-tdd-evidence",),
    "spec_review": ("reviews.md#spec-compliance-review",),
    "quality_review": ("reviews.md#quality-review",),
    "security_review": ("reviews.md#security-review",),
    "accessibility_review": ("reviews.md#accessibility-review",),
    "operational_readiness_review": ("reviews.md#operational-readiness-review",),
    "verification": ("verification.md",),
    "release": ("verification.md#release-decision",),
}
EXCEPTION_FIELDS = {
    "exception_id",
    "feature_id",
    "gate",
    "scope",
    "reason",
    "risk",
    "approved_by",
    "expires",
    "compensating_controls",
}
STATE_REQUIRED_GATES = {
    "DISCOVERY": ("proposal",),
    "DESIGN": ("proposal", "discovery"),
    "PLANNED": ("proposal", "discovery", "design"),
    "IMPLEMENTING": ("proposal", "discovery", "design", "plan"),
    "SPEC_REVIEW": ("proposal", "discovery", "design", "plan", "tdd"),
    "QUALITY_SECURITY_REVIEW": ("proposal", "discovery", "design", "plan", "tdd", "spec_review"),
    "VERIFYING": (
        "proposal", "discovery", "design", "plan", "tdd", "spec_review",
        "quality_review", "security_review", "accessibility_review",
        "operational_readiness_review",
    ),
    "RELEASE_READY": (
        "proposal", "discovery", "design", "plan", "tdd", "spec_review",
        "quality_review", "security_review", "accessibility_review",
        "operational_readiness_review", "verification",
    ),
    "RELEASED": REQUIRED_GATES,
    "CLOSED": REQUIRED_GATES,
}
STATE_ALLOWED_NONPENDING_GATES = {
    "INTAKE": (),
    "PROPOSAL": ("proposal",),
    "DISCOVERY": ("proposal", "discovery"),
    "DESIGN": ("proposal", "discovery", "design"),
    "PLANNED": ("proposal", "discovery", "design", "plan"),
    "IMPLEMENTING": ("proposal", "discovery", "design", "plan", "tdd"),
    "SPEC_REVIEW": ("proposal", "discovery", "design", "plan", "tdd", "spec_review"),
    "QUALITY_SECURITY_REVIEW": (
        "proposal", "discovery", "design", "plan", "tdd", "spec_review",
        "quality_review", "security_review", "accessibility_review", "operational_readiness_review",
    ),
    "VERIFYING": REQUIRED_GATES[:-2],
    "RELEASE_READY": REQUIRED_GATES[:-1],
    "RELEASED": REQUIRED_GATES,
    "CLOSED": REQUIRED_GATES,
}
TASK_EVIDENCE_FIELDS = (
    "Exact files",
    "Exact command",
    "Expected RED failure",
    "Actual RED result / exit status",
    "GREEN result / exit status",
    "Full-suite evidence",
    "Environment",
    "Artifact/link",
    "Recorded by",
    "Timestamp",
    "Commit/revision",
    "Dependencies",
    "Risks",
    "Commit boundary",
)
MANIFEST_FIELDS = {
    "schema_version",
    "feature_id",
    "title",
    "lifecycle_state",
    "status",
    "version",
    "artifacts",
    "adr_assessment",
    "owners",
    "evidence",
    "gates",
    "post_release",
    "blocker",
    "exceptions_file",
}
GATE_NEXT_TRANSITIONS = {
    "proposal": "DISCOVERY",
    "discovery": "DESIGN",
    "design": "PLANNED",
    "plan": "IMPLEMENTING",
    "tdd": "SPEC_REVIEW",
    "spec_review": "QUALITY_SECURITY_REVIEW",
    "quality_review": "QUALITY_SECURITY_REVIEW",
    "security_review": "VERIFYING",
    "accessibility_review": "VERIFYING",
    "operational_readiness_review": "VERIFYING",
    "verification": "RELEASE_READY",
    "release": "RELEASED",
}
GATE_FAILURE_TRANSITIONS = {
    "proposal": "PROPOSAL",
    "discovery": "DISCOVERY",
    "design": "DESIGN",
    "plan": "PLANNED",
    "tdd": "IMPLEMENTING",
    "spec_review": "IMPLEMENTING",
    "quality_review": "IMPLEMENTING",
    "security_review": "IMPLEMENTING",
    "accessibility_review": "IMPLEMENTING",
    "operational_readiness_review": "IMPLEMENTING",
    "verification": "IMPLEMENTING",
    "release": "RELEASE_READY",
}
BLOCKER_FIELDS = {"reason", "resolver", "resume_state", "evidence"}
GATE_OWNER_FIELDS = {
    "proposal": "product_manager",
    "discovery": "discovery_analyst",
    "design": "architect",
    "plan": "implementation_planner",
    "tdd": "implementer",
    "spec_review": "spec_reviewer",
    "quality_review": "quality_reviewer",
    "security_review": "security_reviewer",
    "accessibility_review": "accessibility_reviewer",
    "operational_readiness_review": "operational_readiness_reviewer",
    "verification": "verifier",
    "release": "product_manager",
}
WORKFLOW_HEADINGS = ("## Entry criteria", "## Activities", "## Required artifacts", "## Exit evidence", "## Failure and revision")

LEGACY_ROOT_PATHS = (
    "01-product",
    "02-knowledge-base",
    "03-architecture-decisions",
    "04-delivery",
    "raw",
    "docs",
    "governance",
    "SCHEMA.md",
    "index.md",
    "log.md",
)

FORBIDDEN = {
    "private key": re.compile(r"BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY"),
    "GitHub token": re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "generic API secret": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "personal home path": re.compile(r"/(?:home|Users)/[A-Za-z0-9._-]+/"),
    "private IPv4 address": re.compile(
        r"(?<![0-9])(?:"
        r"10(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){3}|"
        r"192\.168(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){2}|"
        r"172\.(?:1[6-9]|2[0-9]|3[01])(?:\.(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])){2}"
        r")(?![0-9])"
    ),
    "private hostname": re.compile(r"\b[a-z0-9-]+\.(?:internal|local|corp)\b", re.IGNORECASE),
    "credential assignment": re.compile(
        r"\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*['\"]?"
        r"(?!\$\{|\{\{|<|\[)[A-Za-z0-9_./+=-]{16,}",
        re.IGNORECASE,
    ),
}

LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


def find_forbidden(text: str) -> list[str]:
    """Return safety-rule labels found in any text artifact."""
    return [label for label, pattern in FORBIDDEN.items() if pattern.search(text)]


def collect_text_files() -> list[tuple[Path, str]]:
    """Read repository text files while excluding generated and VCS state."""
    excluded = {".git", ".venv", ".pytest_cache", "__pycache__", "node_modules", "dist", "build", ".vite", ".terraform"}
    files: list[tuple[Path, str]] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or excluded.intersection(path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        files.append((path, text))
    return files


def validate_exception_records(
    records: object, today: str | None = None
) -> list[str]:
    """Validate machine-readable lifecycle exception records."""
    if not isinstance(records, list):
        return ["exceptions root must be a JSON list"]
    current = date.fromisoformat(today) if today else date.today()
    errors: list[str] = []
    seen_ids: set[str] = set()
    broad_scope = re.compile(
        r"\b(?:entire|whole|full|all|any|every|everything|global|repo|repository|repository-wide)\b",
        re.IGNORECASE,
    )
    for index, record in enumerate(records):
        label = f"exception[{index}]"
        if not isinstance(record, dict):
            errors.append(f"{label}: record must be an object")
            continue
        if set(record) != EXCEPTION_FIELDS:
            errors.append(f"{label}: fields must exactly match the exception schema")
        missing = sorted(
            key
            for key in EXCEPTION_FIELDS - {"compensating_controls"}
            if not isinstance(record.get(key), str) or not record[key].strip()
        )
        if missing:
            errors.append(f"{label}: missing required fields {', '.join(missing)}")
        exception_id = record.get("exception_id")
        if isinstance(exception_id, str):
            if exception_id in seen_ids:
                errors.append(f"{label}: exception_id must be unique")
            seen_ids.add(exception_id)
        approver = str(record.get("approved_by", ""))
        if not approver.startswith("human:") or not approver[len("human:"):].strip():
            errors.append(f"{label}: a named human approver is required")
        scope = str(record.get("scope", ""))
        if broad_scope.search(scope):
            errors.append(f"{label}: scope is too broad")
        controls = record.get("compensating_controls")
        if not isinstance(controls, list) or not controls or not all(
            isinstance(item, str) and item.strip() for item in controls
        ):
            errors.append(f"{label}: compensating controls are required")
        expiry = str(record.get("expires", ""))
        try:
            expiry_date = date.fromisoformat(expiry)
            if expiry_date < current:
                errors.append(f"{label}: exception is expired")
        except ValueError:
            errors.append(f"{label}: expires must be an ISO date")
        gate = str(record.get("gate", "")).lower()
        documentation_only = re.fullmatch(
            r"(?:one |single )?(?:documentation|docs)-only (?:file|change)(?: [a-z0-9._/-]+)?",
            scope.lower(),
        )
        if ("test" in gate or "tdd" in gate) and not documentation_only:
            errors.append(f"{label}: TDD cannot be waived for executable behavior")
    return errors


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("missing YAML frontmatter")
    try:
        _, raw, body = text.split("---", 2)
    except ValueError as exc:
        raise ValueError("unterminated YAML frontmatter") from exc
    metadata: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip().strip("'\"")
    return metadata, body


def validate_links(path: Path, text: str) -> list[str]:
    failures = []
    for target in LINK.findall(text):
        target = target.split("#", 1)[0].strip()
        if not target or target.startswith(("http://", "https://", "mailto:", "{{")):
            continue
        if not (path.parent / target).resolve().exists():
            failures.append(f"{path.relative_to(ROOT)}: broken link {target}")
    return failures


def _markdown_has_anchor(path: Path, anchor: str) -> bool:
    """Return whether a simple GitHub-style heading anchor exists."""
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("#"):
            continue
        heading = line.lstrip("#").strip().lower()
        slug = re.sub(r"[^a-z0-9 _-]", "", heading)
        slug = re.sub(r"[ _]+", "-", slug).strip("-")
        if slug == anchor.lower():
            return True
    return False


def _validate_reference(reference: object, package_dir: Path) -> str | None:
    if not isinstance(reference, str) or not reference:
        return "artifact reference must be a non-empty string"
    file_name, _, anchor = reference.partition("#")
    candidate = Path(file_name)
    if not file_name or candidate.is_absolute() or ".." in candidate.parts:
        return f"artifact reference must stay within the feature package: {reference}"
    try:
        package_root = package_dir.resolve(strict=True)
        target = (package_dir / candidate).resolve(strict=True)
    except (OSError, RuntimeError):
        return f"artifact reference does not exist: {reference}"
    if not target.is_relative_to(package_root) or not target.is_file():
        return f"artifact reference must resolve to a file within the feature package: {reference}"
    if anchor and not _markdown_has_anchor(target, anchor):
        return f"artifact anchor does not exist: {reference}"
    return None


def _validate_commit(revision: str, label: str) -> list[str]:
    check = subprocess.run(
        ["git", "cat-file", "-e", f"{revision}^{{commit}}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    return [] if not check.returncode else [f"post_release.{label} must identify an existing commit object"]


def _validate_revision_pair(released_revision: str, documentation_candidate_revision: str) -> list[str]:
    """Require real ordered commits and a wiki-only documentation candidate diff."""
    errors = _validate_commit(released_revision, "released_revision")
    errors.extend(_validate_commit(documentation_candidate_revision, "documentation_candidate_revision"))
    if errors:
        return errors
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", released_revision, documentation_candidate_revision],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if ancestor.returncode:
        errors.append("documentation candidate must descend from the released revision")
        return errors
    changed = subprocess.run(
        ["git", "diff", "--name-only", released_revision, documentation_candidate_revision],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
    if not changed:
        errors.append("documentation candidate must contain a non-empty wiki-only diff")
    invalid = [
        path
        for path in changed
        if not path.startswith("wiki/") or Path(path).suffix.lower() not in {".md", ".yaml", ".yml", ".json"}
    ]
    if invalid:
        errors.append(f"documentation candidate contains non-wiki or executable changes: {', '.join(invalid)}")
    return errors


def validate_manifest_data(
    data: object,
    exception_records: object,
    package_dir: Path | None = None,
) -> list[str]:
    """Validate lifecycle manifest semantics and cross-artifact references."""
    failures: list[str] = []
    if not isinstance(data, dict):
        return ["manifest must be a mapping"]

    if set(data) != MANIFEST_FIELDS:
        failures.append("manifest top-level fields must exactly match the governed schema")
    if data.get("schema_version") != 1:
        failures.append("schema_version must equal 1")
    for field in ("feature_id", "title", "status"):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            failures.append(f"manifest {field} must be a non-empty string")
    version = data.get("version")
    if not isinstance(version, int) or isinstance(version, bool) or version < 1:
        failures.append("manifest version must be a positive integer")
    if data.get("exceptions_file") != "exceptions.json":
        failures.append("exceptions_file must equal exceptions.json")
    adr_schema = data.get("adr_assessment")
    if (
        not isinstance(adr_schema, dict)
        or set(adr_schema) != {"required", "rationale"}
        or not isinstance(adr_schema.get("required"), bool)
    ):
        failures.append("adr_assessment must exactly contain boolean required and rationale")
    evidence_schema = data.get("evidence")
    if evidence_schema != EVIDENCE_MAP:
        failures.append("evidence must exactly map each governed evidence key to its canonical artifact")

    feature_id = data.get("feature_id")
    owners = data.get("owners")
    if not isinstance(owners, dict) or set(owners) != set(MANIFEST_OWNER_FIELDS):
        failures.append("owners must exactly match the governed role matrix")
        owners = owners if isinstance(owners, dict) else {}
    else:
        invalid_owners = [
            field
            for field, value in owners.items()
            if not isinstance(value, str) or not value.strip() or value != value.strip()
        ]
        if invalid_owners:
            failures.append(f"owner identities must be trimmed non-empty strings: {', '.join(sorted(invalid_owners))}")

    lifecycle_state = data.get("lifecycle_state")
    if lifecycle_state not in LIFECYCLE_STATES:
        failures.append(f"invalid lifecycle_state {lifecycle_state!r}")

    independent_fields = (
        "implementer",
        "spec_reviewer",
        "quality_reviewer",
        "security_reviewer",
        "accessibility_reviewer",
        "operational_readiness_reviewer",
        "verifier",
    )
    named_independent = [
        owners.get(field)
        for field in independent_fields
        if owners.get(field) not in {None, "", "unassigned"}
    ]
    if len(named_independent) != len(set(named_independent)):
        failures.append("implementer, independent reviewers, and verifier must use distinct identities")
    if lifecycle_state == "CLOSED":
        missing_owners = [field for field in MANIFEST_OWNER_FIELDS if owners.get(field) in {None, "", "unassigned"}]
        if missing_owners:
            failures.append(f"CLOSED manifest requires named owners: {', '.join(missing_owners)}")

    gates = data.get("gates")
    if not isinstance(gates, dict) or set(gates) != set(REQUIRED_GATES):
        failures.append("gates must exactly match the governed gate matrix")
        gates = gates if isinstance(gates, dict) else {}

    records = exception_records if isinstance(exception_records, list) else []
    records_by_id = {
        record.get("exception_id"): record
        for record in records
        if isinstance(record, dict) and isinstance(record.get("exception_id"), str)
    }
    for gate_name in REQUIRED_GATES:
        gate = gates.get(gate_name)
        if not isinstance(gate, dict):
            continue
        expected_fields = set(GATE_FIELDS)
        if gate_name in CONDITIONAL_GATES:
            expected_fields |= {"applicability", "not_applicable_rationale"}
        if set(gate) != expected_fields:
            failures.append(f"gate {gate_name} fields do not match its schema")
            continue

        result = gate.get("result")
        expected_transition = (
            GATE_FAILURE_TRANSITIONS[gate_name]
            if result == "FAIL"
            else GATE_NEXT_TRANSITIONS[gate_name]
        )
        if gate.get("next_transition") != expected_transition:
            failures.append(f"gate {gate_name} next_transition must equal {expected_transition} for result {result}")
        for field in ("checked_inputs", "evidence"):
            values = gate.get(field)
            if not isinstance(values, list) or any(not isinstance(value, str) or not value for value in values):
                failures.append(f"gate {gate_name}.{field} must be a list of non-empty references")
        failure_reason = gate.get("failure_reason")
        if failure_reason is not None and (not isinstance(failure_reason, str) or not failure_reason.strip()):
            failures.append(f"gate {gate_name} failure_reason must be null or a non-empty string")
        exception_id_value = gate.get("exception_id")
        if exception_id_value is not None and (not isinstance(exception_id_value, str) or not exception_id_value.strip()):
            failures.append(f"gate {gate_name} exception_id must be null or a non-empty string")
        allowed_results = {"PENDING", "PASS", "FAIL", "EXCEPTED"}
        if gate_name in CONDITIONAL_GATES:
            allowed_results.add("NOT_APPLICABLE")
        if result not in allowed_results:
            failures.append(f"gate {gate_name} has invalid result {result!r}")

        checked_inputs = gate.get("checked_inputs")
        evidence_items = gate.get("evidence")
        if result != "PENDING" and (not checked_inputs or not evidence_items):
            failures.append(f"gate {gate_name} final result requires checked inputs and evidence")
        if result != "PENDING" and isinstance(evidence_items, list):
            if result == "EXCEPTED":
                if "exceptions.json" not in evidence_items:
                    failures.append(f"gate {gate_name} EXCEPTED evidence must include exceptions.json")
            elif not set(GATE_FINAL_EVIDENCE[gate_name]).issubset(evidence_items):
                failures.append(f"gate {gate_name} final evidence must include its canonical gate artifacts")
        if result != "PENDING" and isinstance(checked_inputs, list):
            canonical_inputs = set(GATE_FINAL_EVIDENCE[gate_name])
            if result == "EXCEPTED":
                if not canonical_inputs.intersection(checked_inputs):
                    failures.append(f"gate {gate_name} EXCEPTED checked inputs must include a canonical gate artifact")
            elif not canonical_inputs.issubset(checked_inputs):
                failures.append(f"gate {gate_name} checked inputs must include its canonical gate artifacts")
        if result == "FAIL" and not gate.get("failure_reason"):
            failures.append(f"gate {gate_name} FAIL requires failure_reason")
        if result in {"PENDING", "PASS", "EXCEPTED", "NOT_APPLICABLE"} and gate.get("failure_reason") is not None:
            failures.append(f"gate {gate_name} non-failure result must clear failure_reason")

        owner = gate.get("owner")
        owner_field = GATE_OWNER_FIELDS[gate_name]
        if isinstance(owners, dict) and owner != owners.get(owner_field):
            failures.append(f"gate {gate_name} owner must match owners.{owner_field}")
        if result != "PENDING" and (not isinstance(owner, str) or owner in {"", "unassigned"}):
            failures.append(f"gate {gate_name} final result requires a named owner")

        if gate_name in CONDITIONAL_GATES:
            applicability = gate.get("applicability")
            if applicability not in {"UNASSESSED", "APPLICABLE", "NOT_APPLICABLE"}:
                failures.append(f"gate {gate_name} has invalid applicability")
            if applicability == "NOT_APPLICABLE":
                rationale = gate.get("not_applicable_rationale")
                if not isinstance(rationale, str) or not rationale.strip():
                    failures.append(f"gate {gate_name} N/A requires a non-empty rationale")
                if not isinstance(owner, str) or owner in {"", "unassigned"}:
                    failures.append(f"gate {gate_name} N/A requires a named independent reviewer")
                if isinstance(owners, dict):
                    reviewer_fields = {
                        "spec_reviewer",
                        "quality_reviewer",
                        "security_reviewer",
                        "accessibility_reviewer",
                        "operational_readiness_reviewer",
                    }
                    reviewer_fields.discard(owner_field)
                    conflicting = {owners.get("implementer")}
                    conflicting.update(owners.get(field) for field in reviewer_fields)
                    if owner in conflicting:
                        failures.append(f"gate {gate_name} N/A reviewer must be independent")
                if result not in {"PENDING", "NOT_APPLICABLE"}:
                    failures.append(f"gate {gate_name} N/A applicability conflicts with result")
            elif result == "NOT_APPLICABLE":
                failures.append(f"gate {gate_name} NOT_APPLICABLE requires matching applicability")
            if result in {"PASS", "FAIL", "EXCEPTED"} and applicability != "APPLICABLE":
                failures.append(f"gate {gate_name} final applicable result requires APPLICABLE")

        exception_id = gate.get("exception_id")
        if result == "EXCEPTED":
            record = records_by_id.get(exception_id)
            if not record:
                failures.append(f"gate {gate_name} EXCEPTED requires a valid exception_id")
            elif record.get("feature_id") != feature_id or record.get("gate") != gate_name:
                failures.append(f"gate {gate_name} exception does not match feature and gate")
        elif exception_id is not None:
            failures.append(f"gate {gate_name} exception_id is only valid for EXCEPTED")

    state_key = lifecycle_state if isinstance(lifecycle_state, str) else ""
    for gate_name in STATE_REQUIRED_GATES.get(state_key, ()):
        gate = gates.get(gate_name)
        result = gate.get("result") if isinstance(gate, dict) else None
        successful_results = {"PASS", "EXCEPTED"}
        if gate_name in CONDITIONAL_GATES:
            successful_results.add("NOT_APPLICABLE")
        if result not in successful_results:
            failures.append(f"lifecycle_state {lifecycle_state} requires successful gate {gate_name}")
    allowed_nonpending = set(STATE_ALLOWED_NONPENDING_GATES.get(state_key, REQUIRED_GATES))
    blocker = data.get("blocker")
    if not isinstance(blocker, dict) or set(blocker) != BLOCKER_FIELDS:
        failures.append("blocker must exactly match the governed blocker schema")
        blocker = blocker if isinstance(blocker, dict) else {}
    if state_key != "BLOCKED":
        if blocker != {"reason": None, "resolver": None, "resume_state": None, "evidence": []}:
            failures.append("non-BLOCKED lifecycle must clear blocker metadata")
        for gate_name in REQUIRED_GATES:
            gate = gates.get(gate_name)
            result = gate.get("result") if isinstance(gate, dict) else None
            if gate_name not in allowed_nonpending and result != "PENDING":
                failures.append(f"lifecycle_state {lifecycle_state} requires future gate {gate_name} to remain PENDING")
    else:
        failed_gates = [
            gate_name
            for gate_name in REQUIRED_GATES
            if isinstance(gates.get(gate_name), dict) and gates[gate_name].get("result") == "FAIL"
        ]
        if data.get("status") != "BLOCKED" or len(failed_gates) != 1:
            failures.append("BLOCKED lifecycle requires status BLOCKED and exactly one failed gate")
        else:
            failed_gate_name = failed_gates[0]
            failed_gate = gates[failed_gate_name]
            failure_index = REQUIRED_GATES.index(failed_gate_name)
            for prior_gate_name in REQUIRED_GATES[:failure_index]:
                prior_gate = gates.get(prior_gate_name)
                prior_result = prior_gate.get("result") if isinstance(prior_gate, dict) else None
                prior_success = {"PASS", "EXCEPTED"}
                if prior_gate_name in CONDITIONAL_GATES:
                    prior_success.add("NOT_APPLICABLE")
                if prior_result not in prior_success:
                    failures.append(f"BLOCKED lifecycle requires prior gate {prior_gate_name} to be successful")
            for future_gate_name in REQUIRED_GATES[failure_index + 1 :]:
                future_gate = gates.get(future_gate_name)
                if not isinstance(future_gate, dict) or future_gate.get("result") != "PENDING":
                    failures.append(f"BLOCKED lifecycle requires future gate {future_gate_name} to remain PENDING")
            resolver = blocker.get("resolver")
            if not isinstance(resolver, str) or not resolver.startswith("human:") or not resolver[len("human:"):].strip():
                failures.append("BLOCKED lifecycle requires a named human resolver")
            if blocker.get("reason") != failed_gate.get("failure_reason"):
                failures.append("BLOCKED reason must exactly match the failed gate failure_reason")
            if blocker.get("resume_state") != GATE_FAILURE_TRANSITIONS[failed_gate_name]:
                failures.append("BLOCKED resume_state must return to the failed gate artifact-owning phase")
            if blocker.get("evidence") != failed_gate.get("evidence"):
                failures.append("BLOCKED evidence must exactly match the failed gate evidence")

    post_release = data.get("post_release")
    if not isinstance(post_release, dict) or set(post_release) != POST_RELEASE_FIELDS:
        failures.append("post_release must contain the complete released-revision and closure schema")
    elif lifecycle_state in {"RELEASED", "CLOSED"}:
        if not post_release.get("released_revision"):
            failures.append("RELEASED and CLOSED manifests require released_revision")
        elif not re.fullmatch(r"[0-9a-f]{40}", str(post_release["released_revision"])):
            failures.append("released_revision must be a full 40-character lowercase commit SHA")
        elif lifecycle_state == "RELEASED":
            failures.extend(_validate_commit(str(post_release["released_revision"]), "released_revision"))
        if lifecycle_state == "CLOSED":
            for field in ("documentation_candidate_revision", "knowledge_writeback", "closure_evidence"):
                if not post_release.get(field):
                    failures.append(f"CLOSED manifest requires post_release.{field}")
            docs_revision = post_release.get("documentation_candidate_revision")
            if docs_revision and not re.fullmatch(r"[0-9a-f]{40}", str(docs_revision)):
                failures.append("documentation_candidate_revision must be a full 40-character lowercase commit SHA")
            if docs_revision == post_release.get("released_revision"):
                failures.append("documentation candidate must differ from the released revision")
            if post_release.get("retrospective") != "retrospective.md":
                failures.append("CLOSED manifest must reference retrospective.md")
            released_revision = post_release.get("released_revision")
            if (
                isinstance(released_revision, str)
                and isinstance(docs_revision, str)
                and re.fullmatch(r"[0-9a-f]{40}", released_revision)
                and re.fullmatch(r"[0-9a-f]{40}", docs_revision)
                and released_revision != docs_revision
            ):
                failures.extend(_validate_revision_pair(released_revision, docs_revision))

    adr = data.get("adr_assessment")
    if lifecycle_state in {"PLANNED", "IMPLEMENTING", "SPEC_REVIEW", "QUALITY_SECURITY_REVIEW", "VERIFYING", "RELEASE_READY", "RELEASED", "CLOSED"}:
        rationale = adr.get("rationale") if isinstance(adr, dict) else None
        if not isinstance(rationale, str) or not rationale.strip() or rationale.lstrip().upper().startswith("TBD"):
            failures.append("ADR assessment must be resolved before PLANNED")

    if package_dir:
        artifacts = data.get("artifacts")
        if not isinstance(artifacts, dict) or artifacts != ARTIFACT_MAP:
            failures.append("artifacts must exactly map each governed key to its canonical package file")
        else:
            for reference in artifacts.values():
                if error := _validate_reference(reference, package_dir):
                    failures.append(error)
        evidence = data.get("evidence")
        if not isinstance(evidence, dict):
            failures.append("evidence must be a mapping")
        else:
            for reference in evidence.values():
                if error := _validate_reference(reference, package_dir):
                    failures.append(error)
        if lifecycle_state == "BLOCKED" and isinstance(blocker, dict):
            blocker_evidence = blocker.get("evidence")
            if isinstance(blocker_evidence, list):
                for reference in blocker_evidence:
                    if error := _validate_reference(reference, package_dir):
                        failures.append(f"blocker.evidence: {error}")
        if lifecycle_state == "CLOSED" and isinstance(post_release, dict):
            for field in ("retrospective", "knowledge_writeback", "closure_evidence"):
                reference = post_release.get(field)
                if error := _validate_reference(reference, package_dir):
                    failures.append(f"post_release.{field}: {error}")
            released_revision = post_release.get("released_revision")
            docs_revision = post_release.get("documentation_candidate_revision")
            if isinstance(released_revision, str) and isinstance(docs_revision, str):
                for file_name in ("retrospective.md", "reviews.md", "verification.md"):
                    artifact_text = (package_dir / file_name).read_text(encoding="utf-8")
                    if re.search(r"\b(?:PENDING|TBD)\b", artifact_text, re.IGNORECASE):
                        failures.append(f"CLOSED manifest requires completed {file_name} without pending placeholders")
                    if released_revision not in artifact_text:
                        failures.append(f"CLOSED {file_name} must bind the released revision")
                knowledge_reference = post_release.get("knowledge_writeback")
                closure_reference = post_release.get("closure_evidence")
                if isinstance(knowledge_reference, str) and not _validate_reference(knowledge_reference, package_dir):
                    knowledge_text = (package_dir / knowledge_reference.partition("#")[0]).read_text(encoding="utf-8")
                    if docs_revision not in knowledge_text:
                        failures.append("knowledge writeback evidence must bind the documentation candidate revision")
                if isinstance(closure_reference, str) and not _validate_reference(closure_reference, package_dir):
                    closure_text = (package_dir / closure_reference.partition("#")[0]).read_text(encoding="utf-8")
                    if released_revision not in closure_text or docs_revision not in closure_text:
                        failures.append("closure evidence must bind released and documentation candidate revisions")
        for gate_name, gate in gates.items():
            if not isinstance(gate, dict):
                continue
            for field in ("checked_inputs", "evidence"):
                references = gate.get(field)
                if not isinstance(references, list):
                    failures.append(f"gate {gate_name}.{field} must be a list")
                    continue
                for reference in references:
                    if error := _validate_reference(reference, package_dir):
                        failures.append(f"gate {gate_name}.{field}: {error}")
        reviews_path = package_dir / "reviews.md"
        if reviews_path.is_file():
            reviews_text = reviews_path.read_text(encoding="utf-8")
            review_headings = {
                "accessibility_review": "Accessibility review",
                "operational_readiness_review": "Operational readiness review",
            }
            for gate_name, heading in review_headings.items():
                gate = gates.get(gate_name)
                if not isinstance(gate, dict):
                    continue
                section_match = re.search(
                    rf"^## {re.escape(heading)}\s*$\n(?P<body>.*?)(?=^## |\Z)",
                    reviews_text,
                    re.MULTILINE | re.DOTALL | re.IGNORECASE,
                )
                if not section_match:
                    failures.append(f"reviews.md missing {heading} section")
                    continue
                body = section_match.group("body")
                review_fields: dict[str, str] = {}
                for field in ("Applicability", "Verdict", "N/A rationale", "Independent reviewer"):
                    values = re.findall(rf"^- {re.escape(field)}:\s*(.+)$", body, re.MULTILINE)
                    if len(values) != 1 or not values[0].strip():
                        failures.append(f"reviews.md {heading} requires exactly one non-empty {field}")
                    else:
                        review_fields[field] = values[0].strip()
                applicability = review_fields.get("Applicability", "").split()[0]
                verdict = review_fields.get("Verdict", "").split()[0]
                reviewer = review_fields.get("Independent reviewer", "").strip("`")
                if applicability != gate.get("applicability"):
                    failures.append(f"reviews.md {heading} applicability must match manifest")
                if verdict != gate.get("result"):
                    failures.append(f"reviews.md {heading} verdict must match manifest")
                expected_reviewer = gate.get("owner")
                if expected_reviewer == "unassigned":
                    expected_reviewer = "PENDING"
                if reviewer != expected_reviewer:
                    failures.append(f"reviews.md {heading} reviewer must match manifest gate owner")
                if gate.get("applicability") == "NOT_APPLICABLE":
                    rationale = review_fields.get("N/A rationale", "")
                    if rationale.upper() in {"", "PENDING", "TBD", "N/A"}:
                        failures.append(f"reviews.md {heading} N/A requires concrete rationale")
                    manifest_rationale = gate.get("not_applicable_rationale")
                    if not isinstance(manifest_rationale, str) or rationale.strip() != manifest_rationale.strip():
                        failures.append(f"reviews.md {heading} N/A rationale must exactly match manifest")
        tasks = package_dir / "tasks.md"
        if tasks.is_file():
            task_text = tasks.read_text(encoding="utf-8")
            task_blocks = list(
                re.finditer(
                    r"^## (?P<id>TASK-[A-Z0-9-]+) TDD evidence\s*$\n(?P<body>.*?)(?=^## TASK-[A-Z0-9-]+ TDD evidence\s*$|\Z)",
                    task_text,
                    re.MULTILINE | re.DOTALL,
                )
            )
            all_evidence_headings = re.findall(r"^##\s+(.+?TDD evidence)\s*$", task_text, re.MULTILINE | re.IGNORECASE)
            canonical_headings = [f"{match.group('id')} TDD evidence" for match in task_blocks]
            task_like_headings = re.findall(r"^##\s+(TASK-[^\n]+)\s*$", task_text, re.MULTILINE | re.IGNORECASE)
            if all_evidence_headings != canonical_headings or task_like_headings != canonical_headings:
                failures.append("tasks.md every TDD evidence heading must use canonical uppercase TASK-* syntax")
            if not task_blocks:
                failures.append("tasks.md requires at least one structured TASK-* TDD evidence block")
            task_ids = [match.group("id") for match in task_blocks]
            if len(task_ids) != len(set(task_ids)):
                failures.append("tasks.md task identifiers must be unique")
            summary_ids = re.findall(r"^\|\s*(TASK-[A-Z0-9-]+)\s*\|", task_text, re.MULTILINE)
            if sorted(summary_ids) != sorted(task_ids) or len(summary_ids) != len(set(summary_ids)):
                failures.append("tasks.md summary rows must map one-to-one to unique task evidence blocks")
            is_template = package_dir == ROOT / "wiki/delivery/templates/feature"
            for match in task_blocks:
                task_id = match.group("id")
                body = match.group("body")
                fields: dict[str, str] = {}
                for field in TASK_EVIDENCE_FIELDS:
                    values = re.findall(rf"^- {re.escape(field)}:\s*(.+)$", body, re.MULTILINE)
                    if len(values) != 1 or not values[0].strip():
                        failures.append(f"tasks.md {task_id} requires exactly one non-empty {field} field")
                    else:
                        fields[field] = values[0].strip()
                if not is_template:
                    for field, value in fields.items():
                        if len(value) < 3 or not re.search(r"[A-Za-z0-9]", value):
                            failures.append(f"tasks.md {task_id} {field} must contain substantive evidence")
                for field in ("Exact files", "Expected RED failure", "Dependencies", "Risks", "Commit boundary"):
                    if fields.get(field, "").upper() in {"PENDING", "TBD", "N/A"}:
                        failures.append(f"tasks.md {task_id} {field} must be concrete")
                for field in ("Actual RED result / exit status", "GREEN result / exit status", "Full-suite evidence"):
                    if fields.get(field, "").upper() == "PENDING":
                        failures.append(f"tasks.md {task_id} {field} requires a rationale after PENDING")
                command = fields.get("Exact command", "")
                if not is_template and not re.fullmatch(r"`[^`]+\s+[^`]+`", command):
                    failures.append(f"tasks.md {task_id} Exact command must be a replayable backticked command with arguments")
                exact_files = fields.get("Exact files", "")
                if not is_template and "`" not in exact_files:
                    failures.append(f"tasks.md {task_id} Exact files must name concrete paths")
    return failures


def main() -> int:
    failures: list[str] = []
    for name in sorted(REQUIRED):
        if not (ROOT / name).is_file():
            failures.append(f"missing required file: {name}")

    for name in LEGACY_ROOT_PATHS:
        if (ROOT / name).exists():
            failures.append(f"legacy root path must not exist: {name}")

    text_files = collect_text_files()
    for path, text in text_files:
        rel = path.relative_to(ROOT)
        for label in find_forbidden(text):
            failures.append(f"{rel}: forbidden {label}")

    markdown = [(path, text) for path, text in text_files if path.suffix == ".md"]
    for path, text in markdown:
        rel = path.relative_to(ROOT)
        if not text.strip():
            failures.append(f"{rel}: empty Markdown file")
        failures.extend(validate_links(path, text))

    agents = sorted((ROOT / ".github/agents").glob("*.agent.md"))
    agent_names = {path.name.removesuffix(".agent.md") for path in agents}
    if agent_names != set(AGENT_TOOLS):
        failures.append("custom agent catalog must exactly match the governed role matrix")
    for path in agents:
        try:
            metadata, body = parse_frontmatter(path)
        except ValueError as exc:
            failures.append(f"{path.relative_to(ROOT)}: {exc}")
            continue
        if metadata.get("name") != path.name.removesuffix(".agent.md"):
            failures.append(f"{path.relative_to(ROOT)}: name must match filename")
        if not metadata.get("description"):
            failures.append(f"{path.relative_to(ROOT)}: description is required")
        expected_tools = AGENT_TOOLS.get(path.name.removesuffix(".agent.md"))
        if metadata.get("tools") != expected_tools:
            failures.append(f"{path.relative_to(ROOT)}: tools must match governed least-privilege matrix")
        if len(body.splitlines()) < 60:
            failures.append(f"{path.relative_to(ROOT)}: agent contract must be at least 60 lines")
        for heading in AGENT_HEADINGS:
            if heading not in body:
                failures.append(f"{path.relative_to(ROOT)}: missing {heading}")
    prompts = sorted((ROOT / ".github/prompts").glob("*.prompt.md"))
    prompt_names = {path.name.removesuffix(".prompt.md") for path in prompts}
    if prompt_names != set(PROMPT_AGENTS):
        failures.append("lifecycle prompt catalog must exactly match the governed prompt matrix")
    for path in prompts:
        try:
            metadata, body = parse_frontmatter(path)
        except ValueError as exc:
            failures.append(f"{path.relative_to(ROOT)}: {exc}")
            continue
        prompt_name = path.name.removesuffix(".prompt.md")
        if metadata.get("name") != prompt_name:
            failures.append(f"{path.relative_to(ROOT)}: name must match filename")
        for key in ("description", "argument-hint", "agent"):
            if not metadata.get(key):
                failures.append(f"{path.relative_to(ROOT)}: {key} is required")
        if metadata.get("agent") != PROMPT_AGENTS.get(prompt_name):
            failures.append(f"{path.relative_to(ROOT)}: agent must match governed prompt-role matrix")
        for heading in PROMPT_HEADINGS:
            if heading not in body:
                failures.append(f"{path.relative_to(ROOT)}: missing {heading}")
        if len(body.splitlines()) < 40:
            failures.append(f"{path.relative_to(ROOT)}: prompt contract must be at least 40 lines")

    instructions = sorted((ROOT / ".github/instructions").glob("*.instructions.md"))
    instruction_names = {path.name.removesuffix(".instructions.md") for path in instructions}
    if instruction_names != INSTRUCTIONS:
        failures.append("path-specific instruction catalog must exactly match the governed matrix")
    for path in instructions:
        try:
            metadata, _ = parse_frontmatter(path)
        except ValueError as exc:
            failures.append(f"{path.relative_to(ROOT)}: {exc}")
            continue
        if not metadata.get("applyTo"):
            failures.append(f"{path.relative_to(ROOT)}: applyTo is required")

    for path in sorted((ROOT / "workflows").glob("[0-9][0-9]-*.md")):
        body = path.read_text(encoding="utf-8")
        for heading in WORKFLOW_HEADINGS:
            if heading not in body:
                failures.append(f"{path.relative_to(ROOT)}: missing {heading}")

    features_root = ROOT / "wiki/delivery/features"
    for feature_dir in sorted(path for path in features_root.iterdir() if path.is_dir()):
        package_files = {path.name for path in feature_dir.iterdir() if path.is_file()}
        missing_package_files = sorted(FEATURE_PACKAGE_FILES - package_files)
        if missing_package_files:
            failures.append(
                f"{feature_dir.relative_to(ROOT)}: incomplete feature package; missing "
                + ", ".join(missing_package_files)
            )
        manifest = feature_dir / "manifest.yaml"
        exceptions = feature_dir / "exceptions.json"
        if not manifest.is_file():
            failures.append(f"{feature_dir.relative_to(ROOT)}: missing manifest.yaml")
        if not exceptions.is_file():
            failures.append(f"{feature_dir.relative_to(ROOT)}: missing exceptions.json")
            continue
        try:
            records = json.loads(exceptions.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            failures.append(f"{exceptions.relative_to(ROOT)}: invalid JSON: {exc.msg}")
            continue
        for error in validate_exception_records(records):
            failures.append(f"{exceptions.relative_to(ROOT)}: {error}")
        if manifest.is_file():
            try:
                manifest_data = yaml.safe_load(manifest.read_text(encoding="utf-8"))
            except yaml.YAMLError as exc:
                failures.append(f"{manifest.relative_to(ROOT)}: invalid YAML: {exc}")
            else:
                for error in validate_manifest_data(manifest_data, records, feature_dir):
                    failures.append(f"{manifest.relative_to(ROOT)}: {error}")

    example_package = ROOT / "examples/feature-package"
    example_files = {path.name for path in example_package.iterdir() if path.is_file()}
    if example_files != FEATURE_PACKAGE_FILES:
        failures.append("examples/feature-package: files must exactly match the feature package matrix")
    try:
        example_records = json.loads((example_package / "exceptions.json").read_text(encoding="utf-8"))
        example_manifest = yaml.safe_load((example_package / "manifest.yaml").read_text(encoding="utf-8"))
    except (json.JSONDecodeError, yaml.YAMLError, OSError) as exc:
        failures.append(f"examples/feature-package: invalid manifest or exceptions: {exc}")
    else:
        for error in validate_exception_records(example_records):
            failures.append(f"examples/feature-package/exceptions.json: {error}")
        for error in validate_manifest_data(example_manifest, example_records, example_package):
            failures.append(f"examples/feature-package/manifest.yaml: {error}")

    template_package = ROOT / "wiki/delivery/templates/feature"
    try:
        template_manifest = yaml.safe_load((template_package / "manifest.yaml").read_text(encoding="utf-8"))
    except (yaml.YAMLError, OSError) as exc:
        failures.append(f"wiki/delivery/templates/feature/manifest.yaml: invalid YAML: {exc}")
    else:
        for error in validate_manifest_data(template_manifest, [], template_package):
            failures.append(f"wiki/delivery/templates/feature/manifest.yaml: {error}")

    roles_contract = (ROOT / "wiki/guides/lifecycle/roles.md").read_text(encoding="utf-8")
    state_machine = (ROOT / "wiki/guides/lifecycle/state-machine.md").read_text(encoding="utf-8")
    for role in CANONICAL_ROLE_LABELS:
        if f"| {role} |" not in roles_contract:
            failures.append(f"wiki/guides/lifecycle/roles.md: missing canonical role {role}")
    if "| DISCOVERY | Discovery analyst / product manager |" not in state_machine:
        failures.append("wiki/guides/lifecycle/state-machine.md: discovery ownership is inconsistent")
    if "Knowledge curator persists" not in state_machine:
        failures.append("wiki/guides/lifecycle/state-machine.md: discovery persistence handoff is missing")

    review_paths = [
        ROOT / "wiki/delivery/templates/feature/reviews.md",
        ROOT / "examples/feature-package/reviews.md",
        *(path / "reviews.md" for path in features_root.iterdir() if path.is_dir()),
    ]

    for path in review_paths:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for heading in ("## Accessibility review", "## Operational readiness review"):
            if heading not in text:
                failures.append(f"{path.relative_to(ROOT)}: missing {heading}")
        if "PASS, FAIL, or NOT_APPLICABLE" not in text:
            failures.append(f"{path.relative_to(ROOT)}: conditional verdict contract is missing")

    contract = (ROOT / "AGENTS.md").read_text(encoding="utf-8") if (ROOT / "AGENTS.md").exists() else ""
    copilot_contract = (ROOT / ".github/copilot-instructions.md").read_text(encoding="utf-8") if (ROOT / ".github/copilot-instructions.md").exists() else ""
    instruction_catalog = (ROOT / ".github/instructions/README.md").read_text(encoding="utf-8") if (ROOT / ".github/instructions/README.md").exists() else ""
    if CANONICAL_LIFECYCLE not in contract or CANONICAL_LIFECYCLE not in copilot_contract:
        failures.append("AGENTS.md and Copilot instructions must share the canonical lifecycle string")
    source_orders = {
        "AGENTS.md": (
            contract,
            ("Human instruction", "Approved feature package", "Accepted ADRs", "This root `AGENTS.md`", "Executable tests", "Reusable templates"),
        ),
        ".github/copilot-instructions.md": (
            copilot_contract,
            ("current human request", "Approved feature package", "Accepted ADRs", "Root `AGENTS.md`", "Existing executable tests", "Reusable templates"),
        ),
        ".github/instructions/README.md": (
            instruction_catalog,
            ("Current human instruction", "Approved feature package", "Accepted ADRs", "Root `AGENTS.md`", "Executable tests", "Reusable templates"),
        ),
    }
    for label, (text, markers) in source_orders.items():
        positions = [text.find(marker) for marker in markers]
        if -1 in positions or positions != sorted(positions):
            failures.append(f"{label}: source-of-truth order must match AGENTS.md")
    source_sections = {
        "AGENTS.md": (contract, "Source-of-truth order"),
        ".github/copilot-instructions.md": (copilot_contract, "Source-of-truth hierarchy"),
        ".github/instructions/README.md": (instruction_catalog, "Precedence"),
    }
    for label, (text, heading) in source_sections.items():
        match = re.search(
            rf"^## {re.escape(heading)}\s*$\n(?P<body>.*?)(?=^## |\Z)",
            text,
            re.MULTILINE | re.DOTALL,
        )
        numbers = re.findall(r"^(\d+)\.\s", match.group("body"), re.MULTILINE) if match else []
        if numbers != ["1", "2", "3", "4", "5", "6"]:
            failures.append(f"{label} source hierarchy must contain exactly the canonical six numbered layers")
    specificity_texts = [contract, copilot_contract, instruction_catalog]
    specificity_texts.extend(path.read_text(encoding="utf-8") for path in agents)
    if any("narrowest applicable" in text.lower() or "most specific" in text.lower() for text in specificity_texts):
        failures.append("instruction and agent contracts must stop on conflict instead of selecting by path specificity")
    for phrase in (
        "RED evidence",
        "Spec-compliance reviewer",
        "dispatch packet",
        "Human authority",
        "different assignments",
        "named human approver",
    ):
        if phrase.lower() not in contract.lower():
            failures.append(f"AGENTS.md: missing contract phrase {phrase!r}")

    retrospective_prompt = (ROOT / ".github/prompts/95-retrospective.prompt.md").read_text(encoding="utf-8")
    retrospective_workflow = (ROOT / "workflows/90-retrospective.md").read_text(encoding="utf-8")
    knowledge_prompt = (ROOT / ".github/prompts/97-knowledge-writeback.prompt.md").read_text(encoding="utf-8")
    if "Knowledge-writeback handoff packet" not in retrospective_prompt or "do not update canonical knowledge" not in retrospective_prompt:
        failures.append("95-retrospective: must finish with a handoff packet without canonical writeback")
    if "Write durable learning through the knowledge curator" in retrospective_prompt or "Knowledge-writeback references" in retrospective_prompt:
        failures.append("95-retrospective: must not perform knowledge writeback before completion")
    if "Do not mutate canonical knowledge" not in retrospective_workflow or "next required step is `97-knowledge-writeback`" not in retrospective_workflow:
        failures.append("workflows/90-retrospective.md: must hand off to 97 without closing")
    if "Next permitted state: `CLOSED`" in retrospective_workflow:
        failures.append("workflows/90-retrospective.md: closure belongs after knowledge writeback")
    for phrase in ("completed retrospective", "documentation-only candidate", "released revision"):
        if phrase.lower() not in knowledge_prompt.lower():
            failures.append(f"97-knowledge-writeback: missing post-retrospective protection {phrase!r}")

    workflow_text = (ROOT / ".github/workflows/validate-scaffold.yml").read_text(encoding="utf-8")
    dependabot_text = (ROOT / ".github/dependabot.yml").read_text(encoding="utf-8")
    if "pip install" in workflow_text or "uv sync --frozen --extra test" not in workflow_text:
        failures.append("validation workflow must install only the frozen lockfile dependency set")
    if "uv run --frozen --extra test" not in workflow_text:
        failures.append("validation workflow commands must preserve the frozen lockfile")
    if dependabot_text.count("default-days: 7") != 2:
        failures.append("Dependabot ecosystems require a seven-day cooldown")

    if failures:
        print("VALIDATION FAIL")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(
        f"VALIDATION PASS: {len(markdown)} Markdown files and "
        f"{len(text_files)} text files checked"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
