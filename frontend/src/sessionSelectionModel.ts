type SelectableSession = {
  id: string;
};

export function resolveSelectedSession<TSession extends SelectableSession>(
  sessions: TSession[],
  selectedId: string | null,
): TSession | null {
  if (!selectedId) return null;
  return sessions.find((session) => session.id === selectedId) || null;
}
