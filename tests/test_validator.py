import importlib.util
import copy
import re
import shutil
from pathlib import Path

import yaml

VALIDATOR_PATH = Path(__file__).resolve().parents[1] / "scripts" / "validate_scaffold.py"
SPEC = importlib.util.spec_from_file_location("validate_scaffold", VALIDATOR_PATH)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)
ROOT = VALIDATOR_PATH.parents[1]


def test_forbidden_scanner_covers_non_markdown_secret_shapes():
    samples = [
        "gh" + "p_" + "a" * 24,
        "AK" + "IA" + "A" * 16,
        "BEGIN " + "PRIVATE KEY",
        "/" + "home" + "/private-user/project/file",
    ]
    for sample in samples:
        assert VALIDATOR.find_forbidden(sample), sample


def test_forbidden_scanner_allows_placeholders():
    assert VALIDATOR.find_forbidden("API_KEY=${API_KEY}\nTOKEN={{TOKEN}}") == []


def test_private_ip_scanner_requires_a_complete_address():
    private_addresses = (
        ".".join(("10", "0", "0", "1")),
        ".".join(("172", "16", "0", "1")),
        ".".join(("192", "168", "1", "1")),
    )
    for address in private_addresses:
        assert "private IPv4 address" in VALIDATOR.find_forbidden(address)
    assert VALIDATOR.find_forbidden("10. Human approval remains mandatory.") == []


def test_exception_records_require_human_approval_expiry_and_controls():
    valid = {
        "exception_id": "EXC-001",
        "feature_id": "FTR-001",
        "gate": "documentation-validation",
        "scope": "one documentation-only file",
        "reason": "No executable behavior changes",
        "risk": "low",
        "approved_by": "human:repository-owner",
        "expires": "2099-12-31",
        "compensating_controls": ["structural validator"],
    }
    assert VALIDATOR.validate_exception_records([valid], today="2026-08-21") == []

    invented = dict(valid, invented_field="bypass")
    assert any("exactly match" in error for error in VALIDATOR.validate_exception_records([invented], today="2026-08-21"))

    blank_human = dict(valid, approved_by="human:   ")
    assert any("named human" in error for error in VALIDATOR.validate_exception_records([blank_human], today="2026-08-21"))

    assert any("exception_id must be unique" in error for error in VALIDATOR.validate_exception_records([valid, dict(valid)], today="2026-08-21"))

    invalid = dict(valid)
    invalid.update(
        approved_by="agent:orchestrator",
        expires="2020-01-01",
        scope="entire repository",
        compensating_controls=[],
    )
    errors = VALIDATOR.validate_exception_records([invalid], today="2026-08-21")
    assert any("human approver" in error for error in errors)
    assert any("expired" in error for error in errors)
    assert any("scope" in error for error in errors)
    assert any("compensating controls" in error for error in errors)


def test_exception_records_reject_test_gate_and_scope_bypasses():
    base = {
        "exception_id": "EXC-002",
        "feature_id": "FTR-001",
        "gate": "tests",
        "scope": "production code",
        "reason": "Temporary waiver",
        "risk": "high",
        "approved_by": "human:repository-owner",
        "expires": "2099-12-31",
        "compensating_controls": ["manual review"],
    }
    errors = VALIDATOR.validate_exception_records([base], today="2026-08-21")
    assert any("executable behavior" in error for error in errors)

    for gate_name in ("test_gate", "TDD_gate", "unit_test_exception"):
        disguised = dict(base, gate=gate_name)
        errors = VALIDATOR.validate_exception_records([disguised], today="2026-08-21")
        assert any("executable behavior" in error for error in errors), gate_name

    mixed = dict(base, gate="tdd", scope="documentation-only and production code")
    errors = VALIDATOR.validate_exception_records([mixed], today="2026-08-21")
    assert any("executable behavior" in error for error in errors)

    broad = dict(base, gate="documentation-validation", scope="full repo")
    errors = VALIDATOR.validate_exception_records([broad], today="2026-08-21")
    assert any("scope" in error for error in errors)

    across = dict(base, gate="documentation-validation", scope="across the repository")
    errors = VALIDATOR.validate_exception_records([across], today="2026-08-21")
    assert any("scope" in error for error in errors)


