/* Track page: hero progress, study list with completion state, test link. */
import { initPage } from '../app.js';
import { $, esc, icon, smartTitle } from '../ui.js';
import { getModules, getModuleIndex } from '../data.js';
import { isStudyComplete, moduleCompletionCount, nextStudyId } from '../store.js';
import { offlineSupported, isTrackSaved, saveTrack } from '../offline.js';

initPage();

const moduleId = document.body.dataset.module;
const list = $('#studyList');
let studies = [];

function paint() {
  const { done, total } = moduleCompletionCount(moduleId, studies.length);
  $('#moduleBar').style.setProperty('--p', String(done / total));
  $('#moduleBarLabel').textContent = `${done} of ${total} studies complete`;
  const next = nextStudyId(moduleId, studies.length);
  list.setAttribute('aria-busy', 'false');
  list.innerHTML = studies.map((s) => {
    const complete = isStudyComplete(moduleId, s.id);
    const isNext = s.id === next && done > 0;
    const status = complete ? `${icon('check')}<span>Done</span>` : isNext ? `<span>Resume</span>${icon('arrow-right')}` : `<span>Start</span>${icon('arrow-right')}`;
    return `<li><a href="reader.html?study=${s.id}" class="study-item${complete ? ' is-done' : ''}${isNext ? ' is-next' : ''}">
      <span class="study-item__num" aria-hidden="true">${complete ? icon('check') : s.id}</span>
      <span class="study-item__body"><span class="study-item__kicker">Study ${s.id}</span>
        <span class="study-item__title">${esc(smartTitle(s.title))}</span></span>
      <span class="study-item__status">${status}</span></a></li>`;
  }).join('');
}

function showError() {
  list.setAttribute('aria-busy', 'false');
  list.innerHTML = `<li class="notice notice--error">${icon('wifi-off')}<span>We couldn’t load the studies. Check your connection, then
    <button class="link-btn" type="button" id="retry">try again</button>.</span></li>`;
  $('#retry').addEventListener('click', load);
}

function setupOffline(meta) {
  if (!offlineSupported() || $('#offlineBox')) return;
  const box = document.createElement('div');
  box.className = 'offline-box';
  box.id = 'offlineBox';
  const saved = isTrackSaved(moduleId);
  box.innerHTML = `<div><h2>Study without data</h2><p>Save all ${studies.length} studies of the ${esc(meta.title)} on this phone, so they open with no signal. About 1 MB.</p></div>
    <button class="btn" type="button" id="offlineBtn">${icon('download')}<span class="btn__label">${saved ? 'Saved on this device. Update' : 'Save for offline'}</span></button>
    <p class="offline-box__status" id="offlineStatus" role="status"></p>`;
  $('.test-cta').before(box);
  $('#offlineBtn').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    const status = $('#offlineStatus');
    const failed = await saveTrack(meta, studies.length, (done, total) => { status.textContent = `Saving… ${done} of ${total}`; });
    btn.disabled = false;
    status.textContent = failed ? `Some files could not be saved (${failed}). Check your connection and try again.` : 'Saved. This track now works without internet.';
    if (!failed) $('.btn__label', btn).textContent = 'Saved on this device. Update';
  });
}

async function load() {
  try {
    const [modules, index] = await Promise.all([getModules(), getModuleIndex(moduleId)]);
    studies = index.studies;
    const meta = modules.find((m) => m.id === moduleId);
    $('#testIntro').textContent = `Once you’ve gone through all ${studies.length} studies, take the ${meta.title} quiz on test day.`;
    paint();
    setupOffline(meta);
  } catch {
    showError();
  }
}

list.setAttribute('role', 'list');
window.addEventListener('rccg:progress-synced', () => { if (studies.length) paint(); });
load();
