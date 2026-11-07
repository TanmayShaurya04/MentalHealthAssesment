import { store } from '../store.js';
import { authApi } from '../api/auth.js';
import { moodsApi } from '../api/moods.js';
import { journalsApi } from '../api/journals.js';
import { assessmentsApi } from '../api/assessments.js';
import { appointmentsApi } from '../api/appointments.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { renderMoodArtwork } from './MoodTracker.js';

export const Dashboard = {
  _cleanupNavbar: null,
  _heroTimer: null,

  render() {
    const user = store.getUser() || { name: 'Student' };
    const firstName = user.name ? user.name.split(' ')[0] : 'Student';

    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    return `
      ${Navbar.render()}

      <main class="dashboard-page page-root" id="main-content">
        <div class="container dashboard-container">
          
          <!-- Rotating photo welcome panel -->
          <header class="dashboard-hero" aria-roledescription="carousel" aria-label="Student sanctuary">
            <div class="dashboard-hero-photo" id="dashboard-hero-photo" aria-hidden="true"></div>
            <div class="dashboard-hero-content">
              <span class="dashboard-eyebrow">Student Sanctuary</span>
              <h1 class="dashboard-greeting">${greeting}, ${firstName}.</h1>
              <p class="dashboard-tagline">How is your mind feeling today? There are no right or wrong answers.</p>
              <div class="dashboard-header-actions">
                <a href="/chat" class="btn btn-primary btn-sm">Talk with AI Companion</a>
                <a href="/counsellors" class="btn btn-secondary btn-sm">Counselling & Support</a>
              </div>
            </div>
            <div class="hero-carousel-controls" role="group" aria-label="Welcome photos">
              <button type="button" class="hero-carousel-dot active" data-slide="0" aria-label="Show photo 1" aria-pressed="true"></button>
              <button type="button" class="hero-carousel-dot" data-slide="1" aria-label="Show photo 2" aria-pressed="false"></button>
              <button type="button" class="hero-carousel-dot" data-slide="2" aria-label="Show photo 3" aria-pressed="false"></button>
            </div>
          </header>

          <!-- Core Grid Layout -->
          <div class="dashboard-grid">

            <!-- Left Main Column -->
            <div class="dashboard-main-col">

              <!-- Quick Mood Check-In Widget -->
              <section class="card dashboard-card mood-checkin-card" aria-labelledby="mood-checkin-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">Daily check-in</span>
                    <h2 id="mood-checkin-title" class="card-title">Record your mood</h2>
                  </div>
                  <a href="/mood" class="card-link-subtle">View history & chart →</a>
                </div>

                <div class="mood-selector-bar" role="radiogroup" aria-label="Select mood level">
                  <button type="button" class="mood-pick-btn" data-level="very_low" data-score="1" aria-label="Very Low">
                    <div class="mood-image-wrapper">${renderMoodArtwork('very_low', 40)}</div>
                    <span class="mood-pick-label">Very Low</span><span class="mood-state-caption">Feeling heavy</span>
                  </button>
                  <button type="button" class="mood-pick-btn" data-level="low" data-score="2" aria-label="Low">
                    <div class="mood-image-wrapper">${renderMoodArtwork('low', 40)}</div>
                    <span class="mood-pick-label">Low</span><span class="mood-state-caption">A little low</span>
                  </button>
                  <button type="button" class="mood-pick-btn active" data-level="neutral" data-score="3" aria-label="Neutral">
                    <div class="mood-image-wrapper">${renderMoodArtwork('neutral', 40)}</div>
                    <span class="mood-pick-label">Neutral</span><span class="mood-state-caption">In between</span>
                  </button>
                  <button type="button" class="mood-pick-btn" data-level="good" data-score="4" aria-label="Good">
                    <div class="mood-image-wrapper">${renderMoodArtwork('good', 40)}</div>
                    <span class="mood-pick-label">Good</span><span class="mood-state-caption">Feeling brighter</span>
                  </button>
                  <button type="button" class="mood-pick-btn" data-level="very_good" data-score="5" aria-label="Very Good">
                    <div class="mood-image-wrapper">${renderMoodArtwork('very_good', 40)}</div>
                    <span class="mood-pick-label">Very Good</span><span class="mood-state-caption">Feeling hopeful</span>
                  </button>
                </div>

                <div class="mood-note-group">
                  <input
                    type="text"
                    id="quick-mood-note"
                    class="form-input"
                    placeholder="Add an optional brief reflection... (e.g. Wrapped up lab experiment, feeling lighter)"
                  />
                  <button type="button" class="btn btn-primary" id="save-quick-mood-btn">Log today's mood</button>
                </div>

                <div id="latest-mood-badge" class="latest-mood-info" style="display:none;"></div>
              </section>

              <!-- Recent Journal Preview -->
              <section class="card dashboard-card" aria-labelledby="journal-preview-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">Private thoughts</span>
                    <h2 id="journal-preview-title" class="card-title">Latest Journal Reflection</h2>
                  </div>
                  <a href="/journal" class="card-link-subtle">All entries →</a>
                </div>

                <div id="dashboard-journal-preview" class="journal-preview-box">
                  <div class="loading-spinner">Loading latest reflection...</div>
                </div>

                <div class="card-action-bar">
                  <a href="/journal/new" class="btn btn-outline btn-sm">+ Write new entry</a>
                </div>
              </section>

              <!-- AI Companion Quick Prompts -->
              <section class="card dashboard-card ai-prompts-card" aria-labelledby="ai-prompts-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">Support companion</span>
                    <h2 id="ai-prompts-title" class="card-title">Need to think out loud?</h2>
                  </div>
                  <span class="badge badge-sage">Safe & Confidential</span>
                </div>
                <p class="ai-prompts-desc">
                  Serenova's companion listens with compassion, without diagnosing or evaluating you. Select a prompt to start:
                </p>
                <div class="ai-prompt-pills">
                  <a href="/chat" class="prompt-pill">"I have a lot of deadlines and my brain feels paralyzed."</a>
                  <a href="/chat" class="prompt-pill">"Can you guide me through a 2-minute grounding exercise?"</a>
                  <a href="/chat" class="prompt-pill">"I'm feeling like I don't belong in my program."</a>
                  <a href="/chat" class="prompt-pill">"My sleep schedule is completely upside down."</a>
                </div>
              </section>

            </div>

            <!-- Right Sidebar Column -->
            <div class="dashboard-side-col">

              <!-- Self-Assessment Screening Card -->
              <section class="card dashboard-card assessment-widget" aria-labelledby="screening-widget-title">
                <span class="card-eyebrow">Self-reflection</span>
                <h3 id="screening-widget-title" class="card-title">20-Question Well-Being Screening</h3>
                <p class="assessment-widget-desc">
                  PHQ-9 and GAD-7 screening with a short student-life check-in for context.
                </p>
                <div id="latest-assessment-status" class="assessment-status-box">
                  <span class="status-loading">Checking history...</span>
                </div>
                <a href="/assessment" class="btn btn-primary btn-sm btn-block">Take / Retake screening</a>
                <p class="text-xs text-ink-60 mt-3" style="text-align:center;">
                  Screening only — not a clinical diagnosis.
                </p>
              </section>

              <!-- Upcoming Counselling Appointments -->
              <section class="card dashboard-card appointments-widget" aria-labelledby="appt-widget-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">Human guidance</span>
                    <h3 id="appt-widget-title" class="card-title">Counselling Sessions</h3>
                  </div>
                  <a href="/counsellors" class="card-link-subtle">Counsellors →</a>
                </div>
                <div id="dashboard-appointments-list" class="appt-list-box">
                  <div class="loading-spinner">Checking bookings...</div>
                </div>
                <a href="/counsellors" class="btn btn-outline btn-sm btn-block mt-3">Book confidential consultation</a>
              </section>

              <!-- 24x7 Immediate Helplines Card -->
              <section class="card dashboard-card helpline-card" aria-label="Crisis helpline notice">
                <div class="helpline-card-header">
                  <span class="helpline-card-badge">24x7 Verified Help</span>
                  <h4>Immediate Support</h4>
                </div>
                <p class="helpline-card-text">
                  If you are experiencing severe distress or thoughts of self-harm, please connect with a live counselor right away:
                </p>
                <div class="quick-hotlines">
                  <a href="tel:14416" class="quick-hotline-item">
                    <strong>Tele-MANAS:</strong> <span>14416 (Toll-free)</span>
                  </a>
                  <a href="tel:9152987821" class="quick-hotline-item">
                    <strong>iCall Helpline:</strong> <span>9152987821</span>
                  </a>
                </div>
                <button type="button" class="btn btn-secondary btn-sm btn-block mt-3" id="dash-open-helpline-btn">
                  View all emergency helplines
                </button>
              </section>

            </div>

          </div>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    const heroImages = [
      'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1800&q=85',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=85',
    ];
    let heroIndex = 0;
    const heroPhoto = document.getElementById('dashboard-hero-photo');
    const heroDots = [...document.querySelectorAll('.hero-carousel-dot')];
    const showHero = (index) => {
      heroIndex = index % heroImages.length;
      heroPhoto.style.backgroundImage = `linear-gradient(90deg, rgba(24, 29, 25, .76), rgba(24, 29, 25, .18)), url("${heroImages[heroIndex]}")`;
      heroDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === heroIndex);
        dot.setAttribute('aria-pressed', String(i === heroIndex));
      });
    };
    showHero(0);
    heroDots.forEach(dot => dot.addEventListener('click', () => {
      showHero(Number(dot.dataset.slide));
      clearInterval(this._heroTimer);
      this._heroTimer = setInterval(() => showHero(heroIndex + 1), 6500);
    }));
    this._heroTimer = setInterval(() => showHero(heroIndex + 1), 6500);

    // 1. Fetch user profile if needed
    try {
      await authApi.getMe();
    } catch (e) { /* ignore */ }

    // Wire Quick Mood Checkin
    let selectedLevel = 'neutral';
    let selectedScore = 3;
    const moodBtns = document.querySelectorAll('.mood-pick-btn');
    moodBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        moodBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLevel = btn.dataset.level;
        selectedScore = parseInt(btn.dataset.score, 10);
      });
    });

    const noteInput = document.getElementById('quick-mood-note');
    const saveMoodBtn = document.getElementById('save-quick-mood-btn');
    const latestBadge = document.getElementById('latest-mood-badge');

    saveMoodBtn?.addEventListener('click', async () => {
      const note = noteInput.value.trim();
      saveMoodBtn.disabled = true;
      saveMoodBtn.textContent = 'Saving...';

      try {
        await moodsApi.logMood({
          level: selectedLevel,
          score: selectedScore,
          note: note || null,
        });
        Toast.success("Today's mood recorded.");
        noteInput.value = '';
        saveMoodBtn.disabled = false;
        saveMoodBtn.textContent = "Log today's mood";
        loadLatestMood();
      } catch (err) {
        Toast.error(err.message || 'Failed to save mood log.');
        saveMoodBtn.disabled = false;
        saveMoodBtn.textContent = "Log today's mood";
      }
    });

    async function loadLatestMood() {
      try {
        const res = await moodsApi.getLatestMood();
        if (res.latest && latestBadge) {
          const m = res.latest;
          const dateStr = new Date(m.recorded_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
          latestBadge.style.display = 'block';
          latestBadge.innerHTML = `
            <span>Last logged: <strong>${m.level.replace('_', ' ')}</strong> (${dateStr})</span>
            ${m.note ? `<p class="italic text-xs mt-1">"${m.note}"</p>` : ''}
          `;
        }
      } catch (e) { /* ignore */ }
    }
    loadLatestMood();

    // 2. Load latest journal preview
    const journalBox = document.getElementById('dashboard-journal-preview');
    async function loadJournalPreview() {
      if (!journalBox) return;
      try {
        const list = await journalsApi.listJournals({ limit: 1 });
        if (list.length > 0) {
          const j = list[0];
          const dateStr = new Date(j.created_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
          });
          journalBox.innerHTML = `
            <div class="journal-preview-item">
              <div class="flex-between">
                <h4 class="journal-preview-title">${j.title}</h4>
                <span class="journal-preview-date">${dateStr}</span>
              </div>
              <p class="journal-preview-snippet">${j.content.slice(0, 140)}${j.content.length > 140 ? '...' : ''}</p>
              <div class="journal-preview-tags">
                ${(j.tags || []).map(t => `<span class="badge badge-surface">#${t}</span>`).join('')}
              </div>
            </div>
          `;
        } else {
          journalBox.innerHTML = `
            <p class="empty-text">Your private notebook is quiet. Take a moment to capture whatever is on your mind.</p>
          `;
        }
      } catch (e) {
        journalBox.innerHTML = `<p class="error-text">Unable to load journal entries.</p>`;
      }
    }
    loadJournalPreview();

    // 3. Load latest assessment status
    const assessBox = document.getElementById('latest-assessment-status');
    async function loadAssessmentStatus() {
      if (!assessBox) return;
      try {
        const res = await assessmentsApi.getLatestAssessment();
        if (res.latest) {
          const a = res.latest;
          const dateStr = new Date(a.taken_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric'
          });
          assessBox.innerHTML = `
            <div class="assessment-status-badge badge-${a.category}">
              <strong>${a.level_label}</strong>${a.score_schema_version === 2 ? `<span class="assessment-mini-scores">PHQ-9 ${a.phq9_score}/27 · GAD-7 ${a.gad7_score}/21</span>` : ''}
            </div>
            <p class="text-xs text-ink-60 mt-1">Last taken on ${dateStr}</p>
          `;
        } else {
          assessBox.innerHTML = `
            <p class="text-xs text-ink-60">You haven't taken a well-being check yet.</p>
          `;
        }
      } catch (e) {
        assessBox.innerHTML = `<p class="text-xs text-ink-40">Status unavailable.</p>`;
      }
    }
    loadAssessmentStatus();

    // 4. Load upcoming appointments
    const apptBox = document.getElementById('dashboard-appointments-list');
    async function loadAppointments() {
      if (!apptBox) return;
      try {
        const list = await appointmentsApi.listAppointments();
        const active = list.filter(a => a.status !== 'cancelled').slice(0, 2);
        if (active.length > 0) {
          apptBox.innerHTML = active.map(a => `
            <div class="dash-appt-item">
              <div class="flex-between">
                <strong>${a.counsellor_name || 'Counsellor'}</strong>
                <span class="badge badge-${a.status === 'confirmed' ? 'sage' : 'saffron'}">${a.status}</span>
              </div>
              <p class="text-xs text-ink-60 mt-1">${a.preferred_date} at ${a.time_slot}</p>
            </div>
          `).join('');
        } else {
          apptBox.innerHTML = `
            <p class="empty-text">No upcoming consultations booked.</p>
          `;
        }
      } catch (e) {
        apptBox.innerHTML = `<p class="error-text">Unable to load appointments.</p>`;
      }
    }
    loadAppointments();

    // Wire emergency modal button in dashboard
    document.getElementById('dash-open-helpline-btn')?.addEventListener('click', () => {
      document.getElementById('open-helpline-btn')?.click();
    });
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
    if (this._heroTimer) clearInterval(this._heroTimer);
  }
};
