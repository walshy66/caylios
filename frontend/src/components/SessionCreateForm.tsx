import { FormEvent, useState } from 'react';
import { createSession, Session } from '../api';

type Props = {
  onCreated: (session: Session) => void;
};

export default function SessionCreateForm({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const session = await createSession({
        title,
        repo_path: repoPath || undefined,
        harness: 'test',
        prompt: prompt || undefined,
      });
      setTitle('');
      setRepoPath('');
      setPrompt('');
      onCreated(session);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <h2>Create session</h2>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8 }} />
      </label>
      <label>
        Repo path
        <input value={repoPath} onChange={(event) => setRepoPath(event.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8 }} />
      </label>
      <label>
        Prompt
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} style={{ display: 'block', width: '100%', minHeight: 80, marginBottom: 8 }} />
      </label>
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</button>
    </form>
  );
}
