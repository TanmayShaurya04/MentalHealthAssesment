import { moodsApi } from '../api/moods.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import Chart from 'chart.js/auto';

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
            <h1 class="page-title">Mood Journal & Reflections</h1>
            <p class="page-subtitle">
              Observing your emotional state with gentle honesty. No pressure, no judgment.
            </p>
          </header>

          <div class="mood-layout-grid">

            <!-- Log Form Card -->
            <section class="card mood-entry-card" aria-labelledby="new-mood-heading">
              <span class="card-eyebrow">Record right now</span>
              <h2 id="new-mood-heading" class="card-title">How does your mind feel in this moment?</h2>

              <div class="mood-selector-bar mt-4" role="radiogroup" aria-label="Select mood">
                <button type="button" class="mood-pick-btn" data-level="very_low" data-score="1" aria-label="Very Low">
                  <span class="mood-dot dot-very-low"></span>
                  <span class="mood-pick-label">Very Low</span>
                </button>
                <button type="button" class="mood-pick-btn" data-level="low" data-score="2" aria-label="Low">
                  <span class="mood-dot dot-low"></span>
                  <span class="mood-pick-label">Low</span>
                </button>
                <button type="button" class="mood-pick-btn active" data-level="neutral" data-score="3" aria-label="Neutral">
                  <span class="mood-dot dot-neutral"></span>
                  <span class="mood-pick-label">Neutral</span>
                </button>
                <button type="button" class="mood-pick-btn" data-level="good" data-score="4" aria-label="Good">
                  <span class="mood-dot dot-good"></span>
                  <span class="mood-pick-label">Good</span>
                </button>
                <button type="button" class="mood-pick-btn" data-level="very_good" data-score="5" aria-label="Very Good">
                  <span class="mood-dot dot-very-good"></span>
                  <span class="mood-pick-label">Very Good</span>
                </button>
              </div>

              <!-- Tags Selector -->
              <div class="mood-tags-selector mt-4">
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
                  placeholder="What's on your mind? (e.g. Stayed up late studying, feeling foggy but relieved)"
                ></textarea>
              </div>

              <button type="button" class="btn btn-primary btn-block mt-3" id="submit-mood-btn">
                Record Entry
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
              <div class="loading-spinner">Loading mood logs...</div>
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
        submitBtn.textContent = 'Record Entry';
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

        // Render List
        if (history.length === 0) {
          listEl.innerHTML = `<p class="empty-text">No mood records yet. Make your first entry above.</p>`;
        } else {
          listEl.innerHTML = history.map(m => {
            const dateStr = new Date(m.recorded_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `
              <div class="card mood-history-item" id="mood-item-${m.id}">
                <div class="mood-item-left">
                  <span class="mood-dot dot-${m.level.replace('_', '-')}"></span>
                  <div>
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

          // Wire delete
          listEl.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (!confirm('Delete this mood entry?')) return;
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

        // Render Chart.js
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
