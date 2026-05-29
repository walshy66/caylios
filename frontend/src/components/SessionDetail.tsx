import { useCallback, useEffect, useState } from 'react';
import { getSession, getSessionLogs, restartSession, resumeSession, Session, startSession, stopSession } from '../api';
import { LOG_TAIL_INTERVAL_MS, shouldTailLogs } from '../sessionLogTailModel';
import { getAvailableSessionActions } from '../sessionListModel';

type Props = {
  session: Session | null;
  onChanged: (session: Session) => void;
};

export default function SessionDetail({ session, onChanged }: Props) {
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshLogs = useCallback(async (showLoading = true) => {
    if (!session) return;
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      setLogs(await getSessionLogs(session.id));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [session]);

  useEffect(() => {
    setLogs(session?.output_tail || '');
    if (!shouldTailLogs(session)) return;

    async function refreshRunningSession() {
      if (!session) return;
      await refreshLogs(false);
      onChanged(await getSession(session.id));
    }

    void refreshRunningSession();
    const intervalId = window.setInterval(() => {
      void refreshRunningSession();
    }, LOG_TAIL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshLogs, session]);

  if (!session) {
    return (
      <section className="panel session-detail-panel">
        <h2>Session detail</h2>
        <p>Select a session to view details.</p>
      </section>
    );
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

  async function handleResume() {
    if (!session) return;
    const updated = await resumeSession(session.id);
    onChanged(updated);
    await refreshLogs();
  }

  async function handleRestart() {
    if (!session) return;
    const updated = await restartSession(session.id);
    onChanged(updated);
    await refreshLogs();
  }

  const availableActions = getAvailableSessionActions(session.status);

  return (
    <section className="panel session-detail-panel">
      <h2>{session.title}</h2>
      <p>Status: {session.status}</p>
      <p>Harness: {session.harness}</p>
      <p>Repo: {session.repo_path || 'Not set'}</p>
      {session.error_message ? <p className="session-error">Error: {session.error_message}</p> : null}
      <div className="session-actions">
        {availableActions.includes('start') ? <button onClick={handleStart}>Start</button> : null}
        {availableActions.includes('stop') ? <button onClick={handleStop}>Stop</button> : null}
        {availableActions.includes('resume') ? <button onClick={handleResume}>Resume</button> : null}
        {availableActions.includes('restart') ? <button onClick={handleRestart}>Restart</button> : null}
        <button onClick={() => refreshLogs()}>{isLoading ? 'Refreshing...' : 'Refresh logs'}</button>
      </div>
      <pre className="session-log">{logs || 'No logs loaded.'}</pre>
    </section>
  );
}
