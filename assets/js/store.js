/* Progress storage. localStorage is the fast, synchronous source of truth on
   this device; auth.js layers optional cloud sync on top when someone signs in.
   The storage key and shape are unchanged from earlier versions so existing
   progress is preserved: { [moduleId]: { [studyId]: true } } */

const PROGRESS_KEY = 'rccg-learning-progress-v1';
const LAST_KEY = 'rccg-last-study-v1';
const fallback = {}; // used when the browser blocks localStorage (e.g. some private modes)

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return fallback[key] ?? null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    fallback[key] = value;
  }
}

export function loadProgress() {
  const data = read(PROGRESS_KEY);
  return data && typeof data === 'object' ? data : {};
}

export function saveProgress(data) {
  write(PROGRESS_KEY, data);
}

export function markStudyComplete(moduleId, studyId) {
  const data = loadProgress();
  data[moduleId] = data[moduleId] || {};
  data[moduleId][studyId] = true;
  write(PROGRESS_KEY, data);
  // Remember the first day this study was finished (for the weekly summary).
  const completedOn = getCompletedOn();
  const key = `${moduleId}/${studyId}`;
  if (!completedOn[key]) { completedOn[key] = dayKey(); write(COMPLETED_KEY, completedOn); }
  recordActivity();
  window.dispatchEvent(new CustomEvent('rccg:progress-changed'));
}

export function isStudyComplete(moduleId, studyId) {
  const mod = loadProgress()[moduleId];
  return Boolean(mod && mod[studyId]);
}

export function moduleCompletionCount(moduleId, totalStudies) {
  const mod = loadProgress()[moduleId] || {};
  let done = 0;
  for (let id = 1; id <= totalStudies; id++) if (mod[id]) done++;
  return { done, total: totalStudies };
}

/** The first study in a module the person has not finished (null when all are done). */
export function nextStudyId(moduleId, totalStudies) {
  for (let id = 1; id <= totalStudies; id++) if (!isStudyComplete(moduleId, id)) return id;
  return null;
}

export function setLastStudy(moduleId, studyId) {
  write(LAST_KEY, { moduleId, studyId });
}

export function getLastStudy() {
  const last = read(LAST_KEY);
  return last && last.moduleId && Number.isInteger(last.studyId) ? last : null;
}

/** Union-merge two progress objects (used when cloud and device progress meet). */
export function mergeProgress(a, b) {
  const out = {};
  for (const src of [a, b]) {
    for (const moduleId of Object.keys(src || {})) {
      out[moduleId] = out[moduleId] || {};
      for (const studyId of Object.keys(src[moduleId] || {})) {
        if (src[moduleId][studyId]) out[moduleId][studyId] = true;
      }
    }
  }
  return out;
}

/* ==========================================================================
   Resume, streaks, notes and bookmarks

   Everything below lives in localStorage on this device. When someone signs
   in, auth.js copies it to their account:
   - activity days and "completed on" dates go in their progress document
     (the only part a class leader can ever see, and only if they opt in);
   - notes, bookmarks and reading positions go in a separate private document
     that only they can read.
   ========================================================================== */

const ACTIVITY_KEY = 'rccg-activity-v1';       // ["2026-11-01", ...] days with study activity
const COMPLETED_KEY = 'rccg-completed-on-v1';  // { "module/studyId": "2026-11-01" }
const POSITION_KEY = 'rccg-position-v1';       // { "module/studyId": { index, updatedAt } }
const NOTES_KEY = 'rccg-notes-v1';             // { "module/studyId": { text, updatedAt } }
const BOOKMARKS_KEY = 'rccg-bookmarks-v1';     // { "module/studyId/index": { ...details, updatedAt, removed } }
const SHARE_KEY = 'rccg-share-v1';             // { shared: boolean }

export const MAX_NOTE_LENGTH = 2000;
export const MAX_BOOKMARKS = 200;
const MAX_ACTIVITY_DAYS = 400;

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day as "YYYY-MM-DD" (a learner's own day, not UTC). */
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, amount) {
  const date = parseDay(key);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
}

const isDayKey = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/* ---------- Activity days and streaks ---------- */
export function getActivity() {
  const days = read(ACTIVITY_KEY);
  return Array.isArray(days) ? days.filter(isDayKey) : [];
}

export function mergeActivity(a, b) {
  const all = new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(isDayKey));
  return [...all].sort().slice(-MAX_ACTIVITY_DAYS);
}

export function saveActivity(days) {
  write(ACTIVITY_KEY, mergeActivity(days, []));
}

/** Notes that the learner studied today. Returns true when today was newly added. */
export function recordActivity(today = dayKey()) {
  const days = getActivity();
  if (days.includes(today)) return false;
  write(ACTIVITY_KEY, mergeActivity(days, [today]));
  window.dispatchEvent(new CustomEvent('rccg:progress-changed'));
  return true;
}

/** Consecutive days of study. A streak stays alive until a whole day is missed:
    if you studied yesterday but not yet today, it still counts. */
export function currentStreak(days, today = dayKey()) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) { count++; cursor = addDays(cursor, -1); }
  return count;
}

