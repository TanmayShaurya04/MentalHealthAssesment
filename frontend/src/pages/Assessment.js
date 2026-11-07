import { assessmentsApi } from '../api/assessments.js';
import { Toast } from '../components/Toast.js';
import { navigate } from '../navigation.js';
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
              <strong>Notice:</strong> 20 questions in three short parts, about 4 minutes. The PHQ-9 and GAD-7 are screening tools; the student-life check-in adds context only. This is not a medical diagnosis.
              <span class="assessment-source-links">Questionnaire references: <a href="https://cde.nlm.nih.gov/formView?tinyId=mJsGoMU1m" target="_blank" rel="noopener noreferrer">PHQ-9</a> · <a href="https://adaa.org/sites/default/files/GAD-7_Anxiety-updated_0.pdf" target="_blank" rel="noopener noreferrer">GAD-7</a></span>
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
    let currentIndex = 0;
    const answers = {};

    try {
      const data = await assessmentsApi.getQuestions();
      questions = data.questions;
      scale = data.scale;
      renderQuestion();
    } catch (e) {
      flowCard.innerHTML = `<p class="error-text">Unable to load screening questionnaire at this time.</p>`;
    }

    function renderQuestion() {
      if (!flowCard || questions.length === 0) return;

      const q = questions[currentIndex];
      const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
      const currentAnswer = answers[q.id];

      flowCard.innerHTML = `
        <div class="assessment-progress-bar-wrap">
          <div class="progress-info-row">
            <span>Question ${currentIndex + 1} of ${questions.length}</span>
            <span>Over the last 2 weeks</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <div class="question-body-wrap mt-6">
          <span class="assessment-question-kicker">${q.section || 'Private check-in'} · Question ${currentIndex + 1} of ${questions.length}</span>
          <h2 class="question-prompt-text">${q.prompt}</h2>
          ${q.safety_item ? `<p class="assessment-sensitive-note">This question can feel personal. You may pause at any time. If you are in immediate danger, call <a href="tel:112">112</a> or Tele-MANAS at <a href="tel:14416">14416</a>.</p>` : ''}
          ${q.safety_item && currentAnswer > 0 ? `<div class="assessment-support-alert" role="alert"><strong>You deserve support right now.</strong><p>If you feel you might act on these thoughts, call <a href="tel:112">112</a> or <a href="tel:14416">14416</a>, and contact someone trusted who can stay with you. This questionnaire cannot assess immediate safety.</p></div>` : ''}

          <div class="options-group mt-6" role="radiogroup" aria-label="Answer options">
            ${scale.map((opt, optionIndex) => `
              <button
                type="button"
                class="option-choice-btn ${currentAnswer === opt.score ? 'selected' : ''}"
                data-score="${opt.score}"
                aria-pressed="${currentAnswer === opt.score}"
              >
                <span class="option-feeling" aria-hidden="true">${(q.reverse_context ? ['😟', '😐', '🙂', '😄'] : ['🙂', '😐', '😟', '😣'])[optionIndex] || '•'}</span>
                <span class="option-label-text">${q.context_only && optionIndex === 0 ? 'Not at all / rarely' : opt.label}</span>
                <span class="option-choice-check" aria-hidden="true">${currentAnswer === opt.score ? '✓' : '→'}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="assessment-nav-row mt-8">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-prev-question" ${currentIndex === 0 ? 'disabled' : ''}>
            ← Previous
          </button>

          ${currentIndex === questions.length - 1 ? `
            <button type="button" class="btn btn-primary btn-sm" id="btn-submit-assessment" ${currentAnswer === undefined ? 'disabled' : ''}>
              Complete Screening →
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" id="btn-next-question" ${currentAnswer === undefined ? 'disabled' : ''}>
              Next Question →
            </button>
          `}
        </div>
      `;

      // Wire option clicks
      flowCard.querySelectorAll('.option-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const score = parseInt(btn.dataset.score, 10);
          answers[q.id] = score;
          flowCard.querySelectorAll('.option-choice-btn').forEach(option => {
            option.classList.toggle('selected', option === btn);
            option.setAttribute('aria-pressed', String(option === btn));
          });

          // Auto-advance if not on last question
          if (currentIndex < questions.length - 1 && !(q.safety_item && score > 0)) {
            setTimeout(() => {
              currentIndex++;
              renderQuestion();
            }, 180);
          } else {
            renderQuestion();
          }
        });
      });

      // Wire Prev button
      document.getElementById('btn-prev-question')?.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderQuestion();
        }
      });

      // Wire Next button
      document.getElementById('btn-next-question')?.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) {
          currentIndex++;
          renderQuestion();
        }
      });

      // Wire Submit button
      document.getElementById('btn-submit-assessment')?.addEventListener('click', async () => {
        const payload = Object.entries(answers).map(([qId, score]) => ({
          question_id: parseInt(qId, 10),
          score
        }));

        const submitBtn = document.getElementById('btn-submit-assessment');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Calculating score...';

        try {
          const res = await assessmentsApi.submitAssessment(payload);
          Toast.success('Screening completed.');
          navigate('/assessment/results');
        } catch (err) {
          Toast.error(err.message || 'Failed to submit screening.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Complete Screening →';
        }
      });
    }
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
