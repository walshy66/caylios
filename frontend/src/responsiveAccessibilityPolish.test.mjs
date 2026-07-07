import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./App.css', import.meta.url), 'utf8');

assert.match(css, /box-sizing:\s*border-box/);
assert.match(css, /body\s*{[^}]*line-height:\s*1\.5/s);
assert.match(css, /button:focus-visible,[\s\S]*select:focus-visible,[\s\S]*input:focus-visible,[\s\S]*textarea:focus-visible\s*{[^}]*outline:\s*3px solid/s);
assert.match(css, /@media\s*\(max-width:\s*480px\)\s*{[\s\S]*\.app-shell\s*{[^}]*padding:\s*12px/s);

console.log('responsive accessibility polish verification passed');
