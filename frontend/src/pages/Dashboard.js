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
import { photo, photoUrl, HERO_POOL } from '../assets/images.js';
import { attachEmojiDock } from '../utils/emojiDock.js';
import { esc } from '../utils/html.js';
import { t } from '../i18n/index.js';
import { resourcesApi } from '../api/resources.js';
import { RESOURCE_PHOTO } from '../assets/images.js';

const TIP_COUNT = 7;
const tipOfTheDay = () => { const i = new Date().getDate() % TIP_COUNT; return { title: t(`tip.${i}.title`), body: t(`tip.${i}.body`) }; };


export const Dashboard = {
  _cleanupNavbar: null,

  render() {
    const user = store.getUser() || { name: 'Student' };
    const firstName = user.name ? user.name.split(' ')[0] : 'Student';

    const hour = new Date().getHours();
    let greeting = t('dash.morning');
    if (hour >= 12 && hour < 17) greeting = t('dash.afternoon');
    else if (hour >= 17) greeting = t('dash.evening');

    return `
      ${Navbar.render()}

      <main class="dashboard-page page-root" id="main-content">
        <div class="container dashboard-container">
          
          <!-- Hero banner -->
          <header class="dash-hero">
            <div class="dash-hero-slides" id="dash-hero-slides" aria-hidden="true">
              ${HERO_POOL.map((k, i) => `<div class="dash-hero-slide${i === 0 ? ' is-active' : ''}" style="background-image:url('${photoUrl(k, 1600)}')"></div>`).join('')}
            </div>
            <div class="dash-hero-overlay"></div>
            <div class="dash-hero-dots" role="group" aria-label="${t('dash.bgPhotos')}">
              ${HERO_POOL.map((k, i) => `<button type="button" class="dash-hero-dot${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-label="Show photo ${i + 1}" aria-pressed="${i === 0}"></button>`).join('')}
            </div>
            <div class="dash-hero-content">
              <span class="dashboard-eyebrow dash-hero-eyebrow">${t('dash.eyebrow')}</span>
              <h1 class="dash-hero-title">${greeting}, ${esc(firstName)}.</h1>
              <p class="dash-hero-tagline">${t('dash.tagline')}</p>
              <div class="dash-hero-actions">
                <a href="/chat" class="btn btn-primary btn-sm">${t('dash.talkAI')}</a>
                <a href="/counsellors" class="btn btn-glass btn-sm">${t('dash.counselling')}</a>
              </div>
            </div>
          </header>

          <!-- At-a-glance stats -->
          <section class="stat-strip" aria-label="${t('dash.weekGlance')}" data-stagger>
            <div class="stat-tile reveal">
              <span class="stat-label">${t('dash.streak')}</span>
              <span class="stat-value"><span id="stat-streak" data-count="0">0</span><small> ${t('dash.days')}</small></span>
              <span class="stat-hint" id="stat-streak-hint">${t('dash.logMoodStart')}</span>
            </div>
            <div class="stat-tile reveal">
              <span class="stat-label">${t('dash.avgMood')}</span>
              <span class="stat-value"><span id="stat-avg" data-count="0">0</span><small> / 5</small></span>
              <span class="stat-hint" id="stat-avg-hint">${t('dash.noLogs')}</span>
            </div>
            <div class="stat-tile reveal">
              <span class="stat-label">${t('dash.wellbeingCheck')}</span>
              <span class="stat-value stat-value--text" id="stat-check">—</span>
              <span class="stat-hint" id="stat-check-hint">${t('dash.notTaken')}</span>
            </div>
            <div class="stat-tile reveal">
              <span class="stat-label">${t('dash.nextSession')}</span>
              <span class="stat-value stat-value--text" id="stat-session">—</span>
              <span class="stat-hint" id="stat-session-hint">${t('dash.noneBooked')}</span>
            </div>
          </section>

          <!-- Core Grid Layout -->
          <div class="dashboard-grid">

            <!-- Left Main Column -->
            <div class="dashboard-main-col">

              <!-- Quick Mood Check-In Widget -->
              <section class="card dashboard-card mood-checkin-card" aria-labelledby="mood-checkin-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">${t('dash.dailyCheckin')}</span>
                    <h2 id="mood-checkin-title" class="card-title">${t('dash.recordMood')}</h2>
                  </div>
                  <a href="/mood" class="card-link-subtle">${t('dash.history')}</a>
                </div>

                <div class="mood-selector-bar" role="radiogroup" aria-label="${t('dash.selectMood')}">
                  <button type="button" class="mood-pick-btn" data-level="very_low" data-score="1" aria-label="${t('mood.very_low')}">
                    <div class="mood-image-wrapper">${renderMoodArtwork('very_low', 40)}</div>
                    <span class="mood-pick-label">${t('mood.very_low')}</span>
                  </button>
                  <button type="button" class="mood-pick-btn" data-level="low" data-score="2" aria-label="${t('mood.low')}">
                    <div class="mood-image-wrapper">${renderMoodArtwork('low', 40)}</div>
                    <span class="mood-pick-label">${t('mood.low')}</span>
                  </button>
                  <button type="button" class="mood-pick-btn active" data-level="neutral" data-score="3" aria-label="${t('mood.neutral')}">
                    <div class="mood-image-wrapper">${renderMoodArtwork('neutral', 40)}</div>
                    <span class="mood-pick-label">${t('mood.neutral')}</span>
                  </button>
                  <button type="button" class="mood-pick-btn" data-level="good" data-score="4" aria-label="${t('mood.good')}">
                    <div class="mood-image-wrapper">${renderMoodArtwork('good', 40)}</div>
                    <span class="mood-pick-label">${t('mood.good')}</span>
                  </button>
                  <button type="button" class="mood-pick-btn" data-level="very_good" data-score="5" aria-label="${t('mood.very_good')}">
                    <div class="mood-image-wrapper">${renderMoodArtwork('very_good', 40)}</div>
                    <span class="mood-pick-label">${t('mood.very_good')}</span>
                  </button>
                </div>

                <div class="mood-note-group">
                  <input
                    type="text"
                    id="quick-mood-note"
                    class="form-input"
                    placeholder="${t('dash.notePlaceholder')}"
                  />
                  <button type="button" class="btn btn-primary" id="save-quick-mood-btn">${t('dash.logMood')}</button>
                </div>

                <div id="latest-mood-badge" class="latest-mood-info" style="display:none;"></div>
              </section>

              <!-- Recent Journal Preview -->
              <section class="card dashboard-card" aria-labelledby="journal-preview-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">${t('dash.private')}</span>
                    <h2 id="journal-preview-title" class="card-title">${t('dash.latestJournal')}</h2>
                  </div>
                  <a href="/journal" class="card-link-subtle">${t('dash.allEntries')}</a>
                </div>

                <div id="dashboard-journal-preview" class="journal-preview-box">
                  <div class="loading-spinner">${t('dash.loadingJournal')}</div>
                </div>

                <div class="card-action-bar">
                  <a href="/journal/new" class="btn btn-outline btn-sm">${t('dash.writeNew')}</a>
                </div>
              </section>

              <!-- Gentle reminder of the day -->
              <section class="card dashboard-card tip-card" aria-labelledby="tip-title">
                <div class="tip-photo">${photo('walk', { w: 700 })}</div>
                <div class="tip-body">
                  <span class="card-eyebrow">${t('dash.tipEyebrow')}</span>
                  <h2 id="tip-title" class="card-title">${tipOfTheDay().title}</h2>
                  <p class="tip-text">${tipOfTheDay().body}</p>
                </div>
              </section>

              <!-- AI Companion Quick Prompts -->
              <section class="card dashboard-card ai-prompts-card" aria-labelledby="ai-prompts-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">${t('dash.companionEyebrow')}</span>
                    <h2 id="ai-prompts-title" class="card-title">${t('dash.thinkAloud')}</h2>
                  </div>
                  <span class="badge badge-sage">${t('dash.safe')}</span>
                </div>
                <p class="ai-prompts-desc">
                  ${t('dash.companionDesc')}
                </p>
                <div class="ai-prompt-pills">
                  <a href="/chat" class="prompt-pill">${t('dash.p1')}</a>
                  <a href="/chat" class="prompt-pill">${t('dash.p2')}</a>
                  <a href="/chat" class="prompt-pill">${t('dash.p3')}</a>
                  <a href="/chat" class="prompt-pill">${t('dash.p4')}</a>
                </div>
              </section>

            </div>

            <!-- Right Sidebar Column -->
            <div class="dashboard-side-col">

              <!-- Self-Assessment Screening Card -->
              <section class="card dashboard-card assessment-widget" aria-labelledby="screening-widget-title">
                <span class="card-eyebrow">${t('dash.selfReflection')}</span>
                <h3 id="screening-widget-title" class="card-title">${t('dash.screeningTitle')}</h3>
                <p class="assessment-widget-desc">
                  ${t('dash.screeningDesc')}
                </p>
                <div id="latest-assessment-status" class="assessment-status-box">
                  <span class="status-loading">${t('dash.checkingHistory')}</span>
                </div>
                <a href="/assessment" class="btn btn-primary btn-sm btn-block">${t('dash.takeScreening')}</a>
                <p class="text-xs text-ink-60 mt-3" style="text-align:center;">
                  ${t('dash.screeningNote')}
                </p>
              </section>

              <!-- Upcoming Counselling Appointments -->
              <section class="card dashboard-card appointments-widget" aria-labelledby="appt-widget-title">
                <div class="card-header-row">
                  <div>
                    <span class="card-eyebrow">${t('dash.humanGuidance')}</span>
                    <h3 id="appt-widget-title" class="card-title">${t('dash.sessionsTitle')}</h3>
                  </div>
                  <a href="/counsellors" class="card-link-subtle">${t('dash.counsellorsLink')}</a>
                </div>
                <div id="dashboard-appointments-list" class="appt-list-box">
                  <div class="loading-spinner">${t('dash.checkingBookings')}</div>
                </div>
                <a href="/counsellors" class="btn btn-outline btn-sm btn-block mt-3">${t('dash.bookConsult')}</a>
              </section>

              <!-- 24x7 Immediate Helplines Card -->
              <section class="card dashboard-card helpline-card" aria-label="Crisis helpline notice">
                <div class="helpline-card-header">
                  <span class="helpline-card-badge">${t('dash.verifiedHelp')}</span>
                  <h4>${t('dash.immediateSupport')}</h4>
                </div>
                <p class="helpline-card-text">
                  ${t('dash.helplineText')}
                </p>
                <div class="quick-hotlines">
                  <a href="tel:14416" class="quick-hotline-item">
                    <strong>Tele-MANAS:</strong> <span>${t('dash.tollFree')}</span>
                  </a>
                  <a href="tel:9152987821" class="quick-hotline-item">
                    <strong>iCall Helpline:</strong> <span>9152987821</span>
                  </a>
                </div>
                <button type="button" class="btn btn-secondary btn-sm btn-block mt-3" id="dash-open-helpline-btn">
                  ${t('dash.viewAllHelplines')}
                </button>
              </section>

              <!-- One-minute breathing reset -->
              <section class="card dashboard-card reset-card" aria-labelledby="reset-title">
                <span class="card-eyebrow">${t('dash.resetEyebrow')}</span>
                <h3 id="reset-title" class="card-title">${t('dash.resetTitle')}</h3>
                <div class="reset-stage">
                  <div class="reset-orb" id="reset-orb" aria-hidden="true"></div>
                  <p class="reset-cue" id="reset-cue" aria-live="polite">${t('dash.resetReady')}</p>
                </div>
                <button type="button" class="btn btn-outline btn-sm btn-block" id="reset-btn" aria-pressed="false">${t('dash.start')}</button>
              </section>

            </div>

          </div>

          <!-- Picked-for-you guides (full-width strip under both columns) -->
          <section class="reads-strip" aria-labelledby="reads-title">
            <div class="card-header-row">
              <div>
                <span class="card-eyebrow">${t('dash.worthRead')}</span>
                <h2 id="reads-title" class="card-title">${t('dash.pickedToday')}</h2>
              </div>
              <a href="/resources" class="card-link-subtle">${t('dash.allGuides')}</a>
            </div>
            <div id="dash-reads" class="reads-list"><div class="loading-spinner">${t('dash.findingGuides')}</div></div>
          </section>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  _heroTimer: null,
  _dockOff: null,

  _breathTimer: null,

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    // One-minute breathing reset: 4s in, 2s hold, 6s out
    const resetBtn = document.getElementById('reset-btn');
    const orb = document.getElementById('reset-orb');
    const cue = document.getElementById('reset-cue');
    const stopBreath = () => { clearInterval(this._breathTimer); this._breathTimer = null; orb?.classList.remove('is-in', 'is-out'); if (cue) cue.textContent = t('dash.resetReady'); if (resetBtn) { resetBtn.textContent = t('dash.start'); resetBtn.setAttribute('aria-pressed', 'false'); } };
    resetBtn?.addEventListener('click', () => {
      if (this._breathTimer) { stopBreath(); return; }
      resetBtn.textContent = t('dash.stop'); resetBtn.setAttribute('aria-pressed', 'true');
      const phases = [[t('dash.breatheIn'), 4, 'is-in'], [t('dash.hold'), 2, 'is-in'], [t('dash.breatheOut'), 6, 'is-out']];
      let i = 0, left = 0, cycles = 0;
      const tick = () => {
        if (left <= 0) {
          if (i >= phases.length) { i = 0; if (++cycles >= 5) { stopBreath(); if (cue) cue.textContent = t('dash.wellDone'); return; } }
          const [label, secs, cls] = phases[i++]; left = secs; cue.textContent = label; orb.classList.remove('is-in', 'is-out'); void orb.offsetWidth; orb.classList.add(cls);
        }
        left--;
      };
      tick(); this._breathTimer = setInterval(tick, 1000);
    });

    // Guides picked for today (rotates daily; leans towards rest/emotional guides on lower-mood days)
    resourcesApi.listResources().then((list) => {
      const box = document.getElementById('dash-reads'); if (!box) return;
      const pool = list.filter((r) => !r.is_crisis_helpline);
      const day = Math.floor(Date.now() / 86400000);
      const picks = [0, 1, 2].map((n) => pool[(day * 3 + n * 7) % pool.length]).filter((r, i, a) => r && a.indexOf(r) === i);
      box.innerHTML = picks.map((r) => `<a href="/resources" class="read-item"><span class="read-thumb">${photo(r.image || RESOURCE_PHOTO[r.category] || 'sunrise', { w: 480 })}</span><span class="read-text"><b>${esc(r.title)}</b><small>${esc(r.category_label || '')} · ${esc(r.read_time)}</small></span></a>`).join('');
    }).catch(() => { const box = document.getElementById('dash-reads'); if (box) box.innerHTML = `<p class="text-xs text-ink-60">${t('dash.guidesUnavailable')}</p>`; });

    this._dockOff = attachEmojiDock(document.querySelector('.mood-selector-bar'));

    // Photo slideshow in the welcome banner: changes by itself, pauses on hover, dots to jump
    const slides = [...document.querySelectorAll('.dash-hero-slide')];
    const dots = [...document.querySelectorAll('.dash-hero-dot')];
    const hero = document.querySelector('.dash-hero');
    let idx = 0;
    const show = (n) => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((el, i) => el.classList.toggle('is-active', i === idx));
      dots.forEach((el, i) => { el.classList.toggle('is-active', i === idx); el.setAttribute('aria-pressed', String(i === idx)); });
    };
    const start = () => {
      clearInterval(this._heroTimer);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this._heroTimer = setInterval(() => show(idx + 1), 6000);
    };
    dots.forEach((d) => d.addEventListener('click', () => { show(Number(d.dataset.slide)); start(); }));
    hero?.addEventListener('mouseenter', () => clearInterval(this._heroTimer));
    hero?.addEventListener('mouseleave', start);
    start();

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
      saveMoodBtn.textContent = t('dash.saving');

      try {
        await moodsApi.logMood({
          level: selectedLevel,
          score: selectedScore,
          note: note || null,
        });
        Toast.success(t('dash.moodSaved'));
        noteInput.value = '';
        saveMoodBtn.disabled = false;
        saveMoodBtn.textContent = t('dash.logMood');
        loadLatestMood();
        if (typeof loadMoodStats === 'function') loadMoodStats();
      } catch (err) {
        Toast.error(err.message || t('dash.moodFailed'));
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
            <span>${t('dash.lastLogged')} <strong>${t('mood.' + m.level)}</strong> (${dateStr})</span>
            ${m.note ? `<p class="italic text-xs mt-1">"${esc(m.note)}"</p>` : ''}
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
                <h4 class="journal-preview-title">${esc(j.title)}</h4>
                <span class="journal-preview-date">${dateStr}</span>
              </div>
              <p class="journal-preview-snippet">${esc(j.content.slice(0, 140))}${j.content.length > 140 ? '…' : ''}</p>
              <div class="journal-preview-tags">
                ${(j.tags || []).map(t => `<span class="badge badge-surface">#${esc(t)}</span>`).join('')}
              </div>
            </div>
          `;
        } else {
          journalBox.innerHTML = `
            <p class="empty-text">${t('dash.journalQuiet')}</p>
          `;
        }
      } catch (e) {
        journalBox.innerHTML = `<p class="error-text">${t('dash.journalError')}</p>`;
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
          const scoreText = a.max_score ? `${a.total_score}/${a.max_score}` : `${a.total_score}`;
          assessBox.innerHTML = `
            <div class="assessment-status-badge badge-${a.category}">
              <strong>${esc(a.level_label)}</strong> (${scoreText})
            </div>
            ${(a.sections || []).length ? `
              <ul class="status-sections">
                ${a.sections.map(sec => `<li><span>${esc(sec.instrument)}</span><strong>${sec.score}/${sec.max}</strong><em>${esc(sec.severity)}</em></li>`).join('')}
              </ul>` : ''}
            <p class="text-xs text-ink-60 mt-1">${t('dash.lastTakenOn', { date: dateStr })}</p>
          `;
          const checkEl = document.getElementById('stat-check');
          if (checkEl) {
            checkEl.textContent = a.category.charAt(0).toUpperCase() + a.category.slice(1);
            document.getElementById('stat-check-hint').textContent = t('dash.takenOn', { date: dateStr });
          }
        } else {
          assessBox.innerHTML = `
            <p class="text-xs text-ink-60">${t('dash.noCheckYet')}</p>
          `;
        }
      } catch (e) {
        assessBox.innerHTML = `<p class="text-xs text-ink-40">${t('dash.statusUnavailable')}</p>`;
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
        if (active.length) {
          document.getElementById('stat-session').textContent = active[0].preferred_date;
          document.getElementById('stat-session-hint').textContent = `${active[0].time_slot} · ${active[0].counsellor_name || t('dash.counsellorFallback')}`;
        }
        if (active.length > 0) {
          apptBox.innerHTML = active.map(a => `
            <div class="dash-appt-item">
              <div class="flex-between">
                <strong>${esc(a.counsellor_name || t('dash.counsellorFallback'))}</strong>
                <span class="badge badge-${a.status === 'confirmed' ? 'sage' : 'saffron'}">${t('appt.' + a.status)}</span>
              </div>
              <p class="text-xs text-ink-60 mt-1">${a.preferred_date} at ${a.time_slot}</p>
            </div>
          `).join('');
        } else {
          apptBox.innerHTML = `
            <p class="empty-text">${t('dash.noConsults')}</p>
          `;
        }
      } catch (e) {
        apptBox.innerHTML = `<p class="error-text">${t('dash.apptError')}</p>`;
      }
    }
    loadAppointments();

    // 5. Mood stats + streak for the at-a-glance strip
    async function loadMoodStats() {
      try {
        const [stats, list] = await Promise.all([moodsApi.getStats(), moodsApi.listMoods(60)]);
        const avgEl = document.getElementById('stat-avg');
        if (stats.total_logs > 0 && avgEl) {
          avgEl.setAttribute('data-count', String(stats.average_score));
          avgEl.textContent = stats.average_score.toFixed(1);
          document.getElementById('stat-avg-hint').textContent = t('dash.acrossCheckins', { n: stats.total_logs });
        }
        const days = new Set(list.map(m => new Date(m.recorded_at).toDateString()));
        let streak = 0;
        const cursor = new Date();
        if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1); // today may not be logged yet
        while (days.has(cursor.toDateString())) { streak++; cursor.setDate(cursor.getDate() - 1); }
        const streakEl = document.getElementById('stat-streak');
        if (streakEl) {
          streakEl.setAttribute('data-count', String(streak));
          streakEl.textContent = String(streak);
        }
        document.getElementById('stat-streak-hint').textContent =
          streak === 0 ? t('dash.logMoodStart') : streak === 1 ? t('dash.niceStart') : t('dash.keepGoing');
      } catch (e) { /* stats are optional */ }
    }
    loadMoodStats();

    // Wire emergency modal button in dashboard
    document.getElementById('dash-open-helpline-btn')?.addEventListener('click', () => {
      document.getElementById('open-helpline-btn')?.click();
    });
  },

  destroy() {
    clearInterval(this._breathTimer);
    clearInterval(this._heroTimer);
    this._dockOff?.();
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
