import assert from 'node:assert/strict';

import {
  INTAKE_FIELDS,
  applyExtractedFields,
  buildSubmissionFields,
  draftHasContent,
  emptyIntakeForm,
  intakeSections,
  missingRequiredFields,
  parseDraft,
  serializeDraft,
} from './intakeFormModel.ts';

// CoachCW intake covers identity, business, ATO, and engagement sections.
assert.deepEqual(intakeSections(), ['Identity', 'Business', 'ATO', 'Engagement']);
assert.ok(INTAKE_FIELDS.some((field) => field.name === 'tfn'));

// Draft round-trips through localStorage serialization.
const form = { ...emptyIntakeForm(), full_name: 'Jane Citizen', email: 'jane@example.com' };
const raw = serializeDraft(form, 'Jane', '2026-06-11T00:00:00Z');
const restored = parseDraft(raw);
assert.equal(restored.values.full_name, 'Jane Citizen');
assert.equal(restored.submitter, 'Jane');
assert.equal(restored.savedAt, '2026-06-11T00:00:00Z');

// Corrupt or cleared storage yields null rather than a crash.
assert.equal(parseDraft(null), null);
assert.equal(parseDraft('{broken json'), null);
assert.equal(parseDraft('"just a string"'), null);

// Draft detection ignores whitespace-only values.
assert.equal(draftHasContent(emptyIntakeForm(), '  '), false);
assert.equal(draftHasContent(form, ''), true);

// Extraction populates only empty fields and surfaces flags.
const extraction = applyExtractedFields(
  { ...emptyIntakeForm(), full_name: 'Already Typed' },
  {
    full_name: 'Extracted Name',
    email: 'extracted@example.com',
    abn: null,
    _extraction: { flagged_fields: ['abn', 'email'] },
  },
);
assert.equal(extraction.values.full_name, 'Already Typed'); // user input preserved
assert.equal(extraction.values.email, 'extracted@example.com');
assert.deepEqual(extraction.populated, ['email']);
assert.deepEqual(extraction.flagged, ['abn', 'email']);

// Required-field validation includes the submitter name.
const missing = missingRequiredFields(emptyIntakeForm(), '');
assert.ok(missing.includes('Your name'));
assert.ok(missing.includes('Full legal name'));
assert.deepEqual(
  missingRequiredFields(
    { ...emptyIntakeForm(), full_name: 'J', email: 'j@e.co', phone: '04', services_needed: 'Tax' },
    'Jane',
  ),
  [],
);

// Submission payload drops empty fields and trims values.
assert.deepEqual(buildSubmissionFields({ a: ' x ', b: '', c: '  ' }), { a: 'x' });

console.log('intakeFormModel tests passed');
