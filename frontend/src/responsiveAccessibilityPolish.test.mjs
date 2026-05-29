import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./App.css', import.meta.url), 'utf8');
const createForm = readFileSync(new URL('./components/SessionCreateForm.tsx', import.meta.url), 'utf8');
const sessionList = readFileSync(new URL('./components/SessionList.tsx', import.meta.url), 'utf8');
const sessionDetail = readFileSync(new URL('./components/SessionDetail.tsx', import.meta.url), 'utf8');

assert.match(css, /box-sizing:\s*border-box/);
assert.match(css, /body\s*{[^}]*line-height:\s*1\.5/s);
assert.match(css, /button:focus-visible,[\s\S]*select:focus-visible,[\s\S]*input:focus-visible,[\s\S]*textarea:focus-visible\s*{[^}]*outline:\s*3px solid/s);
assert.match(css, /@media\s*\(max-width:\s*480px\)\s*{[\s\S]*\.app-shell\s*{[^}]*padding:\s*12px/s);
assert.match(css, /@media\s*\(max-width:\s*480px\)\s*{[\s\S]*\.session-card-meta\s*{[^}]*grid-template-columns:\s*1fr/s);
assert.match(css, /\.session-actions\s*{[^}]*flex-wrap:\s*wrap/s);
assert.match(css, /\.session-log\s*{[^}]*white-space:\s*pre-wrap/s);

assert.match(createForm, /className="panel session-create-form"/);
assert.match(createForm, /className="form-control"/);
assert.match(sessionList, /className="panel session-list-panel"/);
assert.match(sessionList, /aria-pressed={session\.id === selectedId}/);
assert.match(sessionList, /className="session-card-meta"/);
assert.match(sessionDetail, /className="panel session-detail-panel"/);
assert.match(sessionDetail, /className="session-actions"/);
assert.match(sessionDetail, /className="session-log"/);

console.log('responsive accessibility polish verification passed');
