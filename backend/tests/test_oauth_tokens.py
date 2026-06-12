"""COA-282: encrypted per-workspace OAuth token storage and lifecycle."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app import connections, db
from app.connections import ConnectorDisconnected, get_valid_access_token, upsert_connection
from app.main import app

HOST_A = {"host": "clienta.simplets.com.au"}


def use_temp_db(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path / "data")
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "data" / "simplets.sqlite3")


def seed_workspaces():
    db.init_db()
    timestamp = "2026-01-01T00:00:00+00:00"
    with db.sqlite3.connect(db.DB_PATH) as conn:
        for ws_id, subdomain in [("ws-a", "clienta"), ("ws-b", "clientb")]:
            conn.execute(
                "INSERT INTO workspaces (id, name, subdomain, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (ws_id, subdomain, subdomain, timestamp, timestamp),
            )
        for index, (ws_id, user_id, role) in enumerate(
            [("ws-a", "alice-admin", "admin"), ("ws-a", "rita-reviewer", "reviewer")]
        ):
            conn.execute(
                "INSERT INTO workspace_users (id, workspace_id, user_id, role, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (f"membership-{index}", ws_id, user_id, role, timestamp, timestamp),
            )
        conn.commit()


def open_conn():
    conn = db.sqlite3.connect(db.DB_PATH)
    conn.row_factory = db.sqlite3.Row
    return conn


def test_tokens_are_encrypted_at_rest(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()

    with open_conn() as conn:
        upsert_connection(conn, "ws-a", "hubspot", access_token="secret-access-token", refresh_token="secret-refresh")
        row = conn.execute("SELECT * FROM connector_connections WHERE workspace_id = 'ws-a'").fetchone()

    assert row["encrypted_access_token"] != "secret-access-token"
    assert "secret-access-token" not in (row["encrypted_access_token"] or "")
    raw_db_bytes = (tmp_path / "data" / "simplets.sqlite3").read_bytes()
    assert b"secret-access-token" not in raw_db_bytes
    assert b"secret-refresh" not in raw_db_bytes

    with open_conn() as conn:
        assert get_valid_access_token(conn, "ws-a", "hubspot") == "secret-access-token"


def test_api_never_exposes_token_material(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()

    with TestClient(app) as client:
        put = client.put(
            "/connections/hubspot",
            json={"access_token": "secret-access-token", "refresh_token": "secret-refresh"},
            headers={"x-sts-user": "alice-admin", **HOST_A},
        )
        listed = client.get("/connections", headers={"x-sts-user": "alice-admin", **HOST_A})

    assert put.status_code == 200
    assert listed.status_code == 200
    for body in [put.text, listed.text]:
        assert "secret-access-token" not in body
        assert "secret-refresh" not in body
        assert "encrypted" not in body
    assert listed.json()[0]["status"] == "connected"


def test_expired_token_refreshes_transparently(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()
    expired_at = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()

    with open_conn() as conn:
        upsert_connection(
            conn, "ws-a", "xero",
            access_token="stale-token", refresh_token="refresh-1", token_expires_at=expired_at,
        )
        refreshed = get_valid_access_token(
            conn, "ws-a", "xero",
            refresher=lambda refresh_token: {
                "access_token": f"fresh-for-{refresh_token}",
                "refresh_token": "refresh-2",
                "token_expires_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
            },
        )
        row = conn.execute("SELECT * FROM connector_connections WHERE provider = 'xero'").fetchone()

    assert refreshed == "fresh-for-refresh-1"
    assert row["status"] == "connected"
    # The rotated refresh token is stored for next time.
    with open_conn() as conn:
        assert get_valid_access_token(conn, "ws-a", "xero") == "fresh-for-refresh-1"


def test_failed_refresh_marks_connection_disconnected(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()
    expired_at = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()

    def rejecting_refresher(refresh_token: str) -> dict:
        raise RuntimeError("revoked by provider")

    with open_conn() as conn:
        upsert_connection(
            conn, "ws-a", "hubspot",
            access_token="stale", refresh_token="revoked-refresh", token_expires_at=expired_at,
        )
        with pytest.raises(ConnectorDisconnected):
            get_valid_access_token(conn, "ws-a", "hubspot", refresher=rejecting_refresher)
        row = conn.execute("SELECT * FROM connector_connections WHERE provider = 'hubspot'").fetchone()

    assert row["status"] == "disconnected"
    assert row["encrypted_access_token"] is None
    assert row["encrypted_refresh_token"] is None
    assert "rejected" in row["disconnect_reason"]


def test_disconnected_connector_raises_until_reconnected(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()

    with TestClient(app) as client:
        client.put(
            "/connections/pandadoc",
            json={"access_token": "token-1"},
            headers={"x-sts-user": "alice-admin", **HOST_A},
        )
        disconnected = client.delete("/connections/pandadoc", headers={"x-sts-user": "alice-admin", **HOST_A})

    assert disconnected.status_code == 200
    assert disconnected.json()["status"] == "disconnected"

    with open_conn() as conn:
        with pytest.raises(ConnectorDisconnected):
            get_valid_access_token(conn, "ws-a", "pandadoc")


def test_connections_are_workspace_scoped(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()

    with open_conn() as conn:
        upsert_connection(conn, "ws-a", "hubspot", access_token="ws-a-token")

    with TestClient(app) as client:
        ws_b = client.get("/connections", headers={"x-sts-user": "platform-admin", "host": "clientb.simplets.com.au"})

    assert ws_b.json() == []

    with open_conn() as conn:
        with pytest.raises(ConnectorDisconnected):
            get_valid_access_token(conn, "ws-b", "hubspot")


def test_reviewer_cannot_manage_connectors(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()

    with TestClient(app) as client:
        viewed = client.get("/connections", headers={"x-sts-user": "rita-reviewer", **HOST_A})
        managed = client.put(
            "/connections/hubspot",
            json={"access_token": "nope"},
            headers={"x-sts-user": "rita-reviewer", **HOST_A},
        )
        removed = client.delete("/connections/hubspot", headers={"x-sts-user": "rita-reviewer", **HOST_A})

    assert viewed.status_code == 200
    assert managed.status_code == 403
    assert removed.status_code == 403


def test_unknown_provider_rejected(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed_workspaces()

    with TestClient(app) as client:
        response = client.put(
            "/connections/sharepoint",
            json={"access_token": "irrelevant"},
            headers={"x-sts-user": "alice-admin", **HOST_A},
        )

    assert response.status_code == 422
