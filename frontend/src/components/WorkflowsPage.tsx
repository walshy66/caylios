/** Workflows run natively in the STS backend: intake → review and approval →
 * distribution to connected destinations. This page is the seam for the
 * upcoming visual workflow builder. */
export default function WorkflowsPage() {
  return (
    <section className="panel" aria-labelledby="workflows-title">
      <h2 id="workflows-title">Workflows</h2>
      <p className="muted">
        Workflows move approved client data from SimpleTS into your connected apps: a client submits a
        form, your team reviews and approves it, and SimpleTS distributes it to every connected
        destination.
      </p>
      <p className="muted">
        The visual workflow builder is in development. Distribution currently runs automatically on
        approval — manage destinations from Settings → Connected apps.
      </p>
    </section>
  );
}
