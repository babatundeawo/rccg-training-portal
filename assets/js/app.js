// Core App Logic for RCCG Training Portal

// --- LocalStorage Keys ---
const STATE_PREFIX = "rccg_track_";

// Get progress state for a track
function getTrackProgress(trackId) {
  const data = localStorage.getItem(STATE_PREFIX + trackId);
  return data ? JSON.parse(data) : { completedStudies: [], currentStudy: "1", examScore: null, examPassed: false };
}

// Save progress state for a track
function saveTrackProgress(trackId, progress) {
  localStorage.setItem(STATE_PREFIX + trackId, JSON.stringify(progress));
}

// Mark a study as complete
function completeStudy(trackId, studyId) {
  const progress = getTrackProgress(trackId);
  if (!progress.completedStudies.includes(studyId)) {
    progress.completedStudies.push(studyId);
  }
  saveTrackProgress(trackId, progress);
}

// Reset progress for a track
function resetTrackProgress(trackId) {
  localStorage.removeItem(STATE_PREFIX + trackId);
  window.location.reload();
}

// --- Dynamic Study Viewer Engine ---
let currentCardIndex = 0;
let cardsList = [];
let cyuStatus = false; // Cyu state

function initStudyViewer(trackId, contentDatabase) {
  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get('study') || "1";
  
  // Find study content
  const study = contentDatabase.find(s => s.id === studyId);
  if (!study) {
    document.getElementById('study-container').innerHTML = `
      <div class="callout-box warning">
        <h3>Study not found</h3>
        <p>The requested study section could not be found. Return to the <a href="index.html">Dashboard</a>.</p>
      </div>
    `;
    return;
  }

  // Set page headers
  document.getElementById('header-title').innerText = study.title;
  document.getElementById('header-subtitle').innerText = `Study ${studyId}`;
  
  cardsList = study.cards;
  currentCardIndex = 0;

  // Render cards
  const deck = document.getElementById('card-deck');
  deck.innerHTML = '';
  
  cardsList.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = `study-card ${index === 0 ? 'active' : ''}`;
    cardEl.id = `card-${index}`;
    
    cardEl.innerHTML = `
      <span class="card-category">${card.category}</span>
      <h2 class="card-title">${card.title}</h2>
      <div class="card-content">${card.content}</div>
    `;

    // If it's the last card, and not the final study, suggest review or quiz
    deck.appendChild(cardEl);
  });

  // Setup Check-Your-Understanding on the second-to-last card or append custom cyu if provided
  injectCYUQuestions(trackId, studyId);

  // Setup navigation drawer maps
  setupNavigationDrawer(trackId, contentDatabase, studyId);

  // Update controls
  updateCardNavigation(trackId, studyId);
  updateProgressBar();
  bindScriptureLinks();
}

