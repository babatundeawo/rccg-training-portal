/* Notes dialog: one private note per study, saved on the device as you type
   (and to the learner's account when they are signed in). */
import { $, esc, icon, createDialog, showDialog } from './ui.js';
import { getNote, setNote, MAX_NOTE_LENGTH } from './store.js';

let dlg;
let current = null;
let saveTimer;

function build() {
  dlg = createDialog({
    className: 'dialog--sheet',
    label: 'My notes',
    html: `<div class="dialog__head"><h2 class="dialog__title" id="noteTitle">My notes</h2>
      <button class="nav-btn" type="button" data-close aria-label="Close notes">${icon('x')}</button></div>
      <div class="dialog__body">
        <p class="muted" id="noteStudy"></p>
        <div class="field"><label for="noteText">Your private note</label>
          <textarea class="input note-input" id="noteText" rows="9" maxlength="${MAX_NOTE_LENGTH}" placeholder="Write what you want to remember from this study."></textarea>
          <span class="hint"><span id="noteStatus" role="status">Saved on this device.</span> <span id="noteCount"></span></span></div>
      </div>`,
  });
  dlg.setAttribute('aria-labelledby', 'noteTitle');
  dlg.removeAttribute('aria-label');
  const area = $('#noteText', dlg);
  const flush = () => {
    clearTimeout(saveTimer);
    if (!current) return;
    setNote(current.moduleId, current.studyId, area.value);
    $('#noteStatus', dlg).textContent = 'Saved.';
  };
  area.addEventListener('input', () => {
    $('#noteStatus', dlg).textContent = 'Saving…';
    $('#noteCount', dlg).textContent = `${area.value.length} / ${MAX_NOTE_LENGTH}`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  });
  dlg.addEventListener('close', flush);
}

export function openNotes({ moduleId, studyId, studyTitle }) {
  if (!dlg) build();
  current = { moduleId, studyId };
  const area = $('#noteText', dlg);
  area.value = getNote(moduleId, studyId);
  $('#noteStudy', dlg).innerHTML = `Study ${studyId}: ${esc(studyTitle)}`;
  $('#noteStatus', dlg).textContent = 'Notes save automatically.';
  $('#noteCount', dlg).textContent = `${area.value.length} / ${MAX_NOTE_LENGTH}`;
  showDialog(dlg);
  area.focus();
}
