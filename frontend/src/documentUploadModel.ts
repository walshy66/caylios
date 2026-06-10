export type DocumentUploadFormState = {
  intent: string;
  uploader: string;
  files: File[];
};

export function canSubmitDocumentUpload(state: DocumentUploadFormState): boolean {
  return Boolean(state.intent.trim() && state.uploader.trim() && state.files.length > 0);
}

export function buildDocumentUploadFormData(state: DocumentUploadFormState, file: File = state.files[0]): FormData {
  if (!file) {
    throw new Error('file is required');
  }

  const formData = new FormData();
  formData.append('intent', state.intent.trim());
  formData.append('uploader', state.uploader.trim());
  formData.append('file', file);
  return formData;
}

export type WorkflowRunExtractionState = {
  extraction_status: 'created' | 'running' | 'completed' | 'errored' | null;
  extraction_error: string | null;
};

export function getWorkflowRunExtractionSummary(workflowRun: WorkflowRunExtractionState): string {
  if (workflowRun.extraction_status === 'completed') {
    return 'Extraction completed';
  }
  if (workflowRun.extraction_status === 'errored') {
    return `Extraction failed: ${workflowRun.extraction_error || 'Unknown error'}`;
  }
  if (workflowRun.extraction_status === 'running') {
    return 'Extraction running';
  }
  return 'Extraction not started';
}
