"""Per-workspace connector OAuth token storage and lifecycle (COA-282).

Constitution VII: tokens are encrypted at rest, scoped to a workspace, never
exposed through the API or logs. Expired tokens refresh transparently; a failed
or revoked refresh flips the connection to a visible "disconnected" state that
downstream workflow execution must treat as a hard stop, never a silent skip.
"""

import os
import sqlite3
from datetime import UTC, datetime
from typing import Callable
from uuid import uuid4

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, status

from app import db
from app.auth import WorkspaceActor, require_admin, require_any_staff
from app.db import get_connection
from app.models import ConnectionStatus, ConnectorProvider
from app.schemas import ConnectorConnection, ConnectorConnectionUpsert

router = APIRouter(prefix="/connections", tags=["connections"])

PUBLIC_COLUMNS = (
    "id, workspace_id, provider, status, token_expires_at, scopes,"
    " external_account_label, disconnect_reason, created_at, updated_at"
)


class ConnectorDisconnected(Exception):
    """Raised when a workflow needs a connector that has no usable credentials."""

    def __init__(self, provider: str, reason: str):
        self.provider = provider
        self.reason = reason
        super().__init__(f"{provider}: {reason}")


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _dev_key_path() -> str:
    return str(db.DATA_DIR / "sts-encryption.key")


def encryption_key() -> bytes:
    """STS_ENCRYPTION_KEY in production; a generated, gitignored key file in dev."""
    env_key = os.environ.get("STS_ENCRYPTION_KEY", "").strip()
    if env_key:
        return env_key.encode()
    key_path = _dev_key_path()
    if os.path.exists(key_path):
        with open(key_path, "rb") as handle:
            return handle.read().strip()
    db.DATA_DIR.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    with open(key_path, "wb") as handle:
        handle.write(key)
    return key


def _cipher() -> Fernet:
    return Fernet(encryption_key())


def encrypt_token(token: str | None) -> str | None:
    if token is None or not token.strip():
        return None
    return _cipher().encrypt(token.encode()).decode()


