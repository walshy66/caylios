import assert from 'node:assert/strict';
import { buildSessionCreatePayload, canSubmitSessionCreateForm } from './sessionCreateModel.ts';

assert.equal(canSubmitSessionCreateForm({ harness: 'test', title: '', repoPath: '', prompt: '' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'test', title: '  ', repoPath: '', prompt: '' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'test', title: 'Run agent', repoPath: '', prompt: '' }), true);
assert.equal(canSubmitSessionCreateForm({ harness: 'codex', title: 'Run agent', repoPath: '', prompt: 'Do work', model: 'gpt-5' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'codex', title: 'Run agent', repoPath: '/tmp/repo', prompt: '', model: 'gpt-5' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'codex', title: 'Run agent', repoPath: '/tmp/repo', prompt: 'Do work', model: '' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'codex', title: 'Run agent', repoPath: '/tmp/repo', prompt: 'Do work', model: 'gpt-5' }), true);
assert.equal(canSubmitSessionCreateForm({ harness: 'pi', title: 'Run agent', repoPath: '', prompt: 'Do work', model: 'claude-sonnet-4.5' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'pi', title: 'Run agent', repoPath: '/tmp/repo', prompt: '', model: 'claude-sonnet-4.5' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'pi', title: 'Run agent', repoPath: '/tmp/repo', prompt: 'Do work', model: '' }), false);
assert.equal(canSubmitSessionCreateForm({ harness: 'pi', title: 'Run agent', repoPath: '/tmp/repo', prompt: 'Do work', model: 'claude-sonnet-4.5' }), true);

assert.deepEqual(
  buildSessionCreatePayload({ harness: 'pi', title: ' Run agent ', repoPath: ' /tmp/repo ', prompt: ' Do work ', model: ' claude-sonnet-4.5 ' }),
  { title: 'Run agent', repo_path: '/tmp/repo', harness: 'pi', prompt: 'Do work', model: 'claude-sonnet-4.5' },
);

assert.deepEqual(
  buildSessionCreatePayload({ harness: 'test', title: 'Test session', repoPath: ' /tmp/repo ', prompt: ' Do work ' }),
  { title: 'Test session', harness: 'test' },
);

assert.deepEqual(
  buildSessionCreatePayload({ harness: 'codex', title: 'Run agent', repoPath: ' /tmp/repo ', prompt: ' Do work ', model: ' gpt-5 ' }),
  { title: 'Run agent', harness: 'codex', repo_path: '/tmp/repo', prompt: 'Do work', model: 'gpt-5' },
);

console.log('sessionCreateModel tests passed');
