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
