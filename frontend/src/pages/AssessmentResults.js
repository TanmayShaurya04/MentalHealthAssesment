import { assessmentsApi } from '../api/assessments.js';
import { router } from '../router.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { esc } from '../utils/html.js';

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
            <p>Take the 20-question screening to check in on your mood, anxiety and student-life stress.</p>
            <a href="/assessment" class="btn btn-primary mt-4">Take screening now</a>
          </div>
        `;
        return;
      }

      const a = res.latest;
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
            <div>
              <span class="score-number">${a.total_score}</span>
              ${a.max_score ? `<span class="score-total">/ ${a.max_score}</span>` : ''}
            </div>
            <div class="score-category-wrap">
              <span class="badge badge-lg badge-${a.category}">${esc(a.level_label)}</span>
              <p class="score-scale-hint">${a.sections ? 'Combined across PHQ-9, GAD-7 and the student check-in' : 'Overall screening score'}</p>
            </div>
          </div>

          ${a.safety_flag ? `
            <div class="safety-inline safety-inline--lg" role="alert">
              <strong>You mentioned thoughts of being better off dead or of hurting yourself.</strong>
              Please talk to someone today. Call Tele-MANAS on <a href="tel:14416"><strong>14416</strong></a> (free, 24x7),
              KIRAN on <a href="tel:18005990019"><strong>1800-599-0019</strong></a>, or <a href="tel:112"><strong>112</strong></a> if you are in immediate danger.
            </div>` : ''}

          ${(a.sections || []).length ? `
            <div class="results-section mt-6">
              <h3 class="results-section-heading">Your results by area</h3>
              <div class="section-bars">
                ${a.sections.map((sec) => `
                  <div class="section-bar">
                    <div class="section-bar-head">
                      <span><strong>${esc(sec.title)}</strong> <em>${esc(sec.instrument)}${sec.validated ? '' : ' · context only'}</em></span>
                      <span>${sec.score}/${sec.max} · <strong>${esc(sec.severity)}</strong></span>
                    </div>
                    <div class="section-bar-track"><div class="section-bar-fill rank-${sec.rank}" style="--w:${Math.round((sec.score / sec.max) * 100)}%"></div></div>
                  </div>`).join('')}
              </div>
              <p class="text-xs text-ink-60 mt-2">PHQ-9 bands: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe, 20–27 severe. GAD-7 bands: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe.</p>
            </div>` : ''}

          <div class="results-disclaimer-box" role="note">
            <p><strong>Important:</strong> ${esc(a.disclaimer)}</p>
          </div>

          <div class="results-section mt-6">
            <h3 class="results-section-heading">Interpretation</h3>
            <p class="results-body-text">${esc(a.interpretation).replace(/\n\n/g, '<br><br>')}</p>
          </div>

          <div class="results-section mt-6">
            <h3 class="results-section-heading">Supportive Recommendations</h3>
            <ul class="recommendations-list">
              ${(a.recommendations || []).map(r => `<li>${esc(r)}</li>`).join('')}
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
          <p>Need immediate support? Connect with our 24x7 verified helpline at <a href="tel:14416" class="underline">14416 (Tele-MANAS)</a>.</p>
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