def test_manifest_rejects_na_for_mandatory_gate_and_incomplete_post_release():
    data = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    broken = copy.deepcopy(data)
    broken["gates"]["security_review"]["result"] = "NOT_APPLICABLE"
    errors = VALIDATOR.validate_manifest_data(broken, [])
    assert any("security_review has invalid result" in error for error in errors)

    broken = copy.deepcopy(data)
    del broken["post_release"]["closure_evidence"]
    errors = VALIDATOR.validate_manifest_data(broken, [])
    assert any("complete released-revision and closure schema" in error for error in errors)

    closed = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    closed["lifecycle_state"] = "CLOSED"
    closed_errors = VALIDATOR.validate_manifest_data(closed, [])
    assert "RELEASED and CLOSED manifests require released_revision" in closed_errors
    assert "CLOSED manifest requires post_release.closure_evidence" in closed_errors


def test_manifest_conditional_na_requires_named_reviewer_and_rationale():
    data = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    gate = data["gates"]["accessibility_review"]
    gate.update(
        applicability="NOT_APPLICABLE",
        result="NOT_APPLICABLE",
        owner="unassigned",
        not_applicable_rationale="",
    )
    errors = VALIDATOR.validate_manifest_data(data, [])
    assert any("non-empty rationale" in error for error in errors)
    assert any("named independent reviewer" in error for error in errors)

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["owners"]["accessibility_reviewer"] = data["owners"]["security_reviewer"]
    data["gates"]["accessibility_review"]["owner"] = data["owners"]["security_reviewer"]
    errors = VALIDATOR.validate_manifest_data(data, [])
    assert any("N/A reviewer must be independent" in error for error in errors)


def test_manifest_final_gate_results_require_evidence_and_consistent_applicability():
    data = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    data["owners"]["security_reviewer"] = "example:security-reviewer"
    data["gates"]["security_review"].update(owner="example:security-reviewer", result="PASS")
    errors = VALIDATOR.validate_manifest_data(data, [])
    assert any("final result requires checked inputs and evidence" in error for error in errors)

    data = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    data["owners"]["accessibility_reviewer"] = "example:accessibility-reviewer"
    data["gates"]["accessibility_review"].update(
        owner="example:accessibility-reviewer",
        result="FAIL",
        failure_reason="scope failed review",
    )
    errors = VALIDATOR.validate_manifest_data(data, [])
    assert any("final result requires checked inputs and evidence" in error for error in errors)
    assert any("final applicable result requires APPLICABLE" in error for error in errors)


def test_manifest_excepted_gate_requires_matching_exception_record():
    data = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    data["feature_id"] = "FTR-001"
    data["lifecycle_state"] = "DISCOVERY"
    data["owners"]["product_manager"] = "human:repository-owner"
    data["gates"]["release"]["owner"] = "human:repository-owner"
    gate = data["gates"]["proposal"]
    gate.update(
        result="EXCEPTED",
        owner="human:repository-owner",
        checked_inputs=["feature.md"],
        evidence=["exceptions.json"],
        exception_id="EXC-001",
    )
    assert any("valid exception_id" in error for error in VALIDATOR.validate_manifest_data(data, []))

    record = {
        "exception_id": "EXC-001",
        "feature_id": "FTR-001",
        "gate": "proposal",
        "scope": "one documentation-only proposal field",
        "reason": "Source unavailable until the next review date",
        "risk": "low",
        "approved_by": "human:repository-owner",
        "expires": "2099-12-31",
        "compensating_controls": ["independent documentation review"],
    }
    assert VALIDATOR.validate_exception_records([record], today="2026-08-21") == []
    assert VALIDATOR.validate_manifest_data(data, [record]) == []


