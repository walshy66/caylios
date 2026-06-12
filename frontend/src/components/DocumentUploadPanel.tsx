import { FormEvent, useState } from 'react';
import { DocumentUploadResult, deleteWorkflowRun, extractWorkflowRun, uploadDocument } from '../api';
import { buildDocumentUploadFormData, canSubmitDocumentUpload, getWorkflowRunExtractionSummary } from '../documentUploadModel';

const INTENT_OPTIONS = [
  { value: 'summarize', label: 'Summarize document' },
  { value: 'extract_actions', label: 'Extract action items' },
  { value: 'review', label: 'Review for follow-up' },
];

type Props = {
  onUploaded?: (result: DocumentUploadResult) => void;
};

export default function DocumentUploadPanel({ onUploaded }: Props) {
  const [intent, setIntent] = useState(INTENT_OPTIONS[0].value);
  const [uploader, setUploader] = useState('local-user');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUploads, setLastUploads] = useState<DocumentUploadResult[]>([]);

  const formState = { intent, uploader, files };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitDocumentUpload(formState)) {
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const results = await Promise.all(files.map((selectedFile) => uploadDocument(buildDocumentUploadFormData(formState, selectedFile))));
      setLastUploads((currentUploads) => [...currentUploads, ...results]);
      setFiles([]);
      results.forEach((result) => onUploaded?.(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleExtract() {
    if (lastUploads.length === 0) {
      return;
    }

    setIsExtracting(true);
    setError(null);
    try {
      const updatedUploads = await Promise.all(
        lastUploads.map(async (upload) => ({ ...upload, workflow_run: await extractWorkflowRun(upload.workflow_run.id) })),
      );
      setLastUploads(updatedUploads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  }

  function addSelectedFiles(selectedFiles: File[]) {
    setFiles((currentFiles) => {
      const existingFileKeys = new Set(currentFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const newFiles = selectedFiles.filter((file) => !existingFileKeys.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...currentFiles, ...newFiles];
    });
  }

  function removeSelectedFile(indexToRemove: number) {
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
  }

  async function deleteUploadedRun(upload: DocumentUploadResult) {
    setError(null);
    try {
      await deleteWorkflowRun(upload.workflow_run.id);
      setLastUploads((currentUploads) => currentUploads.filter((currentUpload) => currentUpload.workflow_run.id !== upload.workflow_run.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <section className="panel document-upload-panel" aria-labelledby="document-upload-title">
      <h2 id="document-upload-title">Upload document</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Intent
          <select className="form-control" value={intent} onChange={(event) => setIntent(event.target.value)}>
            {INTENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Uploader
          <input className="form-control" value={uploader} onChange={(event) => setUploader(event.target.value)} />
        </label>
        <label
          className={`document-drop-zone${isDragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addSelectedFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <span>{files.length > 0 ? `${files.length} document${files.length === 1 ? '' : 's'} selected` : 'Drag documents here or choose files'}</span>
          <input
            type="file"
            multiple
            onChange={(event) => {
              addSelectedFiles(Array.from(event.target.files ?? []));
              event.currentTarget.value = '';
            }}
            aria-label="Choose documents to upload"
          />
        </label>
        {files.length > 0 ? (
          <ul className="selected-document-list" aria-label="Selected documents">
            {files.map((selectedFile, index) => (
              <li key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`}>
                <span>{selectedFile.name}</span>
                <button type="button" onClick={() => removeSelectedFile(index)} aria-label={`Remove ${selectedFile.name}`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="submit" disabled={!canSubmitDocumentUpload(formState) || isUploading}>
          {isUploading ? 'Uploading…' : `Create ${files.length > 1 ? `${files.length} workflow runs` : 'workflow run'}`}
        </button>
      </form>
      {error ? <p className="session-error">{error}</p> : null}
      {lastUploads.length > 0 ? (
        <div className="upload-success">
          <p>Created {lastUploads.length} workflow run{lastUploads.length === 1 ? '' : 's'}.</p>
          <button type="button" onClick={handleExtract} disabled={isExtracting}>
            {isExtracting ? 'Extracting…' : 'Run AI extraction'}
          </button>
          {lastUploads.map((upload) => (
            <div key={upload.workflow_run.id} className="upload-result">
              <p>
                Created workflow run {upload.workflow_run.id} for {upload.document.filename}. Temporary retention expires{' '}
                {new Date(upload.document.retention_expires_at).toLocaleString()}.
              </p>
              <button type="button" onClick={() => deleteUploadedRun(upload)}>
                Delete uploaded document
              </button>
              <p>{getWorkflowRunExtractionSummary(upload.workflow_run)}</p>
              {upload.workflow_run.suggested_classification ? (
                <p>Suggested classification: {upload.workflow_run.suggested_classification}</p>
              ) : null}
              {upload.workflow_run.extracted_fields ? (
                <label>
                  Editable extracted fields
                  <textarea
                    className="form-control"
                    defaultValue={JSON.stringify(upload.workflow_run.extracted_fields, null, 2)}
                    rows={6}
                  />
                </label>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
