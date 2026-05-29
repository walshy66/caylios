import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./App.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

assert.match(app, /className="app-shell"/);
assert.match(app, /className="session-dashboard"/);
assert.match(app, /className="session-sidebar"/);
assert.match(css, /@media\s*\(max-width:\s*720px\)/);
assert.match(css, /\.session-dashboard\s*{[^}]*grid-template-columns:\s*minmax\(280px,\s*1fr\)\s+minmax\(360px,\s*2fr\)/s);
assert.match(css, /@media\s*\(max-width:\s*720px\)\s*{[\s\S]*\.session-dashboard\s*{[^}]*grid-template-columns:\s*1fr/s);
assert.match(css, /@media\s*\(max-width:\s*720px\)\s*{[\s\S]*\.app-shell\s*{[^}]*padding:\s*16px/s);

console.log('mobile stacked layout verification passed');