// Inject interactive Check-Your-Understanding prompts (CYU)
function injectCYUQuestions(trackId, studyId) {
  // Let's create a custom CYU question based on study ID
  let questionText = "Which of the following is true about this study?";
  let options = ["Option A", "Option B", "Option C", "Option D"];
  let correctIndex = 0;
  let explanation = "Great! You understand the core teaching of this section.";

  if (trackId === 'believers') {
    if (studyId === "1") {
      questionText = "What is the New Birth NOT according to the Bible?";
      options = ["A spiritual birth", "Quickening of our spirit", "Being religious or churchy", "Translation into light"];
      correctIndex = 2;
      explanation = "Correct! Acts 10:1-9 shows that being religious or churchy is not a substitute for the New Birth.";
    } else if (studyId === "2") {
      questionText = "Which element of genuine repentance comes as a consequence of Holy Spirit conviction?";
      options = ["Godly sorrow", "Renunciation", "Restitution", "Remorse"];
      correctIndex = 0;
      explanation = "Correct! Godly sorrow comes from the Spirit and leads to salvation (2 Cor 7:10).";
    } else {
      questionText = "How do we live the Christian life successfully?";
      options = ["By ignoring fellowship", "By study of the Word, prayer, and fellowship", "Only by being baptized", "By doing good works alone"];
      correctIndex = 1;
      explanation = "Correct! A successful Christian life requires the study of the Word, prayer, and constant fellowship.";
    }
  } else if (trackId === 'baptismal') {
    if (studyId === "9") {
      questionText = "What is defined as having a desire to harm others or ill will?";
      options = ["Anger", "Strife", "Malice", "Gloominess"];
      correctIndex = 2;
      explanation = "Correct! Malice is defined as a desire to harm others, which is an aberration for a child of God.";
    } else if (studyId === "11") {
      questionText = "Which type of fast involves absolute abstinence from both food and water?";
      options = ["Absolute Fast", "Total Fast", "Partial Fast", "Normal Fast"];
      correctIndex = 0;
      explanation = "Correct! An Absolute Fast means no food and no water.";
    } else {
      questionText = "What is the mode of Water Baptism commanded in scripture?";
      options = ["Sprinkling", "Pouring", "Immersion", "Infant dedication"];
      correctIndex = 2;
      explanation = "Correct! The Greek 'Baptizo' means to submerge/immerse, representing burial with Christ.";
    }
  } else if (trackId === 'workers') {
    if (studyId === "2") {
      questionText = "What is the first goal of the RCCG Vision/Mission statement?";
      options = ["To take people to heaven", "To plant churches", "To make Heaven", "To build schools"];
      correctIndex = 2;
      explanation = "Correct! The absolute first goal of RCCG is 'To make Heaven'.";
    } else if (studyId === "4") {
      questionText = "Which of the following is a qualification for an RCCG worker?";
      options = ["Being highly rich", "A regular tithe-payer", "Speaking in public", "Knowing political leaders"];
      correctIndex = 1;
      explanation = "Correct! Malachi 3:10 indicates that a worker must be a faithful tithe-payer.";
    } else {
      questionText = "What represents the workforce (fixed for service) in Christ's circle of followers?";
      options = ["The Twelve", "The Seventy", "The Five Hundred", "The Three"];
      correctIndex = 1;
      explanation = "Correct! The seventy disciples represent the committed workforce set apart for service.";
    }
  }

  // Find the index before the last card (usually the card before the memory verse card)
  const cyuCardIndex = Math.max(0, cardsList.length - 2);
  const cyuCard = document.getElementById(`card-${cyuCardIndex}`);
  if (!cyuCard) return;

  const cyuContainer = document.createElement('div');
  cyuContainer.className = "cyu-box";
  cyuContainer.innerHTML = `
    <div class="cyu-title">📝 Check Your Understanding:</div>
    <p style="font-weight: 600; margin-bottom: 12px;">${questionText}</p>
    <div class="cyu-options">
      ${options.map((opt, idx) => `<div class="cyu-option" onclick="checkCYUAnswer(this, ${idx}, ${correctIndex}, '${escapeHtml(explanation)}')">${opt}</div>`).join('')}
    </div>
    <div class="cyu-feedback" id="cyu-feedback"></div>
  `;
  cyuCard.querySelector('.card-content').appendChild(cyuContainer);
}

