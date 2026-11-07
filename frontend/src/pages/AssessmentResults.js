import { assessmentsApi } from '../api/assessments.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const AssessmentResults = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="assessment-results-page page-root" id="main-content">
        <div class="container container--narrow">

          <div id="results-content-box">
            <div class="loading-spinner">Loading your latest results...</div>
          </div>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    const container = document.getElementById('results-content-box');

    try {
      const res = await assessmentsApi.getLatestAssessment();
      if (!res.latest) {
        container.innerHTML = `
          <div class="card empty-state">
            <h2>No screening completed yet</h2>
            <p>Take the 20-question screening for a private check-in on recent well-being.</p>
            <a href="/assessment" class="btn btn-primary mt-4">Take screening now</a>
          </div>
        `;
        return;
      }

      const a = res.latest;
      const hasValidatedScores = a.score_schema_version === 2;
      const contextPrompts = {
        17: 'Academic or campus responsibilities felt hard to manage',
        18: 'Felt connected to someone you can turn to',
        19: 'Had enough time to rest',
        20: 'Could take a small step when something felt difficult',
      };
      const frequencyLabels = ['Not at all / rarely', 'Several days', 'More than half the days', 'Nearly every day'];
      const dateStr = new Date(a.taken_at).toLocaleDateString(undefined, {
        month: 'long', day: 'numeric', year: 'numeric'
      });

      container.innerHTML = `
        <div class="results-header">
          <span class="section-eyebrow">Screening Overview</span>
          <h1 class="page-title">Your Well-Being Summary</h1>
          <p class="text-xs text-ink-60">Completed on ${dateStr}</p>
        </div>

        <div class="card results-score-card mt-6">
          <div class="score-display-row">
            <div class="score-category-wrap">
              <span class="badge badge-lg badge-${a.category}">${a.level_label}</span>
              <p class="score-scale-hint">Based on your separate screening scales. This is not a diagnosis.</p>
            </div>
          </div>

          ${hasValidatedScores ? `
            <div class="assessment-score-grid" aria-label="Screening scores">
              <article><span>PHQ-9</span><strong>${a.phq9_score}<small> / 27</small></strong><p>Low-mood screening score</p></article>
              <article><span>GAD-7</span><strong>${a.gad7_score}<small> / 21</small></strong><p>Anxiety screening score</p></article>
            </div>
            <p class="text-xs text-ink-60 mt-3">Student-life check-in answers add context and are not included in either score.</p>
            <div class="student-context-summary">
              <h3>Student-life reflection</h3>
              ${(a.student_life_answers || []).map(answer => `<div><span>${contextPrompts[answer.question_id] || 'Your check-in'}</span><strong>${frequencyLabels[answer.score] || '—'}</strong></div>`).join('')}
            </div>
          ` : `<p class="text-xs text-ink-60">This entry was recorded with an earlier version of the self-reflection check-in.</p>`}

          <div class="results-disclaimer-box" role="note">
            <p><strong>Important:</strong> ${a.disclaimer}</p>
          </div>

          <div class="results-section mt-6">
            <h3 class="results-section-heading">Interpretation</h3>
            <p class="results-body-text">${a.interpretation}</p>
          </div>

          <div class="results-section mt-6">
            <h3 class="results-section-heading">Supportive Recommendations</h3>
            <ul class="recommendations-list">
              ${(a.recommendations || []).map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <div class="results-actions-row mt-8">
            <a href="/chat" class="btn btn-primary">Talk with AI Companion</a>
            <a href="/counsellors" class="btn btn-secondary">Consult a Counsellor</a>
            <button type="button" class="btn btn-secondary" id="btn-print-report">🖨️ Print Report</button>
            <a href="/assessment" class="btn btn-ghost btn-sm">Retake Screening</a>
          </div>
        </div>

        <!-- Support reminder -->
        <div class="results-support-banner mt-6">
          <p>Need immediate support? In India, call <a href="tel:14416" class="underline">14416 (Tele-MANAS)</a> or <a href="tel:112" class="underline">112</a> in immediate danger.</p>
        </div>
      `;

      document.getElementById('btn-print-report')?.addEventListener('click', () => {
        window.print();
      });
    } catch (err) {
      container.innerHTML = `<p class="error-text">Could not load results. Please try again.</p>`;
    }
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
