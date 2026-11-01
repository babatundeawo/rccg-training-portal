/* Page bootstrap shared by every page: navigation behaviour, theme toggle,
   mobile menu, command palette trigger, account button, scroll reveals,
   tactile button ripple and the offline service worker. */
import { $, $$, icon, rootPath, createDialog, showDialog, esc, paintAccountButton, toast } from './ui.js';

const ACCOUNT_HINT_KEY = 'rccg-account-hint';

function initNavScroll() {
  const nav = $('.topnav');
  if (!nav) return;
  let ticking = false;
  const sync = () => { nav.classList.toggle('is-scrolled', window.scrollY > 8); ticking = false; };
  sync();
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }, { passive: true });
}

/* ---------- Theme ---------- */
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0a1c' : '#f8f7fb');
  $$('.theme-toggle').forEach((btn) => {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  });
}

function initTheme() {
  applyTheme(currentTheme());
  $$('.theme-toggle').forEach((btn) => {
    btn.innerHTML = `${icon('sun', 'icon--sun')}${icon('moon', 'icon--moon')}`;
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('rccg-theme', next); } catch { /* private mode: choice lasts for this visit */ }
    });
  });
  // Follow the system setting live, until the visitor picks a theme themselves.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change', (event) => {
    let saved = null;
    try { saved = localStorage.getItem('rccg-theme'); } catch { /* ignore */ }
    if (!saved) applyTheme(event.matches ? 'dark' : 'light');
  });
}

/* ---------- Mobile menu (built from the links already in the nav) ---------- */
function initMenu() {
  const btn = $('.topnav__menu-btn');
  if (!btn) return;
  btn.innerHTML = icon('menu');
  let dlg;
  btn.addEventListener('click', () => {
    if (!dlg) {
      const links = $$('.topnav__links a').map((a) =>
        `<a href="${esc(a.getAttribute('href'))}">${icon('book-open')}<span>${esc(a.textContent.trim())}</span></a>`).join('');
      const home = `<a href="${rootPath() || './'}">${icon('house')}<span>Home</span></a>`;
      dlg = createDialog({
        className: 'dialog--drawer',
        label: 'Menu',
        html: `<div class="dialog__head"><h2 class="dialog__title">Menu</h2>
          <button class="nav-btn" type="button" data-close aria-label="Close menu">${icon('x')}</button></div>
          <nav class="dialog__body" aria-label="Menu"><div class="menu-list">${home}${links}<button type="button" data-palette-open>${icon('search')}<span>Search studies</span></button></div></nav>`,
      });
    }
    showDialog(dlg);
  });
}

/* ---------- Command palette (loaded only when first used) ---------- */
function initPalette() {
  const open = async () => {
    try {
      const mod = await import('./palette.js');
      mod.openPalette();
    } catch {
      toast('Search is unavailable right now.', { type: 'error' });
    }
  };
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $$('[data-kbd]').forEach((k) => { k.textContent = '⌘ K'; });
  $$('.nav-btn--search').forEach((btn) => btn.insertAdjacentHTML('afterbegin', icon('search')));
  // One delegated listener also covers the search button inside the mobile menu.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('[data-palette-open]');
    if (!trigger) return;
    trigger.closest('dialog')?.close();
    open();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  });
}

/* ---------- Account (Firebase is loaded only when needed) ---------- */
function initAccount() {
  const btn = $('[data-account-btn]');
  if (!btn) return;
  let hint = null;
  try { hint = JSON.parse(localStorage.getItem(ACCOUNT_HINT_KEY)); } catch { /* ignore */ }
  paintAccountButton(hint);

  btn.addEventListener('click', async () => {
    const mod = await import('./account-ui.js');
    mod.openAccount(btn);
  });

  // Returning, signed-in visitors: restore the session quietly in the background.
  if (hint) {
    const restore = () => import('./account-ui.js').then((mod) => mod.initAccount());
    if ('requestIdleCallback' in window) requestIdleCallback(restore, { timeout: 2500 });
    else setTimeout(restore, 1200);
  }
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const items = $$('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el, i) => {
    if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', String(i % 4));
    observer.observe(el);
  });
}

/* ---------- Pointer polish: ripple on buttons, glow follows the cursor on track cards ---------- */
function initPointerPolish() {
  document.addEventListener('pointerdown', (event) => {
    const btn = event.target.closest?.('.btn');
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const ripple = document.createElement('span');
    ripple.className = 'btn__ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    btn.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const card = event.target.closest?.('.track');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, { passive: true });
}

/* ---------- Install prompt (Chrome fires this event once; keep it for install.js) ---------- */
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__rccgInstallEvent = event;
  window.dispatchEvent(new CustomEvent('rccg:install-ready'));
});

function initInstall() {
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-install-open]')) return;
    import('./install.js').then((mod) => mod.openInstallHelp()).catch(() => toast('Install help is unavailable right now.', { type: 'error' }));
  });
  const load = () => import('./install.js').then((mod) => mod.initInstall()).catch(() => { /* optional */ });
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}

/* ---------- Back to top (long pages only) ---------- */
function initBackToTop() {
  if (document.getElementById('bottomBar')) return; // the study reader has its own controls
  const btn = document.createElement('button');
  btn.className = 'to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to top');
  btn.hidden = true;
  btn.innerHTML = icon('arrow-up');
  document.body.append(btn);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }));
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { btn.hidden = window.scrollY < window.innerHeight * 1.2; ticking = false; });
  }, { passive: true });
}

/* ---------- Offline support and safe updates ---------- */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!secure) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  const announce = (worker) => {
    toast('A new version of the Learning Path is ready.', {
      duration: 0,
      action: { label: 'Refresh', onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }) },
    });
  };
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${rootPath()}sw.js`).then((registration) => {
      // A new version already waiting from an earlier visit.
      if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
        });
      });
      // Long-lived installed apps: look for updates when they come back to the foreground.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') registration.update().catch(() => {}); });
    }).catch(() => { /* offline support is optional */ });
  });
}

export function initPage() {
  initNavScroll();
  initTheme();
  initMenu();
  initPalette();
  initAccount();
  initReveal();
  initPointerPolish();
  initInstall();
  initBackToTop();
  registerServiceWorker();
}
