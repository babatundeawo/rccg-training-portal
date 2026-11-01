/* Class leader view. Only approved leaders can load the data: Firestore's
   security rules enforce that, so hiding or showing things here is a courtesy,
   never the protection. Shows learners who chose to share their progress. */
import { initPage } from '../app.js';
import { $, $$, esc, icon, toast } from '../ui.js';
import { getModules, getModuleIndex } from '../data.js';
import { loadAuth, friendlyAuthError } from '../auth.js';
import { currentStreak } from '../store.js';

initPage();

const root = $('#leaderRoot');
let rows = [];
let modules = [];
let totals = {};
let sortKey = 'name';
let query = '';

function message(kind, title, body, action = '') {
  root.innerHTML = `<div class="notice notice--${kind} leader-notice">${icon(kind === 'error' ? 'triangle-alert' : 'info')}
    <div><strong>${esc(title)}</strong><p>${body}</p>${action}</div></div>`;
}

const formatDay = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never');

function toRow(learner) {
  const done = {};
  for (const m of modules) done[m.id] = Object.keys(learner.modules?.[m.id] || {}).filter((k) => learner.modules[m.id][k]).length;
  const days = Array.isArray(learner.activity) ? learner.activity : [];
  const lastDay = days.length ? [...days].sort().pop() : null;
  return {
    uid: learner.uid,
    name: learner.name || 'Unnamed learner',
    email: learner.email || '',
    done,
    streak: currentStreak(days),
    lastDay,
    updatedAt: learner.updatedAt || 0,
  };
}

function visibleRows() {
  const q = query.trim().toLowerCase();
  const list = rows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  const by = {
    name: (a, b) => a.name.localeCompare(b.name),
    recent: (a, b) => (b.lastDay || '').localeCompare(a.lastDay || ''),
    progress: (a, b) => Object.values(b.done).reduce((x, y) => x + y, 0) - Object.values(a.done).reduce((x, y) => x + y, 0),
  };
  return list.sort(by[sortKey]);
}

function paintTable() {
  const list = visibleRows();
  $('#leaderCount').textContent = `${list.length} of ${rows.length} learners`;
  $('#leaderBody').innerHTML = list.length ? list.map((r) => `<tr>
      <th scope="row" data-label="Learner"><span class="lead-name">${esc(r.name)}</span><span class="lead-email">${esc(r.email)}</span></th>
      ${modules.map((m) => `<td data-label="${esc(m.title)}"><span class="lead-prog"><span class="bar" aria-hidden="true"><span class="bar__fill" data-p="${(r.done[m.id] || 0) / totals[m.id]}"></span></span>${r.done[m.id] || 0} / ${totals[m.id]}</span></td>`).join('')}
      <td data-label="Streak">${r.streak} ${r.streak === 1 ? 'day' : 'days'}</td>
      <td data-label="Last studied">${r.lastDay ? esc(formatDay(new Date(`${r.lastDay}T00:00:00`).getTime())) : 'Never'}</td></tr>`).join('')
    : `<tr><td colspan="${modules.length + 3}" class="saved-empty">No learners match.</td></tr>`;
  // The page's security policy blocks inline styles, so bar widths are set here.
  $$('#leaderBody [data-p]').forEach((el) => el.style.setProperty('--p', el.dataset.p));
}

/* A spreadsheet can run text that starts with = + - @ as a formula, so those cells are defused. */
const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

function exportCsv() {
  const header = ['Name', 'Email', ...modules.map((m) => `${m.title} (of ${totals[m.id]})`), 'Streak (days)', 'Last studied'];
  const lines = [header, ...visibleRows().map((r) => [r.name, r.email, ...modules.map((m) => r.done[m.id] || 0), r.streak, r.lastDay || ''])];
  const blob = new Blob([`﻿${lines.map((l) => l.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `class-progress-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function renderLeader() {
  root.innerHTML = `<div class="lead-tools">
      <div class="field lead-search"><label for="leadSearch">Find a learner</label><input class="input" id="leadSearch" type="search" placeholder="Name or email" autocomplete="off"></div>
      <div class="field"><label for="leadSort">Sort by</label><select class="input" id="leadSort"><option value="name">Name</option><option value="recent">Most recently studied</option><option value="progress">Most studies finished</option></select></div>
      <button class="btn" type="button" id="leadExport">${icon('download')}<span class="btn__label">Download CSV</span></button></div>
    <p class="muted" id="leaderCount" role="status"></p>
    <div class="lead-wrap"><table class="lead-table"><thead><tr><th scope="col">Learner</th>${modules.map((m) => `<th scope="col">${esc(m.title)}</th>`).join('')}<th scope="col">Streak</th><th scope="col">Last studied</th></tr></thead><tbody id="leaderBody"></tbody></table></div>
    <p class="hint">Only learners who turned on “Share my progress with my class leaders” appear here. Treat this list as confidential.</p>`;
  $('#leadSearch').addEventListener('input', (e) => { query = e.target.value; paintTable(); });
  $('#leadSort').addEventListener('change', (e) => { sortKey = e.target.value; paintTable(); });
  $('#leadExport').addEventListener('click', exportCsv);
  paintTable();
}

async function start() {
  let auth;
  try {
    auth = await loadAuth();
  } catch {
    return message('error', 'You appear to be offline', 'This page needs an internet connection. Please reconnect and refresh.');
  }
  const run = async () => {
    const user = auth.getCurrentUser();
    if (!user) {
      return message('info', 'Sign in to continue', 'Class leaders sign in with the account the site owner approved.',
        '<p><button class="btn btn--primary" type="button" id="leadSignIn"><span class="btn__label">Sign in</span></button></p>');
    }
    if (!user.emailVerified) {
      return message('info', 'Please verify your email first', 'Open the verification link we emailed you, then refresh this page.');
    }
    if (!(await auth.isLeader())) {
      return message('info', 'This page is for approved class leaders', 'Your account has not been approved as a class leader. Ask the site owner to approve it.');
    }
    root.innerHTML = '<p class="muted"><span class="spinner" aria-hidden="true"></span> Loading learners…</p>';
    try {
      modules = await getModules();
      const indexes = await Promise.all(modules.map((m) => getModuleIndex(m.id)));
      totals = Object.fromEntries(modules.map((m, i) => [m.id, indexes[i].studies.length]));
      rows = (await auth.listSharedLearners()).map(toRow);
      renderLeader();
    } catch (error) {
      toast(friendlyAuthError(error), { type: 'error' });
      message('error', 'We could not load the class list', esc(friendlyAuthError(error)));
    }
  };
  window.addEventListener('rccg:auth-changed', run);
  document.addEventListener('click', (e) => { if (e.target.closest('#leadSignIn')) $('[data-account-btn]')?.click(); });
  run();
}
start();
