import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./App.css', import.meta.url), 'utf8');
// The legacy session dashboard now lives behind VITE_ENABLE_AGENT_DASHBOARD.
const app = readFileSync(new URL('./components/AgentSessionsDashboard.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('./components/SessionDetail.tsx', import.meta.url), 'utf8');

assert.match(css, /\.session-dashboard\s*{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(280px,\s*1fr\)\s+minmax\(360px,\s*2fr\)/s);
assert.match(app, /<div className="session-sidebar">[\s\S]*<SessionCreateForm[\s\S]*<SessionList[\s\S]*<\/div>\s*<SessionDetail/s);
assert.match(detail, /className="panel session-detail-panel"/);
assert.match(css, /\.session-detail-panel\s*{[^}]*min-width:\s*0/s);

console.log('desktop split layout verification passed');
