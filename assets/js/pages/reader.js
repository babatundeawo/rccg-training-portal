/* Study reader: one idea per card, scripture reveal, study map, completion. */
import { initPage } from '../app.js';
import { $, $$, esc, icon, rootPath, smartTitle, createDialog, showDialog, toast } from '../ui.js';
import { getModules, getModuleIndex, getStudy } from '../data.js';
import { markStudyComplete, isStudyComplete, moduleCompletionCount, setLastStudy, recordActivity, getPosition, setPosition, clearPosition, isBookmarked, toggleBookmark } from '../store.js';
import { openNotes } from '../notes.js';
import { shareLink } from '../share.js';
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
    <div class="card-top"><span class="card-label">Point ${i + 1}</span>
      <button class="bm-btn" type="button" data-bookmark="${i}" aria-pressed="false" aria-label="Bookmark this point">${icon('bookmark')}</button></div>
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
    ${next <= total ? `<a class="btn btn--ghost" href="reader.html?study=${next}"><span class="btn__label">Study ${next}</span>${icon('arrow-right')}</a>` : ''}
    <button class="btn btn--ghost" type="button" id="notesBtn">${icon('pencil')}<span class="btn__label">My notes</span></button>`;
  $('#notesBtn').addEventListener('click', () => openNotes({ moduleId, studyId, studyTitle: title }));

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
      + '<a class="btn" href="index.html"><span class="btn__label">Back to study list</span></a>'
      + `<button class="btn btn--ghost" type="button" id="shareBtn">${icon('share-2')}<span class="btn__label">Invite a friend</span></button>`;
    $('#shareBtn').addEventListener('click', () => shareLink({ title: 'RCCG Learning Path', text: 'I am studying with the RCCG Learning Path. Join me:', url: new URL(`${rootPath()}`, location.href).href }));
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('#completeTitle').focus();
  }

  const paintBookmarks = () => {
    $$('[data-bookmark]').forEach((btn) => {
      const on = isBookmarked(moduleId, studyId, Number(btn.dataset.bookmark));
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Remove bookmark' : 'Bookmark this point');
      btn.classList.toggle('is-on', on);
    });
  };
  paintBookmarks();
  $('#cardDeck').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-bookmark]');
    if (!btn) return;
    const i = Number(btn.dataset.bookmark);
    const result = toggleBookmark(moduleId, studyId, i, { heading: cards[i].heading, studyTitle: title });
    if (result === 'full') toast('You have reached the bookmark limit. Remove one to add another.', { type: 'error' });
    else toast(result === 'added' ? 'Bookmarked. Find it under My notes.' : 'Bookmark removed.');
    paintBookmarks();
  });
  window.addEventListener('rccg:private-synced', paintBookmarks);

  // Pick up where the learner stopped (only if the study is unfinished).
  const linkedPoint = parseInt(params.get('point') || '0', 10);
  const fromLink = Number.isInteger(linkedPoint) && linkedPoint > 1 ? Math.min(linkedPoint - 1, cards.length - 1) : 0;
  const savedPoint = fromLink || (isStudyComplete(moduleId, studyId) ? 0 : Math.min(getPosition(moduleId, studyId), cards.length - 1));
  if (savedPoint > 0 && !fromLink) toast(`Welcome back. Continuing at point ${savedPoint + 1} of ${cards.length}.`);
  recordActivity();

  initDeck({
    deck: $('#cardDeck'),
    barFill: $('#deckBar'),
    stepLabel: $('#stepLabel'),
    live: $('#deckLive'),
    backBtn: $('#backBtn'),
    nextBtn: $('#nextBtn'),
    startIndex: savedPoint,
    onChange: (index) => { if (index > 0 || savedPoint > 0) setPosition(moduleId, studyId, index); },
    onComplete: () => { clearPosition(moduleId, studyId); showComplete(); },
  });
}

init();
