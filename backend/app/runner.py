import os
import shlex
import subprocess
import threading
from pathlib import Path
from typing import Callable

from app.db import ROOT_DIR
from app.models import Harness, SessionStatus

LOGS_DIR = ROOT_DIR / "logs"
_processes: dict[str, subprocess.Popen] = {}
OUTPUT_TAIL_LIMIT = 12000


def build_test_session_command() -> list[str]:
    return [
        "python",
        "-c",
        "import time; print('SimpleTS session started', flush=True); time.sleep(3); print('SimpleTS session complete', flush=True)",
    ]


def read_output_tail(log_path: Path) -> str:
    if not log_path.exists():
        return ""
    return log_path.read_text(encoding="utf-8", errors="replace")[-OUTPUT_TAIL_LIMIT:]


def build_pi_harness_command(prompt: str, model: str) -> list[str]:
    command_template = os.getenv("SIMPLETS_PI_COMMAND", "pi")
    command = shlex.split(command_template)
    command.extend(["--model", model, prompt])
    return command


def start_session_process(
    session_id: str,
    harness: Harness,
    repo_path: str | None,
    prompt: str | None,
    model: str | None,
    on_complete: Callable[[str, SessionStatus, str | None, str | None], None],
) -> Path:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOGS_DIR / f"{session_id}.log"

    cwd = None
    if harness == Harness.TEST:
        command = build_test_session_command()
    elif harness == Harness.PI:
        if repo_path is None or prompt is None or model is None:
            raise ValueError("repo_path, prompt, and model are required for the Pi harness")
        cwd = Path(repo_path)
        command = build_pi_harness_command(prompt, model)
    else:
        raise ValueError(f"Unsupported local harness: {harness.value}")

    log_file = log_path.open("w", encoding="utf-8")
    try:
        process = subprocess.Popen(command, cwd=cwd, stdout=log_file, stderr=subprocess.STDOUT)
    except OSError as exc:
        message = f"Failed to start harness command {command[0]!r}: {exc}"
        log_file.write(message + "\n")
        log_file.close()
        on_complete(session_id, SessionStatus.ERRORED, read_output_tail(log_path), message)
        return log_path
    _processes[session_id] = process

    def wait_for_process() -> None:
        try:
            return_code = process.wait()
            if _processes.get(session_id) is process:
                status = SessionStatus.COMPLETED if return_code == 0 else SessionStatus.ERRORED
                error_message = None if return_code == 0 else f"Process exited with code {return_code}"
                on_complete(session_id, status, read_output_tail(log_path), error_message)
        finally:
            log_file.close()
            if _processes.get(session_id) is process:
                _processes.pop(session_id, None)

    threading.Thread(target=wait_for_process, daemon=True).start()
    return log_path


def start_test_session(session_id: str, on_complete: Callable[[str, SessionStatus, str | None, str | None], None]) -> Path:
    return start_session_process(session_id, Harness.TEST, None, None, None, on_complete)


def has_active_process(session_id: str) -> bool:
    return session_id in _processes


def stop_session(session_id: str) -> bool:
    process = _processes.get(session_id)
    if not process:
        return False
    process.terminate()
    _processes.pop(session_id, None)
    return True
