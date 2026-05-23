import { useState } from 'react';
import { getSessionLogs, Session, startSession, stopSession } from '../api';

type Props = {
  session: Session | null;
  onChanged: (session: Session) => void;
};

export default function SessionDetail({ session, onChanged }: Props) {
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!session) {
    return (
      <section style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <h2>Session detail</h2>
        <p>Select a session to view details.</p>
      </section>
    );
  }

  async function refreshLogs() {
    if (!session) return;
    setIsLoading(true);
    try {
      setLogs(await getSessionLogs(session.id));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStart() {
    if (!session) return;
    const updated = await startSession(session.id);
    onChanged(updated);
    await refreshLogs();
  }

  async function handleStop() {
    if (!session) return;
    const updated = await stopSession(session.id);
    onChanged(updated);
    await refreshLogs();
  }

  return (
    <section style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h2>{session.title}</h2>
      <p>Status: {session.status}</p>
      <p>Harness: {session.harness}</p>
      <p>Repo: {session.repo_path || 'Not set'}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handleStart}>Start</button>
        <button onClick={handleStop}>Stop</button>
        <button onClick={refreshLogs}>{isLoading ? 'Refreshing...' : 'Refresh logs'}</button>
      </div>
      <pre style={{ minHeight: 180, padding: 12, background: '#f6f6f6', overflow: 'auto' }}>{logs || 'No logs loaded.'}</pre>
    </section>
  );
}
