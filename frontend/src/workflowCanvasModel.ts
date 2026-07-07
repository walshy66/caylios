/** Workflow canvas drafts: the design surface for future-state workflows.
 * V1 persists to browser localStorage only (mock-backed, real-route
 * prototype); the serialize/load seam here is where backend workflow
 * definitions plug in later. */

export type WorkflowPosition = { x: number; y: number };

export type WorkflowStep = {
  id: string;
  title: string;
  kind: string;
  position: WorkflowPosition;
};

export type WorkflowConnector = {
  id: string;
  source_step_id: string;
  target_step_id: string;
  label: string;
  source_handle: string | null;
  target_handle: string | null;
};

export type WorkflowDraft = {
  id: string;
  title: string;
  steps: WorkflowStep[];
  connectors: WorkflowConnector[];
  created_at: string;
  updated_at: string;
};

export type WorkflowStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const WORKFLOW_DRAFTS_STORAGE_KEY = 'sts.workflow-drafts.v1';

function nextLocalId(prefix: string, existingIds: string[]): string {
  let index = existingIds.length + 1;
  let id = `${prefix}-${index}`;
  while (existingIds.includes(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  return id;
}

export function defaultWorkflowTitle(drafts: WorkflowDraft[]): string {
  return drafts.length === 0 ? 'Workflow' : `Workflow ${drafts.length + 1}`;
}

export function createWorkflowDraft(title: string, now: string, id?: string): WorkflowDraft {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('workflow title is required');
  return {
    id: id ?? (globalThis.crypto?.randomUUID?.() ?? `workflow-${Date.now()}`),
    title: trimmed,
    steps: [],
    connectors: [],
    created_at: now,
    updated_at: now,
  };
}

export function renameWorkflow(draft: WorkflowDraft, title: string, now: string): WorkflowDraft {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('workflow title is required');
  return { ...draft, title: trimmed, updated_at: now };
}

export function addWorkflowStep(
  draft: WorkflowDraft,
  kind: string,
  title: string,
  now: string,
  position?: WorkflowPosition,
): WorkflowDraft {
  return {
    ...draft,
    updated_at: now,
    steps: [
      ...draft.steps,
      {
        id: nextLocalId('step', draft.steps.map((step) => step.id)),
        title: title.trim() || 'Step',
        kind,
        position: position ?? { x: 160 + draft.steps.length * 220, y: 140 },
      },
    ],
  };
}

export function renameWorkflowStep(draft: WorkflowDraft, stepId: string, title: string, now: string): WorkflowDraft {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('step title is required');
  return {
    ...draft,
    updated_at: now,
    steps: draft.steps.map((step) => (step.id === stepId ? { ...step, title: trimmed } : step)),
  };
}

export function moveWorkflowStep(draft: WorkflowDraft, stepId: string, position: WorkflowPosition, now: string): WorkflowDraft {
  return {
    ...draft,
    updated_at: now,
    steps: draft.steps.map((step) => (step.id === stepId ? { ...step, position } : step)),
  };
}

export function removeWorkflowSteps(draft: WorkflowDraft, stepIds: string[], now: string): WorkflowDraft {
  const ids = new Set(stepIds);
  return {
    ...draft,
    updated_at: now,
    steps: draft.steps.filter((step) => !ids.has(step.id)),
    connectors: draft.connectors.filter(
      (connector) => !ids.has(connector.source_step_id) && !ids.has(connector.target_step_id),
    ),
  };
}

export function addWorkflowConnector(
  draft: WorkflowDraft,
  sourceStepId: string,
  targetStepId: string,
  now: string,
  label = '',
  sourceHandle: string | null = null,
  targetHandle: string | null = null,
): WorkflowDraft {
  const stepIds = new Set(draft.steps.map((step) => step.id));
  if (!stepIds.has(sourceStepId) || !stepIds.has(targetStepId)) {
    throw new Error('connector requires valid source and target steps');
  }
  return {
    ...draft,
    updated_at: now,
    connectors: [
      ...draft.connectors,
      {
        id: nextLocalId('connector', draft.connectors.map((connector) => connector.id)),
        source_step_id: sourceStepId,
        target_step_id: targetStepId,
        label: label.trim(),
        source_handle: sourceHandle,
        target_handle: targetHandle,
      },
    ],
  };
}

export function renameWorkflowConnector(draft: WorkflowDraft, connectorId: string, label: string, now: string): WorkflowDraft {
  return {
    ...draft,
    updated_at: now,
    connectors: draft.connectors.map((connector) => (connector.id === connectorId ? { ...connector, label: label.trim() } : connector)),
  };
}

export function removeWorkflowConnectors(draft: WorkflowDraft, connectorIds: string[], now: string): WorkflowDraft {
  const ids = new Set(connectorIds);
  return {
    ...draft,
    updated_at: now,
    connectors: draft.connectors.filter((connector) => !ids.has(connector.id)),
  };
}

export function loadWorkflowDrafts(storage: WorkflowStorage): WorkflowDraft[] {
  try {
    const raw = storage.getItem(WORKFLOW_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (candidate): candidate is WorkflowDraft =>
        typeof candidate?.id === 'string' &&
        typeof candidate?.title === 'string' &&
        Array.isArray(candidate?.steps) &&
        Array.isArray(candidate?.connectors),
    );
  } catch {
    return [];
  }
}

export function saveWorkflowDraft(storage: WorkflowStorage, draft: WorkflowDraft): WorkflowDraft[] {
  const drafts = loadWorkflowDrafts(storage);
  const next = drafts.some((candidate) => candidate.id === draft.id)
    ? drafts.map((candidate) => (candidate.id === draft.id ? draft : candidate))
    : [...drafts, draft];
  storage.setItem(WORKFLOW_DRAFTS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeWorkflowDraft(storage: WorkflowStorage, draftId: string): WorkflowDraft[] {
  const next = loadWorkflowDrafts(storage).filter((candidate) => candidate.id !== draftId);
  storage.setItem(WORKFLOW_DRAFTS_STORAGE_KEY, JSON.stringify(next));
  return next;
}
