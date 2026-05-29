import assert from 'node:assert/strict';
import { resolveSelectedSession } from './sessionSelectionModel.ts';

const sessions = [
  { id: 'running-session', status: 'running', title: 'Running session' },
  { id: 'completed-session', status: 'completed', title: 'Completed session' },
];

assert.equal(
  resolveSelectedSession(sessions, null),
  null,
  'does not select a session when no persisted selected id exists'
);
assert.deepEqual(
  resolveSelectedSession(sessions, 'running-session'),
  sessions[0],
  'recovers the persisted selected session after the session list refreshes'
);
assert.equal(
  resolveSelectedSession(sessions, 'missing-session'),
  null,
  'clears selection when the persisted selected id no longer exists'
);
