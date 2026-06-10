import base64
import json
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import httpx

from app.models import WorkflowRunStatus


@dataclass(frozen=True)
class ExtractionRequest:
    document_id: str
    filename: str
    content_type: str | None
    intent: str
    content: bytes


@dataclass(frozen=True)
class ExtractionResult:
    fields: dict[str, Any]
    suggested_classification: str | None = None


class ExtractionProvider(Protocol):
    def extract(self, request: ExtractionRequest) -> ExtractionResult:
        ...


class DemoExtractionProvider:
    """Deterministic local provider for synthetic/demo document extraction."""

    def extract(self, request: ExtractionRequest) -> ExtractionResult:
        text = request.content.decode("utf-8", errors="replace").strip()
        preview = text[:500]
        fields: dict[str, Any] = {
            "intent": request.intent,
            "filename": request.filename,
            "summary": preview or "No readable text found.",
        }
        if request.intent == "extract_actions":
            fields["action_items"] = self._extract_action_items(text)
        elif request.intent == "review":
            fields["review_notes"] = ["Review extracted content before any approval or writeback."]

        return ExtractionResult(fields=fields, suggested_classification=self._classify(request.filename, text))

    def _extract_action_items(self, text: str) -> list[str]:
        action_items = [line.strip(" -\t") for line in text.splitlines() if line.strip().lower().startswith(("todo", "action", "follow up"))]
        return action_items or ["Review document and confirm next action."]

    def _classify(self, filename: str, text: str) -> str:
        lowered = f"{filename}\n{text}".lower()
        if "invoice" in lowered:
            return "invoice"
        if "contract" in lowered or "agreement" in lowered:
            return "agreement"
        if "note" in lowered or "meeting" in lowered:
            return "notes"
        return "demo_document"


FieldDefinition = dict[str, Any]

# Field definitions per document intent. The reviewer-facing flagging contract is
# identical to the STS Extract Activepieces piece: missing or low-confidence
# values are flagged explicitly, never silently passed through.
INTENT_FIELD_DEFINITIONS: dict[str, list[FieldDefinition]] = {
    "client_intake": [
        {"name": "full_name", "description": "Client full legal name", "type": "string", "required": True},
        {"name": "email", "description": "Client email address", "type": "string", "required": True},
        {"name": "phone", "description": "Client phone number", "type": "string", "required": False},
        {"name": "business_name", "description": "Business or trading name", "type": "string", "required": False},
        {"name": "abn", "description": "Australian Business Number", "type": "string", "required": False},
    ],
    "invoice": [
        {"name": "invoice_number", "description": "Invoice number or reference", "type": "string", "required": True},
        {"name": "issuer", "description": "Name of the issuing business", "type": "string", "required": True},
        {"name": "issue_date", "description": "Invoice issue date", "type": "string", "required": False},
        {"name": "due_date", "description": "Payment due date", "type": "string", "required": False},
        {"name": "total_amount", "description": "Total amount payable", "type": "number", "required": True},
        {"name": "currency", "description": "Currency code", "type": "string", "required": False},
    ],
}

DEFAULT_FIELD_DEFINITIONS: list[FieldDefinition] = [
    {"name": "document_title", "description": "Title or heading of the document", "type": "string", "required": False},
    {"name": "issuer", "description": "Who issued or wrote the document", "type": "string", "required": False},
    {"name": "document_date", "description": "Primary date on the document", "type": "string", "required": False},
    {"name": "summary", "description": "One-sentence summary of the document", "type": "string", "required": True},
]

EXTRACTION_TOOL_NAME = "submit_extracted_fields"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


