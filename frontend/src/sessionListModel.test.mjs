import assert from 'node:assert/strict';
import {
  buildSessionCardViewModels,
  filterSessions,
  formatSessionCreatedAt,
  getHarnessTagViewModel,
} from './sessionListModel.ts';

const sessions = [
  { id: '1', title: 'Run agent', status: 'running', harness: 'pi', created_at: '2026-05-24T10:30:00.000Z' },
  { id: '2', title: 'Done agent', status: 'completed', harness: 'codex', created_at: '2026-05-23T09:00:00.000Z' },
  { id: '3', title: 'New agent', status: 'created', harness: 'test', created_at: '2026-05-22T08:00:00.000Z' },
];

assert.deepEqual(buildSessionCardViewModels(sessions), [
  {
    id: '1',
    title: 'Run agent',
    status: 'running',
    harness: 'pi',
    harnessTag: { label: 'Pi', background: '#eef2ff', color: '#3730a3' },
    createdAtLabel: 'May 24, 2026, 10:30 AM',
    availableActions: ['stop', 'restart'],
  },
  {
    id: '2',
    title: 'Done agent',
    status: 'completed',
    harness: 'codex',
    harnessTag: { label: 'Codex', background: '#ecfdf5', color: '#047857' },
    createdAtLabel: 'May 23, 2026, 9:00 AM',
    availableActions: ['restart'],
  },
  {
    id: '3',
    title: 'New agent',
    status: 'created',
    harness: 'test',
    harnessTag: { label: 'Test', background: '#fff7ed', color: '#c2410c' },
    createdAtLabel: 'May 22, 2026, 8:00 AM',
    availableActions: ['start'],
  },
]);
assert.deepEqual(buildSessionCardViewModels([{ id: '4', title: 'Paused agent', status: 'stopped', harness: 'pi', created_at: '2026-05-22T08:00:00.000Z' }])[0].availableActions, ['resume', 'restart']);
assert.deepEqual(buildSessionCardViewModels([{ id: '5', title: 'Failed agent', status: 'errored', harness: 'pi', created_at: '2026-05-22T08:00:00.000Z' }])[0].availableActions, ['restart']);
assert.equal(formatSessionCreatedAt('2026-05-24T10:30:00.000Z'), 'May 24, 2026, 10:30 AM');

assert.deepEqual(filterSessions(sessions, { harness: 'pi' }), [sessions[0]]);
assert.deepEqual(filterSessions(sessions, { status: 'completed' }), [sessions[1]]);
assert.deepEqual(filterSessions(sessions, { harness: 'all', status: 'all' }), sessions);

assert.deepEqual(getHarnessTagViewModel('pi'), { label: 'Pi', background: '#eef2ff', color: '#3730a3' });
assert.deepEqual(getHarnessTagViewModel('codex'), { label: 'Codex', background: '#ecfdf5', color: '#047857' });
assert.deepEqual(getHarnessTagViewModel('test'), { label: 'Test', background: '#fff7ed', color: '#c2410c' });

console.log('sessionListModel tests passed');
