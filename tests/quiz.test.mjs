import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffle, buildCandidatePaper, scorePaper, formatTime, validateCandidate,
  buildWhatsAppMessage, whatsappShareUrl,
} from '../assets/js/quiz.js';

const bank = Array.from({ length: 40 }, (_, i) => ({
  question: `Q${i}`,
  options: ['A', 'B', 'C', 'D'],
  correctIndex: i % 4,
}));

test('shuffle keeps every item and does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5, 6];
  const out = shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(out.slice().sort(), input);
});

test('paper has the requested size and tracks the correct answer through shuffling', () => {
  const paper = buildCandidatePaper(bank, 30);
  assert.equal(paper.length, 30);
  for (const q of paper) {
    const original = bank.find((b) => b.question === q.question);
    assert.equal(q.options[q.correctIndex], original.options[original.correctIndex]);
  }
});

test('paper never exceeds the size of the bank', () => {
  assert.equal(buildCandidatePaper(bank.slice(0, 5), 30).length, 5);
});

test('scorePaper counts only correct answers', () => {
  const paper = [{ correctIndex: 1 }, { correctIndex: 0 }, { correctIndex: 2 }];
  assert.deepEqual(scorePaper(paper, [1, 0, 0]), { correct: 2, total: 3 });
  assert.deepEqual(scorePaper(paper, []), { correct: 0, total: 3 });
});

test('formatTime renders m:ss and never goes negative', () => {
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(-4), '0:00');
});

test('validateCandidate flags missing and invalid fields', () => {
  const today = new Date('2026-01-01T00:00:00');
  assert.deepEqual(validateCandidate({ name: 'Ada Obi', dob: '1990-05-05', phone: '' }, today), {});
  const bad = validateCandidate({ name: 'A', dob: '', phone: '123' }, today);
  assert.ok(bad.name && bad.dob && bad.phone);
  assert.ok(validateCandidate({ name: 'Ada Obi', dob: '2030-01-01' }, today).dob);
});

test('WhatsApp message contains the score and share url is encoded', () => {
  const msg = buildWhatsAppMessage({
    moduleTitle: 'Believers', name: 'Ada', dob: '1990-05-05', phone: '', extra: null,
    correct: 24, total: 30, date: '1 Jan 2026',
  });
  assert.match(msg, /24 \/ 30 {2}\(80%\)/);
  assert.ok(!msg.includes('Phone'));
  assert.ok(whatsappShareUrl(msg).startsWith('https://wa.me/?text=*RCCG'));
});