def build_extraction_tool_schema(definitions: list[FieldDefinition]) -> dict[str, Any]:
    properties: dict[str, Any] = {}
    for definition in definitions:
        properties[definition["name"]] = {
            "type": "object",
            "description": definition.get("description", f"Extracted value for {definition['name']}"),
            "properties": {
                "value": {"type": [definition.get("type", "string"), "null"]},
                "present": {"type": "boolean"},
                "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            },
            "required": ["value", "present", "confidence"],
        }
    return {
        "type": "object",
        "properties": {
            "fields": {
                "type": "object",
                "properties": properties,
                "required": [definition["name"] for definition in definitions],
            },
            "suggested_classification": {"type": "string"},
        },
        "required": ["fields", "suggested_classification"],
    }


def flag_extracted_fields(
    definitions: list[FieldDefinition],
    raw_fields: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Build the extracted_fields payload with explicit review flags."""
    fields: dict[str, Any] = {}
    field_details: dict[str, Any] = {}
    flagged: list[str] = []

    for definition in definitions:
        name = definition["name"]
        raw = raw_fields.get(name) or {}
        present = bool(raw.get("present")) and raw.get("value") not in (None, "")
        confidence = raw.get("confidence", "low")

        flag_reason = None
        if not present:
            flag_reason = (
                "required value missing from document"
                if definition.get("required")
                else "value not found in document"
            )
        elif confidence == "low":
            flag_reason = "low confidence extraction — verify against source"

        fields[name] = raw.get("value") if present else None
        field_details[name] = {
            "present": present,
            "confidence": confidence,
            "flagged": flag_reason is not None,
            "flag_reason": flag_reason,
        }
        if flag_reason is not None:
            flagged.append(name)

    fields["_extraction"] = {"flagged_fields": flagged, "field_details": field_details}
    return fields


class ClaudeExtractionProvider:
    """Calls the Claude API for document extraction (COA-273).

    Synchronous by design: the end-user waits ~5-15s with a loading state, so no
    background queue is involved.
    """

    def __init__(self, api_key: str, model: str | None = None, client: httpx.Client | None = None):
        self.api_key = api_key
        self.model = model or os.environ.get("STS_EXTRACTION_MODEL", "claude-sonnet-4-6")
        self.client = client or httpx.Client(timeout=60.0)

    def _document_block(self, request: ExtractionRequest) -> dict[str, Any]:
        content_type = (request.content_type or "").lower()
        encoded = base64.b64encode(request.content).decode()
        if content_type == "application/pdf":
            return {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": encoded},
            }
        if content_type in {"image/jpeg", "image/png", "image/gif", "image/webp"}:
            return {
                "type": "image",
                "source": {"type": "base64", "media_type": content_type, "data": encoded},
            }
        return {"type": "text", "text": request.content.decode("utf-8", errors="replace")}

    def extract(self, request: ExtractionRequest) -> ExtractionResult:
        definitions = INTENT_FIELD_DEFINITIONS.get(request.intent, DEFAULT_FIELD_DEFINITIONS)
        response = self.client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": self.model,
                "max_tokens": 2000,
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Extract the defined fields from the attached document. "
                            f"The document is expected to be: {request.intent}. "
                            "For every field report whether it is present and your confidence. "
                            "Never guess values that are not in the document."
                        ),
                    },
                    {"role": "user", "content": [self._document_block(request)]},
                ],
                "tools": [
                    {
                        "name": EXTRACTION_TOOL_NAME,
                        "description": "Submit the extracted field values with presence and confidence.",
                        "input_schema": build_extraction_tool_schema(definitions),
                    }
                ],
                "tool_choice": {"type": "tool", "name": EXTRACTION_TOOL_NAME},
            },
        )
        response.raise_for_status()
        payload = response.json()

        tool_input = None
        for block in payload.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == EXTRACTION_TOOL_NAME:
                tool_input = block.get("input")
                break
        if not tool_input or "fields" not in tool_input:
            raise RuntimeError("extraction failed: the model returned no structured output")

        return ExtractionResult(
            fields=flag_extracted_fields(definitions, tool_input["fields"]),
            suggested_classification=tool_input.get("suggested_classification"),
        )


def get_extraction_provider() -> ExtractionProvider:
    provider = os.environ.get("STS_EXTRACTION_PROVIDER", "demo").lower()
    if provider == "claude":
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("STS_EXTRACTION_PROVIDER=claude requires ANTHROPIC_API_KEY")
        return ClaudeExtractionProvider(api_key=api_key)
    return DemoExtractionProvider()


class ExtractionService:
    def __init__(self, conn: sqlite3.Connection, provider: ExtractionProvider):
        self.conn = conn
        self.provider = provider

    def run(self, workflow_run_id: str, workspace_id: str | None = None) -> sqlite3.Row | None:
        if workspace_id is None:
            workflow_run = self.conn.execute("SELECT * FROM workflow_runs WHERE id = ?", (workflow_run_id,)).fetchone()
        else:
            workflow_run = self.conn.execute(
                "SELECT * FROM workflow_runs WHERE id = ? AND workspace_id = ?", (workflow_run_id, workspace_id)
            ).fetchone()
        if workflow_run is None:
            return None

        document = self.conn.execute("SELECT * FROM documents WHERE id = ?", (workflow_run["document_id"],)).fetchone()
        if document is None:
            self._mark_error(workflow_run_id, "document not found")
            return self.conn.execute("SELECT * FROM workflow_runs WHERE id = ?", (workflow_run_id,)).fetchone()

        path = Path(document["temporary_storage_path"])
        try:
            content = path.read_bytes()
            result = self.provider.extract(
                ExtractionRequest(
                    document_id=document["id"],
                    filename=document["filename"],
                    content_type=document["content_type"],
                    intent=workflow_run["intent"],
                    content=content,
                )
            )
        except Exception as exc:  # Provider and storage failures must be visible on the run.
            self._mark_error(workflow_run_id, str(exc))
        else:
            self.conn.execute(
                """
                UPDATE workflow_runs
                SET status = ?, extraction_status = ?, extraction_error = NULL,
                    suggested_classification = ?, extracted_fields = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (
                    WorkflowRunStatus.COMPLETED.value,
                    WorkflowRunStatus.COMPLETED.value,
                    result.suggested_classification,
                    json.dumps(result.fields),
                    workflow_run_id,
                ),
            )
            self.conn.commit()

        return self.conn.execute("SELECT * FROM workflow_runs WHERE id = ?", (workflow_run_id,)).fetchone()

    def _mark_error(self, workflow_run_id: str, error: str) -> None:
        self.conn.execute(
            """
            UPDATE workflow_runs
            SET status = ?, extraction_status = ?, extraction_error = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (WorkflowRunStatus.ERRORED.value, WorkflowRunStatus.ERRORED.value, error, workflow_run_id),
        )
        self.conn.commit()
