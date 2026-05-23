from pydantic import BaseModel, Field

from app.models import Harness, SessionStatus


class SessionCreate(BaseModel):
    title: str = Field(min_length=1)
    repo_path: str | None = None
    harness: Harness = Harness.TEST
    prompt: str | None = None


class Session(BaseModel):
    id: str
    title: str
    repo_path: str | None
    harness: Harness
    prompt: str | None
    status: SessionStatus
    branch_name: str | None
    log_path: str | None
    created_at: str
    updated_at: str


class SessionLogs(BaseModel):
    session_id: str
    logs: str
