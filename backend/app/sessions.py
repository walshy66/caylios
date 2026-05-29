import re
import sqlite3
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import get_connection
from app.models import Harness, SessionStatus
from app.runner import has_active_process, start_session_process, stop_session
from app.schemas import Session, SessionCreate, SessionLogs

router = APIRouter(prefix="/sessions", tags=["sessions"])


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def row_to_session(row: sqlite3.Row) -> Session:
    return Session(**dict(row))


def generate_branch_name(title: str, fallback_id: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"sts/{slug or fallback_id[:8]}"


def create_session_branch(session_id: str, title: str, repo_path: str | None) -> str | None:
    if not repo_path:
        return None

    path = Path(repo_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail="Repository path does not exist")

    branch_name = generate_branch_name(title, session_id)
    try:
        subprocess.run(["git", "checkout", "-b", branch_name], cwd=path, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        branch_exists = subprocess.run(
            ["git", "rev-parse", "--verify", branch_name], cwd=path, capture_output=True, text=True
        )
        if branch_exists.returncode == 0:
            subprocess.run(["git", "checkout", branch_name], cwd=path, check=True, capture_output=True, text=True)
        else:
            detail = (exc.stderr or exc.stdout or "Failed to create session branch").strip()
            raise HTTPException(status_code=400, detail=detail) from exc

    return branch_name


def update_status(
    session_id: str,
    status: SessionStatus,
    output_tail: str | None = None,
    error_message: str | None = None,
) -> None:
    connection = get_connection()
    conn = next(connection)
    try:
        conn.execute(
            "UPDATE sessions SET status = ?, output_tail = ?, error_message = ?, updated_at = ? WHERE id = ?",
            (status.value, output_tail, error_message, now_iso(), session_id),
        )
        conn.commit()
    finally:
        connection.close()


@router.get("", response_model=list[Session])
def list_sessions(
    status: SessionStatus | None = None,
    harness: Harness | None = None,
    q: str | None = Query(default=None, min_length=1),
    conn: sqlite3.Connection = Depends(get_connection),
) -> list[Session]:
    clauses: list[str] = []
    params: list[str] = []

    if status is not None:
        clauses.append("status = ?")
        params.append(status.value)
    if harness is not None:
        clauses.append("harness = ?")
        params.append(harness.value)
    if q is not None:
        clauses.append("(title LIKE ? OR prompt LIKE ? OR repo_path LIKE ?)")
        pattern = f"%{q}%"
        params.extend([pattern, pattern, pattern])

    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = conn.execute(f"SELECT * FROM sessions{where} ORDER BY created_at DESC", params).fetchall()
    return [row_to_session(row) for row in rows]


@router.post("", response_model=Session)
def create_session(payload: SessionCreate, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    session_id = str(uuid4())
    timestamp = now_iso()
    conn.execute(
        """
        INSERT INTO sessions (
            id, title, repo_path, harness, prompt, model, status, branch_name, log_path, output_tail, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session_id,
            payload.title,
            payload.repo_path,
            payload.harness.value,
            payload.prompt,
            payload.model,
            SessionStatus.CREATED.value,
            None,
            None,
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


def start_session_from_row(session_id: str, row: sqlite3.Row, conn: sqlite3.Connection) -> Session:
    branch_name = row["branch_name"] or create_session_branch(session_id, row["title"], row["repo_path"])
    log_path = start_session_process(
        session_id,
        Harness(row["harness"]),
        row["repo_path"],
        row["prompt"],
        row["model"],
        update_status,
    )
    if has_active_process(session_id):
        conn.execute(
            "UPDATE sessions SET status = ?, branch_name = ?, log_path = ?, error_message = ?, updated_at = ? WHERE id = ?",
            (SessionStatus.RUNNING.value, branch_name, str(log_path), None, now_iso(), session_id),
        )
    else:
        conn.execute("UPDATE sessions SET branch_name = ?, log_path = ?, updated_at = ? WHERE id = ?", (branch_name, str(log_path), now_iso(), session_id))
    conn.commit()
    updated = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return row_to_session(updated)


@router.post("/{session_id}/start", response_model=Session)
def start_session(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row["status"] == SessionStatus.RUNNING.value:
        raise HTTPException(status_code=409, detail="Session already running")

    return start_session_from_row(session_id, row, conn)


@router.post("/{session_id}/resume", response_model=Session)
def resume_session(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row["status"] != SessionStatus.STOPPED.value:
        raise HTTPException(status_code=409, detail="Only stopped sessions can be resumed")

    return start_session_from_row(session_id, row, conn)


@router.post("/{session_id}/restart", response_model=Session)
def restart_session(session_id: str, conn: sqlite3.Connection = Depends(get_connection)) -> Session:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if row["status"] == SessionStatus.RUNNING.value:
        stop_session(session_id)

    return start_session_from_row(session_id, row, conn)


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
