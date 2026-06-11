import { useState } from 'react';
import { PORTAL_FORMS } from '../dashboardModel';
import IntakeFormPanel from './IntakeFormPanel';

export default function FormsPage() {
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  return (
    <div>
      <section className="panel" aria-labelledby="forms-title">
        <h2 id="forms-title">Your client forms</h2>
        <p>Forms your clients fill out. Submissions land in the review queue for approval.</p>
        <div className="forms-list">
          {PORTAL_FORMS.map((form) => (
            <button
              key={form.id}
              type="button"
              className={`forms-list-card${form.status === 'sample' ? ' forms-list-sample' : ''}`}
              onClick={() => form.status === 'live' && setOpenFormId(openFormId === form.id ? null : form.id)}
              disabled={form.status === 'sample'}
            >
              <strong>{form.name}</strong>
              <span className={`form-status form-status-${form.status}`}>
                {form.status === 'live' ? 'Live' : 'Sample'}
              </span>
              <small>{form.description}</small>
            </button>
          ))}
        </div>
      </section>
      {openFormId === 'coachcw-client-intake' ? <IntakeFormPanel /> : null}
    </div>
  );
}
