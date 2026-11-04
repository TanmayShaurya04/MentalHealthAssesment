import { assessmentsApi } from '../api/assessments.js';
import { Toast } from '../components/Toast.js';
import { router } from '../router.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Assessment = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="assessment-page page-root" id="main-content">
        <div class="container container--narrow assessment-container">

          <header class="assessment-header">
            <span class="section-eyebrow">Self-Reflection</span>
            <h1 class="page-title">Student Well-Being Screening</h1>
            <p class="assessment-disclaimer-banner" role="note">
              <strong>Notice:</strong> This screening is for self-reflection and awareness. It is not a medical diagnosis.
            </p>
          </header>

          <div class="card assessment-flow-card" id="assessment-flow-card">
            <div class="loading-spinner">Preparing screening questions...</div>
          </div>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    const flowCard = document.getElementById('assessment-flow-card');
    let questions = [];
    let scale = [];
    let sections = [];
    let currentIndex = 0;
    let started = false;
    const answers = {};

    try {
      const data = await assessmentsApi.getQuestions();
      questions = data.questions;
      scale = data.scale;
      sections = data.sections;
      renderIntro();
    } catch (e) {
      flowCard.innerHTML = `<p class="error-text">Unable to load screening questionnaire at this time.</p>`;
    }

    const sectionOf = (q) => sections.find((s) => s.id === q.section);

    function renderIntro() {
      flowCard.innerHTML = `
        <div class="assess-intro">
          <h2 class="assess-intro-title">Before you begin</h2>
          <ul class="assess-intro-list">
            <li><strong>${questions.length} questions</strong> in three short parts, about 4 minutes.</li>
            <li>Parts 1 and 2 are the <strong>PHQ-9</strong> and <strong>GAD-7</strong>, two widely used screening questionnaires for low mood and anxiety.</li>
            <li>Part 3 is a short student-life check-in written for Serenova. It adds context but is not a clinical scale.</li>
            <li>Answer for <strong>the last 2 weeks</strong>. There are no right or wrong answers.</li>
            <li>Your answers are private to you.</li>
          </ul>
          <div class="assess-intro-note" role="note">
            This is a screening, not a diagnosis. If you are in distress right now, call Tele-MANAS on <a href="tel:14416"><strong>14416</strong></a> (free, 24x7).
          </div>
          <button type="button" class="btn btn-primary" id="btn-start-assessment">Start screening →</button>
        </div>
      `;
      document.getElementById('btn-start-assessment')?.addEventListener('click', () => {
        started = true;
        renderQuestion();
      });
    }

    function renderQuestion() {
      if (!flowCard || questions.length === 0) return;

      const q = questions[currentIndex];
      const sec = sectionOf(q);
      const progressPercent = Math.round((currentIndex / questions.length) * 100);
      const currentAnswer = answers[q.id];
      const isLast = currentIndex === questions.length - 1;
      const partNo = sections.findIndex((s) => s.id === q.section) + 1;
      const firstOfSection = currentIndex === 0 || questions[currentIndex - 1].section !== q.section;

      flowCard.innerHTML = `
        <div class="assessment-progress-bar-wrap">
          <div class="progress-info-row">
            <span>Question ${currentIndex + 1} of ${questions.length}</span>
            <span>Part ${partNo} of ${sections.length} · ${sec.title}</span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${currentIndex}">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-parts" aria-hidden="true">
            ${sections.map((s, i) => `<span class="${i + 1 < partNo ? 'done' : i + 1 === partNo ? 'current' : ''}"></span>`).join('')}
          </div>
        </div>

        <div class="question-body-wrap question-enter mt-6" key="${q.id}">
          ${firstOfSection ? `<p class="section-intro-note"><strong>${sec.instrument}</strong> · ${sec.intro}</p>` : `<p class="section-intro-note section-intro-note--quiet">${sec.intro}</p>`}
          <h2 class="question-prompt-text">${q.prompt}</h2>

          <div class="options-group mt-6" role="radiogroup" aria-label="Answer options">
            ${scale.map((opt) => `
              <button
                type="button"
                role="radio"
                aria-checked="${currentAnswer === opt.score}"
                class="option-choice-btn ${currentAnswer === opt.score ? 'selected' : ''}"
                data-score="${opt.score}"
              >
                <span class="option-radio-circle"></span>
                <span class="option-label-text">${opt.label}</span>
                <kbd class="option-key" aria-hidden="true">${opt.score + 1}</kbd>
              </button>
            `).join('')}
          </div>

          ${q.safety && currentAnswer > 0 ? `
            <div class="safety-inline" role="alert">
              <strong>Thank you for answering honestly.</strong>
              If you have thoughts of harming yourself, please talk to someone today: Tele-MANAS
              <a href="tel:14416"><strong>14416</strong></a> (free, 24x7) or <a href="tel:112"><strong>112</strong></a> in an emergency.
              You can keep going with the screening afterwards.
            </div>
          ` : ''}
        </div>

        <div class="assessment-nav-row mt-8">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-prev-question" ${currentIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>

          ${isLast ? `
            <button type="button" class="btn btn-primary btn-sm" id="btn-submit-assessment" ${currentAnswer === undefined ? 'disabled' : ''}>
              See my results →
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" id="btn-next-question" ${currentAnswer === undefined ? 'disabled' : ''}>
              Next →
            </button>
          `}
        </div>
      `;

      const choose = (score) => {
        answers[q.id] = score;
        // Auto-advance, except on the safety question (let the note be read) and the last question
        if (!isLast && !q.safety) {
          setTimeout(() => { currentIndex++; renderQuestion(); }, 220);
          flowCard.querySelectorAll('.option-choice-btn').forEach((b) => {
            const on = parseInt(b.dataset.score, 10) === score;
            b.classList.toggle('selected', on);
            b.setAttribute('aria-checked', String(on));
          });
        } else {
          renderQuestion();
        }
      };

      flowCard.querySelectorAll('.option-choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => choose(parseInt(btn.dataset.score, 10)));
      });

      document.getElementById('btn-prev-question')?.addEventListener('click', () => {
        if (currentIndex > 0) { currentIndex--; renderQuestion(); }
      });

      document.getElementById('btn-next-question')?.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) { currentIndex++; renderQuestion(); }
      });

      document.getElementById('btn-submit-assessment')?.addEventListener('click', async () => {
        const payload = Object.entries(answers).map(([qId, score]) => ({
          question_id: parseInt(qId, 10),
          score
        }));

        const submitBtn = document.getElementById('btn-submit-assessment');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Calculating…';

        try {
          await assessmentsApi.submitAssessment(payload);
          Toast.success('Screening completed.');
          router.navigate('/assessment/results');
        } catch (err) {
          Toast.error(err.message || 'Failed to submit screening.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'See my results →';
        }
      });
    }

    // Keyboard: press 1-4 to answer the current question
    this._onKey = (e) => {
      if (!started || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= scale.length) {
        flowCard.querySelector(`.option-choice-btn[data-score="${n - 1}"]`)?.click();
      }
    };
    document.addEventListener('keydown', this._onKey);
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
    if (this._onKey) document.removeEventListener('keydown', this._onKey);
  }
};
