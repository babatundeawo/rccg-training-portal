/* Homepage: fills in each track's live progress and the "Continue" shortcut. */
import { initPage } from '../app.js';
import { $ } from '../ui.js';
import { getModules, getModuleIndex } from '../data.js';
import { moduleCompletionCount, getLastStudy, getActivity, getCompletedOn, currentStreak, weekDays, studiesFinishedThisWeek, getPosition, listNotes, listBookmarks } from '../store.js';

initPage();

let journeyData = { modules: [], indexes: [] };

function paintJourney() {
  const panel = $('#journey');
  if (!panel) return;
  const days = getActivity();
  const completedOn = getCompletedOn();
  const last = getLastStudy();
  const savedItems = listNotes().length + listBookmarks().length;
  const hasHistory = days.length > 0 || Boolean(last) || savedItems > 0;
  panel.hidden = !hasHistory;
  if (!hasHistory) return;

  const streak = currentStreak(days);
  $('#streakNum').textContent = String(streak);
  $('#streakLabel').textContent = streak === 1 ? 'day streak' : 'day streak';
  const week = weekDays(days);
  $('#weekDots').innerHTML = week.map((d) => `<li class="week__day${d.active ? ' is-on' : ''}${d.isToday ? ' is-today' : ''}${d.isFuture ? ' is-future' : ''}">
      <span class="week__dot" aria-hidden="true"></span><span class="week__name">${d.label}</span>
      <span class="sr-only">${d.label}${d.isToday ? ' (today)' : ''}: ${d.active ? 'studied' : d.isFuture ? 'still to come' : 'no study'}</span></li>`).join('');
  const finished = studiesFinishedThisWeek(completedOn);
  const studied = week.filter((d) => d.active).length;
  $('#weekSummary').textContent = studied === 0
    ? 'Nothing yet this week. Even one point today starts a streak.'
    : `${studied} ${studied === 1 ? 'day' : 'days'} of study this week, ${finished} ${finished === 1 ? 'study' : 'studies'} finished.`;
  $('#journeyNotes').textContent = savedItems ? `My notes and bookmarks (${savedItems})` : 'My notes and bookmarks';

  const { modules, indexes } = journeyData;
  const idx = last ? modules.findIndex((m) => m.id === last.moduleId) : -1;
  const resume = $('#journeyResume');
  if (idx >= 0 && last.studyId <= indexes[idx].studies.length) {
    const point = getPosition(last.moduleId, last.studyId);
    resume.href = `${modules[idx].path}reader.html?study=${last.studyId}`;
    $('[data-journey-resume]', resume).textContent = `Continue ${modules[idx].title}, Study ${last.studyId}${point > 0 ? ` (point ${point + 1})` : ''}`;
    resume.hidden = false;
  } else {
    resume.hidden = true;
  }
}

async function hydrate() {
  let modules;
  let indexes;
  try {
    modules = await getModules();
    indexes = await Promise.all(modules.map((m) => getModuleIndex(m.id)));
  } catch {
    paintJourney();
    return; // the static cards already work as plain links
  }
  journeyData = { modules, indexes };

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
    paintJourney();
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
  window.addEventListener('rccg:private-synced', paint);
}

hydrate();
