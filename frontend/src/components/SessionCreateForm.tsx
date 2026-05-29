import { FormEvent, useState } from 'react';
import { createSession, Session } from '../api';
import { buildSessionCreatePayload, canSubmitSessionCreateForm, requiresAgentInputs } from '../sessionCreateModel';

type Props = {
  onCreated: (session: Session) => void;
};

export default function SessionCreateForm({ onCreated }: Props) {
  const [harness, setHarness] = useState<Session['harness']>('test');
  const [title, setTitle] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showAgentInputs = requiresAgentInputs(harness);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const values = { harness, title, repoPath, prompt, model };
    if (!canSubmitSessionCreateForm(values)) return;

    setIsSubmitting(true);
    try {
      const session = await createSession(buildSessionCreatePayload(values));
      setTitle('');
      setRepoPath('');
      setPrompt('');
      setModel('gpt-5');
      onCreated(session);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel session-create-form" onSubmit={handleSubmit}>
      <h2>Create session</h2>
      <label>
        Session type
        <select className="form-control" value={harness} onChange={(event) => setHarness(event.target.value as Session['harness'])}>
          <option value="test">Test</option>
          <option value="codex">Codex</option>
          <option value="pi">Pi</option>
        </select>
      </label>
      <label>
        Title
        <input className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      {showAgentInputs ? (
        <>
          <label>
            Repo path
            <input className="form-control" required value={repoPath} onChange={(event) => setRepoPath(event.target.value)} />
          </label>
          <label>
            Model
            <select className="form-control" required value={model} onChange={(event) => setModel(event.target.value)}>
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-5-codex">GPT-5 Codex</option>
              <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
            </select>
          </label>
          <label>
            Prompt
            <textarea className="form-control" required value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
          </label>
        </>
      ) : null}
      <button type="submit" disabled={isSubmitting || !canSubmitSessionCreateForm({ harness, title, repoPath, prompt, model })}>{isSubmitting ? 'Creating...' : 'Create'}</button>
    </form>
  );
}
