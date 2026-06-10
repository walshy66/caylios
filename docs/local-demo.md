# Local Demo Path

This demo path uses only `demo/synthetic-client-intake.txt`. It contains fictional data and requires no real client PII.

## Start the app locally

Backend:

```powershell
cd C:\Users\camer\Documents\simplets\backend
py -3.13 -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd C:\Users\camer\Documents\simplets\frontend
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## End-to-end demo flow

1. In **Upload document**, choose `demo/synthetic-client-intake.txt`.
2. Select an intent such as **Extract action items**.
3. Click **Create workflow run** to upload the synthetic document.
4. Click **Run AI extraction** and confirm extraction completes with suggested fields.
5. In **Shared review queue**, refresh the queue and open the pending workflow run.
6. Review the source preview and editable extracted data.
7. Edit the extracted JSON fields if desired, then save the edit.
8. Click **Approve reviewed run**.
9. Before approval, use the export endpoints if needed:
   - `GET http://127.0.0.1:8000/workflow-runs/{workflow_run_id}/export?format=json`
   - `GET http://127.0.0.1:8000/workflow-runs/{workflow_run_id}/export?format=csv`
10. Approval performs a mock writeback and returns a mock destination record id.
11. Confirm the audit summary on the approved workflow run includes reviewer, destination, export formats, destination record id, and source deletion status.

## Expected outcome

The local demo shows upload, intent selection, extraction, review, edit, approve, export/mock writeback, and audit summary without requiring any private customer data.
