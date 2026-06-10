import { useEffect, useState } from 'react';
import {
  approveReviewRun,
  getReviewRun,
  listReviewQueue,
  ReviewQueueItem,
  ReviewRunDetail,
  updateReviewFields,
} from '../api';
import {
  canApproveReviewRun,
  canSaveExtractedFields,
  formatApprovalCompletion,
  formatSourcePreview,
  parseEditableFields,
} from '../reviewQueueModel';

const CURRENT_REVIEWER = 'local-reviewer';

export default function ReviewQueuePanel() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [selected, setSelected] = useState<ReviewRunDetail | null>(null);
  const [fieldsDraft, setFieldsDraft] = useState('{}');
  const [hasOpenedExtractedDataScreen, setHasOpenedExtractedDataScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [approvalCompletion, setApprovalCompletion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshQueue() {
    setError(null);
    try {
      setQueue(await listReviewQueue());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review queue failed to load');
    }
  }

  useEffect(() => {
    refreshQueue();
  }, []);

  async function openRun(workflowRunId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await getReviewRun(workflowRunId);
      setApprovalCompletion(null);
      setSelected(detail);
      setFieldsDraft(JSON.stringify(detail.extracted_fields ?? {}, null, 2));
      setHasOpenedExtractedDataScreen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workflow run failed to open');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveFields() {
    if (!selected || !canSaveExtractedFields(fieldsDraft)) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const workflowRun = await updateReviewFields(selected.id, CURRENT_REVIEWER, parseEditableFields(fieldsDraft));
      setSelected({ ...selected, ...workflowRun });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extracted fields failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  async function approveSelected() {
    if (!selected || !canApproveReviewRun({ hasOpenedExtractedDataScreen, fieldsAreValid: canSaveExtractedFields(fieldsDraft) })) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const approvedRun = await approveReviewRun(selected.id, CURRENT_REVIEWER);
      setApprovalCompletion(formatApprovalCompletion(approvedRun));
      setSelected(null);
      await refreshQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workflow run failed to approve');
    } finally {
      setIsSaving(false);
    }
  }

  const fieldsAreValid = canSaveExtractedFields(fieldsDraft);

  return (
    <section className="panel review-queue-panel" aria-labelledby="review-queue-title">
      <h2 id="review-queue-title">Shared review queue</h2>
      <button type="button" onClick={refreshQueue} disabled={isLoading || isSaving}>
        Refresh queue
      </button>
      {error ? <p className="session-error">{error}</p> : null}
      {approvalCompletion ? <p className="session-status">{approvalCompletion}</p> : null}
      <div className="review-queue-layout">
        <div>
          <h3>Pending workflow runs</h3>
          {queue.length === 0 ? <p>No pending workflow runs.</p> : null}
          <div className="review-run-list">
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                className="review-run-card"
                onClick={() => openRun(item.id)}
                aria-pressed={selected?.id === item.id}
              >
                <strong>{item.document.filename}</strong>
                <span>{item.suggested_classification || item.intent}</span>
                <small>Uploaded by {item.document.uploader}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="review-detail">
          <h3>Source preview and extracted data</h3>
          {selected ? (
            <>
              <p>
                Reviewing {selected.document.filename} as {CURRENT_REVIEWER}. Retention expires{' '}
                {new Date(selected.document.retention_expires_at).toLocaleString()}.
              </p>
              <pre className="source-preview">{formatSourcePreview(selected.source_preview)}</pre>
              <label>
                Editable extracted fields
                <textarea
                  className="form-control"
                  value={fieldsDraft}
                  rows={8}
                  onChange={(event) => setFieldsDraft(event.target.value)}
                />
              </label>
              {!fieldsAreValid ? <p className="session-error">Extracted fields must be a JSON object.</p> : null}
              <div className="review-actions">
                <button type="button" onClick={saveFields} disabled={!fieldsAreValid || isSaving}>
                  {isSaving ? 'Saving…' : 'Save extracted fields'}
                </button>
                <button
                  type="button"
                  onClick={approveSelected}
                  disabled={!canApproveReviewRun({ hasOpenedExtractedDataScreen, fieldsAreValid }) || isSaving}
                >
                  Approve reviewed run
                </button>
              </div>
            </>
          ) : (
            <p>Open a pending run to review the source document and extracted fields before approval.</p>
          )}
        </div>
      </div>
    </section>
  );
}
