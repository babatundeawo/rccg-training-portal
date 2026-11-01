/* My notes and bookmarks: everything the learner saved, across all tracks. */
import { initPage } from '../app.js';
import { $, esc, icon, rootPath, smartTitle, toast } from '../ui.js';
import { getModules, getModuleIndex } from '../data.js';
import { listBookmarks, listNotes, toggleBookmark, setNote } from '../store.js';
import { openNotes } from '../notes.js';

initPage();

let modules = [];
const titles = new Map(); // "module/studyId" -> study title

const studyLabel = (moduleId, studyId) => {
  const module = modules.find((m) => m.id === moduleId);
  const title = titles.get(`${moduleId}/${studyId}`);
  return { module: module ? module.title : moduleId, title: title ? smartTitle(title) : `Study ${studyId}`, path: module ? module.path : `${moduleId}/` };
};

function paint() {
  const root = rootPath();
  const bookmarks = listBookmarks();
  const notes = listNotes();

  $('#bookmarkList').innerHTML = bookmarks.length ? bookmarks.map((b) => {
    const info = studyLabel(b.moduleId, b.studyId);
    return `<li class="saved-item"><a class="saved-item__main" href="${root}${info.path}reader.html?study=${b.studyId}&amp;point=${b.index + 1}">
        <span class="saved-item__kicker">${esc(info.module)} · Study ${b.studyId}</span>
        <span class="saved-item__title">${esc(b.heading || `Point ${b.index + 1}`)}</span>
        <span class="saved-item__meta">${esc(info.title)}</span></a>
      <button class="nav-btn" type="button" data-remove-bookmark="${esc(`${b.moduleId}|${b.studyId}|${b.index}`)}" aria-label="Remove bookmark: ${esc(b.heading || `Point ${b.index + 1}`)}">${icon('trash-2')}</button></li>`;
  }).join('') : `<li class="saved-empty">${icon('bookmark')}<span>No bookmarks yet. While studying, tap the bookmark icon on any point to keep it here.</span></li>`;

  $('#noteList').innerHTML = notes.length ? notes.map((n) => {
    const info = studyLabel(n.moduleId, n.studyId);
    const excerpt = n.text.length > 220 ? `${n.text.slice(0, 220)}…` : n.text;
    return `<li class="saved-item saved-item--note"><div class="saved-item__main">
        <span class="saved-item__kicker">${esc(info.module)} · Study ${n.studyId}</span>
        <span class="saved-item__title">${esc(info.title)}</span>
        <span class="saved-item__text">${esc(excerpt)}</span></div>
      <div class="saved-item__actions">
        <button class="nav-btn" type="button" data-edit-note="${esc(`${n.moduleId}|${n.studyId}`)}" aria-label="Edit note for ${esc(info.title)}">${icon('pencil')}</button>
        <button class="nav-btn" type="button" data-delete-note="${esc(`${n.moduleId}|${n.studyId}`)}" aria-label="Delete note for ${esc(info.title)}">${icon('trash-2')}</button></div></li>`;
  }).join('') : `<li class="saved-empty">${icon('pencil')}<span>No notes yet. Open any study and tap <strong>My notes</strong> to write one.</span></li>`;
}

document.addEventListener('click', (event) => {
  const rb = event.target.closest('[data-remove-bookmark]');
  if (rb) {
    const [moduleId, studyId, index] = rb.dataset.removeBookmark.split('|');
    toggleBookmark(moduleId, Number(studyId), Number(index));
    toast('Bookmark removed.');
    paint();
    return;
  }
  const en = event.target.closest('[data-edit-note]');
  if (en) {
    const [moduleId, studyId] = en.dataset.editNote.split('|');
    const info = studyLabel(moduleId, Number(studyId));
    openNotes({ moduleId, studyId: Number(studyId), studyTitle: info.title });
    return;
  }
  const dn = event.target.closest('[data-delete-note]');
  if (dn && window.confirm('Delete this note? This cannot be undone.')) {
    const [moduleId, studyId] = dn.dataset.deleteNote.split('|');
    setNote(moduleId, Number(studyId), '');
    toast('Note deleted.');
    paint();
  }
});
document.addEventListener('close', (event) => { if (event.target.tagName === 'DIALOG') paint(); }, true);
window.addEventListener('rccg:private-synced', paint);

async function load() {
  paint();
  try {
    modules = await getModules();
    const indexes = await Promise.all(modules.map((m) => getModuleIndex(m.id)));
    modules.forEach((m, i) => indexes[i].studies.forEach((s) => titles.set(`${m.id}/${s.id}`, s.title)));
    paint();
  } catch {
    /* the lists still work with generic labels while offline */
  }
}
load();
