/* Study reader: one idea per card, scripture reveal, study map, completion. */
import { initPage } from '../app.js';
import { $, esc, icon, smartTitle, createDialog, showDialog } from '../ui.js';
import { getModules, getModuleIndex, getStudy } from '../data.js';
import { markStudyComplete, isStudyComplete, moduleCompletionCount, setLastStudy } from '../store.js';
import { renderScriptureText, initScripture } from '../scripture.js';
import { initDeck } from '../deck.js';

initPage();

const moduleId = document.body.dataset.module;
const params = new URLSearchParams(location.search);
const studyId = parseInt(params.get('study') || '1', 10);

function cardHtml(card, i) {
  const blocks = card.blocks.map((b) => (b.type === 'list'
    ? `<ul>${b.items.map((item) => `<li>${renderScriptureText(item)}</li>`).join('')}</ul>`
    : `<p>${renderScriptureText(b.text)}</p>`)).join('');
  return `<article class="study-card" data-index="${i}" aria-labelledby="card-title-${i}">
    <span class="card-label">Point ${i + 1}</span>
    <h2 class="card-title" id="card-title-${i}" tabindex="-1">${esc(card.heading)}</h2>
    <div class="card-content">${blocks}</div></article>`;
}

function showNotFound(message) {
  $('#readerMain').innerHTML = `<div class="complete">
    <div class="complete__badge" aria-hidden="true">${icon('info')}</div>
    <h1>We couldn’t open that study</h1><p>${esc(message)}</p>
    <div class="complete__actions"><a class="btn btn--primary" href="index.html">Back to all studies</a></div></div>`;
  $('#bottomBar').hidden = true;
}

function paintRing(total) {
  const { done } = moduleCompletionCount(moduleId, total);
  const circle = $('.progress-ring .value-c');
  if (!circle) return;
  const c = 2 * Math.PI * 12;
  circle.style.strokeDasharray = String(c);
  circle.style.strokeDashoffset = String(c * (1 - (total ? done / total : 0)));
}

async function init() {
  let modules; let index; let study;
  try {
    [modules, index] = await Promise.all([getModules(), getModuleIndex(moduleId)]);
    if (!Number.isInteger(studyId) || studyId < 1 || studyId > index.studies.length) {
      return showNotFound(`This track has studies 1 to ${index.studies.length}.`);
    }
    study = await getStudy(moduleId, studyId);
  } catch {
    return showNotFound('Check your connection and try again. Studies you have opened before also work offline.');
  }

  const meta = modules.find((m) => m.id === moduleId);
  const total = index.studies.length;
  const title = smartTitle(study.title);
  setLastStudy(moduleId, studyId);

  document.title = `Study ${studyId}: ${title} - ${meta.title}`;
  const canonical = $('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', `${canonical.href.split('?')[0]}?study=${studyId}`);
  $('meta[name="description"]')?.setAttribute('content', `Study ${studyId} of ${total} in the ${meta.title}: ${title}.`);

  $('#studyEyebrow').textContent = `Study ${studyId} of ${total}`;
  $('#studyTitle').textContent = title;

  const prev = studyId - 1;
  const next = studyId + 1;
  $('#quickNav').innerHTML = `<a class="btn btn--ghost" href="index.html">${icon('list')}<span class="btn__label">All studies</span></a>
    ${prev >= 1 ? `<a class="btn btn--ghost" href="reader.html?study=${prev}">${icon('arrow-left')}<span class="btn__label">Study ${prev}</span></a>` : ''}
    ${next <= total ? `<a class="btn btn--ghost" href="reader.html?study=${next}"><span class="btn__label">Study ${next}</span>${icon('arrow-right')}</a>` : ''}`;

  if (study.memoryVerse?.length) {
    $('#memoryVerseText').innerHTML = study.memoryVerse.map((mv) =>
      `<button type="button" class="scr" data-ref="${esc(mv.keys.join(','))}" data-label="${esc(mv.label)}">${esc(mv.label)}</button>`).join(' · ');
    $('#memoryVerseBox').hidden = false;
  }

  const cards = study.cards.slice();
  if (study.conclusion?.length) cards.push({ heading: 'In Conclusion', blocks: study.conclusion });
  $('#cardDeck').innerHTML = cards.map(cardHtml).join('');
  $('#cardDeck').setAttribute('aria-busy', 'false');

  /* Study map drawer */
  const mapDialog = createDialog({
    className: 'dialog--drawer',
    label: `${meta.title} studies`,
    html: `<div class="dialog__head"><h2 class="dialog__title">${esc(meta.title)}</h2>
      <button class="nav-btn" type="button" data-close aria-label="Close study map">${icon('x')}</button></div>
      <nav class="dialog__body" aria-label="Studies"><div class="map-list" id="mapList"></div></nav>`,
  });
  const paintMap = () => {
    $('#mapList', mapDialog).innerHTML = index.studies.map((s) => {
      const done = isStudyComplete(moduleId, s.id);
      const current = s.id === studyId;
      return `<a class="map-item${done ? ' is-done' : ''}${current ? ' is-current' : ''}" href="reader.html?study=${s.id}"${current ? ' aria-current="page"' : ''}>
        <span class="map-item__dot">${done ? icon('check') : s.id}</span><span>Study ${s.id}: ${esc(smartTitle(s.title))}</span></a>`;
    }).join('');
    paintRing(total);
  };
  paintMap();
  window.addEventListener('rccg:progress-synced', paintMap);
  $('[data-map-open]').addEventListener('click', () => showDialog(mapDialog));

  initScripture(document);

  function showComplete() {
    markStudyComplete(moduleId, studyId);
    paintMap();
    if (next <= total) setLastStudy(moduleId, next);
    $('#readerMain').hidden = true;
    $('#bottomBar').hidden = true;
    $('#completeScreen').hidden = false;
    $('#completeMsg').textContent = `You’ve finished Study ${studyId}: ${title}.`;
    $('#completeActions').innerHTML = (next <= total
      ? `<a class="btn btn--primary btn--lg" href="reader.html?study=${next}"><span class="btn__label">Next: ${esc(smartTitle(index.studies[next - 1].title))}</span>${icon('arrow-right', 'icon--nudge')}</a>`
      : `<a class="btn btn--gold btn--lg" href="../${meta.testPath}"><span class="btn__label">Take the test</span>${icon('arrow-right', 'icon--nudge')}</a>`)
      + '<a class="btn" href="index.html"><span class="btn__label">Back to study list</span></a>';
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('#completeTitle').focus();
  }

  initDeck({
    deck: $('#cardDeck'),
    barFill: $('#deckBar'),
    stepLabel: $('#stepLabel'),
    live: $('#deckLive'),
    backBtn: $('#backBtn'),
    nextBtn: $('#nextBtn'),
    onComplete: showComplete,
  });
}

init();