function escapeHtml(text) {
  return text.replace(/'/g, "\\'");
}

function checkCYUAnswer(element, index, correctIndex, explanation) {
  const options = element.parentElement.children;
  for (let opt of options) {
    opt.classList.remove('correct', 'incorrect');
    opt.style.pointerEvents = 'none'; // Lock selections
  }

  const feedback = document.getElementById('cyu-feedback');
  feedback.style.display = 'block';

  if (index === correctIndex) {
    element.classList.add('correct');
    feedback.innerHTML = `<span style="color: var(--color-green);">✓ Correct!</span> ${explanation}`;
    cyuStatus = true;
    document.getElementById('next-btn').disabled = false;
  } else {
    element.classList.add('incorrect');
    options[correctIndex].classList.add('correct');
    feedback.innerHTML = `<span style="color: var(--color-red);">✗ Incorrect.</span> ${explanation}`;
    cyuStatus = true; // Still allow completion once they see the correct answer
    document.getElementById('next-btn').disabled = false;
  }
}

// Progressive reveal navigation
function updateCardNavigation(trackId, studyId) {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  // Disable/enable prev
  prevBtn.disabled = currentCardIndex === 0;

  // Next button states
  if (currentCardIndex === cardsList.length - 1) {
    nextBtn.innerText = "Finish Study ✓";
  } else {
    nextBtn.innerText = "Next →";
  }

  // Lock next button on check-your-understanding card until answered
  const cyuCardIndex = Math.max(0, cardsList.length - 2);
  if (currentCardIndex === cyuCardIndex && !cyuStatus) {
    nextBtn.disabled = true;
  } else {
    nextBtn.disabled = false;
  }
}

function prevCard() {
  if (currentCardIndex > 0) {
    document.getElementById(`card-${currentCardIndex}`).classList.remove('active');
    currentCardIndex--;
    document.getElementById(`card-${currentCardIndex}`).classList.add('active');
    
    const urlParams = new URLSearchParams(window.location.search);
    const studyId = urlParams.get('study') || "1";
    const trackId = document.body.dataset.track;
    updateCardNavigation(trackId, studyId);
    updateProgressBar();
  }
}

function nextCard() {
  const trackId = document.body.dataset.track;
  const urlParams = new URLSearchParams(window.location.search);
  const studyId = urlParams.get('study') || "1";

  if (currentCardIndex < cardsList.length - 1) {
    document.getElementById(`card-${currentCardIndex}`).classList.remove('active');
    currentCardIndex++;
    document.getElementById(`card-${currentCardIndex}`).classList.add('active');
    
    updateCardNavigation(trackId, studyId);
    updateProgressBar();
  } else {
    // Finished last card, mark study complete!
    completeStudy(trackId, studyId);
    // Redirect back to track dashboard
    window.location.href = "index.html";
  }
}

function updateProgressBar() {
  const progress = ((currentCardIndex + 1) / cardsList.length) * 100;
  document.getElementById('progress-fill').style.width = `${progress}%`;
}

// --- Navigation Map Side Drawer ---
function setupNavigationDrawer(trackId, contentDatabase, currentStudyId) {
  const progress = getTrackProgress(trackId);
  const drawerList = document.getElementById('drawer-list');
  if (!drawerList) return;

  drawerList.innerHTML = '';
  contentDatabase.forEach(study => {
    const isCompleted = progress.completedStudies.includes(study.id);
    const isActive = study.id === currentStudyId;
    
    const item = document.createElement('li');
    item.className = `drawer-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
    item.onclick = () => {
      window.location.href = `study.html?study=${study.id}`;
    };
    
    item.innerHTML = `
      <span class="drawer-item-check">${isCompleted ? '✓' : ''}</span>
      <span>Study ${study.id}: ${study.title}</span>
    `;
    drawerList.appendChild(item);
  });
}

function toggleDrawer() {
  document.getElementById('nav-drawer').classList.toggle('open');
  document.getElementById('drawer-overlay').classList.toggle('open');
}

// --- Scripture Reveal Modal ---
function bindScriptureLinks() {
  const links = document.querySelectorAll('.scripture-link');
  links.forEach(link => {
    const text = link.innerText;
    link.onclick = (e) => {
      e.preventDefault();
      revealScripture(text);
    };
  });
}

function revealScripture(reference) {
  const modal = document.getElementById('scripture-modal');
  const refTitle = document.getElementById('scripture-ref');
  const bodyText = document.getElementById('scripture-body');

  refTitle.innerText = reference;
  
  // Try local dictionary first
  let text = typeof getScriptureText === 'function' ? getScriptureText(reference) : null;
  
  if (text) {
    bodyText.innerHTML = `"${text}"`;
    modal.classList.add('open');
  } else {
    // If not found in local db, fetch from free Bible API online
    bodyText.innerHTML = `Loading verse from cloud...`;
    modal.classList.add('open');
    
    fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=nkjv`)
      .then(res => res.json())
      .then(data => {
        if (data && data.text) {
          bodyText.innerHTML = `"${data.text.trim()}"`;
        } else {
          bodyText.innerHTML = `Scripture verse details are referenced in your handbook. Please check your printed Bible.`;
        }
      })
      .catch(() => {
        bodyText.innerHTML = `Bible text could not be loaded offline. Sourced from: ${reference}`;
      });
  }
}

function closeScriptureModal() {
  document.getElementById('scripture-modal').classList.remove('open');
}

// --- Test / Exam Environment Engine ---
let examQuestions = [];
let examCurrentIndex = 0;
let examAnswers = {};
let examTimeLeft = 30 * 60; // 30 mins
let examTimerInterval = null;
let candidateInfo = {};

function startExamRegistration(e) {
  if (e) e.preventDefault();
  
  const trackId = document.body.dataset.track;
  const name = document.getElementById('candidate-name').value.trim();
  const dob = document.getElementById('candidate-dob').value;
  const phone = document.getElementById('candidate-phone').value.trim();
  const deptInput = document.getElementById('candidate-dept');
  const dept = deptInput ? deptInput.value.trim() : "General";

  if (!name || !dob || !phone) {
    alert("Please fill in all candidate details before beginning the exam.");
    return;
  }

  candidateInfo = { name, dob, phone, dept, date: new Date().toLocaleDateString() };

  // Load questions
  const fullBank = RCCG_QUIZZES[trackId];
  if (!fullBank || fullBank.length === 0) {
    alert("Question bank not loaded for this track.");
    return;
  }

  // Shuffled and picked 30 questions
  examQuestions = shuffleArray([...fullBank]).slice(0, 30);
  
  // Shuffled options for each question
  examQuestions.forEach(q => {
    q.shuffledOptions = shuffleArray([...q.options]);
  });

  examCurrentIndex = 0;
  examAnswers = {};

  // Switch viewports
  document.getElementById('registration-screen').style.display = 'none';
  document.getElementById('exam-screen').style.display = 'block';

  // Start timer
  startExamTimer();
  renderExamQuestion();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function startExamTimer() {
  examTimeLeft = 30 * 60; // 30 mins
  const widget = document.getElementById('timer-widget');
  widget.style.display = 'flex';

  updateTimerDisplay();

  examTimerInterval = setInterval(() => {
    examTimeLeft--;
    updateTimerDisplay();

    if (examTimeLeft <= 60) {
      widget.classList.add('quiz-timer-warn');
    }

    if (examTimeLeft <= 0) {
      clearInterval(examTimerInterval);
      alert("Time is up! Your answers are being submitted.");
      submitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(examTimeLeft / 60);
  const secs = examTimeLeft % 60;
  document.getElementById('timer-time').innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderExamQuestion() {
  const q = examQuestions[examCurrentIndex];
  
  document.getElementById('q-number').innerText = `Question ${examCurrentIndex + 1} of 30`;
  document.getElementById('q-text').innerText = q.question;

  const optionsContainer = document.getElementById('q-options');
  optionsContainer.innerHTML = '';

  q.shuffledOptions.forEach((opt) => {
    const isSelected = examAnswers[examCurrentIndex] === opt;
    const optionEl = document.createElement('div');
    optionEl.className = `quiz-option ${isSelected ? 'selected' : ''}`;
    optionEl.onclick = () => selectQuizOption(opt);
    
    optionEl.innerHTML = `
      <input type="radio" name="quiz_opt" value="${opt}" ${isSelected ? 'checked' : ''}>
      <span>${opt}</span>
    `;
    optionsContainer.appendChild(optionEl);
  });

  // Setup navigation controls
  document.getElementById('quiz-prev-btn').disabled = examCurrentIndex === 0;
  
  const nextBtn = document.getElementById('quiz-next-btn');
  if (examCurrentIndex === 29) {
    nextBtn.innerText = "Submit Exam ⎘";
  } else {
    nextBtn.innerText = "Next Question →";
  }
}

function selectQuizOption(option) {
  examAnswers[examCurrentIndex] = option;
  renderExamQuestion();
}

function quizPrev() {
  if (examCurrentIndex > 0) {
    examCurrentIndex--;
    renderExamQuestion();
  }
}

function quizNext() {
  if (examCurrentIndex < 29) {
    examCurrentIndex++;
    renderExamQuestion();
  } else {
    // Confirmation
    const unanswered = 30 - Object.keys(examAnswers).length;
    let msg = "Are you sure you want to submit your exam?";
    if (unanswered > 0) {
      msg = `You have ${unanswered} unanswered questions. Are you sure you want to submit?`;
    }
    if (confirm(msg)) {
      submitExam();
    }
  }
}

function submitExam() {
  clearInterval(examTimerInterval);
  document.getElementById('timer-widget').style.display = 'none';

  // Calculate score
  let correctCount = 0;
  examQuestions.forEach((q, idx) => {
    if (examAnswers[idx] === q.answer) {
      correctCount++;
    }
  });

  const percentage = Math.round((correctCount / 30) * 100);
  const passed = percentage >= 70; // 70% pass score
  const trackId = document.body.dataset.track;

  // Save progress score
  const progress = getTrackProgress(trackId);
  progress.examScore = percentage;
  progress.examPassed = passed;
  saveTrackProgress(trackId, progress);

  // Render Result Screen
  document.getElementById('exam-screen').style.display = 'none';
  const resultScreen = document.getElementById('result-screen');
  resultScreen.style.display = 'block';

  const trackName = getTrackName(trackId);

  resultScreen.innerHTML = `
    <div class="result-card">
      <div class="result-circle ${passed ? 'passed' : 'failed'}">
        <div class="result-circle-num">${percentage}%</div>
        <div class="result-circle-label">${passed ? 'Passed' : 'Failed'}</div>
      </div>
      <h2 class="result-status-title" style="color: ${passed ? 'var(--color-green)' : 'var(--color-red)'}">
        ${passed ? 'Congratulations!' : 'Exam Unsuccessful'}
      </h2>
      <p class="result-status-text">
        ${passed ? 'You have successfully passed the certification exam!' : 'You did not reach the 70% passing score. Please review the manual and try again.'}
      </p>

      <div class="result-details">
        <div class="result-details-row">
          <span class="result-details-label">Candidate Name:</span>
          <span class="result-details-value">${candidateInfo.name}</span>
        </div>
        <div class="result-details-row">
          <span class="result-details-label">Date of Birth:</span>
          <span class="result-details-value">${candidateInfo.dob}</span>
        </div>
        <div class="result-details-row">
          <span class="result-details-label">Manual track:</span>
          <span class="result-details-value">${trackName}</span>
        </div>
        <div class="result-details-row">
          <span class="result-details-label">Score details:</span>
          <span class="result-details-value">${correctCount} / 30 Correct</span>
        </div>
        <div class="result-details-row">
          <span class="result-details-label">Exam date:</span>
          <span class="result-details-value">${candidateInfo.date}</span>
        </div>
      </div>

      <div class="dashboard-actions" style="justify-content: center;">
        <button class="btn btn-primary" onclick="shareToWhatsApp('${trackName}', ${percentage}, ${passed})">
          Share to WhatsApp Group 📱
        </button>
        <a href="index.html" class="btn btn-outline">Back to Dashboard</a>
      </div>
    </div>
  `;
}

function getTrackName(trackId) {
  if (trackId === "believers") return "Believers' Manual";
  if (trackId === "baptismal") return "Baptismal Manual";
  if (trackId === "workers") return "Workers-in-Training";
  return "RCCG Manual";
}

function shareToWhatsApp(trackName, score, passed) {
  const statusStr = passed ? "🏆 PASSED (CERTIFIED)" : "❌ FAILED (REQUIRES RETAKE)";
  const deptStr = candidateInfo.dept ? `\n*Department:* ${candidateInfo.dept}` : "";
  
  const textMsg = `*RCCG EXAM RESULT SUMMARY*
----------------------------------
*Candidate:* ${candidateInfo.name}
*DOB:* ${candidateInfo.dob}
*Track:* ${trackName}${deptStr}
*Date:* ${candidateInfo.date}
*Score:* ${score}%
*Status:* ${statusStr}
----------------------------------
RCCG Training Portal
Group Link: https://chat.whatsapp.com/JjGUgLda4izJauGQwXWGdu`;

  // Encode message for URL
  const encodedText = encodeURIComponent(textMsg);
  
  // Native WhatsApp share url
  const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  
  // Open link in new tab
  window.open(waUrl, '_blank');
}
