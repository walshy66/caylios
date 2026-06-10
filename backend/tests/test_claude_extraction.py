"""COA-273: Claude extraction provider with explicit low-confidence/missing flagging."""

import json

import httpx
import pytest

from app.extraction import (
    ClaudeExtractionProvider,
    ExtractionRequest,
    build_extraction_tool_schema,
    flag_extracted_fields,
    get_extraction_provider,
)


def make_request(intent="invoice", content_type="application/pdf"):
    return ExtractionRequest(
        document_id="doc-1",
        filename="invoice.pdf",
        content_type=content_type,
        intent=intent,
        content=b"%PDF-1.4 fake",
    )


def claude_response(fields, classification="invoice"):
    return {
        "content": [
            {
                "type": "tool_use",
                "name": "submit_extracted_fields",
                "input": {"fields": fields, "suggested_classification": classification},
            }
        ]
    }


def mock_provider(response_payload, capture=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if capture is not None:
            capture.append(json.loads(request.content))
        return httpx.Response(200, json=response_payload)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    return ClaudeExtractionProvider(api_key="test-key", model="claude-sonnet-4-6", client=client)


def test_extracts_fields_and_flags_low_confidence_and_missing():
    provider = mock_provider(
        claude_response(
            {
                "invoice_number": {"value": "INV-001", "present": True, "confidence": "high"},
                "issuer": {"value": "Acme Pty Ltd", "present": True, "confidence": "high"},
                "issue_date": {"value": "2026-06-01", "present": True, "confidence": "low"},
                "due_date": {"value": None, "present": False, "confidence": "low"},
                "total_amount": {"value": None, "present": False, "confidence": "low"},
                "currency": {"value": "AUD", "present": True, "confidence": "medium"},
            }
        )
    )

    result = provider.extract(make_request())

    assert result.fields["invoice_number"] == "INV-001"
    assert result.fields["total_amount"] is None
    assert result.suggested_classification == "invoice"

    extraction = result.fields["_extraction"]
    assert set(extraction["flagged_fields"]) == {"issue_date", "due_date", "total_amount"}
    assert extraction["field_details"]["total_amount"]["flag_reason"] == "required value missing from document"
    assert extraction["field_details"]["issue_date"]["flag_reason"].startswith("low confidence")
    assert extraction["field_details"]["invoice_number"]["flagged"] is False


def test_request_carries_pdf_document_and_tool_schema():
    captured = []
    provider = mock_provider(
        claude_response(
            {
                "invoice_number": {"value": "INV-1", "present": True, "confidence": "high"},
                "issuer": {"value": "A", "present": True, "confidence": "high"},
                "issue_date": {"value": None, "present": False, "confidence": "low"},
                "due_date": {"value": None, "present": False, "confidence": "low"},
                "total_amount": {"value": 10, "present": True, "confidence": "high"},
                "currency": {"value": None, "present": False, "confidence": "low"},
            }
        ),
        capture=captured,
    )

    provider.extract(make_request())

    body = captured[0]
    assert body["model"] == "claude-sonnet-4-6"
    assert body["tool_choice"] == {"type": "tool", "name": "submit_extracted_fields"}
    document_block = body["messages"][1]["content"][0]
    assert document_block["type"] == "document"
    assert document_block["source"]["media_type"] == "application/pdf"
    schema = body["tools"][0]["input_schema"]
    assert "invoice_number" in schema["properties"]["fields"]["properties"]


def test_text_files_are_sent_as_text_blocks():
    captured = []
    provider = mock_provider(
        claude_response(
            {
                "document_title": {"value": "Notes", "present": True, "confidence": "high"},
                "issuer": {"value": None, "present": False, "confidence": "low"},
                "document_date": {"value": None, "present": False, "confidence": "low"},
                "summary": {"value": "A note", "present": True, "confidence": "high"},
            },
            classification="notes",
        ),
        capture=captured,
    )

    provider.extract(make_request(intent="unknown-intent", content_type="text/plain"))

    block = captured[0]["messages"][1]["content"][0]
    assert block["type"] == "text"


def test_missing_tool_output_raises_visible_error():
    provider = mock_provider({"content": [{"type": "text", "text": "I cannot extract this."}]})

    with pytest.raises(RuntimeError, match="no structured output"):
        provider.extract(make_request())


def test_api_error_is_not_swallowed():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "rate limited"}})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = ClaudeExtractionProvider(api_key="test-key", client=client)

    with pytest.raises(httpx.HTTPStatusError):
        provider.extract(make_request())


def test_provider_selection_via_env(monkeypatch):
    monkeypatch.setenv("STS_EXTRACTION_PROVIDER", "claude")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assert isinstance(get_extraction_provider(), ClaudeExtractionProvider)

    monkeypatch.delenv("ANTHROPIC_API_KEY")
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        get_extraction_provider()

    monkeypatch.setenv("STS_EXTRACTION_PROVIDER", "demo")
    assert not isinstance(get_extraction_provider(), ClaudeExtractionProvider)


def test_flagging_helper_handles_absent_model_fields():
    definitions = [{"name": "alpha", "type": "string", "required": True}]
    flagged = flag_extracted_fields(definitions, {})

    assert flagged["alpha"] is None
    assert flagged["_extraction"]["flagged_fields"] == ["alpha"]


def test_tool_schema_marks_all_fields_required():
    schema = build_extraction_tool_schema([
        {"name": "alpha", "type": "string"},
        {"name": "beta", "type": "number"},
    ])

    assert schema["properties"]["fields"]["required"] == ["alpha", "beta"]
