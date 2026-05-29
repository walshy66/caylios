from pydantic import BaseModel, Field, model_validator

from app.models import ActivityTag, Harness, SessionStatus


class SessionCreate(BaseModel):
    title: str = Field(min_length=1)
    repo_path: str | None = None
    harness: Harness = Harness.TEST
    prompt: str | None = None
    model: str | None = None

    @model_validator(mode="after")
    def validate_harness_inputs(self) -> "SessionCreate":
        if self.harness in {Harness.CODEX, Harness.PI}:
            if not self.repo_path or not self.repo_path.strip():
                raise ValueError("repo_path is required for codex and pi sessions")
            if not self.prompt or not self.prompt.strip():
                raise ValueError("prompt is required for codex and pi sessions")
            if not self.model or not self.model.strip():
                raise ValueError("model is required for codex and pi sessions")
        return self


class Session(BaseModel):
    id: str
    title: str
    repo_path: str | None
    harness: Harness
    prompt: str | None
    model: str | None
    status: SessionStatus
    branch_name: str | None
    log_path: str | None
    output_tail: str | None
    error_message: str | None
    created_at: str
    updated_at: str


class SessionLogs(BaseModel):
    session_id: str
    logs: str


class ActivityItem(BaseModel):
    id: str
    session_id: str
    tag: ActivityTag
    body: str = Field(min_length=1)
    created_at: str
