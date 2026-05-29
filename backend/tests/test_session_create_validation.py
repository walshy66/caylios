import pytest
from pydantic import ValidationError

from app.schemas import SessionCreate


def test_test_harness_accepts_title_without_agent_inputs():
    payload = SessionCreate(title="Test session", harness="test")

    assert payload.title == "Test session"
    assert payload.repo_path is None
    assert payload.prompt is None


@pytest.mark.parametrize("harness", ["codex", "pi"])
def test_agent_harness_requires_repo_path_prompt_and_model(harness):
    with pytest.raises(ValidationError):
        SessionCreate(title="Agent session", harness=harness, prompt="Do work", model="gpt-5")

    with pytest.raises(ValidationError):
        SessionCreate(title="Agent session", harness=harness, repo_path="/tmp/repo", model="gpt-5")

    with pytest.raises(ValidationError):
        SessionCreate(title="Agent session", harness=harness, repo_path="/tmp/repo", prompt="Do work")

    payload = SessionCreate(
        title="Agent session",
        harness=harness,
        repo_path="/tmp/repo",
        prompt="Do work",
        model="gpt-5",
    )

    assert payload.repo_path == "/tmp/repo"
    assert payload.prompt == "Do work"
    assert payload.model == "gpt-5"
