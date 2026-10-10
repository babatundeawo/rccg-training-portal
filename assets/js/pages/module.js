/* Track page: hero progress, study list with completion state, test link. */
import { initPage } from '../app.js';
import { $, esc, icon, smartTitle } from '../ui.js';
import { getModules, getModuleIndex } from '../data.js';
import { isStudyComplete, moduleCompletionCount, nextStudyId } from '../store.js';

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

async function load() {
  try {
    const [modules, index] = await Promise.all([getModules(), getModuleIndex(moduleId)]);
    studies = index.studies;
    const meta = modules.find((m) => m.id === moduleId);
    $('#testIntro').textContent = `Once you’ve gone through all ${studies.length} studies, take the ${meta.title} quiz on test day.`;
    paint();
  } catch {
    showError();
  }
}

list.setAttribute('role', 'list');
window.addEventListener('rccg:progress-synced', () => { if (studies.length) paint(); });
load();
