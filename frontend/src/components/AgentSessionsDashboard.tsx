import { useEffect, useState } from 'react';
import { listSessions, restartSession, resumeSession, Session, startSession, stopSession } from '../api';
import { resolveSelectedSession } from '../sessionSelectionModel';
import DocumentUploadPanel from './DocumentUploadPanel';
import SessionCreateForm from './SessionCreateForm';
import SessionDetail from './SessionDetail';
import SessionList from './SessionList';

const SELECTED_SESSION_STORAGE_KEY = 'simplets.selectedSessionId';

function getStoredSelectedSessionId(): string | null {
  return window.localStorage.getItem(SELECTED_SESSION_STORAGE_KEY);
}

/** Legacy coding-agent session dashboard plus the original document-upload demo.
 * Internal runtime tooling only — hidden behind VITE_ENABLE_AGENT_DASHBOARD and
 * not part of the STS subscriber portal. */
export default function AgentSessionsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => getStoredSelectedSessionId());
  const [selected, setSelected] = useState<Session | null>(null);

  async function refreshSessions() {
    const nextSessions = await listSessions();
    setSessions(nextSessions);
    setSelected(resolveSelectedSession(nextSessions, selectedId));
  }

  useEffect(() => {
    refreshSessions();
  }, []);

  useEffect(() => {
    if (selectedId) {
      window.localStorage.setItem(SELECTED_SESSION_STORAGE_KEY, selectedId);
    } else {
      window.localStorage.removeItem(SELECTED_SESSION_STORAGE_KEY);
    }
  }, [selectedId]);

  function handleSessionSelected(session: Session) {
    setSelectedId(session.id);
    setSelected(session);
  }

  function handleSessionChanged(session: Session) {
    setSelectedId(session.id);
    setSelected(session);
    setSessions((current) => current.map((item) => (item.id === session.id ? session : item)));
  }

  function handleSessionCreated(session: Session) {
    setSessions((current) => [session, ...current]);
    setSelectedId(session.id);
    setSelected(session);
  }

  async function handleSessionStart(session: Session) {
    handleSessionChanged(await startSession(session.id));
  }

  async function handleSessionStop(session: Session) {
    handleSessionChanged(await stopSession(session.id));
  }

  async function handleSessionResume(session: Session) {
    handleSessionChanged(await resumeSession(session.id));
  }

  async function handleSessionRestart(session: Session) {
    handleSessionChanged(await restartSession(session.id));
  }

  return (
    <section className="agent-dashboard">
      <h2>Agent runtime (internal)</h2>
      <div className="session-dashboard">
        <div className="session-sidebar">
          <DocumentUploadPanel />
          <SessionCreateForm onCreated={handleSessionCreated} />
          <SessionList
            sessions={sessions}
            selectedId={selected?.id || null}
            onSelect={handleSessionSelected}
            onStart={handleSessionStart}
            onStop={handleSessionStop}
            onResume={handleSessionResume}
            onRestart={handleSessionRestart}
          />
        </div>
        <SessionDetail session={selected} onChanged={handleSessionChanged} />
      </div>
    </section>
  );
}
