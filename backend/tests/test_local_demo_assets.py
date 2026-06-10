from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEMO_DOC = ROOT / "demo" / "synthetic-client-intake.txt"
DEMO_GUIDE = ROOT / "docs" / "local-demo.md"


def test_synthetic_demo_document_exists_without_real_client_pii():
    assert DEMO_DOC.exists(), "synthetic demo document must be checked in for local demos"
    content = DEMO_DOC.read_text(encoding="utf-8")

    assert "Synthetic Demo Document" in content
    assert "TODO:" in content or "Action:" in content
    assert "Example Client" in content
    assert "real client" not in content.lower()


def test_local_demo_guide_covers_end_to_end_flow_and_uses_synthetic_document():
    assert DEMO_GUIDE.exists(), "local demo instructions must be documented"
    content = DEMO_GUIDE.read_text(encoding="utf-8").lower()

    for step in [
        "upload",
        "intent",
        "extraction",
        "review",
        "edit",
        "approve",
        "export",
        "mock writeback",
        "audit summary",
    ]:
        assert step in content

    assert "synthetic-client-intake.txt" in content
    assert "no real client pii" in content
