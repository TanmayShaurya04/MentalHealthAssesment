/**
 * Assessment.js — guided well-being screening (PHQ-9, GAD-7 and a 4-item student check-in).
 *
 * One question at a time, with a progress ring, a calm "breathe" pause between parts,
 * a review step, and progress that survives a refresh (sessionStorage, this tab only).
 * The questions and scoring come from the server; nothing is scored here.
 */
import { assessmentsApi } from '../api/assessments.js';
import { Toast } from '../components/Toast.js';
import { router } from '../router.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { icon } from '../components/icons.js';
import { photo } from '../assets/images.js';
import { esc } from '../utils/html.js';

const STORE_KEY = 'serenova_screening_v1';

const ENCOURAGE = [
  [0.0, 'Take your time. There are no right or wrong answers.'],
  [0.25, 'Nice and steady. Answer how the last two weeks really felt.'],
  [0.5, "You're about halfway. Thank you for being honest with yourself."],
  [0.75, 'Almost there. Just a few more.'],
];

const readSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
};
const writeSaved = (data) => {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* private mode: progress just isn't kept */ }
};
const clearSaved = () => {
  try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
};

export const Assessment = {
  _cleanupNavbar: null,
  _onKey: null,
  _onClick: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="assessment-page page-root scr-page" id="main-content">
        <div class="container scr-container">
          <header class="scr-header">
            <span class="section-eyebrow">Self-Reflection</span>
            <h1 class="page-title">Student Well-Being Screening</h1>
            <p class="scr-notice" role="note">
              ${icon('info', { size: 16 })}
              <span>For self-reflection and awareness. It is not a medical diagnosis.</span>
            </p>
          </header>

          <div class="scr-shell" id="assessment-flow-card" aria-live="polite">
            <div class="skeleton skeleton-block scr-skeleton"></div>
          </div>
        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    const shell = document.getElementById('assessment-flow-card');
    let questions = [];
    let scale = [];
    let sections = [];
    let steps = [];
    const state = { step: -1, answers: {} }; // step -1 = intro screen
    let busy = false;

    try {
      const data = await assessmentsApi.getQuestions();
      questions = data.questions;
      scale = data.scale;
      sections = data.sections;
    } catch (e) {
      shell.innerHTML = `
        <div class="empty-state empty-state--error">
          ${icon('alert', { size: 32 })}
          <p>We couldn't load the screening right now. Please check your connection and try again.</p>
          <button type="button" class="btn btn-secondary btn-sm" data-act="reload">${icon('refresh', { size: 16 })} Try again</button>
        </div>`;
      shell.addEventListener('click', (ev) => { if (ev.target.closest('[data-act="reload"]')) router.navigate('/assessment', false); });
      return;
    }

    // A calm pause is inserted before parts 2 and 3. The last step is the review screen.
    questions.forEach((q, i) => {
      const secIdx = sections.findIndex((s) => s.id === q.section);
      const first = i === 0 || questions[i - 1].section !== q.section;
      if (first && secIdx > 0) steps.push({ t: 'break', sec: secIdx });
      steps.push({ t: 'q', i });
    });
    steps.push({ t: 'review' });

    const saved = readSaved();
    let resumable = false;
    if (saved && saved.answers && Object.keys(saved.answers).length > 0) {
      state.answers = saved.answers;
      state.step = Math.min(Math.max(saved.step ?? 0, 0), steps.length - 1);
      resumable = true;
    }

    const sectionOf = (q) => sections.find((s) => s.id === q.section);
    const answeredCount = () => questions.filter((q) => state.answers[q.id] !== undefined).length;
    const persist = () => writeSaved({ step: state.step, answers: state.answers });
    const labelFor = (score) => scale.find((o) => o.score === score)?.label || '';
    const safetyOpen = () => state.answers[9] > 0;

    const safetyBlock = () => `
      <div class="scr-safety" role="alert">
        <span class="scr-safety-icon">${icon('heart', { size: 20 })}</span>
        <div>
          <strong>Thank you for answering honestly.</strong>
          <p>If you have thoughts of harming yourself, please reach out today. Tele-MANAS
            <a href="tel:14416"><strong>14416</strong></a> (free, 24x7), or <a href="tel:112"><strong>112</strong></a> in an emergency.
            You can carry on with the screening afterwards, and you don't have to do this alone.</p>
        </div>
      </div>`;

    /* ── Progress ring + part pills ─────────────────────────────── */
    function progressHTML() {
      const total = questions.length;
      const done = answeredCount();
      const pct = Math.round((done / total) * 100);
      const R = 26, C = 2 * Math.PI * R;
      const cur = steps[state.step];
      const curQ = cur?.t === 'q' ? questions[cur.i] : null;
      const curSec = curQ ? sections.findIndex((s) => s.id === curQ.section) : cur?.t === 'break' ? cur.sec : sections.length - 1;
      const qNo = curQ ? cur.i + 1 : cur?.t === 'break' ? questions.findIndex((q) => q.section === sections[cur.sec].id) + 1 : total;
      return `
        <div class="scr-progress">
          <div class="scr-ring" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Screening progress">
            <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
              <circle class="scr-ring-bg" cx="32" cy="32" r="${R}" />
              <circle class="scr-ring-fg" cx="32" cy="32" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - done / total)).toFixed(1)}" />
            </svg>
            <span class="scr-ring-label">${pct}%</span>
          </div>
          <div class="scr-progress-text">
            <strong>${cur?.t === 'review' ? 'Review your answers' : `Question ${Math.min(qNo, total)} of ${total}`}</strong>
            <span>Part ${curSec + 1} of ${sections.length} · ${esc(sections[curSec].title)}</span>
          </div>
          <ol class="scr-parts" aria-label="Parts">
            ${sections.map((s, i) => `<li class="${i < curSec || cur?.t === 'review' ? 'done' : i === curSec ? 'current' : ''}"><span>${i + 1}</span>${esc(s.instrument.replace('Serenova student check-in', 'Check-in'))}</li>`).join('')}
          </ol>
        </div>`;
    }

    /* ── Screens ────────────────────────────────────────────────── */
    function introHTML() {
      return `
        <div class="scr-intro scr-enter">
          <div class="scr-intro-photo" aria-hidden="true">
            ${photo('meditation', { w: 900, eager: true })}
            <div class="scr-intro-badge">${icon('clock', { size: 16 })} About ${Math.ceil(questions.length / 5)} minutes</div>
          </div>
          <div class="scr-intro-body">
            <h2>Take a few minutes for yourself</h2>
            <p class="scr-lead">A gentle check-in on your mood, worries and student life over the <strong>last 2 weeks</strong>.</p>
            <ol class="scr-timeline">
              ${sections.map((s, i) => `
                <li>
                  <span class="scr-timeline-dot">${i + 1}</span>
                  <div><strong>${esc(s.title)}</strong><span>${esc(s.instrument)} · ${questions.filter((q) => q.section === s.id).length} questions${s.validated ? '' : ' · context only'}</span></div>
                </li>`).join('')}
            </ol>
            <ul class="scr-facts">
              <li>${icon('lock', { size: 16 })} Your answers are private to you</li>
              <li>${icon('shield', { size: 16 })} PHQ-9 and GAD-7 are standard, widely used questionnaires</li>
              <li>${icon('heart', { size: 16 })} It's a screening, not a diagnosis</li>
            </ul>
            <div class="scr-help" role="note">If you are in distress right now, call Tele-MANAS on <a href="tel:14416"><strong>14416</strong></a> (free, 24x7).</div>
            <div class="scr-intro-actions">
              ${resumable ? `
                <button type="button" class="btn btn-primary btn-lg" data-act="resume">Continue where I left off ${icon('arrow-right', { size: 18 })}</button>
                <button type="button" class="btn btn-ghost" data-act="restart">Start over</button>
              ` : `
                <button type="button" class="btn btn-primary btn-lg" data-act="start">Start screening ${icon('arrow-right', { size: 18 })}</button>
              `}
            </div>
          </div>
        </div>`;
    }

    function questionHTML(q, idx) {
      const sec = sectionOf(q);
      const cur = state.answers[q.id];
      const first = idx === 0 || questions[idx - 1].section !== q.section;
      const frac = idx / questions.length;
      const note = [...ENCOURAGE].reverse().find(([t]) => frac >= t)[1];
      const isLast = idx === questions.length - 1;
      return `
        <div class="scr-card" data-qid="${q.id}">
          <p class="scr-sec-intro ${first ? '' : 'scr-sec-intro--quiet'}">
            ${first ? `<strong>${esc(sec.instrument)}</strong> · ` : ''}${esc(sec.intro)}
          </p>
          <h2 class="scr-prompt">${esc(q.prompt)}</h2>
          <div class="scr-options" role="radiogroup" aria-label="Answer">
            ${scale.map((o) => `
              <button type="button" role="radio" aria-checked="${cur === o.score}" class="scr-option${cur === o.score ? ' selected' : ''}" data-score="${o.score}" style="--i:${o.score}">
                <span class="scr-option-mark">${icon('check', { size: 16 })}</span>
                <span class="scr-option-label">${esc(o.label)}</span>
                <kbd aria-hidden="true">${o.score + 1}</kbd>
              </button>`).join('')}
          </div>
          <div class="scr-safety-slot">${q.safety && cur > 0 ? safetyBlock() : ''}</div>
          <p class="scr-encourage">${note}</p>
          <div class="scr-nav">
            <button type="button" class="btn btn-secondary btn-sm" data-act="prev">${icon('arrow-right', { size: 16, cls: 'flip' })} Back</button>
            <button type="button" class="btn btn-primary btn-sm" data-act="next" ${cur === undefined ? 'disabled' : ''}>
              ${isLast ? 'Review answers' : 'Next'} ${icon('arrow-right', { size: 16 })}
            </button>
          </div>
        </div>`;
    }

    function breakHTML(step) {
      const prev = sections[step.sec - 1];
      const next = sections[step.sec];
      const msg = step.sec === 1
        ? "Part 1 is done. That's often the hardest part."
        : "One short part left. You're doing really well.";
      return `
        <div class="scr-card scr-break">
          <div class="scr-breathe" aria-hidden="true"><span class="scr-breathe-ring"></span><span class="scr-breathe-ring scr-breathe-ring--2"></span><span class="scr-breathe-core"></span></div>
          <p class="scr-break-kicker">${esc(prev.instrument)} complete</p>
          <h2 class="scr-prompt">Take a slow breath</h2>
          <p class="scr-lead">${msg}<br>Breathe in for four, out for six. Next up: <strong>${esc(next.title)}</strong>.</p>
          <div class="scr-nav scr-nav--center">
            <button type="button" class="btn btn-secondary btn-sm" data-act="prev">${icon('arrow-right', { size: 16, cls: 'flip' })} Back</button>
            <button type="button" class="btn btn-primary" data-act="next">I'm ready ${icon('arrow-right', { size: 16 })}</button>
          </div>
        </div>`;
    }

    function reviewHTML() {
      const missing = questions.filter((q) => state.answers[q.id] === undefined);
      return `
        <div class="scr-card scr-review">
          <h2 class="scr-prompt">Look over your answers</h2>
          <p class="scr-lead">You can change any answer before we work out your summary.</p>
          ${safetyOpen() ? safetyBlock() : ''}
          ${sections.map((s) => `
            <section class="scr-review-sec">
              <h3>${esc(s.title)} <em>${esc(s.instrument)}</em></h3>
              <ul>
                ${questions.filter((q) => q.section === s.id).map((q) => {
                  const a = state.answers[q.id];
                  return `<li>
                    <span class="scr-review-q">${esc(q.prompt)}</span>
                    <span class="scr-review-a ${a === undefined ? 'missing' : ''}">${a === undefined ? 'Not answered' : esc(labelFor(a))}</span>
                    <button type="button" class="scr-link" data-act="goto" data-qi="${questions.indexOf(q)}">Change</button>
                  </li>`;
                }).join('')}
              </ul>
            </section>`).join('')}
          <div class="scr-nav">
            <button type="button" class="btn btn-secondary btn-sm" data-act="prev">${icon('arrow-right', { size: 16, cls: 'flip' })} Back</button>
            <button type="button" class="btn btn-primary" data-act="submit" ${missing.length ? 'disabled' : ''}>See my results ${icon('arrow-right', { size: 16 })}</button>
          </div>
          ${missing.length ? `<p class="scr-encourage">${missing.length} question${missing.length > 1 ? 's' : ''} still need an answer.</p>` : ''}
        </div>`;
    }

    function submittingHTML() {
      return `
        <div class="scr-card scr-loading" role="status">
          <div class="scr-pulse" aria-hidden="true"><span></span><span></span><span></span></div>
          <h2 class="scr-prompt">Putting your summary together</h2>
          <p class="scr-lead">This only takes a moment. Thank you for taking the time.</p>
        </div>`;
    }

    /* ── Rendering with a slide transition ──────────────────────── */
    function render(dir = 'fwd') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let html;
      if (state.step < 0) {
        html = introHTML();
      } else {
        const st = steps[state.step];
        const body = st.t === 'q' ? questionHTML(questions[st.i], st.i) : st.t === 'break' ? breakHTML(st) : reviewHTML();
        html = `${progressHTML()}<div class="scr-stage ${reduce ? '' : `scr-slide-${dir}`}">${body}</div>`;
      }
      shell.innerHTML = html;
      window.scrollTo({ top: Math.max(0, shell.offsetTop - 110), behavior: reduce ? 'auto' : 'smooth' });
      if (state.step >= 0) persist();
    }

    const go = (to, dir) => { state.step = Math.min(Math.max(to, 0), steps.length - 1); render(dir); };

    function choose(score) {
      const st = steps[state.step];
      if (st?.t !== 'q') return;
      const q = questions[st.i];
      state.answers[q.id] = score;
      persist();
      // Update in place (no flicker) and mark the choice
      shell.querySelectorAll('.scr-option').forEach((b) => {
        const on = Number(b.dataset.score) === score;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', String(on));
      });
      shell.querySelector('[data-act="next"]')?.removeAttribute('disabled');
      const ring = shell.querySelector('.scr-ring-fg');
      if (ring) {
        const C = 2 * Math.PI * 26;
        ring.setAttribute('stroke-dashoffset', (C * (1 - answeredCount() / questions.length)).toFixed(1));
        shell.querySelector('.scr-ring-label').textContent = `${Math.round((answeredCount() / questions.length) * 100)}%`;
      }
      const slot = shell.querySelector('.scr-safety-slot');
      if (q.safety) {
        // Let the support note be read; the student continues with "Next".
        if (slot) slot.innerHTML = score > 0 ? safetyBlock() : '';
        return;
      }
      setTimeout(() => { if (steps[state.step] === st && !busy) go(state.step + 1, 'fwd'); }, 260);
    }

    async function submit() {
      if (busy) return;
      busy = true;
      shell.innerHTML = submittingHTML();
      const payload = questions.map((q) => ({ question_id: q.id, score: state.answers[q.id] }));
      try {
        const started = Date.now();
        await assessmentsApi.submitAssessment(payload);
        // Keep the calm loading screen up for a moment so it doesn't flash
        await new Promise((r) => setTimeout(r, Math.max(0, 900 - (Date.now() - started))));
        clearSaved();
        Toast.success('Screening completed.');
        router.navigate('/assessment/results');
      } catch (err) {
        busy = false;
        Toast.error(err.message || 'We could not save your screening. Your answers are still here.');
        go(steps.length - 1, 'back');
      }
    }

    /* ── Events (delegated, removed in destroy) ─────────────────── */
    this._onClick = (e) => {
      const opt = e.target.closest('.scr-option');
      if (opt && shell.contains(opt)) { choose(Number(opt.dataset.score)); return; }
      const btn = e.target.closest('[data-act]');
      if (!btn || !shell.contains(btn)) return;
      switch (btn.dataset.act) {
        case 'start': state.answers = {}; go(0, 'fwd'); break;
        case 'resume': go(Math.max(0, state.step), 'fwd'); break;
        case 'restart': state.answers = {}; resumable = false; clearSaved(); go(0, 'fwd'); break;
        case 'prev': if (state.step <= 0) { state.step = -1; render('back'); } else go(state.step - 1, 'back'); break;
        case 'next': go(state.step + 1, 'fwd'); break;
        case 'goto': go(steps.findIndex((s) => s.t === 'q' && s.i === Number(btn.dataset.qi)), 'back'); break;
        case 'submit': submit(); break;
        default: break;
      }
    };
    shell.addEventListener('click', this._onClick);

    // Keyboard: 1-4 answer, Enter/→ next, ← back
    this._onKey = (e) => {
      if (state.step < 0 || busy || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.body.classList.contains('dialog-open')) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      const st = steps[state.step];
      const n = parseInt(e.key, 10);
      if (st?.t === 'q' && n >= 1 && n <= scale.length) { choose(n - 1); return; }
      if (e.key === 'ArrowLeft') shell.querySelector('[data-act="prev"]')?.click();
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON')) {
        const next = shell.querySelector('[data-act="next"]:not([disabled])');
        if (next) { e.preventDefault(); next.click(); }
      }
    };
    document.addEventListener('keydown', this._onKey);

    render('fwd');
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
    if (this._onKey) document.removeEventListener('keydown', this._onKey);
  },
};
