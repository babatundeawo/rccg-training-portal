/* Homepage: fills in each track's live progress and the "Continue" shortcut. */
import { initPage } from '../app.js';
import { $ } from '../ui.js';
import { getModules, getModuleIndex } from '../data.js';
import { moduleCompletionCount, getLastStudy } from '../store.js';

initPage();

async function hydrate() {
  let modules;
  let indexes;
  try {
    modules = await getModules();
    indexes = await Promise.all(modules.map((m) => getModuleIndex(m.id)));
  } catch {
    return; // the static cards already work as plain links
  }

  function paint() {
    modules.forEach((m, i) => {
      const card = $(`[data-track="${m.id}"]`);
      if (!card) return;
      const total = indexes[i].studies.length;
      const { done } = moduleCompletionCount(m.id, total);
      card.querySelector('.bar__fill').style.setProperty('--p', String(done / total));
      card.querySelector('[data-done]').textContent = `${done} / ${total} studies`;
      card.querySelector('[data-cta]').textContent = done === 0 ? 'Start' : done === total ? 'Complete' : 'Continue';
    });
    const last = getLastStudy();
    const resume = $('#resume');
    const idx = last ? modules.findIndex((m) => m.id === last.moduleId) : -1;
    if (resume && idx >= 0 && last.studyId <= indexes[idx].studies.length) {
      resume.href = `${modules[idx].path}reader.html?study=${last.studyId}`;
      $('[data-resume-label]', resume).textContent = `Continue ${modules[idx].title}, Study ${last.studyId}`;
      resume.hidden = false;
    } else if (resume) {
      resume.hidden = true;
    }
  }
  paint();
  window.addEventListener('rccg:progress-synced', paint);
}

hydrate();
