/* Test-day engine: random papers, scoring, validation and the WhatsApp result
   message. Pure functions with no DOM access, so they are easy to test. */

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInt(max) {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Draw `count` random questions, then shuffle each question's options while
    tracking the correct answer, so every candidate's paper differs. */
export function buildCandidatePaper(bank, count = 30) {
  return shuffle(bank).slice(0, Math.min(count, bank.length)).map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      question: q.question,
      options: order.map((i) => q.options[i]),
      correctIndex: order.indexOf(q.correctIndex),
    };
  });
}

export function scorePaper(paper, answers) {
  let correct = 0;
  paper.forEach((q, i) => { if (answers[i] === q.correctIndex) correct++; });
  return { correct, total: paper.length };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Returns { field: message } for anything invalid; an empty object means valid. */
export function validateCandidate({ name, dob, phone }, today = new Date()) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Please enter your full name.';
  if (!dob) errors.dob = 'Please enter your date of birth.';
  else {
    const date = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date > today || date.getFullYear() < 1900) errors.dob = 'Please enter a valid date of birth.';
  }
  if (phone && phone.replace(/\D/g, '').length < 7) errors.phone = 'That phone number looks too short. Leave it blank if you prefer.';
  return errors;
}

export function buildWhatsAppMessage({ moduleTitle, name, dob, phone, extra, correct, total, date }) {
  const pct = Math.round((correct / total) * 100);
  const lines = [`*RCCG - ${moduleTitle} Test Result*`, '', `*Name:* ${name}`, `*Date of birth:* ${dob}`];
  if (phone) lines.push(`*Phone:* ${phone}`);
  if (extra) lines.push(`*${extra.label}:* ${extra.value}`);
  lines.push(`*Test date:* ${date}`, '', `*Score:* ${correct} / ${total}  (${pct}%)`);
  return lines.join('\n');
}

export const whatsappShareUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