def test_example_manifest_validates_artifact_and_tdd_anchor_references():
    package = ROOT / "examples/feature-package"
    data = yaml.safe_load((package / "manifest.yaml").read_text())
    assert VALIDATOR.validate_manifest_data(data, [], package) == []
    data["evidence"]["tdd_cycles"] = "tasks.md#missing-anchor"
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("artifact anchor does not exist" in error for error in errors)


def test_manifest_rejects_extra_owner_identity_collisions_and_unknown_state():
    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["invented_top_level"] = True
    assert any("top-level fields must exactly match" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["owners"]["invented_reviewer"] = "example:invented"
    assert any("exactly match" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    for field in (
        "implementer", "spec_reviewer", "quality_reviewer", "security_reviewer",
        "accessibility_reviewer", "operational_readiness_reviewer", "verifier",
    ):
        data["owners"][field] = "same-person"
    for gate_name, owner_field in VALIDATOR.GATE_OWNER_FIELDS.items():
        data["gates"][gate_name]["owner"] = data["owners"][owner_field]
    assert any("distinct identities" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["lifecycle_state"] = "BANANA"
    assert any("invalid lifecycle_state" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["gates"]["proposal"]["next_transition"] = "BANANA"
    assert any("next_transition must equal DISCOVERY" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["owners"]["spec_reviewer"] = "   "
    data["gates"]["spec_review"]["owner"] = "   "
    assert any("trimmed non-empty strings" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["gates"]["tdd"].update(
        checked_inputs=["tasks.md#task-001-tdd-evidence"],
        evidence=["tasks.md#task-001-tdd-evidence"],
        result="FAIL",
        failure_reason="   ",
    )
    assert any("failure_reason must be null or a non-empty string" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["gates"]["tdd"]["failure_reason"] = "stale failure"
    assert any("non-failure result must clear" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["gates"]["tdd"].update(
        checked_inputs=["tasks.md#task-001-tdd-evidence"],
        evidence=["tasks.md#task-001-tdd-evidence"],
        result="FAIL",
        failure_reason="RED/GREEN evidence is incomplete",
    )
    assert any("next_transition must equal IMPLEMENTING for result FAIL" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["lifecycle_state"] = "BLOCKED"
    data["status"] = "BLOCKED"
    assert any("exactly one failed gate" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data["gates"]["tdd"].update(
        checked_inputs=["tasks.md#task-001-tdd-evidence"],
        evidence=["tasks.md#task-001-tdd-evidence"],
        result="FAIL",
        failure_reason="RED/GREEN evidence is incomplete",
        next_transition="IMPLEMENTING",
    )
    data["blocker"] = {
        "reason": "RED/GREEN evidence is incomplete",
        "resolver": "human:repository-owner",
        "resume_state": "IMPLEMENTING",
        "evidence": ["tasks.md#task-001-tdd-evidence"],
    }
    assert VALIDATOR.validate_manifest_data(data, []) == []
    data["gates"]["plan"].update(result="PENDING", checked_inputs=[], evidence=[])
    assert any("prior gate plan to be successful" in error for error in VALIDATOR.validate_manifest_data(data, []))
    data["gates"]["plan"].update(
        result="PASS",
        checked_inputs=["plan.md", "tasks.md"],
        evidence=["plan.md", "tasks.md"],
    )
    data["gates"]["release"].update(
        checked_inputs=["verification.md#release-decision"],
        evidence=["verification.md#release-decision"],
        result="PASS",
    )
    assert any("future gate release to remain PENDING" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["gates"]["proposal"]["checked_inputs"] = ["retrospective.md"]
    assert any("checked inputs must include its canonical" in error for error in VALIDATOR.validate_manifest_data(data, []))

    data = yaml.safe_load((ROOT / "wiki/delivery/templates/feature/manifest.yaml").read_text())
    data["owners"]["security_reviewer"] = "example:security-reviewer"
    data["gates"]["security_review"].update(
        owner="example:security-reviewer",
        checked_inputs=["feature.md"],
        evidence=["reviews.md"],
        result="PASS",
    )
    assert any("future gate security_review to remain PENDING" in error for error in VALIDATOR.validate_manifest_data(data, []))


def test_closed_manifest_requires_terminal_gates_named_owners_and_real_revisions(tmp_path, monkeypatch):
    monkeypatch.setattr(
        VALIDATOR,
        "_validate_revision_pair",
        lambda released, candidate: ["post_release.released_revision must identify an existing commit object"]
        if released == "3" * 40
        else [],
    )
    data = yaml.safe_load((ROOT / "examples/feature-package/manifest.yaml").read_text())
    data["lifecycle_state"] = "CLOSED"
    for gate_name, gate in data["gates"].items():
        canonical_evidence = list(VALIDATOR.GATE_FINAL_EVIDENCE[gate_name])
        gate.update(
            checked_inputs=canonical_evidence,
            result="PASS",
            evidence=canonical_evidence,
            failure_reason=None,
            exception_id=None,
        )
        if gate_name in VALIDATOR.CONDITIONAL_GATES:
            gate.update(applicability="APPLICABLE", not_applicable_rationale=None)
    data["post_release"].update(
        released_revision="1" * 40,
        retrospective="retrospective.md",
        documentation_candidate_revision="2" * 40,
        knowledge_writeback="retrospective.md#knowledge-base-updates",
        closure_evidence="verification.md#release-decision",
    )
    package = tmp_path / "feature-package"
    shutil.copytree(ROOT / "examples/feature-package", package)
    (package / "retrospective.md").write_text(
        f"# Completed Retrospective\n\nReleased revision: {'1' * 40}\n\n"
        f"## Knowledge-base updates\n\nDocumentation candidate: {'2' * 40}\n"
    )
    (package / "reviews.md").write_text(
        f"# Completed Reviews\n\nReviewed revision: {'1' * 40}\n\n"
        "## Spec-compliance review\n\n- Verdict: PASS\n\n"
        "## Quality review\n\n- Verdict: PASS\n\n"
        "## Security review\n\n- Verdict: PASS\n\n"
        "## Accessibility review\n\n- Applicability: APPLICABLE\n- Verdict: PASS\n"
        "- N/A rationale: N/A — applicable gate\n- Independent reviewer: `example:accessibility-reviewer`\n\n"
        "## Operational readiness review\n\n- Applicability: APPLICABLE\n- Verdict: PASS\n"
        "- N/A rationale: N/A — applicable gate\n- Independent reviewer: `example:operational-readiness-reviewer`\n"
    )
    (package / "verification.md").write_text(
        f"# Completed Verification\n\nReleased revision: {'1' * 40}\n\n"
        f"Documentation candidate: {'2' * 40}\n\n## Release decision\n\nPASS\n"
    )
    assert VALIDATOR.validate_manifest_data(data, [], package) == []

    broken = copy.deepcopy(data)
    broken["gates"]["security_review"]["result"] = "PENDING"
    assert any("CLOSED requires successful gate security_review" in error for error in VALIDATOR.validate_manifest_data(broken, [], package))

    broken = copy.deepcopy(data)
    broken["owners"]["verifier"] = "unassigned"
    broken["gates"]["verification"]["owner"] = "unassigned"
    assert any("CLOSED manifest requires named owners" in error for error in VALIDATOR.validate_manifest_data(broken, [], package))

    broken = copy.deepcopy(data)
    broken["post_release"]["released_revision"] = "not-a-revision"
    assert any("full 40-character" in error for error in VALIDATOR.validate_manifest_data(broken, [], package))

    broken = copy.deepcopy(data)
    broken["post_release"]["released_revision"] = "3" * 40
    assert any("existing commit object" in error for error in VALIDATOR.validate_manifest_data(broken, [], package))

    broken = copy.deepcopy(data)
    broken["post_release"]["closure_evidence"] = "missing.md"
    assert any("post_release.closure_evidence" in error for error in VALIDATOR.validate_manifest_data(broken, [], package))

    (package / "retrospective.md").write_text("# Retrospective\n\nPENDING\n")
    assert any("completed retrospective.md" in error for error in VALIDATOR.validate_manifest_data(data, [], package))


def test_artifact_aliasing_and_hollow_task_evidence_fail_closed(tmp_path):
    source = ROOT / "examples/feature-package"
    package = tmp_path / "feature-package"
    shutil.copytree(source, package)
    data = yaml.safe_load((package / "manifest.yaml").read_text())
    data["artifacts"] = {key: "feature.md" for key in VALIDATOR.ARTIFACT_MAP}
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("exactly map each governed key" in error for error in errors)

    data = yaml.safe_load((source / "manifest.yaml").read_text())
    data["evidence"] = {key: "feature.md" for key in VALIDATOR.EVIDENCE_MAP}
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("canonical artifact" in error for error in errors)

    data = yaml.safe_load((source / "manifest.yaml").read_text())
    reviews = (package / "reviews.md").read_text().replace(
        "- Independent reviewer: `example:accessibility-reviewer`",
        "- Independent reviewer: PENDING",
    )
    (package / "reviews.md").write_text(reviews)
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("Accessibility review reviewer must match" in error for error in errors)

    reviews = (source / "reviews.md").read_text().replace(
        "No UI, semantic, keyboard, visual, assistive-technology, or content-presentation change",
        "Contradictory but non-empty rationale",
    )
    (package / "reviews.md").write_text(reviews)
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("rationale must exactly match" in error for error in errors)

    shutil.copy2(source / "reviews.md", package / "reviews.md")
    (package / "tasks.md").write_text(
        "# Tasks\n\n## TASK-001 TDD evidence\n\n"
        "Exact files Exact command Expected RED failure Actual RED result / exit status "
        "GREEN result / exit status Full-suite evidence Environment Artifact/link Recorded by "
        "Timestamp Commit/revision Dependencies Risks Commit boundary\n"
    )
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("requires exactly one non-empty Exact command" in error for error in errors)

    tasks = (source / "tasks.md").read_text() + "\n## task-003 TDD evidence\n\nEmpty.\n"
    (package / "tasks.md").write_text(tasks)
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("canonical uppercase" in error for error in errors)

    tasks = (source / "tasks.md").read_text() + "\n## TASK-BOGUS TDD evidenc\n\nEmpty.\n"
    (package / "tasks.md").write_text(tasks)
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("canonical uppercase" in error for error in errors)

    tasks = (source / "tasks.md").read_text().replace(
        "| TASK-001 |",
        "| TASK-001 |\n| TASK-001 | duplicate |",
        1,
    )
    (package / "tasks.md").write_text(tasks)
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("one-to-one" in error for error in errors)

    tasks = (source / "tasks.md").read_text()
    for field in VALIDATOR.TASK_EVIDENCE_FIELDS:
        tasks = re.sub(rf"^- {re.escape(field)}:.*$", f"- {field}: .", tasks, flags=re.MULTILINE)
    (package / "tasks.md").write_text(tasks)
    errors = VALIDATOR.validate_manifest_data(data, [], package)
    assert any("must contain substantive evidence" in error for error in errors)


def test_artifact_references_reject_absolute_traversal_and_symlink_escape(tmp_path):
    package = tmp_path / "package"
    package.mkdir()
    (package / "inside.md").write_text("# Inside\n")
    outside = tmp_path / "outside.md"
    outside.write_text("# Outside\n")
    (package / "escape.md").symlink_to(outside)

    assert VALIDATOR._validate_reference("inside.md#inside", package) is None
    assert "stay within" in VALIDATOR._validate_reference("../outside.md", package)
    assert "stay within" in VALIDATOR._validate_reference(str(outside), package)
    assert "within the feature package" in VALIDATOR._validate_reference("escape.md", package)
