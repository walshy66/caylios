import importlib

from fastapi.testclient import TestClient

from app import db
from app.main import app


def use_temp_db(monkeypatch, tmp_path):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "simplets.sqlite3")


def test_sessions_persist_across_app_client_restart(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    with TestClient(app) as client:
        created = client.post(
            "/sessions",
            json={"title": "Persist me", "repo_path": "/repo", "harness": "test", "prompt": "do work"},
        ).json()

    with TestClient(app) as restarted_client:
        listed = restarted_client.get("/sessions").json()
        fetched = restarted_client.get(f"/sessions/{created['id']}").json()

    assert [session["id"] for session in listed] == [created["id"]]
    assert fetched["title"] == "Persist me"
    assert fetched["log_path"] is None


def test_session_history_can_be_queried_by_status_harness_and_text(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    with TestClient(app) as client:
        keep = client.post(
            "/sessions",
            json={"title": "Alpha build", "repo_path": "/alpha", "harness": "pi", "prompt": "ship history", "model": "claude-sonnet-4.5"},
        ).json()
        client.post(
            "/sessions",
            json={"title": "Beta build", "repo_path": "/beta", "harness": "codex", "prompt": "other work", "model": "gpt-5-codex"},
        )

    from app.sessions import update_status
    from app.models import SessionStatus

    update_status(keep["id"], SessionStatus.COMPLETED)

    with TestClient(app) as restarted_client:
        matches = restarted_client.get("/sessions", params={"status": "completed", "harness": "pi", "q": "history"}).json()
        misses = restarted_client.get("/sessions", params={"status": "completed", "harness": "codex"}).json()

    assert [session["id"] for session in matches] == [keep["id"]]
    assert misses == []


def test_session_status_updates_are_persisted(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    with TestClient(app) as client:
        created = client.post("/sessions", json={"title": "Status", "harness": "test"}).json()

    from app.sessions import update_status
    from app.models import SessionStatus

    update_status(created["id"], SessionStatus.COMPLETED)

    with TestClient(app) as restarted_client:
        fetched = restarted_client.get(f"/sessions/{created['id']}").json()

    assert fetched["status"] == "completed"


def test_start_session_creates_git_branch_and_persists_branch_name(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    repo_path = tmp_path / "repo"
    repo_path.mkdir()

    import subprocess

    subprocess.run(["git", "init", "-b", "main"], cwd=repo_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_path, check=True)
    (repo_path / "README.md").write_text("# Test\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=repo_path, check=True)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=repo_path, check=True, capture_output=True)

    with TestClient(app) as client:
        created = client.post(
            "/sessions",
            json={
                "title": "Branch me!!!",
                "repo_path": str(repo_path),
                "harness": "pi",
                "prompt": "do work",
                "model": "claude-sonnet-4.5",
            },
        ).json()

        started = client.post(f"/sessions/{created['id']}/start").json()
        fetched = client.get(f"/sessions/{created['id']}").json()

    branch_name = "sts/branch-me"
    current_branch = subprocess.run(
        ["git", "branch", "--show-current"], cwd=repo_path, check=True, capture_output=True, text=True
    ).stdout.strip()

    assert started["branch_name"] == branch_name
    assert fetched["branch_name"] == branch_name
    assert current_branch == branch_name


def test_restart_running_session_replaces_process_and_keeps_session_running(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")
    terminated = []

    class FakeProcess:
        def __init__(self):
            self.return_code = 0

        def wait(self):
            import time

            time.sleep(60)
            return self.return_code

        def terminate(self):
            terminated.append(self)
            self.return_code = -15

    monkeypatch.setattr(runner.subprocess, "Popen", lambda *args, **kwargs: FakeProcess())

    with TestClient(app) as client:
        created = client.post("/sessions", json={"title": "Restartable", "harness": "test"}).json()
        client.post(f"/sessions/{created['id']}/start").json()
        restarted = client.post(f"/sessions/{created['id']}/restart").json()

    assert restarted["status"] == "running"
    assert len(terminated) == 1


def test_resume_stopped_session_starts_process_again(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")
    process_count = 0

    class FakeProcess:
        def wait(self):
            import time

            time.sleep(60)
            return 0

        def terminate(self):
            pass

    def fake_popen(*args, **kwargs):
        nonlocal process_count
        process_count += 1
        return FakeProcess()

    monkeypatch.setattr(runner.subprocess, "Popen", fake_popen)

    with TestClient(app) as client:
        created = client.post("/sessions", json={"title": "Resumable", "harness": "test"}).json()
        client.post(f"/sessions/{created['id']}/start")
        stopped = client.post(f"/sessions/{created['id']}/stop").json()
        resumed = client.post(f"/sessions/{created['id']}/resume").json()

    assert stopped["status"] == "stopped"
    assert resumed["status"] == "running"
    assert process_count == 2


def test_completed_session_persists_output_tail_for_history_reload(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")

    with TestClient(app) as client:
        created = client.post("/sessions", json={"title": "History", "harness": "test"}).json()
        client.post(f"/sessions/{created['id']}/start")

        import time

        fetched = created
        deadline = time.time() + 5
        while time.time() < deadline and fetched["status"] in {"created", "running"}:
            time.sleep(0.1)
            fetched = client.get(f"/sessions/{created['id']}").json()

    with TestClient(app) as restarted_client:
        reloaded = restarted_client.get(f"/sessions/{created['id']}").json()

    assert reloaded["status"] == "completed"
    assert "SimpleTS session started" in reloaded["output_tail"]
    assert "SimpleTS session complete" in reloaded["output_tail"]
    assert reloaded["error_message"] is None


def test_failed_session_persists_error_message_and_output_tail(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")
    monkeypatch.setattr(
        runner,
        "build_test_session_command",
        lambda: ["python", "-c", "import sys; print('before failure'); print('boom', file=sys.stderr); sys.exit(7)"],
    )

    with TestClient(app) as client:
        created = client.post("/sessions", json={"title": "Failure", "harness": "test"}).json()
        client.post(f"/sessions/{created['id']}/start")

        import time

        fetched = created
        deadline = time.time() + 5
        while time.time() < deadline and fetched["status"] in {"created", "running"}:
            time.sleep(0.1)
            fetched = client.get(f"/sessions/{created['id']}").json()

    with TestClient(app) as restarted_client:
        reloaded = restarted_client.get(f"/sessions/{created['id']}").json()

    assert reloaded["status"] == "errored"
    assert "before failure" in reloaded["output_tail"]
    assert "boom" in reloaded["output_tail"]
    assert reloaded["error_message"] == "Process exited with code 7"


def test_start_session_runs_local_process_and_writes_log(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")

    with TestClient(app) as client:
        created = client.post("/sessions", json={"title": "Runnable", "harness": "test"}).json()

        started = client.post(f"/sessions/{created['id']}/start").json()
        assert started["status"] == "running"
        assert started["log_path"].endswith(f"{created['id']}.log")

        import time

        fetched = started
        deadline = time.time() + 5
        while time.time() < deadline and fetched["status"] == "running":
            time.sleep(0.1)
            fetched = client.get(f"/sessions/{created['id']}").json()

        logs = client.get(f"/sessions/{created['id']}/logs").json()

    assert fetched["status"] == "completed"
    assert "SimpleTS session started" in logs["logs"]
    assert "SimpleTS session complete" in logs["logs"]


def test_start_session_runs_pi_harness_locally_from_repo_path(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    repo_path = tmp_path / "repo"
    repo_path.mkdir()

    import subprocess

    subprocess.run(["git", "init", "-b", "main"], cwd=repo_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_path, check=True)
    (repo_path / "README.md").write_text("# Test\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=repo_path, check=True)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=repo_path, check=True, capture_output=True)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")
    monkeypatch.setenv("SIMPLETS_PI_COMMAND", "python -c \"import os; print('pi local ' + os.getcwd())\"")

    with TestClient(app) as client:
        created = client.post(
            "/sessions",
            json={
                "title": "Local pi",
                "repo_path": str(repo_path),
                "harness": "pi",
                "prompt": "do work",
                "model": "claude-sonnet-4.5",
            },
        ).json()
        client.post(f"/sessions/{created['id']}/start")

        import time

        fetched = created
        deadline = time.time() + 5
        while time.time() < deadline and fetched["status"] in {"created", "running"}:
            time.sleep(0.1)
            fetched = client.get(f"/sessions/{created['id']}").json()
        logs = client.get(f"/sessions/{created['id']}/logs").json()

    assert fetched["status"] == "completed"
    assert f"pi local {repo_path}" in logs["logs"]


def test_start_session_surfaces_missing_local_harness_command(monkeypatch, tmp_path):
    use_temp_db(monkeypatch, tmp_path)
    repo_path = tmp_path / "repo"
    repo_path.mkdir()

    import subprocess

    subprocess.run(["git", "init", "-b", "main"], cwd=repo_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_path, check=True)
    (repo_path / "README.md").write_text("# Test\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=repo_path, check=True)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=repo_path, check=True, capture_output=True)

    from app import runner

    monkeypatch.setattr(runner, "LOGS_DIR", tmp_path / "logs")
    monkeypatch.setenv("SIMPLETS_PI_COMMAND", "definitely-not-a-simplets-command")

    with TestClient(app) as client:
        created = client.post(
            "/sessions",
            json={
                "title": "Missing pi",
                "repo_path": str(repo_path),
                "harness": "pi",
                "prompt": "do work",
                "model": "claude-sonnet-4.5",
            },
        ).json()
        started = client.post(f"/sessions/{created['id']}/start").json()
        logs = client.get(f"/sessions/{created['id']}/logs").json()

    assert started["status"] == "errored"
    assert "Failed to start harness" in started["error_message"]
    assert "definitely-not-a-simplets-command" in logs["logs"]
