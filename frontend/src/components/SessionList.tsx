import { useMemo, useState } from 'react';
import { Session } from '../api';
import { buildSessionCardViewModels, filterSessions } from '../sessionListModel';

type Props = {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
  onStart: (session: Session) => void;
  onStop: (session: Session) => void;
  onResume: (session: Session) => void;
  onRestart: (session: Session) => void;
};

export default function SessionList({ sessions, selectedId, onSelect, onStart, onStop, onResume, onRestart }: Props) {
  const [harnessFilter, setHarnessFilter] = useState<'all' | Session['harness']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Session['status']>('all');
  const filteredSessions = useMemo(
    () => filterSessions(sessions, { harness: harnessFilter, status: statusFilter }),
    [sessions, harnessFilter, statusFilter],
  );
  const sessionCards = useMemo(() => buildSessionCardViewModels(filteredSessions), [filteredSessions]);
  const sessionsById = useMemo(() => new Map(filteredSessions.map((session) => [session.id, session])), [filteredSessions]);

  return (
    <section className="panel session-list-panel">
      <h2>Sessions</h2>
      <div className="session-list-filters">
        <label>
          Type:{' '}
          <select value={harnessFilter} onChange={(event) => setHarnessFilter(event.target.value as 'all' | Session['harness'])}>
            <option value="all">All</option>
            <option value="pi">Pi</option>
            <option value="codex">Codex</option>
            <option value="test">Test</option>
          </select>
        </label>
        <label>
          Status:{' '}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | Session['status'])}>
            <option value="all">All</option>
            <option value="created">Created</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="completed">Completed</option>
            <option value="errored">Errored</option>
          </select>
        </label>
      </div>
      {sessions.length === 0 ? <p>No sessions yet.</p> : null}
      {sessions.length > 0 && sessionCards.length === 0 ? <p>No sessions match the selected filters.</p> : null}
      <div className="session-card-list">
        {sessionCards.map((session) => (
          <button
            className="session-card"
            key={session.id}
            aria-pressed={session.id === selectedId}
            onClick={() => {
              const selectedSession = sessionsById.get(session.id);
              if (selectedSession) onSelect(selectedSession);
            }}
          >
            <div className="session-card-header">
              <strong>{session.title}</strong>
              <span
                className="session-harness-tag"
                style={{
                  background: session.harnessTag.background,
                  color: session.harnessTag.color,
                }}
              >
                {session.harnessTag.label}
              </span>
            </div>
            <div className="session-card-meta">
              <span>Status: {session.status}</span>
              <span>Created: {session.createdAtLabel}</span>
              <span>
                Actions:{' '}
                {session.availableActions.length === 0 ? 'None' : null}
                {session.availableActions.includes('start') ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const selectedSession = sessionsById.get(session.id);
                      if (selectedSession) onStart(selectedSession);
                    }}
                  >
                    Start
                  </button>
                ) : null}
                {session.availableActions.includes('stop') ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const selectedSession = sessionsById.get(session.id);
                      if (selectedSession) onStop(selectedSession);
                    }}
                  >
                    Stop
                  </button>
                ) : null}
                {session.availableActions.includes('resume') ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const selectedSession = sessionsById.get(session.id);
                      if (selectedSession) onResume(selectedSession);
                    }}
                  >
                    Resume
                  </button>
                ) : null}
                {session.availableActions.includes('restart') ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const selectedSession = sessionsById.get(session.id);
                      if (selectedSession) onRestart(selectedSession);
                    }}
                  >
                    Restart
                  </button>
                ) : null}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
