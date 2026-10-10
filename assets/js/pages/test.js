/* Test day: registration → timed randomised paper → score → WhatsApp share. */
import { initPage } from '../app.js';
import { $, $$, esc, icon, toast } from '../ui.js';
import { getModules, getQuizBank } from '../data.js';
import {
  buildCandidatePaper, scorePaper, formatTime, validateCandidate, buildWhatsAppMessage, whatsappShareUrl,
} from '../quiz.js';

initPage();

const MODULE_ID = document.body.dataset.module;
const QUESTIONS_PER_PAPER = 30;
const DURATION_MS = 15 * 60 * 1000;

const steps = { register: $('#stepRegister'), quiz: $('#stepQuiz'), result: $('#stepResult') };
let meta;
let bank = null;
let paper = [];
let answers = [];
let current = 0;
let candidate = {};
let endAt = 0;
let timerId = 0;
let autoSubmitted = false;
let inProgress = false;
let announced = new Set();
let lastScore = null;

function show(step) {
  Object.entries(steps).forEach(([name, el]) => { el.hidden = name !== step; });
}

async function loadBank() {
  try {
    bank = (await getQuizBank(MODULE_ID)).questions;
    $('#qCount').textContent = String(Math.min(QUESTIONS_PER_PAPER, bank.length));
  } catch {
    bank = null;
  }
}

/* ---------- Registration ---------- */
const fields = { name: $('#candName'), dob: $('#candDob'), phone: $('#candPhone') };
const extra = $('[data-extra]');

function setError(key, message) {
  const input = fields[key];
  const slot = $(`#err-${key}`);
  slot.innerHTML = message ? `${icon('triangle-alert')}<span>${esc(message)}</span>` : '';
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

Object.keys(fields).forEach((key) => fields[key].addEventListener('input', () => setError(key, '')));
fields.dob.max = new Date().toISOString().slice(0, 10);

$('#registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = { name: fields.name.value.trim(), dob: fields.dob.value, phone: fields.phone.value.trim() };
  const errors = validateCandidate(values);
  Object.keys(fields).forEach((key) => setError(key, errors[key] || ''));
  const firstBad = Object.keys(fields).find((key) => errors[key]);
  if (firstBad) { fields[firstBad].focus(); return; }

  const startBtn = $('#startBtn');
  startBtn.disabled = true;
  if (!bank) await loadBank();
  if (!bank) {
    startBtn.disabled = false;
    $('#loadError').hidden = false;
    return;
  }
  $('#loadError').hidden = true;
  candidate = { ...values, extra: extra && extra.value.trim() ? { label: extra.dataset.extra, value: extra.value.trim() } : null };
  paper = buildCandidatePaper(bank, QUESTIONS_PER_PAPER);
  answers = new Array(paper.length).fill(null);
  current = 0;
  inProgress = true;
  show('quiz');
  renderQuestion();
  startTimer();
});

/* ---------- Timer (based on the clock, so background tabs can't drift) ---------- */
function startTimer() {
  endAt = Date.now() + DURATION_MS;
  autoSubmitted = false;
  announced = new Set();
  clearInterval(timerId);
  tick();
  timerId = setInterval(tick, 250);
}

function tick() {
  const remaining = (endAt - Date.now()) / 1000;
  const timer = $('#timer');
  $('#timerText').textContent = formatTime(remaining);
  timer.classList.toggle('is-low', remaining <= 60);
  [[300, '5 minutes left'], [60, '1 minute left'], [30, '30 seconds left']].forEach(([mark, text]) => {
    if (remaining <= mark && !announced.has(mark)) { announced.add(mark); $('#timerLive').textContent = text; }
  });
  if (remaining <= 0) {
    clearInterval(timerId);
    autoSubmitted = true;
    finish();
  }
}

/* ---------- Questions ---------- */
function renderQuestion() {
  const q = paper[current];
  $('#qProgress').textContent = `Question ${current + 1} of ${paper.length}`;
  $('#quizBar').style.setProperty('--p', String(current / paper.length));
  const heading = $('#qText');
  heading.textContent = q.question;
  $('#qOpts').innerHTML = q.options.map((opt, i) => `<label class="q-opt">
      <input type="radio" name="answer" value="${i}"><span class="q-opt__face">${esc(opt)}</span></label>`).join('');
  const next = $('#nextBtn');
  next.disabled = true;
  $('.btn__label', next).textContent = current === paper.length - 1 ? 'Finish test' : 'Next question';
  $$('input[name="answer"]').forEach((input) => input.addEventListener('change', () => {
    answers[current] = Number(input.value);
    next.disabled = false;
  }));
  if (current > 0) heading.focus({ preventScroll: true });
}

$('#nextBtn').addEventListener('click', () => {
  if (current < paper.length - 1) { current++; renderQuestion(); } else finish();
});

/* ---------- Result ---------- */
function finish() {
  if (!inProgress) return;
  inProgress = false;
  clearInterval(timerId);
  const { correct, total } = scorePaper(paper, answers);
  lastScore = { correct, total };
  show('result');
  const pct = total ? correct / total : 0;
  $('#scoreNum').firstChild.textContent = `${correct} / ${total}`;
  $('#scorePct').textContent = `${Math.round(pct * 100)}%`;
  const unanswered = answers.filter((a) => a === null).length;
  $('#scoreNote').textContent = autoSubmitted
    ? `Time’s up, so your test was submitted automatically.${unanswered ? ` ${unanswered} unanswered ${unanswered === 1 ? 'question counts' : 'questions count'} as incorrect.` : ''}`
    : 'Well done for completing the test.';
  const circle = $('.score__ring .value-c');
  const c = 2 * Math.PI * 52;
  circle.style.strokeDasharray = String(c);
  circle.style.strokeDashoffset = String(c);
  requestAnimationFrame(() => requestAnimationFrame(() => { circle.style.strokeDashoffset = String(c * (1 - pct)); }));
  window.scrollTo({ top: 0, behavior: 'auto' });
  $('#resultTitle').focus();
}

function resultMessage() {
  return buildWhatsAppMessage({
    moduleTitle: meta.title,
    name: candidate.name, dob: candidate.dob, phone: candidate.phone, extra: candidate.extra,
    correct: lastScore.correct, total: lastScore.total,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  });
}

$('#submitScoreBtn').addEventListener('click', (event) => {
  const btn = event.currentTarget;
  btn.disabled = true;
  $('.btn__label', btn).textContent = 'Score submitted';
  const share = $('#waShareBtn');
  share.href = whatsappShareUrl(resultMessage());
  $('#afterSubmit').hidden = false;
  share.focus();
});

$('#copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultMessage());
    toast('Result copied. Paste it into your chat.', { type: 'success' });
  } catch {
    toast('Couldn’t copy automatically. Use the WhatsApp button instead.', { type: 'error' });
  }
});

window.addEventListener('beforeunload', (event) => {
  if (inProgress) { event.preventDefault(); event.returnValue = ''; }
});

(async function start() {
  try { meta = (await getModules()).find((m) => m.id === MODULE_ID); } catch { meta = null; }
  if (!meta) meta = { title: document.body.dataset.title || 'Test' };
  await loadBank();
})();
