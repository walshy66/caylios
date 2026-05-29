# SimpleTS

SimpleTS is a local-first MVP dashboard for managing AI coding-agent sessions from a laptop.

## MVP goal

Build a simple browser-based dashboard that can:

- Create coding-agent sessions
- Store session metadata locally
- Start a local process for a session
- Save session logs
- Show session history and logs in the UI

## Current scope

This first version is deliberately local-only.

Included:

- FastAPI backend
- React + Vite + TypeScript frontend
- SQLite persistence
- Local subprocess runner
- Local `data/` and `logs/` folders

Excluded for now:

- Docker worker containers
- NAS deployment
- Multi-user authentication
- Linear automation
- GitHub PR automation
- Multiple harness handoff

## Planned local run flow

Run the backend and frontend in two separate terminals. The frontend UI needs the backend running for sessions, history, actions, and logs.

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

If `uvicorn` is not on your PATH, use:

```bash
python -m uvicorn app.main:app --reload
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed by the frontend, usually:

```text
http://localhost:5173
```

On Windows PowerShell from this repo path, the quick-start commands are:

```powershell
cd C:\Users\camer\Documents\simplets\backend
uvicorn app.main:app --reload
```

```powershell
cd C:\Users\camer\Documents\simplets\frontend
npm run dev
```

## Folder structure

```text
simplets/
  backend/
    app/
      main.py
      db.py
      models.py
      schemas.py
      sessions.py
      runner.py
    requirements.txt
  frontend/
    package.json
    index.html
    src/
      App.tsx
      main.tsx
      api.ts
      components/
        SessionList.tsx
        SessionCreateForm.tsx
        SessionDetail.tsx
  data/
    .gitkeep
  logs/
    .gitkeep
```
