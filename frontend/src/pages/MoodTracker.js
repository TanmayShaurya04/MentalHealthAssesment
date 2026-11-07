import { moodsApi } from '../api/moods.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import Chart from 'chart.js/auto';

/** Custom, animated Serenova emoticons shared by check-in and mood history. */
export function renderMoodArtwork(level, size = 48) {
  const faces = {
    very_low: { label: 'Very low mood', skin: '#DDD5D1', cheek: '#C98F86', eyes: '<path d="M22 34q4-5 8 0m20 0q4-5 8 0"/><path d="m21 28 8 2m21-2-8 2"/>', mouth: '<path d="M31 54q9-8 18 0"/>', extra: '<path class="face-tear" d="M56 39c0 4-4 7-4 10a4 4 0 0 0 8 0c0-3-4-6-4-10Z" fill="#8A9E8A" stroke="none"/>' },
    low: { label: 'Low mood', skin: '#E6D5D1', cheek: '#CC988E', eyes: '<path d="M22 34q4 4 8 0m20 0q4 4 8 0"/><path d="m21 29 8 2m21-2-8 2"/>', mouth: '<path d="M31 51q9 7 18 0"/>', extra: '' },
    neutral: { label: 'Neutral mood', skin: '#E9E3D8', cheek: '#CBB89D', eyes: '<ellipse cx="26" cy="33" rx="2.2" ry="3.2"/><ellipse cx="54" cy="33" rx="2.2" ry="3.2"/>', mouth: '<path d="M32 49h16"/>', extra: '' },
    good: { label: 'Good mood', skin: '#F0E1C5', cheek: '#D8A447', eyes: '<path d="M22 34q4-4 8 0m20 0q4-4 8 0"/>', mouth: '<path d="M29 46q11 14 22 0"/>', extra: '<path class="face-glint" d="m62 19 2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#C65D3A" stroke="none"/>' },
    very_good: { label: 'Very good mood', skin: '#DFE8DD', cheek: '#8A9E8A', eyes: '<path d="M20 34q5-8 10 0m20 0q5-8 10 0"/>', mouth: '<path d="M27 44q13 19 26 0"/>', extra: '<path class="face-glint" d="m62 20 2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#D8A447" stroke="none"/>' },
  };
  const face = faces[level] || faces.neutral;
  const safeLevel = faces[level] ? level : 'neutral';
  const artSize = size + 32;
  return `<span class="mood-emoticon-art mood-emoticon-art--${safeLevel}" role="img" aria-label="${face.label}" style="--emoticon-size:${artSize}px"><svg viewBox="0 0 80 80" width="${artSize}" height="${artSize}" aria-hidden="true" focusable="false"><circle class="face-halo" cx="40" cy="40" r="37"/><circle class="face-disc" cx="40" cy="40" r="30" fill="${face.skin}"/><path class="face-shine" d="M20 25q7-12 19-12"/><ellipse cx="25" cy="45" rx="4.5" ry="2.6" fill="${face.cheek}" opacity=".55"/><ellipse cx="55" cy="45" rx="4.5" ry="2.6" fill="${face.cheek}" opacity=".55"/><g class="face-eyes" fill="none" stroke="#51463E" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${face.eyes}</g><g class="face-mouth" fill="none" stroke="#51463E" stroke-width="2.8" stroke-linecap="round">${face.mouth}</g>${face.extra}<circle class="face-freckle" cx="18" cy="54" r="1"/><circle class="face-freckle" cx="62" cy="54" r="1"/></svg></span>`;
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

              <!-- Animated Mood Emoticons -->
              <div class="mood-selector-bar mt-4" role="radiogroup" aria-label="Select mood state">
                <button type="button" class="mood-pick-btn" data-level="very_low" data-score="1" aria-label="Very Low">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('very_low', 48)}
                  </div>
                  <span class="mood-pick-label">Very Low</span><span class="mood-state-caption">Feeling heavy</span>
                </button>

                <button type="button" class="mood-pick-btn" data-level="low" data-score="2" aria-label="Low">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('low', 48)}
                  </div>
                  <span class="mood-pick-label">Low</span><span class="mood-state-caption">A little low</span>
                </button>

                <button type="button" class="mood-pick-btn active" data-level="neutral" data-score="3" aria-label="Neutral">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('neutral', 48)}
                  </div>
                  <span class="mood-pick-label">Neutral</span><span class="mood-state-caption">In between</span>
                </button>

                <button type="button" class="mood-pick-btn" data-level="good" data-score="4" aria-label="Good">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('good', 48)}
                  </div>
                  <span class="mood-pick-label">Good</span><span class="mood-state-caption">Feeling brighter</span>
                </button>

                <button type="button" class="mood-pick-btn" data-level="very_good" data-score="5" aria-label="Very Good">
                  <div class="mood-image-wrapper">
                    ${renderMoodArtwork('very_good', 48)}
                  </div>
                  <span class="mood-pick-label">Very Good</span><span class="mood-state-caption">Feeling hopeful</span>
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
              <div class="mood-chart-detail" id="mood-chart-detail" aria-live="polite">
                <span>Hover over or tap a mood point to revisit that check-in.</span>
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
            const moodEmoticon = renderMoodArtwork(m.level, 40);

            return `
              <div class="card mood-history-item" id="mood-item-${m.id}">
                <div class="mood-item-left">
                  <div class="mood-history-image">
                    ${moodEmoticon}
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

          const levelLabels = { very_low: 'Very Low', low: 'Low', neutral: 'Neutral', good: 'Good', very_good: 'Very Good' };
          const moodFaceImages = {};
          ['very_low', 'low', 'neutral', 'good', 'very_good'].forEach(level => {
            const svgMarkup = renderMoodArtwork(level, 20).match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
            if (!svgMarkup) return;
            const image = new Image();
            const svgWithStyles = svgMarkup
              .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
              .replace(' aria-hidden="true" focusable="false">', '><style>.face-halo{fill:rgba(255,255,255,.46);stroke:rgba(198,93,58,.2);stroke-width:1}.face-disc{stroke:rgba(81,70,62,.12);stroke-width:1}.face-shine{fill:none;stroke:rgba(255,255,255,.76);stroke-width:3;stroke-linecap:round}.face-freckle{fill:rgba(81,70,62,.35)}</style>');
            image.onload = () => this._chartInstance?.draw();
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgWithStyles)}`;
            moodFaceImages[level] = image;
          });

          const moodFacePlugin = {
            id: 'serenovaMoodFaceMarkers',
            afterDatasetsDraw: chart => {
              const points = chart.getDatasetMeta(0).data;
              const activeIndex = chart.getActiveElements().find(item => item.datasetIndex === 0)?.index;
              const context = chart.ctx;
              points.forEach((point, index) => {
                const record = trendData[index];
                if (!record) return;
                const image = moodFaceImages[record.level];
                if (!image?.complete || !image.naturalWidth) return;
                const isActive = activeIndex === index;
                const diameter = isActive ? 34 : 29;
                context.save();
                context.beginPath();
                context.arc(point.x, point.y, diameter / 2 + 2, 0, Math.PI * 2);
                context.fillStyle = '#F6F1E8';
                context.shadowColor = isActive ? 'rgba(198,93,58,.28)' : 'rgba(52,42,34,.14)';
                context.shadowBlur = isActive ? 9 : 5;
                context.fill();
                context.shadowBlur = 0;
                context.lineWidth = isActive ? 2 : 1;
                context.strokeStyle = isActive ? '#C65D3A' : 'rgba(198,93,58,.32)';
                context.stroke();
                context.drawImage(image, point.x - diameter / 2, point.y - diameter / 2, diameter, diameter);
                context.restore();
              });
            }
          };

          const chartDetail = document.getElementById('mood-chart-detail');
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
                pointBackgroundColor: 'rgba(198,93,58,.22)',
                pointBorderColor: '#C65D3A',
                pointRadius: trendData.length ? 12 : 0,
                pointHoverRadius: 8,
                pointHitRadius: 14,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'nearest', intersect: true },
              hover: { mode: 'nearest', intersect: true },
              onHover: (_event, activeElements) => {
                canvas.style.cursor = activeElements.length ? 'pointer' : 'default';
              },
              onClick: (_event, activeElements) => {
                const point = activeElements[0];
                if (!point || !chartDetail) return;
                const record = trendData[point.index];
                if (!record) return;
                const label = levelLabels[record.level] || 'Mood check-in';
                const date = new Date(record.recorded_at).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                });
                chartDetail.innerHTML = `${renderMoodArtwork(record.level, 28)}<div class="mood-chart-detail-copy"><strong>${label}</strong><span>${date} · ${record.score}/5</span></div>`;
                chartDetail.classList.add('has-selection');
              },
              animation: { duration: 700, easing: 'easeOutQuart' },
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
                    title: contexts => {
                      const record = trendData[contexts[0]?.dataIndex];
                      return record ? new Date(record.recorded_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No check-in yet';
                    },
                    label: ctx => {
                      const record = trendData[ctx.dataIndex];
                      return record ? `${levelLabels[record.level] || 'Mood'} · ${record.score}/5` : 'No recorded mood';
                    },
                  }
                }
              }
            },
            plugins: [moodFacePlugin]
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
