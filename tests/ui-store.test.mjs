import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = new EventTarget();
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { smartTitle, esc } = await import('../assets/js/ui.js');
const s = await import('../assets/js/store.js');

test('smartTitle tidies ALL CAPS titles and leaves mixed case alone', () => {
  assert.equal(smartTitle('Already Mixed case'), 'Already Mixed case');
  const out = smartTitle('THE NEW BIRTH FROM ABOVE');
  assert.match(out, /^The New Birth from Above$/);
});

test('esc escapes HTML-significant characters', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('progress is saved, counted and read back', () => {
  store.clear();
  s.markStudyComplete('believers', 1);
  s.markStudyComplete('believers', 2);
  assert.equal(s.isStudyComplete('believers', 1), true);
  assert.equal(s.isStudyComplete('believers', 3), false);
  assert.deepEqual(s.moduleCompletionCount('believers', 8), { done: 2, total: 8 });
  assert.deepEqual(JSON.parse(store.get('rccg-learning-progress-v1')), { believers: { 1: true, 2: true } });
});

test('last study round-trips and rejects bad data', () => {
  store.clear();
  assert.equal(s.getLastStudy(), null);
  s.setLastStudy('baptismal', 4);
  assert.deepEqual(s.getLastStudy(), { moduleId: 'baptismal', studyId: 4 });
  store.set('rccg-last-study-v1', '{"moduleId":"x","studyId":"no"}');
  assert.equal(s.getLastStudy(), null);
});

test('mergeProgress is a union and tolerates empty input', () => {
  const merged = s.mergeProgress({ a: { 1: true } }, { a: { 2: true }, b: { 1: true } });
  assert.deepEqual(merged, { a: { 1: true, 2: true }, b: { 1: true } });
  assert.deepEqual(s.mergeProgress(null, undefined), {});
});
