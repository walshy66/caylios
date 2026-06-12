"""COA-284: workspace-scoped workflow canvas embed URL."""

from fastapi.testclient import TestClient

from app import db
from app.main import app

HOST = {"host": "clienta.simplets.com.au"}


def use_temp_db(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path / "data")
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "data" / "simplets.sqlite3")


def seed(tmp_path):
    db.init_db()
    timestamp = "2026-01-01T00:00:00+00:00"
    with db.sqlite3.connect(db.DB_PATH) as conn:
        conn.execute(
            "INSERT INTO workspaces (id, name, subdomain, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            ("ws-a", "Client A", "clienta", timestamp, timestamp),
        )
        for index, (user_id, role) in enumerate([("alice-admin", "admin"), ("rita-reviewer", "reviewer")]):
            conn.execute(
                "INSERT INTO workspace_users (id, workspace_id, user_id, role, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (f"m-{index}", "ws-a", user_id, role, timestamp, timestamp),
            )
        conn.commit()


def test_canvas_url_scoped_to_workspace_project(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    monkeypatch.setenv("STS_ACTIVEPIECES_URL", "http://localhost:8080")
    seed(tmp_path)

    with TestClient(app) as client:
        assigned = client.patch(
            "/workspaces/current/canvas",
            json={"activepieces_project_id": "proj-123"},
            headers={"x-sts-user": "alice-admin", **HOST},
        )
        canvas = client.get("/workspaces/current/canvas", headers={"x-sts-user": "alice-admin", **HOST})

    assert assigned.status_code == 200
    assert assigned.json()["activepieces_project_id"] == "proj-123"
    assert canvas.status_code == 200
    assert canvas.json()["embed_url"] == "http://localhost:8080/projects/proj-123/flows"


def test_canvas_requires_admin_and_configuration(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    seed(tmp_path)

    with TestClient(app) as client:
        monkeypatch.delenv("STS_ACTIVEPIECES_URL", raising=False)
        unconfigured = client.get("/workspaces/current/canvas", headers={"x-sts-user": "alice-admin", **HOST})

        monkeypatch.setenv("STS_ACTIVEPIECES_URL", "http://localhost:8080")
        reviewer = client.get("/workspaces/current/canvas", headers={"x-sts-user": "rita-reviewer", **HOST})
        anonymous = client.get("/workspaces/current/canvas", headers=HOST)

    assert unconfigured.status_code == 409
    assert reviewer.status_code == 403
    assert anonymous.status_code == 401
