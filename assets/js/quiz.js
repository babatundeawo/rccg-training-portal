/* =============================================================
   RCCG Learning Path — Test / Exam engine
   Candidate registration -> randomized 30-question quiz -> score -> WhatsApp share
   ============================================================= */

const RCCGQuiz = (() => {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Pick `count` random questions from the bank, then shuffle each question's options
   *  (tracking the new correct-answer index) so every candidate's paper differs. */
  function buildCandidatePaper(bank, count = 30) {
    const pool = shuffle(bank).slice(0, Math.min(count, bank.length));
    return pool.map((q) => {
      const optOrder = shuffle(q.options.map((_, i) => i));
      const options = optOrder.map((i) => q.options[i]);
      const correctIndex = optOrder.indexOf(q.correctIndex);
      return { question: q.question, options, correctIndex };
    });
  }

  function scorePaper(paper, answers) {
    let correct = 0;
    paper.forEach((q, i) => { if (answers[i] === q.correctIndex) correct++; });
    return { correct, total: paper.length };
  }

  function buildWhatsAppMessage({ moduleTitle, name, dob, phone, extra, correct, total, date }) {
    const pct = Math.round((correct / total) * 100);
    const lines = [
      `*RCCG — ${moduleTitle} Test Result*`,
      ``,
      `*Name:* ${name}`,
      `*Date of birth:* ${dob}`,
    ];
    if (phone) lines.push(`*Phone:* ${phone}`);
    if (extra) lines.push(`*${extra.label}:* ${extra.value}`);
    lines.push(
      `*Test date:* ${date}`,
      ``,
      `*Score:* ${correct} / ${total}  (${pct}%)`,
    );
    return lines.join('\n');
  }

  function whatsappShareUrl(text) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return { shuffle, buildCandidatePaper, scorePaper, buildWhatsAppMessage, whatsappShareUrl };
})();
