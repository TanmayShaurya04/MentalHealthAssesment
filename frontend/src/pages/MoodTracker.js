import { moodsApi } from '../api/moods.js';
import { confirmDialog } from '../components/Dialog.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import Chart from 'chart.js/auto';

/**
 * Expressive Vector Artwork Images for Mood States
 * Hand-crafted SVG illustrations representing emotional states.
 */
export function renderMoodArtwork(level, size = 48) {
  const s = size;
  switch (level) {
    case 'very_low':
      return `
        <svg width="${s}" height="${s}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mood-svg-art mood-art--very-low" aria-label="Very Low mood illustration">
          <circle cx="32" cy="32" r="30" fill="#E8EEF5" stroke="#4A6FA5" stroke-width="2.5"/>
          <path d="M22 26C24 23 27 24 27 24" stroke="#2B4C7E" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M42 26C40 23 37 24 37 24" stroke="#2B4C7E" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="24" cy="30" r="3" fill="#2B4C7E"/>
          <circle cx="40" cy="30" r="3" fill="#2B4C7E"/>
          <path d="M43 36C43 36 45 39 45 40.5C45 41.8 44 43 42.5 43C41 43 40 41.8 40 40.5C40 39 42 36 42 36" fill="#64B5F6"/>
          <path d="M24 44C27 40 37 40 40 44" stroke="#2B4C7E" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `;

    case 'low':
      return `
        <svg width="${s}" height="${s}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mood-svg-art mood-art--low" aria-label="Low mood illustration">
          <circle cx="32" cy="32" r="30" fill="#EDEAF2" stroke="#7E6B8F" stroke-width="2.5"/>
          <circle cx="23" cy="29" r="3" fill="#58456B"/>
          <circle cx="41" cy="29" r="3" fill="#58456B"/>
          <path d="M25 41C29 39 35 39 39 41" stroke="#58456B" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="20" cy="35" r="3" fill="#D7C9E3" opacity="0.6"/>
          <circle cx="44" cy="35" r="3" fill="#D7C9E3" opacity="0.6"/>
        </svg>
      `;

    case 'neutral':
      return `
        <svg width="${s}" height="${s}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mood-svg-art mood-art--neutral" aria-label="Neutral mood illustration">
          <circle cx="32" cy="32" r="30" fill="#EBF2ED" stroke="#5B8266" stroke-width="2.5"/>
          <circle cx="23" cy="30" r="3" fill="#385440"/>
          <circle cx="41" cy="30" r="3" fill="#385440"/>
          <line x1="25" y1="41" x2="39" y2="41" stroke="#385440" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="19" cy="36" r="3" fill="#A8D5BA" opacity="0.5"/>
          <circle cx="45" cy="36" r="3" fill="#A8D5BA" opacity="0.5"/>
        </svg>
      `;

    case 'good':
      return `
        <svg width="${s}" height="${s}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mood-svg-art mood-art--good" aria-label="Good mood illustration">
          <circle cx="32" cy="32" r="30" fill="#FBF3E8" stroke="#D97706" stroke-width="2.5"/>
          <path d="M21 28C22 26 25 26 26 28" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M38 28C39 26 42 26 43 28" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M23 37C25 43 39 43 41 37" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="18" cy="35" r="4" fill="#FCD34D" opacity="0.7"/>
          <circle cx="46" cy="35" r="4" fill="#FCD34D" opacity="0.7"/>
        </svg>
      `;

    case 'very_good':
    default:
      return `
        <svg width="${s}" height="${s}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="mood-svg-art mood-art--very-good" aria-label="Very Good mood illustration">
          <circle cx="32" cy="32" r="30" fill="#FFF1EE" stroke="#C65D3A" stroke-width="2.5"/>
          <path d="M20 27C21 24 25 24 26 27" stroke="#872E15" stroke-width="3" stroke-linecap="round"/>
          <path d="M38 27C39 24 43 24 44 27" stroke="#872E15" stroke-width="3" stroke-linecap="round"/>
          <path d="M22 36C24 45 40 45 42 36" stroke="#872E15" stroke-width="3" stroke-linecap="round" fill="#C65D3A"/>
          <circle cx="17" cy="36" r="4.5" fill="#F87171" opacity="0.6"/>
          <circle cx="47" cy="36" r="4.5" fill="#F87171" opacity="0.6"/>
          <path d="M12 16L14 12L16 16L20 18L16 20L14 24L12 20L8 18L12 16Z" fill="#FBBF24"/>
          <path d="M50 14L51.5 11L53 14L56 15.5L53 17L51.5 20L50 17L47 15.5L50 14Z" fill="#FBBF24"/>
        </svg>
      `;
  }
}

