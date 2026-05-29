from enum import StrEnum


class SessionStatus(StrEnum):
    CREATED = "created"
    RUNNING = "running"
    STOPPED = "stopped"
    COMPLETED = "completed"
    ERRORED = "errored"


class Harness(StrEnum):
    TEST = "test"
    CODEX = "codex"
    PI = "pi"


class ActivityTag(StrEnum):
    COMMENT = "comment"
    NOTE = "note"
    ATTACHMENT = "attachment"
    HANDOFF = "handoff"
    STATUS = "status"
    PROMPT = "prompt"
    BRANCH = "branch"
