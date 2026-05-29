import sqlite3
from pathlib import Path
from typing import Iterator

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "simplets.sqlite3"


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                repo_path TEXT,
                harness TEXT NOT NULL CHECK (harness IN ('test', 'codex', 'pi')),
                prompt TEXT,
                model TEXT,
                status TEXT NOT NULL CHECK (status IN ('created', 'running', 'stopped', 'completed', 'errored')),
                branch_name TEXT,
                log_path TEXT,
                output_tail TEXT,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        existing_columns = {column[1] for column in conn.execute("PRAGMA table_info(sessions)").fetchall()}
        if "model" not in existing_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN model TEXT")
        if "output_tail" not in existing_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN output_tail TEXT")
        if "error_message" not in existing_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN error_message TEXT")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS activity_events (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                tag TEXT NOT NULL CHECK (tag IN ('comment', 'note', 'attachment', 'handoff', 'status', 'prompt', 'branch')),
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
            """
        )
        conn.commit()


def get_connection() -> Iterator[sqlite3.Connection]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
