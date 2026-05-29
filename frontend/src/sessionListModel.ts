import type { Session } from './api.ts';

export type SessionFilterValue<T extends string> = T | 'all';

export type SessionFilters = {
  harness?: SessionFilterValue<Session['harness']>;
  status?: SessionFilterValue<Session['status']>;
};

export type HarnessTagViewModel = {
  label: string;
  background: string;
  color: string;
};

export type SessionAction = 'start' | 'stop' | 'restart' | 'resume';

export type SessionCardViewModel = Pick<Session, 'id' | 'title' | 'status' | 'harness'> & {
  createdAtLabel: string;
  harnessTag: HarnessTagViewModel;
  availableActions: SessionAction[];
};

export function buildSessionCardViewModels(sessions: Session[]): SessionCardViewModel[] {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    harness: session.harness,
    harnessTag: getHarnessTagViewModel(session.harness),
    createdAtLabel: formatSessionCreatedAt(session.created_at),
    availableActions: getAvailableSessionActions(session.status),
  }));
}

export function filterSessions(sessions: Session[], filters: SessionFilters): Session[] {
  return sessions.filter((session) => {
    const harnessMatches = !filters.harness || filters.harness === 'all' || session.harness === filters.harness;
    const statusMatches = !filters.status || filters.status === 'all' || session.status === filters.status;
    return harnessMatches && statusMatches;
  });
}

export function getAvailableSessionActions(status: Session['status']): SessionAction[] {
  if (status === 'created') return ['start'];
  if (status === 'running') return ['stop', 'restart'];
  if (status === 'stopped') return ['resume', 'restart'];
  if (status === 'completed' || status === 'errored') return ['restart'];
  return [];
}

export function getHarnessTagViewModel(harness: Session['harness']): HarnessTagViewModel {
  const tags: Record<Session['harness'], HarnessTagViewModel> = {
    pi: { label: 'Pi', background: '#eef2ff', color: '#3730a3' },
    codex: { label: 'Codex', background: '#ecfdf5', color: '#047857' },
    test: { label: 'Test', background: '#fff7ed', color: '#c2410c' },
  };
  return tags[harness];
}

export function formatSessionCreatedAt(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
}
