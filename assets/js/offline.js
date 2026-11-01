/* "Save for offline": stores one track's studies, quiz and scripture on the
   device so it works with no signal. Kept in its own cache, which updates do not clear. */
import { rootPath } from './ui.js';

const CONTENT_CACHE = 'rccg-offline-content';
const SAVED_KEY = 'rccg-offline-saved-v1';
const SHARED_FILES = [
  'assets/data/modules.json', 'assets/data/kjv-verses.json', 'assets/css/site.css',
  'assets/js/app.js', 'assets/js/ui.js', 'assets/js/icons.js', 'assets/js/data.js', 'assets/js/store.js', 'assets/js/scripture.js',
  'assets/js/deck.js', 'assets/js/notes.js', 'assets/js/share.js', 'assets/js/palette.js', 'assets/js/quiz.js', 'assets/js/account-ui.js',
  'assets/js/auth.js', 'assets/js/install.js', 'assets/js/pages/reader.js', 'assets/js/pages/module.js', 'assets/js/pages/test.js',
  'assets/js/theme-init.js', 'assets/js/firebase-config.js',
];

export const offlineSupported = () => 'caches' in window;

function readSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || {}; } catch { return {}; }
}

export const isTrackSaved = (moduleId) => Boolean(readSaved()[moduleId]);

/** Saves a track. `onProgress(done, total)` is called as files arrive. Resolves with the number of files that failed. */
export async function saveTrack(meta, totalStudies, onProgress = () => {}) {
  const root = rootPath();
  const urls = [
    ...SHARED_FILES,
    `${meta.path}index.html`, `${meta.path}reader.html`, `${meta.testPath}index.html`,
    `assets/data/${meta.id}/index.json`, `assets/data/${meta.id}/quiz-bank.json`,
    ...Array.from({ length: totalStudies }, (_, i) => `assets/data/${meta.id}/study-${i + 1}.json`),
  ];
  const cache = await caches.open(CONTENT_CACHE);
  let done = 0;
  let failed = 0;
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async (path) => {
      try {
        const response = await fetch(root + path);
        if (response.ok) await cache.put(new URL(root + path, location.href).href, response);
        else failed++;
      } catch {
        failed++;
      }
      onProgress(++done, urls.length);
    }));
  }
  if (!failed) {
    const saved = readSaved();
    saved[meta.id] = Date.now();
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch { /* ignore */ }
  }
  return failed;
}
