import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/css/tokens.css', import.meta.url), 'utf8');

function lum(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

function block(selector) {
  const start = css.indexOf(selector + ' {');
  assert.ok(start >= 0, `${selector} missing`);
  return css.slice(start, css.indexOf('\n}', start));
}
const raw = {};
for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) raw[m[1]] = m[2];
function vars(text) {
  const out = {};
  for (const m of text.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6}|var\(--([a-z0-9-]+)\))/g)) {
    out[m[1]] = m[3] ? raw[m[3]] : m[2];
  }
  return out;
}

const light = vars(block(':root'));
const dark = { ...light, ...vars(block(':root[data-theme="dark"]')) };

for (const [name, v] of [['light', light], ['dark', dark]]) {
  test(`${name}: body text pairs meet WCAG AA (4.5:1)`, () => {
    for (const fg of ['text', 'text-2', 'text-3', 'link']) {
      for (const bg of ['bg', 'surface']) {
        assert.ok(ratio(v[fg], v[bg]) >= 4.5, `${fg} on ${bg} = ${ratio(v[fg], v[bg]).toFixed(2)}`);
      }
    }
    assert.ok(ratio(v['on-primary'], v.primary) >= 4.5, 'on-primary on primary');
  });
}
