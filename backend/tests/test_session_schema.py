import sqlite3

import pytest

from app import db


def use_temp_db(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "simplets.sqlite3")


def test_sessions_table_defines_persistent_session_metadata_schema(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    db.init_db()

    conn = sqlite3.connect(db.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        columns = conn.execute("PRAGMA table_info(sessions)").fetchall()
        create_sql = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sessions'"
        ).fetchone()["sql"]
    finally:
        conn.close()

    assert [column["name"] for column in columns] == [
        "id",
        "title",
        "repo_path",
        "harness",
        "prompt",
        "model",
        "status",
        "branch_name",
        "log_path",
        "output_tail",
        "error_message",
        "created_at",
        "updated_at",
    ]
    required_columns = {"id", "title", "harness", "status", "created_at", "updated_at"}
    assert {column["name"] for column in columns if column["notnull"] or column["pk"]} == required_columns
    assert "CHECK (harness IN ('test', 'codex', 'pi'))" in create_sql
    assert "CHECK (status IN ('created', 'running', 'stopped', 'completed', 'errored'))" in create_sql


def test_session_schema_rejects_unknown_harness_and_status(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    db.init_db()

    conn = sqlite3.connect(db.DB_PATH)
    try:
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """
                INSERT INTO sessions (id, title, harness, status, created_at, updated_at)
                VALUES ('bad-harness', 'Bad harness', 'unknown', 'created', '2026-05-25T00:00:00Z', '2026-05-25T00:00:00Z')
                """
            )
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                """
                INSERT INTO sessions (id, title, harness, status, created_at, updated_at)
                VALUES ('bad-status', 'Bad status', 'test', 'unknown', '2026-05-25T00:00:00Z', '2026-05-25T00:00:00Z')
                """
            )
    finally:
        conn.close()
