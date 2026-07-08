import assert from 'node:assert/strict';

import {
  WORKFLOW_DRAFTS_STORAGE_KEY,
  addWorkflowConnector,
  addWorkflowStep,
  createWorkflowDraft,
  defaultWorkflowTitle,
  loadWorkflowDrafts,
  moveWorkflowStep,
  reconnectWorkflowConnector,
  removeWorkflowConnectors,
  removeWorkflowDraft,
  removeWorkflowSteps,
  renameWorkflow,
  renameWorkflowConnector,
  renameWorkflowStep,
  saveWorkflowDraft,
  setWorkflowConnectorMarker,
} from './workflowCanvasModel.ts';

const NOW = '2026-07-08T00:00:00+00:00';
const LATER = '2026-07-08T01:00:00+00:00';

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value;
    },
  };
}

assert.equal(defaultWorkflowTitle([]), 'Workflow');

const draft = createWorkflowDraft('Client onboarding', NOW, 'wf-1');
assert.equal(draft.title, 'Client onboarding');
assert.equal(draft.id, 'wf-1');
assert.deepEqual(draft.steps, []);
assert.throws(() => createWorkflowDraft('   ', NOW), /title is required/);

assert.equal(defaultWorkflowTitle([draft]), 'Workflow 2');
assert.equal(renameWorkflow(draft, ' Onboarding v2 ', LATER).title, 'Onboarding v2');
assert.equal(renameWorkflow(draft, 'Onboarding v2', LATER).updated_at, LATER);

let flow = addWorkflowStep(draft, 'start', 'Start', NOW);
flow = addWorkflowStep(flow, 'decision', 'Approved?', NOW, { x: 400, y: 200 });
assert.equal(flow.steps.length, 2);
assert.equal(flow.steps[0].id, 'step-1');
assert.deepEqual(flow.steps[1].position, { x: 400, y: 200 });
assert.equal(flow.steps[1].kind, 'decision');

assert.equal(renameWorkflowStep(flow, 'step-2', 'Client approved?', LATER).steps[1].title, 'Client approved?');
assert.throws(() => renameWorkflowStep(flow, 'step-2', '  ', LATER), /title is required/);
assert.deepEqual(moveWorkflowStep(flow, 'step-1', { x: 10, y: 20 }, LATER).steps[0].position, { x: 10, y: 20 });

flow = addWorkflowConnector(flow, 'step-1', 'step-2', NOW, 'Yes', 'bottom', 'top');
assert.equal(flow.connectors.length, 1);
assert.equal(flow.connectors[0].label, 'Yes');
assert.equal(flow.connectors[0].source_handle, 'bottom');
assert.throws(() => addWorkflowConnector(flow, 'step-1', 'missing', NOW), /valid source and target/);

assert.equal(renameWorkflowConnector(flow, 'connector-1', 'No', LATER).connectors[0].label, 'No');
assert.equal(removeWorkflowConnectors(flow, ['connector-1'], LATER).connectors.length, 0);

const reconnectedFlow = reconnectWorkflowConnector(flow, 'connector-1', 'step-2', 'step-1', 'left', 'right', LATER);
assert.equal(reconnectedFlow.connectors[0].source_step_id, 'step-2');
assert.equal(reconnectedFlow.connectors[0].target_step_id, 'step-1');
assert.throws(() => reconnectWorkflowConnector(flow, 'connector-1', 'step-1', 'missing', null, null, LATER), /valid source and target/);
assert.equal(setWorkflowConnectorMarker(flow, 'connector-1', 'none', LATER).connectors[0].marker_end, 'none');
assert.equal(setWorkflowConnectorMarker(flow, 'connector-1', 'arrow', LATER).connectors[0].marker_end, 'arrow');

const withoutStep = removeWorkflowSteps(flow, ['step-1'], LATER);
assert.equal(withoutStep.steps.length, 1);
assert.equal(withoutStep.connectors.length, 0, 'connectors touching removed steps are removed');
assert.equal(withoutStep.updated_at, LATER);

const storage = fakeStorage();
assert.deepEqual(loadWorkflowDrafts(storage), []);
saveWorkflowDraft(storage, flow);
assert.equal(loadWorkflowDrafts(storage).length, 1);
const renamed = renameWorkflow(flow, 'Renamed', LATER);
const savedList = saveWorkflowDraft(storage, renamed);
assert.equal(savedList.length, 1, 'saving an existing draft replaces it');
assert.equal(loadWorkflowDrafts(storage)[0].title, 'Renamed');
const second = createWorkflowDraft('Second', NOW, 'wf-2');
saveWorkflowDraft(storage, second);
assert.equal(loadWorkflowDrafts(storage).length, 2);
assert.deepEqual(removeWorkflowDraft(storage, 'wf-1').map((candidate) => candidate.id), ['wf-2']);

const corrupted = fakeStorage({ [WORKFLOW_DRAFTS_STORAGE_KEY]: '{not json' });
assert.deepEqual(loadWorkflowDrafts(corrupted), []);
const wrongShape = fakeStorage({ [WORKFLOW_DRAFTS_STORAGE_KEY]: JSON.stringify([{ id: 1 }]) });
assert.deepEqual(loadWorkflowDrafts(wrongShape), []);

console.log('workflowCanvasModel tests passed');
