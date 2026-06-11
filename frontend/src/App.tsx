import AgentSessionsDashboard from './components/AgentSessionsDashboard';
import IntakeFormPanel from './components/IntakeFormPanel';
import ReviewQueuePanel from './components/ReviewQueuePanel';
import WorkflowCanvasPanel from './components/WorkflowCanvasPanel';
import { AuthControls } from './auth';
import './App.css';

// Legacy coding-agent dashboard stays in the codebase but out of the product UI.
const agentDashboardEnabled = import.meta.env.VITE_ENABLE_AGENT_DASHBOARD === 'true';

export default function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>SimpleTS</h1>
          <p>Submit once → review once → distribute everywhere.</p>
        </div>
        <AuthControls />
      </header>
      <div className="portal-layout">
        <IntakeFormPanel />
        <WorkflowCanvasPanel />
        <ReviewQueuePanel />
      </div>
      {agentDashboardEnabled ? <AgentSessionsDashboard /> : null}
    </main>
  );
}
