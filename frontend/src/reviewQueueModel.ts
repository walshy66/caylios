export type SourcePreview = {
  available: boolean;
  content: string | null;
  reason: string | null;
};

export type ReviewApprovalState = {
  hasOpenedExtractedDataScreen: boolean;
  fieldsAreValid: boolean;
};

export type PushOutcome = {
  provider: string;
  status: 'pending' | 'succeeded' | 'failed';
  destination_record_id: string | null;
  error_message: string | null;
};

export type ApprovalOutcome = {
  all_succeeded: boolean;
  destination_pushes: PushOutcome[];
};

export function parseEditableFields(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('extracted fields must be valid JSON');
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('extracted fields must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}

export function canSaveExtractedFields(value: string): boolean {
  try {
    parseEditableFields(value);
    return true;
  } catch {
    return false;
  }
}

export function canApproveReviewRun(state: ReviewApprovalState): boolean {
  return state.hasOpenedExtractedDataScreen && state.fieldsAreValid;
}

export function formatSourcePreview(sourcePreview: SourcePreview): string {
  if (sourcePreview.available) {
    return sourcePreview.content || '';
  }
  return `Source unavailable: ${sourcePreview.reason || 'not available'}`;
}

export function formatApprovalOutcome(outcome: ApprovalOutcome): string {
  if (outcome.all_succeeded) {
    const records = outcome.destination_pushes
      .filter((push) => push.destination_record_id)
      .map((push) => `${push.provider}: ${push.destination_record_id}`);
    const suffix = records.length > 0 ? ` (${records.join(', ')})` : '';
    return `Approved. Data pushed to all destinations and purged from SimpleTS${suffix}.`;
  }
  const failed = outcome.destination_pushes.filter((push) => push.status === 'failed');
  const failures = failed.map((push) => `${push.provider}: ${push.error_message ?? 'push failed'}`).join('; ');
  return `Some destinations failed — data is retained until resolved. ${failures}`;
}

/** Names of fields the extraction flagged for reviewer attention. */
export function flaggedFieldNames(extractedFields: Record<string, unknown> | null): string[] {
  if (!extractedFields) {
    return [];
  }
  const meta = extractedFields['_extraction'] as { flagged_fields?: unknown } | undefined;
  if (!meta || !Array.isArray(meta.flagged_fields)) {
    return [];
  }
  return meta.flagged_fields.filter((name): name is string => typeof name === 'string');
}

export function flagReason(extractedFields: Record<string, unknown> | null, fieldName: string): string | null {
  if (!extractedFields) {
    return null;
  }
  const meta = extractedFields['_extraction'] as
    | { field_details?: Record<string, { flag_reason?: string | null }> }
    | undefined;
  return meta?.field_details?.[fieldName]?.flag_reason ?? null;
}

export function hasFailedPushes(pushes: PushOutcome[]): boolean {
  return pushes.some((push) => push.status === 'failed');
}