export function longestStreak(days) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The seven days (Monday first) of the week that contains `today`. */
export function weekDays(days, today = dayKey()) {
  const set = new Set(days);
  const mondayOffset = (parseDay(today).getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  return WEEKDAY_LABELS.map((label, i) => {
    const key = addDays(monday, i);
    return { key, label, active: set.has(key), isToday: key === today, isFuture: key > today };
  });
}

/* ---------- Dates a study was finished ---------- */
export function getCompletedOn() {
  const data = read(COMPLETED_KEY);
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(Object.entries(data).filter(([, v]) => isDayKey(v)));
}

export function mergeCompletedOn(a, b) {
  const out = {};
  for (const src of [a, b]) {
    for (const [key, day] of Object.entries(src || {})) {
      if (isDayKey(day) && (!out[key] || day < out[key])) out[key] = day;
    }
  }
  return out;
}

export function saveCompletedOn(data) {
  write(COMPLETED_KEY, mergeCompletedOn(data, {}));
}

export function studiesFinishedThisWeek(completedOn, today = dayKey()) {
  const week = weekDays([], today);
  const first = week[0].key;
  const last = week[6].key;
  return Object.values(completedOn).filter((day) => day >= first && day <= last).length;
}

/* ---------- Where the learner stopped inside a study ---------- */
const studyKey = (moduleId, studyId) => `${moduleId}/${studyId}`;

export function setPosition(moduleId, studyId, index) {
  const all = read(POSITION_KEY) || {};
  all[studyKey(moduleId, studyId)] = { index, updatedAt: Date.now() };
  write(POSITION_KEY, all);
  window.dispatchEvent(new CustomEvent('rccg:private-changed'));
}

/** The saved card number for a study, or 0. */
export function getPosition(moduleId, studyId) {
  const entry = (read(POSITION_KEY) || {})[studyKey(moduleId, studyId)];
  return entry && Number.isInteger(entry.index) && entry.index > 0 ? entry.index : 0;
}

export function clearPosition(moduleId, studyId) {
  const all = read(POSITION_KEY) || {};
  all[studyKey(moduleId, studyId)] = { index: 0, updatedAt: Date.now() };
  write(POSITION_KEY, all);
  window.dispatchEvent(new CustomEvent('rccg:private-changed'));
}

/* ---------- Notes (one per study) ---------- */
export function getNote(moduleId, studyId) {
  const entry = (read(NOTES_KEY) || {})[studyKey(moduleId, studyId)];
  return entry && typeof entry.text === 'string' ? entry.text : '';
}

export function setNote(moduleId, studyId, text) {
  const all = read(NOTES_KEY) || {};
  all[studyKey(moduleId, studyId)] = { text: String(text).slice(0, MAX_NOTE_LENGTH), updatedAt: Date.now() };
  write(NOTES_KEY, all);
  window.dispatchEvent(new CustomEvent('rccg:private-changed'));
}

export function listNotes() {
  return Object.entries(read(NOTES_KEY) || {})
    .filter(([, v]) => v && typeof v.text === 'string' && v.text.trim())
    .map(([key, v]) => {
      const [moduleId, studyId] = key.split('/');
      return { moduleId, studyId: Number(studyId), text: v.text, updatedAt: v.updatedAt || 0 };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/* ---------- Bookmarks (one per card) ---------- */
const bookmarkKey = (moduleId, studyId, index) => `${moduleId}/${studyId}/${index}`;

export function isBookmarked(moduleId, studyId, index) {
  const entry = (read(BOOKMARKS_KEY) || {})[bookmarkKey(moduleId, studyId, index)];
  return Boolean(entry && !entry.removed);
}

export function activeBookmarkCount() {
  return Object.values(read(BOOKMARKS_KEY) || {}).filter((v) => v && !v.removed).length;
}

/** Adds or removes a bookmark. Returns 'added', 'removed' or 'full' (limit reached). */
export function toggleBookmark(moduleId, studyId, index, details = {}) {
  const all = read(BOOKMARKS_KEY) || {};
  const key = bookmarkKey(moduleId, studyId, index);
  const existing = all[key];
  let result;
  if (existing && !existing.removed) {
    all[key] = { ...existing, removed: true, updatedAt: Date.now() };
    result = 'removed';
  } else {
    if (activeBookmarkCount() >= MAX_BOOKMARKS) return 'full';
    all[key] = {
      heading: String(details.heading || '').slice(0, 160),
      studyTitle: String(details.studyTitle || '').slice(0, 160),
      removed: false,
      updatedAt: Date.now(),
    };
    result = 'added';
  }
  write(BOOKMARKS_KEY, all);
  window.dispatchEvent(new CustomEvent('rccg:private-changed'));
  return result;
}

export function listBookmarks() {
  return Object.entries(read(BOOKMARKS_KEY) || {})
    .filter(([, v]) => v && !v.removed)
    .map(([key, v]) => {
      const [moduleId, studyId, index] = key.split('/');
      return { moduleId, studyId: Number(studyId), index: Number(index), heading: v.heading || '', studyTitle: v.studyTitle || '', updatedAt: v.updatedAt || 0 };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Merge two { key: { ..., updatedAt } } maps: the most recent change to each key wins. */
export function mergeByUpdatedAt(a, b) {
  const out = { ...(a || {}) };
  for (const [key, entry] of Object.entries(b || {})) {
    if (!entry || typeof entry !== 'object') continue;
    if (!out[key] || (entry.updatedAt || 0) > (out[key].updatedAt || 0)) out[key] = entry;
  }
  return out;
}

/** Everything private to the learner, in the shape that is stored in their account. */
export function getPrivateData() {
  return { notes: read(NOTES_KEY) || {}, bookmarks: read(BOOKMARKS_KEY) || {}, positions: read(POSITION_KEY) || {} };
}

export function savePrivateData(data) {
  write(NOTES_KEY, data.notes || {});
  write(BOOKMARKS_KEY, data.bookmarks || {});
  write(POSITION_KEY, data.positions || {});
}

/* ---------- Sharing progress with class leaders (off unless the learner turns it on) ---------- */
export function getShared() {
  const data = read(SHARE_KEY);
  return Boolean(data && data.shared === true);
}

export function setSharedLocal(shared) {
  write(SHARE_KEY, { shared: Boolean(shared) });
}
