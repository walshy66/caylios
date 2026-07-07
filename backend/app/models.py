from enum import StrEnum


class WorkspaceRole(StrEnum):
    ADMIN = "admin"
    REVIEWER = "reviewer"
    OPERATOR = "operator"


class FeatureKey(StrEnum):
    WORKFLOW_AUTOMATION = "workflow_automation"


class ConnectorProvider(StrEnum):
    HUBSPOT = "hubspot"
    GOOGLE_DRIVE = "google_drive"
    PANDADOC = "pandadoc"
    XERO = "xero"
    MOCK = "mock"


class ConnectionStatus(StrEnum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"


class DocumentDeletionStatus(StrEnum):
    RETAINED = "retained"
    DELETED = "deleted"


class WorkflowRunStatus(StrEnum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    ERRORED = "errored"


class ReviewStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    APPROVED = "approved"
