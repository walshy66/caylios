import assert from 'node:assert/strict';
import {
  canApproveReviewRun,
  canSaveExtractedFields,
  formatApprovalCompletion,
  formatSourcePreview,
  parseEditableFields,
} from './reviewQueueModel.ts';

assert.equal(canSaveExtractedFields('{"summary":"Edited"}'), true);
assert.equal(canSaveExtractedFields('not json'), false);
assert.deepEqual(parseEditableFields('{"summary":"Edited","count":2}'), { summary: 'Edited', count: 2 });
assert.throws(() => parseEditableFields('[]'), /must be a JSON object/);
assert.throws(() => parseEditableFields('not json'), /valid JSON/);

assert.equal(canApproveReviewRun({ hasOpenedExtractedDataScreen: false, fieldsAreValid: true }), false);
assert.equal(canApproveReviewRun({ hasOpenedExtractedDataScreen: true, fieldsAreValid: false }), false);
assert.equal(canApproveReviewRun({ hasOpenedExtractedDataScreen: true, fieldsAreValid: true }), true);

assert.equal(formatSourcePreview({ available: true, content: 'Original text', reason: null }), 'Original text');
assert.equal(
  formatSourcePreview({ available: false, content: null, reason: 'document no longer retained' }),
  'Source unavailable: document no longer retained',
);

assert.equal(
  formatApprovalCompletion({ destination_record_id: 'mock-destination-run-1' }),
  'Approved and written to mock destination record mock-destination-run-1.',
);
assert.equal(formatApprovalCompletion({ destination_record_id: null }), 'Approved; no destination record was returned.');

console.log('reviewQueueModel tests passed');