export const MoodTracker = {
  _cleanupNavbar: null,
  _chartInstance: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="mood-tracker-page page-root" id="main-content">
        <div class="container mood-container">

          <header class="page-header">
            <span class="section-eyebrow">Emotional Rhythm</span>
            <h1 class="page-title">Mood Journal & Emotional Weather</h1>
            <p class="page-subtitle">
              Visualise and observe your emotional state with gentle honesty. No pressure, no judgment.
            </p>
          </header>

          <div class="mood-layout-grid">

            <!-- Log Form Card -->
            <section class="card mood-entry-card" aria-labelledby="new-mood-heading">
              <span class="card-eyebrow">Visual Check-in</span>
              <h2 id="new-mood-heading" class="card-title">How does your mind feel right now?</h2>

              <!-- Visual Mood Selector Bar with Images -->
              <div class="mood-selector-bar mt-4" role="radiogroup" aria-label="Select mood state">
                <button type="button" class="mood-pick-btn" data-level="very_low" data-score="1" aria-label="Very Low">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('very_low', 48)}
                  </div>
                  <span class="mood-pick-label">Very Low</span>
                </button>

                <button type="button" class="mood-pick-btn" data-level="low" data-score="2" aria-label="Low">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('low', 48)}
                  </div>
                  <span class="mood-pick-label">Low</span>
                </button>

                <button type="button" class="mood-pick-btn active" data-level="neutral" data-score="3" aria-label="Neutral">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('neutral', 48)}
                  </div>
                  <span class="mood-pick-label">Neutral</span>
                </button>

                <button type="button" class="mood-pick-btn" data-level="good" data-score="4" aria-label="Good">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('good', 48)}
                  </div>
                  <span class="mood-pick-label">Good</span>
                </button>

                <button type="button" class="mood-pick-btn" data-level="very_good" data-score="5" aria-label="Very Good">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('very_good', 48)}
                  </div>
                  <span class="mood-pick-label">Very Good</span>
                </button>
              </div>

              <!-- Tags Selector -->
              <div class="mood-tags-selector mt-6">
                <label class="form-label">What's influencing this feeling? (Optional)</label>
                <div class="tag-pills" id="tag-pills-container">
                  <button type="button" class="tag-toggle-btn" data-tag="Exams">Exams</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Deadlines">Deadlines</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Sleep">Sleep</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Friends">Friends</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Family">Family</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Rest">Rest</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Exercise">Exercise</button>
                  <button type="button" class="tag-toggle-btn" data-tag="Burnout">Burnout</button>
                </div>
              </div>

              <div class="form-group mt-4">
                <label for="mood-note-input" class="form-label">Optional Personal Note</label>
                <textarea
                  id="mood-note-input"
                  class="form-textarea"
                  style="min-height: 80px;"
                  placeholder="What's on your mind? (e.g. Turned in my assignment, feeling relieved but exhausted)"
                ></textarea>
              </div>

              <button type="button" class="btn btn-primary btn-block mt-3" id="submit-mood-btn">
                Record Visual Entry
              </button>
            </section>

            <!-- Chart / Trend Card -->
            <section class="card mood-chart-card" aria-labelledby="chart-heading">
              <div class="card-header-row">
                <div>
                  <span class="card-eyebrow">Trends</span>
                  <h2 id="chart-heading" class="card-title">Recent Emotional Weather</h2>
                </div>
                <div id="mood-summary-pill" class="badge badge-surface">Loading stats...</div>
              </div>

              <div class="chart-wrapper">
                <canvas id="mood-trend-canvas" role="img" aria-label="Mood trend line graph"></canvas>
              </div>
            </section>

          </div>

          <!-- History Section -->
          <section class="mood-history-section mt-8" aria-labelledby="history-heading">
            <div class="card-header-row">
              <h2 id="history-heading" class="page-section-title">Previous Check-Ins</h2>
              <span class="text-xs text-ink-60" id="total-logs-count"></span>
            </div>

            <div id="mood-history-list" class="mood-history-list mt-4">
              <div class="loading-spinner">Loading mood records...</div>
            </div>
          </section>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    let selectedLevel = 'neutral';
    let selectedScore = 3;
    const selectedTags = new Set();

    // 1. Level selector
    const levelBtns = document.querySelectorAll('.mood-pick-btn');
    levelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        levelBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLevel = btn.dataset.level;
        selectedScore = parseInt(btn.dataset.score, 10);
      });
    });

    // 2. Tags toggles
    const tagBtns = document.querySelectorAll('.tag-toggle-btn');
    tagBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (selectedTags.has(tag)) {
          selectedTags.delete(tag);
          btn.classList.remove('active');
        } else {
          selectedTags.add(tag);
          btn.classList.add('active');
        }
      });
    });

    // 3. Submit mood
    const submitBtn = document.getElementById('submit-mood-btn');
    const noteInput = document.getElementById('mood-note-input');

    submitBtn?.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Recording...';

      try {
        await moodsApi.logMood({
          level: selectedLevel,
          score: selectedScore,
          note: noteInput.value.trim() || null,
          tags: Array.from(selectedTags)
        });

        Toast.success('Mood logged successfully.');
        noteInput.value = '';
        selectedTags.clear();
        tagBtns.forEach(b => b.classList.remove('active'));

        loadData();
      } catch (err) {
        Toast.error(err.message || 'Could not save mood entry.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Record Visual Entry';
      }
    });

    // 4. Load Data & Render Chart
    const listEl = document.getElementById('mood-history-list');
    const summaryPill = document.getElementById('mood-summary-pill');
    const countEl = document.getElementById('total-logs-count');
    const canvas = document.getElementById('mood-trend-canvas');

    const loadData = async () => {
      try {
        const [history, stats] = await Promise.all([
          moodsApi.listMoods(30),
          moodsApi.getStats()
        ]);

        if (countEl) countEl.textContent = `${stats.total_logs} entries recorded`;
        if (summaryPill) {
          summaryPill.textContent = stats.total_logs > 0
            ? `Average: ${stats.average_score} / 5.0`
            : 'No logs yet';
        }

        if (history.length === 0) {
          listEl.innerHTML = `<p class="empty-text">No mood records yet. Make your first entry above.</p>`;
        } else {
          listEl.innerHTML = history.map(m => {
            const dateStr = new Date(m.recorded_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const moodIllustration = renderMoodArtwork(m.level, 40);

            return `
              <div class="card mood-history-item" id="mood-item-${m.id}">
                <div class="mood-item-left">
                  <div class="mood-history-image">
                    ${moodIllustration}
                  </div>
                  <div style="flex-grow:1;">
                    <div class="mood-item-header">
                      <strong>${m.level.replace('_', ' ').toUpperCase()}</strong>
                      <span class="mood-item-date">${dateStr}</span>
                    </div>
                    ${m.note ? `<p class="mood-item-note">"${m.note}"</p>` : ''}
                    ${(m.tags || []).length > 0 ? `
                      <div class="mood-item-tags">
                        ${m.tags.map(t => `<span class="badge badge-surface">#${t}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <button type="button" class="btn-delete-item" data-id="${m.id}" title="Delete record" aria-label="Delete record">✕</button>
              </div>
            `;
          }).join('');

          listEl.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (!(await confirmDialog({ title: 'Delete this mood entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
              try {
                await moodsApi.deleteMood(btn.dataset.id);
                Toast.info('Mood log removed.');
                loadData();
              } catch (e) {
                Toast.error('Could not delete record.');
              }
            });
          });
        }

        if (canvas) {
          if (this._chartInstance) {
            this._chartInstance.destroy();
          }

          const trendData = stats.recent_trend || [];
          const labels = trendData.map(d => {
            const dt = new Date(d.recorded_at);
            return `${dt.getMonth() + 1}/${dt.getDate()}`;
          });
          const scores = trendData.map(d => d.score);

          this._chartInstance = new Chart(canvas, {
            type: 'line',
            data: {
              labels: labels.length ? labels : ['Today'],
              datasets: [{
                label: 'Mood Level (1 to 5)',
                data: scores.length ? scores : [3],
                borderColor: '#C65D3A',
                backgroundColor: 'rgba(198, 93, 58, 0.08)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#C65D3A',
                pointRadius: 4,
                pointHoverRadius: 6,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  min: 1,
                  max: 5,
                  ticks: {
                    stepSize: 1,
                    callback: (val) => {
                      const map = { 1: 'Very Low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Very Good' };
                      return map[val] || '';
                    },
                    font: { family: 'DM Sans', size: 11 }
                  },
                  grid: { color: '#E0D9CF' }
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { family: 'DM Sans', size: 11 } }
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const map = { 1: 'Very Low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Very Good' };
                      return `Mood: ${map[ctx.parsed.y] || ctx.parsed.y}`;
                    }
                  }
                }
              }
            }
          });
        }

      } catch (err) {
        listEl.innerHTML = `<p class="error-text">Unable to load mood data.</p>`;
      }
    };

    loadData();
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
    if (this._chartInstance) {
      this._chartInstance.destroy();
      this._chartInstance = null;
    }
  }
};
