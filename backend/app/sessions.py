import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.db import get_connection
from app.models import SessionStatus
from app.runner import start_test_session, stop_session
from app.schemas import Session, SessionCreate, SessionLogs

router = APIRouter(prefix="/sessions", tags=["sessions"])


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def row_to_session(row: sqlite3.Row) -> Session:
    return Session(**dict(row))


def update_status(session_id: str, status: SessionStatus) -> None:
    with next(get_connection()) as conn:
        conn.execute(
            "UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?",
            (status.value, now_iso(), session_id),
        )
        conn.commit()


@router.get("", response_model=list[Session])
def list_sessions(conn: sqlite3.Connection = Depends(get_connection)) -> list[Session]:
    rows = conn.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
    return [row_to_session(row) for row in rows]


@router.post("", response_model=Session)
def create_session(payload: SessionCreate, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    session_id = str(uuid4())
    timestamp = now_iso()
    conn.execute(
        """
        INSERT INTO sessions (
            id, title, repo_path, harness, prompt, status, branch_name, log_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session_id,
            payload.title,
            payload.repo_path,
            payload.harness.value,
            payload.prompt,
            SessionStatus.CREATED.value,
            None,
            None,
            timestamp,
            timestamp,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return row_to_session(row)


@router.get("/{session_id}", response_model=Session)
def get_session(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return row_to_session(row)


@router.post("/{session_id}/start", response_model=Session)
def start_session(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row["status"] == SessionStatus.RUNNING.value:
        raise HTTPException(status_code=409, detail="Session already running")

    log_path = start_test_session(session_id, update_status)
    conn.execute(
        "UPDATE sessions SET status = ?, log_path = ?, updated_at = ? WHERE id = ?",
        (SessionStatus.RUNNING.value, str(log_path), now_iso(), session_id),
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return row_to_session(updated)


@router.post("/{session_id}/stop", response_model=Session)
def stop_session_endpoint(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    stop_session(session_id)
    conn.execute(
        "UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?",
        (SessionStatus.STOPPED.value, now_iso(), session_id),
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return row_to_session(updated)


@router.get("/{session_id}/logs", response_model=SessionLogs)
def get_session_logs(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> SessionLogs:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")

    log_path = row["log_path"]
    if not log_path:
        return SessionLogs(session_id=session_id, logs="")

    path = Path(log_path)
    if not path.exists():
        return SessionLogs(session_id=session_id, logs="")

    return SessionLogs(session_id=session_id, logs=path.read_text(encoding="utf-8"))
