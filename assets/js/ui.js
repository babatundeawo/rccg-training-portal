/* Small UI helpers shared by every page: DOM shortcuts, escaping, icons,
   toasts, dialog handling and title formatting. */
import { ICONS } from './icons.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Path prefix back to the site root: "" on the homepage, "../" in sub-folders. */
export const rootPath = () => document.body.dataset.root || '';

export function icon(name, extraClass = '') {
  return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

/* ---------- Toasts ---------- */
let toastRegion;
export function toast(message, { type = 'info', duration = 4500 } = {}) {
  if (!toastRegion) {
    toastRegion = document.createElement('div');
    toastRegion.className = 'toasts';
    toastRegion.setAttribute('role', 'status');
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.append(toastRegion);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  const glyph = type === 'success' ? 'circle-check' : type === 'error' ? 'triangle-alert' : 'info';
  el.innerHTML = `${icon(glyph)}<span>${esc(message)}</span>`;
  toastRegion.append(el);
  const remove = () => el.remove();
  setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 500);
  }, duration);
}

/* ---------- Dialogs (native <dialog>: focus trap, Esc and inert background built in) ---------- */
const openers = new WeakMap();

export function createDialog({ className = '', label, html }) {
  const dlg = document.createElement('dialog');
  dlg.className = `dialog ${className}`.trim();
  if (label) dlg.setAttribute('aria-label', label);
  dlg.innerHTML = html;
  document.body.append(dlg);
  // Clicking the dimmed backdrop closes the dialog.
  dlg.addEventListener('click', (event) => { if (event.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('is-locked');
    const opener = openers.get(dlg);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  });
  dlg.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => dlg.close()));
  return dlg;
}

export function showDialog(dlg) {
  openers.set(dlg, document.activeElement);
  document.documentElement.classList.add('is-locked');
  if (!dlg.open) dlg.showModal();
}

/* ---------- Titles ---------- */
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'vs', 'with']);
const KEEP_UPPER = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'RCCG', 'KJV']);

/** Several study titles are stored in ALL CAPS. Show them in tidy title case;
    titles that already use mixed case are left exactly as written. */
export function smartTitle(title) {
  if (!title || /[a-z]/.test(title)) return title;
  let afterColon = true;
  const out = title.toLowerCase().split(/(\s+)/).map((token, i) => {
    if (!token.trim()) return token;
    const match = token.match(/^([^a-z]*)([a-z][a-z'’-]*)(.*)$/);
    if (!match) return token;
    const [, pre, word, post] = match;
    let cased;
    if (KEEP_UPPER.has(word.toUpperCase())) cased = word.toUpperCase();
    else if (i > 0 && !afterColon && SMALL_WORDS.has(word)) cased = word;
    else cased = word.charAt(0).toUpperCase() + word.slice(1);
    afterColon = /[:\-–—]$/.test(post);
    return pre + cased + post;
  }).join('');
  return out.replace(/\(\s+/g, '(');
}

/* ---------- Account button (shared by app.js and account-ui.js) ---------- */
export function paintAccountButton(person) {
  const btn = $('[data-account-btn]');
  if (!btn) return;
  if (person && person.name) {
    const first = person.name.split(' ')[0];
    btn.innerHTML = `<span class="account-btn__avatar" aria-hidden="true">${esc(first.charAt(0).toUpperCase())}</span><span class="account-btn__label">${esc(first)}</span>`;
    btn.setAttribute('aria-label', `Account: ${person.name}`);
    btn.dataset.signedIn = 'true';
  } else {
    btn.innerHTML = `${icon('user')}<span class="account-btn__label">Sign in</span>`;
    btn.setAttribute('aria-label', 'Sign in or create an account');
    delete btn.dataset.signedIn;
  }
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
