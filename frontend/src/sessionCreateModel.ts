import type { Session, SessionCreate } from './api.ts';

export type SessionCreateFormValues = {
  harness: Session['harness'];
  title: string;
  repoPath: string;
  prompt: string;
  model?: string;
};

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requiresAgentInputs(harness: Session['harness']): boolean {
  return harness === 'codex' || harness === 'pi';
}

export function canSubmitSessionCreateForm(values: SessionCreateFormValues): boolean {
  if (values.title.trim().length === 0) return false;
  if (!requiresAgentInputs(values.harness)) return true;

  return values.repoPath.trim().length > 0 && values.prompt.trim().length > 0 && optionalTrimmed(values.model ?? '') !== undefined;
}

export function buildSessionCreatePayload(values: SessionCreateFormValues): SessionCreate {
  const payload: SessionCreate = {
    title: values.title.trim(),
    harness: values.harness,
  };

  if (requiresAgentInputs(values.harness)) {
    const repoPath = optionalTrimmed(values.repoPath);
    if (repoPath) payload.repo_path = repoPath;

    const prompt = optionalTrimmed(values.prompt);
    if (prompt) payload.prompt = prompt;

    const model = optionalTrimmed(values.model ?? '');
    if (model) payload.model = model;
  }

  return payload;
}
