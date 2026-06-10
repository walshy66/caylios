import assert from 'node:assert/strict';
import { buildDocumentUploadFormData, canSubmitDocumentUpload, getWorkflowRunExtractionSummary } from './documentUploadModel.ts';

const file = new File(['demo'], 'demo.txt', { type: 'text/plain' });

const secondFile = new File(['demo 2'], 'demo-2.txt', { type: 'text/plain' });

assert.equal(canSubmitDocumentUpload({ intent: '', uploader: 'user-123', files: [file] }), false);
assert.equal(canSubmitDocumentUpload({ intent: 'summarize', uploader: '', files: [file] }), false);
assert.equal(canSubmitDocumentUpload({ intent: 'summarize', uploader: 'user-123', files: [] }), false);
assert.equal(canSubmitDocumentUpload({ intent: ' summarize ', uploader: ' user-123 ', files: [file, secondFile] }), true);

const formData = buildDocumentUploadFormData({ intent: ' summarize ', uploader: ' user-123 ', files: [file, secondFile] }, secondFile);
assert.equal(formData.get('intent'), 'summarize');
assert.equal(formData.get('uploader'), 'user-123');
assert.equal(formData.get('file'), secondFile);
assert.throws(() => buildDocumentUploadFormData({ intent: 'summarize', uploader: 'user-123', files: [] }), /file is required/);

assert.equal(getWorkflowRunExtractionSummary({ extraction_status: null, extraction_error: null }), 'Extraction not started');
assert.equal(getWorkflowRunExtractionSummary({ extraction_status: 'completed', extraction_error: null }), 'Extraction completed');
assert.equal(getWorkflowRunExtractionSummary({ extraction_status: 'errored', extraction_error: 'provider unavailable' }), 'Extraction failed: provider unavailable');

console.log('documentUploadModel tests passed');
