/* Card deck: one idea at a time, with Back / Continue, keyboard arrows and swipe. */
import { $ } from './ui.js';

export function initDeck({ deck, barFill, stepLabel, live, backBtn, nextBtn, onComplete }) {
  const cards = Array.from(deck.querySelectorAll('.study-card'));
  let index = 0;
  let firstPaint = true;

  function paint(direction) {
    deck.dataset.dir = direction;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
    const card = cards[index];
    card.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--i', String(Math.min(i, 8))));
    barFill.style.setProperty('--p', String((index + 1) / cards.length));
    stepLabel.textContent = `${index + 1} / ${cards.length}`;
    backBtn.disabled = index === 0;
    const last = index === cards.length - 1;
    nextBtn.querySelector('.btn__label').textContent = last ? 'Finish study' : 'Continue';
    nextBtn.dataset.last = String(last);
    if (!firstPaint) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      const title = $('.card-title', card);
      if (live) live.textContent = `Point ${index + 1} of ${cards.length}: ${title ? title.textContent : ''}`;
      title?.focus({ preventScroll: true });
    }
    firstPaint = false;
  }

  const next = () => {
    if (index < cards.length - 1) { index++; paint('forward'); }
    else onComplete();
  };
  const back = () => { if (index > 0) { index--; paint('back'); } };

  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', back);

  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (document.querySelector('dialog[open]')) return;
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === 'ArrowRight') next();
    else if (event.key === 'ArrowLeft') back();
  });

  // Swipe left/right on touch screens (ignored for mostly-vertical scrolling).
  let startX = 0;
  let startY = 0;
  deck.addEventListener('touchstart', (event) => {
    startX = event.changedTouches[0].clientX;
    startY = event.changedTouches[0].clientY;
  }, { passive: true });
  deck.addEventListener('touchend', (event) => {
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) (dx < 0 ? next : back)();
  }, { passive: true });

  paint('forward');
  return { get index() { return index; }, total: cards.length };
}
