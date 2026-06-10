export type SourcePreview = {
  available: boolean;
  content: string | null;
  reason: string | null;
};

export type ReviewApprovalState = {
  hasOpenedExtractedDataScreen: boolean;
  fieldsAreValid: boolean;
};

export type ApprovalCompletion = {
  destination_record_id: string | null;
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

export function formatApprovalCompletion(completion: ApprovalCompletion): string {
  if (!completion.destination_record_id) {
    return 'Approved; no destination record was returned.';
  }
  return `Approved and written to mock destination record ${completion.destination_record_id}.`;
}
