/* Command palette (Ctrl/Cmd + K): jump to any track, study or test. */
import { $, $$, esc, icon, rootPath, createDialog, showDialog, smartTitle } from './ui.js';
import { getModules, getModuleIndex } from './data.js';
import { getLastStudy } from './store.js';

let dlg;
let allItems = [];
let shown = [];
let active = 0;

async function buildItems() {
  const modules = await getModules();
  const indexes = await Promise.all(modules.map((m) => getModuleIndex(m.id)));
  const root = rootPath();
  const items = [{ group: 'Go to', label: 'Home', meta: 'RCCG Learning Path', href: root || './', icon: 'house', accent: 'believers', keys: 'home start' }];
  modules.forEach((m) => items.push({ group: 'Go to', label: m.title, meta: 'Track', href: `${root}${m.path}`, icon: m.icon, accent: m.accent, keys: `${m.title} track` }));
  modules.forEach((m) => items.push({ group: 'Test day', label: m.testTitle, meta: 'Test', href: `${root}${m.testPath}`, icon: 'clock', accent: m.accent, keys: `${m.title} test quiz exam` }));
  modules.forEach((m, i) => {
    indexes[i].studies.forEach((s) => items.push({
      group: 'Studies',
      label: smartTitle(s.title),
      meta: `${m.title} · Study ${s.id}`,
      href: `${root}${m.path}reader.html?study=${s.id}`,
      icon: 'scroll-text', accent: m.accent,
      keys: `${m.title} study ${s.id}`,
      moduleId: m.id, studyId: s.id,
    }));
  });
  return items;
}

function search(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    const list = allItems.filter((i) => i.group !== 'Studies');
    const last = getLastStudy();
    const resume = last && allItems.find((i) => i.moduleId === last.moduleId && i.studyId === last.studyId);
    return resume ? [{ ...resume, group: 'Continue', meta: `${resume.meta} · where you left off` }, ...list] : list;
  }
  return allItems
    .map((item) => {
      const hay = `${item.label} ${item.meta} ${item.keys}`.toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) return null;
      const label = item.label.toLowerCase();
      const score = tokens.reduce((sum, t) => sum + (label.startsWith(t) ? 3 : label.includes(` ${t}`) ? 2 : 1), 0);
      return { item, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .map((r) => r.item);
}

function render(query) {
  shown = search(query);
  active = 0;
  const list = $('#pal-list', dlg);
  if (!shown.length) {
    list.innerHTML = `<div class="palette__empty">No matches for “${esc(query)}”. Try a study title or a track name.</div>`;
    $('#pal-input', dlg).removeAttribute('aria-activedescendant');
    $('#pal-count', dlg).textContent = 'No results';
    return;
  }
  let html = '';
  let group = '';
  shown.forEach((item, i) => {
    if (item.group !== group) { group = item.group; html += `<div class="palette__group" role="presentation">${esc(group)}</div>`; }
    html += `<a class="palette__item" role="option" id="pal-${i}" href="${esc(item.href)}" data-accent="${item.accent}" aria-selected="${i === 0}">
      ${icon(item.icon)}<span class="palette__label">${esc(item.label)}</span><span class="palette__meta">${esc(item.meta)}</span></a>`;
  });
  list.innerHTML = html;
  $('#pal-input', dlg).setAttribute('aria-activedescendant', 'pal-0');
  $('#pal-count', dlg).textContent = `${shown.length} result${shown.length === 1 ? '' : 's'}`;
}

function setActive(index) {
  if (!shown.length) return;
  active = (index + shown.length) % shown.length;
  $$('.palette__item', dlg).forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
  const el = $(`#pal-${active}`, dlg);
  $('#pal-input', dlg).setAttribute('aria-activedescendant', `pal-${active}`);
  el?.scrollIntoView({ block: 'nearest' });
}

function build() {
  dlg = createDialog({
    className: 'palette',
    label: 'Search studies',
    html: `<div class="palette__field">
        ${icon('search')}
        <input id="pal-input" class="palette__input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list"
          aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search studies, tracks and tests…" aria-label="Search studies, tracks and tests">
        <button class="nav-btn" type="button" data-close aria-label="Close search">${icon('x')}</button>
      </div>
      <div id="pal-list" class="palette__list" role="listbox" aria-label="Results"></div>
      <div class="sr-only" id="pal-count" aria-live="polite"></div>
      <div class="dialog__foot palette__hints"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>`,
  });
  const input = $('#pal-input', dlg);
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
    else if (event.key === 'Enter' && shown[active]) { event.preventDefault(); location.href = shown[active].href; }
  });
  $('#pal-list', dlg).addEventListener('pointermove', (event) => {
    const el = event.target.closest('.palette__item');
    if (el) { const i = Number(el.id.replace('pal-', '')); if (i !== active) setActive(i); }
  });
}

export async function openPalette() {
  if (!dlg) {
    allItems = await buildItems();
    build();
  }
  showDialog(dlg);
  const input = $('#pal-input', dlg);
  input.value = '';
  render('');
  input.focus();
}
