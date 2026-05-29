import sqlite3

import pytest
from pydantic import ValidationError

from app import db
from app.models import ActivityTag
from app.schemas import ActivityItem


def use_temp_db(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "simplets.sqlite3")


def test_activity_events_table_defines_tagged_activity_schema(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    db.init_db()

    conn = sqlite3.connect(db.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        columns = conn.execute("PRAGMA table_info(activity_events)").fetchall()
        create_sql = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'activity_events'"
        ).fetchone()["sql"]
    finally:
        conn.close()

    assert [column["name"] for column in columns] == [
        "id",
        "session_id",
        "tag",
        "body",
        "created_at",
    ]
    required_columns = {"id", "session_id", "tag", "body", "created_at"}
    assert {column["name"] for column in columns if column["notnull"] or column["pk"]} == required_columns
    assert "CHECK (tag IN ('comment', 'note', 'attachment', 'handoff', 'status', 'prompt', 'branch'))" in create_sql
    assert "FOREIGN KEY (session_id) REFERENCES sessions(id)" in create_sql


@pytest.mark.parametrize("tag", list(ActivityTag))
def test_activity_item_accepts_defined_tags(tag):
    item = ActivityItem(
        id="event-1",
        session_id="session-1",
        tag=tag,
        body="Activity detail",
        created_at="2026-05-25T00:00:00+00:00",
    )

    assert item.tag == tag


def test_activity_item_rejects_unknown_tag():
    with pytest.raises(ValidationError):
        ActivityItem(
            id="event-1",
            session_id="session-1",
            tag="unknown",
            body="Activity detail",
            created_at="2026-05-25T00:00:00+00:00",
        )
