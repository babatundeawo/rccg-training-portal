/* Scripture reveal: tappable references open the actual KJV text in a dialog.
   Content markers look like {{key1,key2|Display Label}} (see docs/CUSTOMIZING.md). */
import { $, esc, rootPath, createDialog, showDialog } from './ui.js';

let versesPromise = null;
export function loadVerses() {
  if (!versesPromise) {
    versesPromise = fetch(`${rootPath()}assets/data/kjv-verses.json`)
      .then((response) => {
        if (!response.ok) throw new Error('verses unavailable');
        return response.json();
      })
      .catch((error) => { versesPromise = null; throw error; });
  }
  return versesPromise;
}

/** Turns text containing {{keys|Label}} markers into safe HTML with scripture buttons. */
export function renderScriptureText(text) {
  return esc(text).replace(/\{\{([^|}]+)\|([^}]+)\}\}/g, (match, refs, label) =>
    `<button type="button" class="scr" data-ref="${refs.trim()}" data-label="${label.trim()}">${label.trim()}</button>`);
}

const parseKey = (key) => {
  const m = key.match(/^(.*?)\s*(\d+):(\d+)$/);
  return m ? { chapter: m[2], verse: m[3] } : { chapter: '', verse: '' };
};

function versesHtml(keys, db) {
  let lastChapter = null;
  return keys.map((key) => {
    const entry = db[key];
    if (!entry) return '';
    const { chapter, verse } = parseKey(key);
    // Show chapter:verse only when a passage crosses into a new chapter.
    const num = lastChapter !== null && chapter !== lastChapter ? `${chapter}:${verse}` : verse;
    lastChapter = chapter;
    return `<p class="verse-line"><span class="vnum">${esc(num)}</span><span>${esc(entry.text)}</span></p>`;
  }).join('');
}

let dlg;
function ensureDialog() {
  if (dlg) return dlg;
  dlg = createDialog({
    className: 'dialog--sheet',
    label: 'Scripture',
    html: `<div class="dialog__head"><h2 class="dialog__title" id="scrTitle"></h2>
        <button class="nav-btn" type="button" data-close aria-label="Close">✕</button></div>
      <div class="dialog__body" id="scrBody" aria-live="polite"></div>
      <div class="dialog__foot">King James Version</div>`,
  });
  dlg.setAttribute('aria-labelledby', 'scrTitle');
  dlg.removeAttribute('aria-label');
  return dlg;
}

async function openReference(tag) {
  const d = ensureDialog();
  const keys = tag.dataset.ref.split(',').map((k) => k.trim()).filter(Boolean);
  $('#scrTitle', d).textContent = tag.dataset.label || '';
  const body = $('#scrBody', d);
  body.innerHTML = '<p class="verse-status">Loading…</p>';
  showDialog(d);
  try {
    const db = await loadVerses();
    const html = versesHtml(keys, db);
    body.innerHTML = html || '<p class="verse-status">This passage isn’t available offline right now.</p>';
    body.scrollTop = 0;
  } catch {
    body.innerHTML = '<p class="verse-status">Couldn’t load the verse. Check your connection and tap the reference again.</p>';
  }
}

let bound = false;
/** Wire up every scripture button on the page. Safe to call more than once. */
export function initScripture(root = document) {
  if (!bound) {
    bound = true;
    document.addEventListener('click', (event) => {
      const tag = event.target.closest?.('.scr[data-ref]');
      if (tag) openReference(tag);
    });
  }
  // Once the verse database is available, references it can't resolve become plain text.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
  idle(() => {
    loadVerses().then((db) => {
      root.querySelectorAll('.scr[data-ref]').forEach((tag) => {
        const keys = tag.dataset.ref.split(',').map((k) => k.trim());
        if (!keys.some((k) => db[k])) tag.replaceWith(document.createTextNode(tag.textContent));
      });
    }).catch(() => { /* stays tappable; the dialog explains if it can't load */ });
  });
}
