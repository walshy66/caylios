import assert from 'node:assert/strict';
import { shouldTailLogs } from './sessionLogTailModel.ts';

assert.equal(shouldTailLogs(null), false, 'does not tail without a selected session');
assert.equal(
  shouldTailLogs({ id: '1', status: 'created' }),
  false,
  'does not tail sessions that have not started'
);
assert.equal(
  shouldTailLogs({ id: '1', status: 'running' }),
  true,
  'tails running sessions so live worker output appears without manual refresh'
);
assert.equal(
  shouldTailLogs({ id: '1', status: 'stopped' }),
  false,
  'stops tailing stopped sessions so the UI does not keep polling after Stop'
);
assert.equal(
  shouldTailLogs({ id: '1', status: 'completed' }),
  false,
  'stops tailing completed sessions after the final status is observed'
);
assert.equal(
  shouldTailLogs({ id: '1', status: 'errored' }),
  false,
  'stops tailing errored sessions after the final status is observed'
);
