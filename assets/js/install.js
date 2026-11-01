/* Install prompt: a gentle banner on a returning visit (Android and desktop
   Chrome use the browser's install prompt; iPhone and iPad show how to use
   "Add to Home Screen", because Safari has no install button to trigger). */
import { $, icon, createDialog, showDialog, toast } from './ui.js';

const KEY = 'rccg-install-v1';
const SNOOZE_DAYS = 30;

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (data) => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } };

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let guide;
function iosSteps() {
  return `<ol class="install-steps">
    <li><span class="install-steps__icon">${icon('share-2')}</span><span>Tap the <strong>Share</strong> button in Safari (the square with an arrow, at the bottom or top of the screen).</span></li>
    <li><span class="install-steps__icon">${icon('square-plus')}</span><span>Scroll down and tap <strong>Add to Home Screen</strong>.</span></li>
    <li><span class="install-steps__icon">${icon('smartphone')}</span><span>Tap <strong>Add</strong>. The Learning Path now opens from your home screen like an app.</span></li></ol>`;
}

export async function promptInstall() {
  const event = window.__rccgInstallEvent;
  if (!event) return false;
  event.prompt();
  const choice = await event.userChoice.catch(() => null);
  window.__rccgInstallEvent = null;
  if (choice && choice.outcome === 'accepted') {
    write({ ...read(), installed: true });
    toast('Installing. Look for the Learning Path on your home screen.', { type: 'success' });
  }
  return true;
}

/** Opens the "how to install" help for whatever device this is. */
export function openInstallHelp() {
  if (isStandalone()) { toast('The Learning Path is already installed on this device.'); return; }
  if (window.__rccgInstallEvent) { promptInstall(); return; }
  if (!guide) {
    guide = createDialog({
      className: 'dialog--sheet',
      label: 'Install the Learning Path',
      html: `<div class="dialog__head"><h2 class="dialog__title">Install the Learning Path</h2>
        <button class="nav-btn" type="button" data-close aria-label="Close">${icon('x')}</button></div>
        <div class="dialog__body" id="installBody"></div>`,
    });
  }
  $('#installBody', guide).innerHTML = isIOS()
    ? `<p class="muted">On iPhone and iPad, install from Safari:</p>${iosSteps()}`
    : `<p class="muted">Open your browser menu (the three dots) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. If you do not see it, open this page in Chrome or Edge.</p>`;
  showDialog(guide);
}

function showBanner() {
  if ($('.install-banner')) return;
  const ios = isIOS();
  const banner = document.createElement('aside');
  banner.className = 'install-banner';
  banner.setAttribute('aria-label', 'Install the app');
  banner.innerHTML = `<span class="install-banner__icon">${icon('smartphone')}</span>
    <div class="install-banner__text"><strong>Keep it on your phone</strong><span>${ios ? 'Add the Learning Path to your home screen.' : 'Install the Learning Path. It opens fast and works offline.'}</span></div>
    <button class="btn btn--primary" type="button" data-act="go"><span class="btn__label">${ios ? 'Show me how' : 'Install'}</span></button>
    <button class="nav-btn" type="button" data-act="no" aria-label="Not now">${icon('x')}</button>`;
  document.body.append(banner);
  banner.addEventListener('click', (event) => {
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    banner.remove();
    if (act === 'no') write({ ...read(), dismissedAt: Date.now() });
    else openInstallHelp();
  });
}

export function initInstall() {
  const state = read();
  const today = new Date().toDateString();
  if (state.lastVisit !== today) write({ ...state, lastVisit: today, visits: (state.visits || 0) + 1 });
  window.addEventListener('appinstalled', () => { write({ ...read(), installed: true }); $('.install-banner')?.remove(); });
  const current = read();
  const snoozed = current.dismissedAt && Date.now() - current.dismissedAt < SNOOZE_DAYS * 86400000;
  const onReader = Boolean(document.getElementById('bottomBar'));
  if (isStandalone() || current.installed || snoozed || onReader || (current.visits || 0) < 2) return;
  // Chrome only offers the prompt once it decides the site qualifies; iOS has no such event.
  if (window.__rccgInstallEvent || isIOS()) setTimeout(showBanner, 4000);
  else window.addEventListener('rccg:install-ready', () => setTimeout(showBanner, 4000), { once: true });
}
