export type IntakeFieldDefinition = {
  name: string;
  label: string;
  section: string;
  required: boolean;
  type: 'text' | 'email' | 'tel' | 'date' | 'textarea';
};

export const INTAKE_DRAFT_STORAGE_KEY = 'caylios.coachcwIntakeDraft.v1';
export const INTAKE_INTENT = 'client_intake';

// CoachCW client engagement intake — hardcoded per COA-275 (no form builder in v1).
export const INTAKE_FIELDS: IntakeFieldDefinition[] = [
  { name: 'full_name', label: 'Full legal name', section: 'Identity', required: true, type: 'text' },
  { name: 'date_of_birth', label: 'Date of birth', section: 'Identity', required: false, type: 'date' },
  { name: 'email', label: 'Email address', section: 'Identity', required: true, type: 'email' },
  { name: 'phone', label: 'Phone number', section: 'Identity', required: true, type: 'tel' },
  { name: 'address', label: 'Residential address', section: 'Identity', required: false, type: 'textarea' },
  { name: 'business_name', label: 'Business / trading name', section: 'Business', required: false, type: 'text' },
  { name: 'abn', label: 'ABN', section: 'Business', required: false, type: 'text' },
  { name: 'tfn', label: 'Tax file number', section: 'ATO', required: false, type: 'text' },
  { name: 'ato_reference', label: 'ATO reference / notice number', section: 'ATO', required: false, type: 'text' },
  { name: 'services_needed', label: 'Services needed', section: 'Engagement', required: true, type: 'textarea' },
  { name: 'notes', label: 'Anything else we should know', section: 'Engagement', required: false, type: 'textarea' },
];

export type IntakeFormValues = Record<string, string>;

export function emptyIntakeForm(): IntakeFormValues {
  return Object.fromEntries(INTAKE_FIELDS.map((field) => [field.name, '']));
}

export function intakeSections(): string[] {
  const seen: string[] = [];
  for (const field of INTAKE_FIELDS) {
    if (!seen.includes(field.section)) {
      seen.push(field.section);
    }
  }
  return seen;
}

export type IntakeDraft = {
  values: IntakeFormValues;
  submitter: string;
  savedAt: string;
};

export function serializeDraft(values: IntakeFormValues, submitter: string, savedAt: string): string {
  return JSON.stringify({ values, submitter, savedAt } satisfies IntakeDraft);
}

export function parseDraft(raw: string | null): IntakeDraft | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<IntakeDraft>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.values !== 'object' || !parsed.values) {
      return null;
    }
    return {
      values: { ...emptyIntakeForm(), ...parsed.values },
      submitter: typeof parsed.submitter === 'string' ? parsed.submitter : '',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function draftHasContent(values: IntakeFormValues, submitter: string): boolean {
  return submitter.trim() !== '' || Object.values(values).some((value) => value.trim() !== '');
}

export type ExtractionApplication = {
  values: IntakeFormValues;
  populated: string[];
  flagged: string[];
};

/** Populate empty form fields from extraction output. User-entered values are
 * never overwritten; flagged fields are reported so the UI can call them out. */
export function applyExtractedFields(
  current: IntakeFormValues,
  extracted: Record<string, unknown>,
): ExtractionApplication {
  const meta = extracted['_extraction'] as { flagged_fields?: string[] } | undefined;
  const flagged = meta?.flagged_fields ?? [];
  const values = { ...current };
  const populated: string[] = [];

  for (const field of INTAKE_FIELDS) {
    const incoming = extracted[field.name];
    if (incoming === null || incoming === undefined || incoming === '') {
      continue;
    }
    if ((values[field.name] ?? '').trim() !== '') {
      continue;
    }
    values[field.name] = String(incoming);
    populated.push(field.name);
  }

  return { values, populated, flagged: flagged.filter((name) => name in values) };
}

export function missingRequiredFields(values: IntakeFormValues, submitter: string): string[] {
  const missing = INTAKE_FIELDS.filter(
    (field) => field.required && (values[field.name] ?? '').trim() === '',
  ).map((field) => field.label);
  if (submitter.trim() === '') {
    missing.unshift('Your name');
  }
  return missing;
}

export function buildSubmissionFields(values: IntakeFormValues): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value !== ''),
  );
}