def decrypt_token(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        return _cipher().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise ConnectorDisconnected("unknown", "stored credentials cannot be decrypted") from exc


def _public_row(conn: sqlite3.Connection, workspace_id: str, provider: str) -> sqlite3.Row | None:
    return conn.execute(
        f"SELECT {PUBLIC_COLUMNS} FROM connector_connections WHERE workspace_id = ? AND provider = ?",
        (workspace_id, provider),
    ).fetchone()


def upsert_connection(
    conn: sqlite3.Connection,
    workspace_id: str,
    provider: str,
    access_token: str,
    refresh_token: str | None = None,
    token_expires_at: str | None = None,
    scopes: str | None = None,
    external_account_label: str | None = None,
) -> None:
    timestamp = now_iso()
    conn.execute(
        """
        INSERT INTO connector_connections (
            id, workspace_id, provider, status, encrypted_access_token, encrypted_refresh_token,
            token_expires_at, scopes, external_account_label, disconnect_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT (workspace_id, provider) DO UPDATE SET
            status = excluded.status,
            encrypted_access_token = excluded.encrypted_access_token,
            encrypted_refresh_token = excluded.encrypted_refresh_token,
            token_expires_at = excluded.token_expires_at,
            scopes = excluded.scopes,
            external_account_label = excluded.external_account_label,
            disconnect_reason = NULL,
            updated_at = excluded.updated_at
        """,
        (
            str(uuid4()),
            workspace_id,
            provider,
            ConnectionStatus.CONNECTED.value,
            encrypt_token(access_token),
            encrypt_token(refresh_token),
            token_expires_at,
            scopes,
            external_account_label,
            timestamp,
            timestamp,
        ),
    )
    conn.commit()


def mark_disconnected(conn: sqlite3.Connection, workspace_id: str, provider: str, reason: str) -> None:
    conn.execute(
        """
        UPDATE connector_connections
        SET status = ?, encrypted_access_token = NULL, encrypted_refresh_token = NULL,
            disconnect_reason = ?, updated_at = ?
        WHERE workspace_id = ? AND provider = ?
        """,
        (ConnectionStatus.DISCONNECTED.value, reason, now_iso(), workspace_id, provider),
    )
    conn.commit()


def _is_expired(token_expires_at: str | None) -> bool:
    if not token_expires_at:
        return False
    return datetime.fromisoformat(token_expires_at) <= datetime.now(UTC)


TokenRefresher = Callable[[str], dict]
"""Given a refresh token, returns {"access_token", "refresh_token"?, "token_expires_at"?} or raises."""


def get_valid_access_token(
    conn: sqlite3.Connection,
    workspace_id: str,
    provider: str,
    refresher: TokenRefresher | None = None,
) -> str:
    """Return a usable access token, refreshing transparently when expired.

    Raises ConnectorDisconnected when the connection is missing, disconnected,
    or refresh fails — callers must surface this, never swallow it.
    """
    row = conn.execute(
        "SELECT * FROM connector_connections WHERE workspace_id = ? AND provider = ?",
        (workspace_id, provider),
    ).fetchone()
    if row is None:
        raise ConnectorDisconnected(provider, "no connection configured for this workspace")
    if row["status"] != ConnectionStatus.CONNECTED.value:
        raise ConnectorDisconnected(provider, row["disconnect_reason"] or "connection is disconnected")

    if not _is_expired(row["token_expires_at"]):
        token = decrypt_token(row["encrypted_access_token"])
        if token is None:
            raise ConnectorDisconnected(provider, "no access token stored")
        return token

    refresh_token = decrypt_token(row["encrypted_refresh_token"])
    if refresher is None or refresh_token is None:
        mark_disconnected(conn, workspace_id, provider, "access token expired and cannot be refreshed")
        raise ConnectorDisconnected(provider, "access token expired and cannot be refreshed")

    try:
        refreshed = refresher(refresh_token)
    except Exception:
        mark_disconnected(conn, workspace_id, provider, "token refresh was rejected by the provider")
        raise ConnectorDisconnected(provider, "token refresh was rejected by the provider") from None

    upsert_connection(
        conn,
        workspace_id,
        provider,
        access_token=refreshed["access_token"],
        refresh_token=refreshed.get("refresh_token", refresh_token),
        token_expires_at=refreshed.get("token_expires_at"),
        scopes=row["scopes"],
        external_account_label=row["external_account_label"],
    )
    return refreshed["access_token"]


def _validate_provider(provider: str) -> str:
    try:
        return ConnectorProvider(provider).value
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unknown connector provider")


@router.get("", response_model=list[ConnectorConnection])
def list_connections(
    actor: WorkspaceActor = Depends(require_any_staff),
    conn: sqlite3.Connection = Depends(get_connection),
) -> list[ConnectorConnection]:
    rows = conn.execute(
        f"SELECT {PUBLIC_COLUMNS} FROM connector_connections WHERE workspace_id = ? ORDER BY provider",
        (actor.workspace.id,),
    ).fetchall()
    return [ConnectorConnection(**dict(row)) for row in rows]


@router.put("/{provider}", response_model=ConnectorConnection)
def connect_provider(
    provider: str,
    payload: ConnectorConnectionUpsert,
    actor: WorkspaceActor = Depends(require_admin),
    conn: sqlite3.Connection = Depends(get_connection),
) -> ConnectorConnection:
    provider = _validate_provider(provider)
    upsert_connection(
        conn,
        actor.workspace.id,
        provider,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        token_expires_at=payload.token_expires_at,
        scopes=payload.scopes,
        external_account_label=payload.external_account_label,
    )
    return ConnectorConnection(**dict(_public_row(conn, actor.workspace.id, provider)))


@router.delete("/{provider}", response_model=ConnectorConnection)
def disconnect_provider(
    provider: str,
    actor: WorkspaceActor = Depends(require_admin),
    conn: sqlite3.Connection = Depends(get_connection),
) -> ConnectorConnection:
    provider = _validate_provider(provider)
    if _public_row(conn, actor.workspace.id, provider) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="connection not found")
    mark_disconnected(conn, actor.workspace.id, provider, "disconnected by workspace admin")
    return ConnectorConnection(**dict(_public_row(conn, actor.workspace.id, provider)))
