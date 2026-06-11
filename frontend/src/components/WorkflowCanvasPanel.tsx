import { useEffect, useState } from 'react';
import { getWorkflowCanvas } from '../api';

/** Embedded workflow canvas (COA-284). Renders the white-labeled workflow
 * engine inside STS navigation. The embed URL is issued by the backend only to
 * authenticated workspace admins. */
export default function WorkflowCanvasPanel() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkflowCanvas()
      .then((canvas) => {
        if (!cancelled) {
          setEmbedUrl(canvas.embed_url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotice('Workflow canvas is not available — it may not be configured yet, or your role does not include workflow management.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (notice) {
    return (
      <section className="panel workflow-canvas-panel" aria-labelledby="workflow-canvas-title">
        <h2 id="workflow-canvas-title">Workflow canvas</h2>
        <p>{notice}</p>
      </section>
    );
  }

  if (!embedUrl) {
    return null;
  }

  return (
    <section className="panel workflow-canvas-panel" aria-labelledby="workflow-canvas-title">
      <h2 id="workflow-canvas-title">Workflow canvas</h2>
      <iframe className="workflow-canvas-frame" src={embedUrl} title="Workflow canvas" />
    </section>
  );
}
