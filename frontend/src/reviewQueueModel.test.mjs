import assert from 'node:assert/strict';
import {
  canApproveReviewRun,
  canSaveExtractedFields,
  flagReason,
  flaggedFieldNames,
  formatApprovalOutcome,
  formatSourcePreview,
  hasFailedPushes,
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

// Approval outcome messaging: success purges, failure retains with reasons.
const success = formatApprovalOutcome({
  all_succeeded: true,
  destination_pushes: [
    { provider: 'mock', status: 'succeeded', destination_record_id: 'mock-destination-run-1', error_message: null },
  ],
});
assert.ok(success.includes('purged from SimpleTS'));
assert.ok(success.includes('mock: mock-destination-run-1'));

const failure = formatApprovalOutcome({
  all_succeeded: false,
  destination_pushes: [
    { provider: 'mock', status: 'succeeded', destination_record_id: 'mock-1', error_message: null },
    { provider: 'hubspot', status: 'failed', destination_record_id: null, error_message: 'hubspot rejected the record: 500' },
  ],
});
assert.ok(failure.includes('data is retained'));
assert.ok(failure.includes('hubspot rejected the record: 500'));

// Flagged-field helpers read the _extraction metadata.
const extracted = {
  total: null,
  issuer: 'Acme',
  _extraction: {
    flagged_fields: ['total'],
    field_details: { total: { flag_reason: 'required value missing from document' } },
  },
};
assert.deepEqual(flaggedFieldNames(extracted), ['total']);
assert.equal(flagReason(extracted, 'total'), 'required value missing from document');
assert.equal(flagReason(extracted, 'issuer'), null);
assert.deepEqual(flaggedFieldNames(null), []);
assert.deepEqual(flaggedFieldNames({ plain: 'fields' }), []);

assert.equal(hasFailedPushes([{ provider: 'mock', status: 'succeeded', destination_record_id: null, error_message: null }]), false);
assert.equal(hasFailedPushes([{ provider: 'hubspot', status: 'failed', destination_record_id: null, error_message: 'x' }]), true);

console.log('reviewQueueModel tests passed');
