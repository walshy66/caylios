import { Session } from '../api';

type Props = {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
};

export default function SessionList({ sessions, selectedId, onSelect }: Props) {
  return (
    <section style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h2>Sessions</h2>
      {sessions.length === 0 ? <p>No sessions yet.</p> : null}
      <div style={{ display: 'grid', gap: 8 }}>
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session)}
            style={{
              textAlign: 'left',
              padding: 12,
              border: session.id === selectedId ? '2px solid #333' : '1px solid #ddd',
              borderRadius: 8,
              background: '#fff',
            }}
          >
            <strong>{session.title}</strong>
            <div>Status: {session.status}</div>
            <div>Harness: {session.harness}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
