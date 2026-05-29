type TailStatus = 'created' | 'running' | 'stopped' | 'completed' | 'errored';

type TailSession = {
  status: TailStatus;
} | null;

export const LOG_TAIL_INTERVAL_MS = 1000;

export function shouldTailLogs(session: TailSession): boolean {
  return session !== null && session.status === 'running';
}
