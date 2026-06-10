"""Destination push framework (COA-276/278, adapters COA-277/279/281/285).

On approval STS pushes the reviewed fields to every connected destination in
the workspace. Push results are recorded per destination; data purge only
happens after every destination succeeded (constitution II + III). Failures are
visible, retryable, and never delete data.
"""

import json
import sqlite3
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import uuid4

import httpx

from app.connections import ConnectorDisconnected, get_valid_access_token
from app.models import ConnectionStatus

PUSH_PENDING = "pending"
PUSH_SUCCEEDED = "succeeded"
PUSH_FAILED = "failed"


class DestinationError(Exception):
    """A destination rejected the push. Message must be subscriber-readable."""


class DestinationAdapter(Protocol):
    provider: str

    def push(self, access_token: str, fields: dict[str, Any], context: dict[str, Any]) -> str:
        """Push reviewed fields to the destination. Returns the destination record id."""
        ...


class MockDestinationAdapter:
    """Demo destination: always succeeds without leaving STS."""

    provider = "mock"

    def push(self, access_token: str, fields: dict[str, Any], context: dict[str, Any]) -> str:
        return f"mock-destination-{context['workflow_run_id']}"


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


_ADAPTERS: dict[str, DestinationAdapter] = {}


def register_adapter(adapter: DestinationAdapter) -> None:
    _ADAPTERS[adapter.provider] = adapter


def get_adapter(provider: str) -> DestinationAdapter | None:
    return _ADAPTERS.get(provider)


def reset_adapters() -> None:
    """Restore the default adapter registry (used by tests)."""
    _ADAPTERS.clear()
    register_adapter(MockDestinationAdapter())
    try:
        from app.connectors import register_default_adapters

        register_default_adapters()
    except ImportError:
        pass


def connected_providers(conn: sqlite3.Connection, workspace_id: str) -> list[str]:
    rows = conn.execute(
        "SELECT provider FROM connector_connections WHERE workspace_id = ? AND status = ? ORDER BY provider",
        (workspace_id, ConnectionStatus.CONNECTED.value),
    ).fetchall()
    return [row["provider"] for row in rows]


def _record_push(
    conn: sqlite3.Connection,
    workflow_run_id: str,
    workspace_id: str,
    provider: str,
    status: str,
    destination_record_id: str | None,
    error_message: str | None,
) -> None:
    timestamp = now_iso()
    existing = conn.execute(
        "SELECT id FROM destination_pushes WHERE workflow_run_id = ? AND provider = ?",
        (workflow_run_id, provider),
    ).fetchone()
    if existing is None:
        conn.execute(
            """
            INSERT INTO destination_pushes (
                id, workflow_run_id, workspace_id, provider, status,
                destination_record_id, error_message, attempted_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                workflow_run_id,
                workspace_id,
                provider,
                status,
                destination_record_id,
                error_message,
                timestamp,
                timestamp,
                timestamp,
            ),
        )
    else:
        conn.execute(
            """
            UPDATE destination_pushes
            SET status = ?, destination_record_id = ?, error_message = ?, attempted_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, destination_record_id, error_message, timestamp, timestamp, existing["id"]),
        )
    conn.commit()


def list_pushes(conn: sqlite3.Connection, workflow_run_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM destination_pushes WHERE workflow_run_id = ? ORDER BY provider",
        (workflow_run_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def push_to_destinations(
    conn: sqlite3.Connection,
    workspace_id: str,
    workflow_run_id: str,
    fields: dict[str, Any],
) -> list[dict[str, Any]]:
    """Push reviewed fields to every connected destination.

    Idempotent on retry: providers whose push already succeeded are skipped so
    retries never create duplicate destination records.
    """
    providers = connected_providers(conn, workspace_id)
    if not providers:
        raise DestinationError("no connected destinations for this workspace")

    # Strip review metadata: destinations receive values only.
    clean_fields = {key: value for key, value in fields.items() if not key.startswith("_")}
    context = {"workflow_run_id": workflow_run_id, "workspace_id": workspace_id}

    already_succeeded = {
        push["provider"] for push in list_pushes(conn, workflow_run_id) if push["status"] == PUSH_SUCCEEDED
    }

    for provider in providers:
        if provider in already_succeeded:
            continue
        adapter = get_adapter(provider)
        if adapter is None:
            _record_push(conn, workflow_run_id, workspace_id, provider, PUSH_FAILED, None,
                         f"no adapter implemented for {provider}")
            continue
        try:
            if provider == "mock":
                access_token = ""
            else:
                access_token = get_valid_access_token(conn, workspace_id, provider)
            record_id = adapter.push(access_token, clean_fields, context)
        except ConnectorDisconnected as exc:
            _record_push(conn, workflow_run_id, workspace_id, provider, PUSH_FAILED, None,
                         f"connector disconnected: {exc.reason}")
        except (DestinationError, httpx.HTTPError) as exc:
            _record_push(conn, workflow_run_id, workspace_id, provider, PUSH_FAILED, None, str(exc))
        else:
            _record_push(conn, workflow_run_id, workspace_id, provider, PUSH_SUCCEEDED, record_id, None)

    return list_pushes(conn, workflow_run_id)


def audit_destinations(pushes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Audit-safe view of push results: providers, statuses, record ids — no field values."""
    return [
        {
            "provider": push["provider"],
            "status": push["status"],
            "destination_record_id": push["destination_record_id"],
            "error_message": push["error_message"],
            "attempted_at": push["attempted_at"],
        }
        for push in pushes
    ]


reset_adapters()
