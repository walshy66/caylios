import { useEffect, useState } from 'react';
import { listReviewQueue } from '../api';
import {
  DUMMY_AI_USAGE,
  PORTAL_FORMS,
  PortalRoute,
  formatRenewalDate,
  liveFormCount,
  usagePercent,
  usageRemaining,
  usageRenewalDate,
} from '../dashboardModel';

// Workflow count is dummied until the canvas backend exposes a flow list to STS.
const DUMMY_WORKFLOW_COUNT = 3;

export default function DashboardPage({ onNavigate }: { onNavigate: (route: PortalRoute) => void }) {
  const [pendingReviews, setPendingReviews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listReviewQueue()
      .then((queue) => {
        if (!cancelled) {
          setPendingReviews(queue.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingReviews(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const usage = DUMMY_AI_USAGE;
  const percent = usagePercent(usage);
  const renewal = formatRenewalDate(usageRenewalDate(new Date()));

  return (
    <div className="dashboard-cards">
      <button type="button" className="dashboard-card" onClick={() => onNavigate('forms')}>
        <h3>Forms</h3>
        <p className="dashboard-card-stat">{liveFormCount(PORTAL_FORMS)}</p>
        <p>live intake form{liveFormCount(PORTAL_FORMS) === 1 ? '' : 's'} for your clients</p>
        <small>View and share your client forms →</small>
      </button>

      <button type="button" className="dashboard-card" onClick={() => onNavigate('workflows')}>
        <h3>Workflows</h3>
        <p className="dashboard-card-stat">{DUMMY_WORKFLOW_COUNT}</p>
        <p>workflows moving your client data</p>
        <small>Open the workflow canvas →</small>
      </button>

      <button type="button" className="dashboard-card" onClick={() => onNavigate('review')}>
        <h3>Review queue</h3>
        <p className="dashboard-card-stat">{pendingReviews ?? '—'}</p>
        <p>submission{pendingReviews === 1 ? '' : 's'} waiting for review</p>
        <small>Review and approve →</small>
      </button>

      <div className="dashboard-card dashboard-card-static">
        <h3>AI usage</h3>
        <div
          className="usage-bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="AI extraction usage"
        >
          <div className="usage-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <p>
          {usage.used.toLocaleString()} of {usage.limit.toLocaleString()} extractions used ({percent}%) —{' '}
          {usageRemaining(usage).toLocaleString()} remaining
        </p>
        <small>Limit renews {renewal}</small>
      </div>
    </div>
  );
}
