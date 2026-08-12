/* =============================================================
   RCCG Learning Path - shared app engine
   Handles: progress storage, nav drawer, scripture reveal modal
   (with real verse numbers + internal scroll), and the single-card
   "deck" reading engine with a fixed bottom Back/Continue bar.
   ============================================================= */

const RCCG = (() => {
  const STORAGE_KEY = 'rccg-learning-progress-v1';

  /* ---------------- Progress store (localStorage) ---------------- */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function markStudyComplete(moduleId, studyId) {
    const data = loadProgress();
    data[moduleId] = data[moduleId] || {};
    data[moduleId][studyId] = true;
    saveProgress(data);
    // If signed in, sync this update to the cloud in the background so it
    // shows up on the person's other devices. No-op for guests, and safe
    // even if auth.js hasn't loaded on this page.
    window.RCCGAuth?.pushProgressToCloud?.();
  }
  function isStudyComplete(moduleId, studyId) {
    const data = loadProgress();
    return !!(data[moduleId] && data[moduleId][studyId]);
  }
  function moduleCompletionCount(moduleId, totalStudies) {
    const data = loadProgress();
    const done = data[moduleId] ? Object.keys(data[moduleId]).length : 0;
    return { done, total: totalStudies };
  }

  /* ---------------- Nav progress ring ---------------- */
  function paintProgressRing(el, pct) {
    if (!el) return;
    const bar = el.querySelector('.bar');
    const r = 12, circumference = 2 * Math.PI * r;
    bar.style.strokeDasharray = circumference;
    bar.style.strokeDashoffset = circumference * (1 - pct);
  }

  /* ---------------- "You are here" drawer ---------------- */
  function initMapDrawer() {
    const openBtn = document.querySelector('[data-map-open]');
    const overlay = document.querySelector('.map-overlay');
    if (!openBtn || !overlay) return;
    const closeBtn = overlay.querySelector('.map-drawer__close');
    const open = () => { overlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { overlay.classList.remove('is-open'); document.body.style.overflow = ''; };
    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------------- Scripture reveal ---------------- */
  let verseDB = null;
  async function loadVerseDB() {
    if (verseDB) return verseDB;
    const res = await fetch(getRootPath() + 'assets/data/kjv-verses.json');
    verseDB = await res.json();
    return verseDB;
  }
  function getRootPath() {
    return document.body.getAttribute('data-root') || '../';
  }

  function buildScriptureModal() {
    if (document.querySelector('.scr-modal-overlay')) return document.querySelector('.scr-modal-overlay');
    const overlay = document.createElement('div');
    overlay.className = 'scr-modal-overlay';
    overlay.innerHTML = `
      <div class="scr-modal" role="dialog" aria-modal="true" aria-labelledby="scrModalRef">
        <div class="scr-modal__head">
          <div class="scr-modal__ref" id="scrModalRef"></div>
          <button class="scr-modal__close" type="button" aria-label="Close">✕</button>
        </div>
        <div class="scr-modal__text"></div>
        <div class="scr-modal__version">King James Version</div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.classList.remove('is-open');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.scr-modal__close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return overlay;
  }

  /** Extracts the verse number from a db key like "jo 3:16" -> 16 */
  function verseNumFromKey(key) {
    const m = key.match(/:(\d+)$/);
    return m ? m[1] : '';
  }

  async function initScriptureReveal(root = document) {
    const tags = root.querySelectorAll('.scr[data-ref]');
    if (!tags.length) return;
    const db = await loadVerseDB();
    const overlay = buildScriptureModal();
    tags.forEach((tag) => {
      if (tag.dataset.bound) return;
      tag.dataset.bound = '1';
      const keys = tag.getAttribute('data-ref').split(',').map(k => k.trim()).filter(Boolean);
      const entries = keys.map(k => ({ key: k, entry: db[k] })).filter(e => e.entry);
      if (!entries.length) {
        tag.replaceWith(document.createTextNode(tag.textContent.trim()));
        return;
      }
      const displayLabel = tag.getAttribute('data-label') || entries[0].entry.ref;
      // Show each verse with its REAL verse number (not array position) on its own
      // line, the way a printed reference Bible lays out a passage - not as one
      // run-on paragraph where verses blur into each other.
      const bodyHTML = entries.map(({ key, entry }) =>
        `<p class="verse-line"><span class="vnum">${RCCG.escapeHtml(verseNumFromKey(key))}</span>${RCCG.escapeHtml(entry.text)}</p>`
      ).join('');
      tag.addEventListener('click', () => {
        overlay.querySelector('.scr-modal__ref').textContent = displayLabel;
        overlay.querySelector('.scr-modal__text').innerHTML = bodyHTML;
        overlay.querySelector('.scr-modal').scrollTop = 0;
        overlay.classList.add('is-open');
      });
    });
  }

  /* ---------------- Card deck (single active card + fixed bottom bar) ---------------- */
  /**
   * opts: {
   *   deckSelector, barFillSelector, stepLabelSelector,
   *   backBtnSelector, nextBtnSelector,
   *   onComplete(), onStep(index, total)
   * }
   */
  function initCardDeck(opts) {
    const deck = document.querySelector(opts.deckSelector);
    const cards = Array.from(deck.querySelectorAll('.study-card'));
    const barFill = document.querySelector(opts.barFillSelector);
    const stepLabel = document.querySelector(opts.stepLabelSelector);
    const backBtn = document.querySelector(opts.backBtnSelector);
    const nextBtn = document.querySelector(opts.nextBtnSelector);
    let index = 0;

    function restartListAnimations(card) {
      card.querySelectorAll('li').forEach((li, i) => {
        li.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        li.offsetHeight; // force reflow to restart animation
        li.style.animation = '';
        li.style.animationDelay = `${Math.min(i, 8) * 45}ms`;
      });
    }

    function paint() {
      cards.forEach((c, i) => c.classList.toggle('active', i === index));
      const pct = Math.round(((index + 1) / cards.length) * 100);
      if (barFill) barFill.style.width = pct + '%';
      if (stepLabel) stepLabel.textContent = `${index + 1} / ${cards.length}`;
      if (backBtn) backBtn.disabled = index === 0;
      if (nextBtn) nextBtn.textContent = index === cards.length - 1 ? 'Finish study ✓' : 'Continue →';
      restartListAnimations(cards[index]);
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      if (typeof opts.onStep === 'function') opts.onStep(index, cards.length);
    }

    backBtn?.addEventListener('click', () => {
      if (index > 0) { index--; paint(); }
    });
    nextBtn?.addEventListener('click', () => {
      if (index < cards.length - 1) {
        index++;
        paint();
      } else if (typeof opts.onComplete === 'function') {
        opts.onComplete();
      }
    });

    paint();
    return { get index() { return index; }, total: cards.length };
  }

  /* ---------------- Understanding checks (cyu) ---------------- */
  function initChecks(root = document) {
    root.querySelectorAll('.cyu-box').forEach((check) => {
      if (check.dataset.bound) return;
      check.dataset.bound = '1';
      const correctIdx = parseInt(check.getAttribute('data-correct'), 10);
      const opts = check.querySelectorAll('.cyu-option');
      const feedback = check.querySelector('.cyu-feedback');
      opts.forEach((opt, i) => {
        opt.addEventListener('click', () => {
          if (check.classList.contains('is-answered')) return;
          check.classList.add('is-answered');
          opts.forEach((o, j) => o.classList.add(j === correctIdx ? 'correct' : (o === opt ? 'incorrect' : '')));
          feedback.textContent = i === correctIdx ? '✓ Correct - well done!' : 'Not quite - the correct answer is highlighted above.';
          feedback.classList.add('is-shown');
        });
      });
    });
  }

  /* ---------------- Helpers ---------------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /** Turns text containing {{key1,key2|Display Label}} markers into scripture tag spans. */
  function renderScriptureText(text) {
    return escapeHtml(text).replace(/\{\{([^|}]+)\|([^}]+)\}\}/g, (m, refs, display) => {
      const safeRefs = escapeHtml(refs.trim());
      const safeLabel = escapeHtml(display.trim());
      return `<button type="button" class="scr" data-ref="${safeRefs}" data-label="${safeLabel}">${safeLabel}</button>`;
    });
  }

  return {
    loadProgress, saveProgress, markStudyComplete, isStudyComplete, moduleCompletionCount,
    paintProgressRing, initMapDrawer, initScriptureReveal, initCardDeck, initChecks,
    renderScriptureText, escapeHtml, getRootPath
  };
})();
