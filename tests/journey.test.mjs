import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = new EventTarget();
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const s = await import('../assets/js/store.js');

test('dayKey and addDays use calendar days', () => {
  assert.equal(s.dayKey(new Date(2026, 10, 1)), '2026-11-01');
  assert.equal(s.addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(s.addDays('2026-12-31', 1), '2027-01-01');
});

test('currentStreak counts consecutive days and survives until a day is missed', () => {
  const days = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
  assert.equal(s.currentStreak(days, '2026-11-01'), 4);
  assert.equal(s.currentStreak(days, '2026-11-02'), 4); // studied yesterday, not yet today
  assert.equal(s.currentStreak(days, '2026-11-03'), 0); // a whole day missed
  assert.equal(s.currentStreak([], '2026-11-01'), 0);
  assert.equal(s.currentStreak(['2026-10-28', '2026-11-01'], '2026-11-01'), 1);
});

test('longestStreak finds the best run', () => {
  assert.equal(s.longestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11']), 3);
  assert.equal(s.longestStreak([]), 0);
});

test('weekDays starts on Monday and marks study days', () => {
  const week = s.weekDays(['2026-10-27', '2026-11-01'], '2026-11-01'); // Sunday
  assert.equal(week.length, 7);
  assert.equal(week[0].key, '2026-10-26');
  assert.equal(week[0].label, 'Mon');
  assert.equal(week[6].key, '2026-11-01');
  assert.equal(week[6].isToday, true);
  assert.deepEqual(week.filter((d) => d.active).map((d) => d.key), ['2026-10-27', '2026-11-01']);
});

test('studiesFinishedThisWeek only counts this week', () => {
  const done = { 'a/1': '2026-10-25', 'a/2': '2026-10-26', 'a/3': '2026-11-01' };
  assert.equal(s.studiesFinishedThisWeek(done, '2026-11-01'), 2);
});

test('activity and completion merges are unions, earliest date wins', () => {
  assert.deepEqual(s.mergeActivity(['2026-10-02', '2026-10-01'], ['2026-10-02', 'junk', '2026-10-03']), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(s.mergeCompletedOn({ 'a/1': '2026-10-05' }, { 'a/1': '2026-10-02', 'a/2': 'bad' }), { 'a/1': '2026-10-02' });
});

test('recordActivity adds today once', () => {
  store.clear();
  assert.equal(s.recordActivity('2026-11-01'), true);
  assert.equal(s.recordActivity('2026-11-01'), false);
  assert.deepEqual(s.getActivity(), ['2026-11-01']);
});

test('finishing a study logs the day it was finished', () => {
  store.clear();
  s.markStudyComplete('believers-manual', 3);
  assert.ok(s.getCompletedOn()['believers-manual/3']);
  assert.equal(s.getActivity().length, 1);
});

test('reading position is saved and cleared', () => {
  store.clear();
  assert.equal(s.getPosition('m', 2), 0);
  s.setPosition('m', 2, 4);
  assert.equal(s.getPosition('m', 2), 4);
  s.clearPosition('m', 2);
  assert.equal(s.getPosition('m', 2), 0);
});

test('notes are limited and listed newest first; empty notes are hidden', () => {
  store.clear();
  s.setNote('m', 1, 'first');
  s.setNote('m', 2, 'x'.repeat(s.MAX_NOTE_LENGTH + 50));
  assert.equal(s.getNote('m', 2).length, s.MAX_NOTE_LENGTH);
  s.setNote('m', 1, '   ');
  assert.deepEqual(s.listNotes().map((n) => n.studyId), [2]);
});

test('bookmarks toggle on and off and respect the limit', () => {
  store.clear();
  assert.equal(s.toggleBookmark('m', 1, 0, { heading: 'Intro', studyTitle: 'One' }), 'added');
  assert.equal(s.isBookmarked('m', 1, 0), true);
  assert.equal(s.listBookmarks()[0].heading, 'Intro');
  assert.equal(s.toggleBookmark('m', 1, 0), 'removed');
  assert.equal(s.isBookmarked('m', 1, 0), false);
  assert.equal(s.listBookmarks().length, 0);
  for (let i = 0; i < s.MAX_BOOKMARKS; i++) s.toggleBookmark('m', 1, i);
  assert.equal(s.toggleBookmark('m', 2, 0), 'full');
});

test('mergeByUpdatedAt keeps the most recent change, including removals', () => {
  const a = { k1: { text: 'old', updatedAt: 1 }, k2: { removed: true, updatedAt: 9 } };
  const b = { k1: { text: 'new', updatedAt: 5 }, k2: { removed: false, updatedAt: 3 }, k3: { text: 'only b', updatedAt: 2 } };
  const merged = s.mergeByUpdatedAt(a, b);
  assert.equal(merged.k1.text, 'new');
  assert.equal(merged.k2.removed, true);
  assert.equal(merged.k3.text, 'only b');
  assert.deepEqual(s.mergeByUpdatedAt(null, undefined), {});
});

test('sharing is off by default and remembered when turned on', () => {
  store.clear();
  assert.equal(s.getShared(), false);
  s.setSharedLocal(true);
  assert.equal(s.getShared(), true);
});
