/** Counsellors: find, compare, pick a date on a calendar, book, and manage sessions (with add-to-calendar). */
import { store } from '../store.js';
import { confirmDialog } from '../components/Dialog.js';
import { icon } from '../components/icons.js';
import { esc } from '../utils/html.js';
import { counsellorsApi } from '../api/counsellors.js';
import { appointmentsApi } from '../api/appointments.js';
import { Toast } from '../components/Toast.js';
import { navigate } from '../navigation.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { slotToDate, downloadIcs } from '../utils/ics.js';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SUPPORT = [
  ['academic_stress', 'Academic stress', 'Exams, deadlines, burnout, focus'],
  ['anxiety_mindfulness', 'Anxiety and calm', 'Worry, panic, sleep, grounding'],
  ['personal_counselling', 'Personal counselling', 'Relationships, family, identity, loneliness'],
  ['general_support', 'Just want to talk', 'No label needed'],
];
const STATUS = { pending: ['Awaiting confirmation', 'warn'], confirmed: ['Confirmed', 'ok'], cancelled: ['Cancelled', 'off'], declined: ['Declined', 'off'], completed: ['Completed', 'ok'] };
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const wk = (d) => WEEK[(d.getDay() + 6) % 7];
const initials = (n) => n.replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '').split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const nice = (dateStr, slot) => { const d = slotToDate(dateStr, slot); return d ? `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${slot}` : `${dateStr}, ${slot}`; };
const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export const Counsellors = {
  _cleanupNavbar: null,
  _onKey: null,

  render() {
    return `
      ${Navbar.render()}
      <main class="counsellors-page page-root cx-page" id="main-content">
        <div class="container cx-container">
          <header class="cx-hero">
            <div class="cx-hero-text">
              <span class="section-eyebrow">Counselling</span>
              <h1>Talk to someone who understands student life</h1>
              <p>Book a 50-minute private video session with a professional counsellor. You see the fee up front, pick the day that suits you, and the counsellor confirms.</p>
              <ul class="cx-trust">
                <li>${icon('lock', { size: 16 })} Private, in your account only</li>
                <li>${icon('video', { size: 16 })} Video session, no app to install</li>
                <li>${icon('rupee', { size: 16 })} Student fees, shown before you book</li>
                <li>${icon('check-circle', { size: 16 })} Counsellor confirms every request</li>
              </ul>
            </div>
            <ol class="cx-steps" aria-label="How it works">
              <li><b>1</b><span>Choose a counsellor</span></li>
              <li><b>2</b><span>Pick a date and time</span></li>
              <li><b>3</b><span>Get confirmation and a video link</span></li>
            </ol>
          </header>

          <div class="cx-tabs" role="tablist">
            <button type="button" class="cx-tab is-on" id="tab-counsellors-btn" role="tab" aria-selected="true">Find a counsellor</button>
            <button type="button" class="cx-tab" id="tab-appointments-btn" role="tab" aria-selected="false">My sessions <span class="cx-count" id="cx-appt-count" hidden></span></button>
          </div>

          <section id="panel-counsellors">
            <div class="cx-filters">
              <label class="cx-search">${icon('search', { size: 18 })}<input type="search" id="counsellor-search-input" placeholder="Search name or concern" aria-label="Search counsellors" /></label>
              <select id="cx-lang" aria-label="Language"><option value="">Any language</option></select>
              <select id="cx-fee" aria-label="Fee"><option value="">Any fee</option><option value="600">Up to ₹600</option><option value="1000">Up to ₹1,000</option><option value="2000">Up to ₹2,000</option></select>
              <select id="cx-day" aria-label="Day"><option value="">Any day</option>${WEEK.map((d) => `<option>${d}</option>`).join('')}</select>
              <select id="cx-sort" aria-label="Sort"><option value="soon">Soonest available</option><option value="fee">Fee: low to high</option><option value="exp">Most experienced</option></select>
            </div>
            <div class="cx-chips" id="cx-specialties" role="group" aria-label="Concerns"></div>
            <p class="cx-result-count" id="cx-result-count" aria-live="polite"></p>
            <div id="counsellors-table-wrapper" class="cx-grid"><div class="skeleton skeleton-block"></div><div class="skeleton skeleton-block"></div></div>
          </section>

          <section id="panel-appointments" hidden>
            <div id="appointments-list-container"></div>
          </section>

          <aside class="cx-help" aria-label="If you need help right now">
            <div><b>Need to talk to someone right now?</b><p>Tele-MANAS (free, 24x7, many languages): <a href="tel:14416">14416</a>. In an emergency call <a href="tel:112">112</a>. Booked sessions are not an emergency service.</p></div>
            <a class="btn btn-secondary" href="/resources">More support options</a>
          </aside>
        </div>
        <div id="cx-layer"></div>
      </main>
      ${Footer.render()}`;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();
    const $ = (id) => document.getElementById(id);
    const layer = $('cx-layer');
    let all = [], apptCache = [], spec = '';
    const role = store.getRole();

    // ── helpers ───────────────────────────────────────────
    const nextOpen = (c, booked = new Set()) => {
      const now = new Date();
      for (let i = 0; i < 28; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        if (!(c.available_days || []).includes(wk(d))) continue;
        for (const s of c.available_slots || []) {
          const t = slotToDate(key(d), s);
          if (t && t > now && !booked.has(`${key(d)}|${s}`)) return { d, s, t };
        }
      }
      return null;
    };
    const close = () => { layer.innerHTML = ''; document.body.classList.remove('cx-lock'); };
    const open = (html, cls) => {
      layer.innerHTML = `<div class="cx-backdrop" data-close="1"><div class="cx-panel ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
      document.body.classList.add('cx-lock');
      layer.querySelector('button, a, input')?.focus();
    };
    layer.addEventListener('click', (e) => { if (e.target.dataset?.close || e.target.closest('[data-close-btn]')) close(); });
    this._onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', this._onKey);

    // ── directory ─────────────────────────────────────────
    const card = (c) => {
      const n = nextOpen(c);
      return `
      <article class="cx-card${c.is_accepting_students ? '' : ' is-off'}">
        <div class="cx-card-top">
          <span class="cx-avatar" aria-hidden="true">${esc(initials(c.name))}</span>
          <div><h3>${esc(c.name)}</h3><p>${esc(c.title)}</p></div>
          <div class="cx-fee"><b>₹${c.fee}</b><span>per session</span></div>
        </div>
        <p class="cx-context">${esc(c.context || '')}</p>
        <div class="cx-tagrow">${(c.specialties || []).map((s) => `<span>${esc(s)}</span>`).join('')}</div>
        <ul class="cx-facts"><li>${icon('award', { size: 15 })} ${c.experience_years} years</li><li>${icon('globe', { size: 15 })} ${esc((c.languages || []).join(', '))}</li><li>${icon('clock', { size: 15 })} 50 min video</li></ul>
        <div class="cx-next">${c.is_accepting_students ? (n ? `Next available <b>${esc(n.d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))}, ${esc(n.s)}</b>` : 'No open slots in the next 4 weeks') : 'Not taking new students right now'}</div>
        <div class="cx-card-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-profile="${esc(c.id)}">View profile</button>
          <button type="button" class="btn btn-primary btn-sm btn-book" data-book="${esc(c.id)}" ${c.is_accepting_students ? '' : 'disabled'}>Book a session</button>
        </div>
      </article>`;
    };
    const specialtyChips = () => {
      const all_ = [...new Set(all.flatMap((c) => c.specialties || []))];
      $('cx-specialties').innerHTML = [['', 'All concerns'], ...all_.map((s) => [s, s])].map(([v, l]) => `<button type="button" class="cx-chip${spec === v ? ' is-on' : ''}" data-spec="${esc(v)}" aria-pressed="${spec === v}">${esc(l)}</button>`).join('');
      const langs = [...new Set(all.flatMap((c) => c.languages || []))].sort();
      const sel = $('cx-lang'); const cur = sel.value;
      sel.innerHTML = `<option value="">Any language</option>${langs.map((l) => `<option${l === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}`;
    };
    const draw = () => {
      const q = $('counsellor-search-input').value.toLowerCase().trim(), lang = $('cx-lang').value, fee = Number($('cx-fee').value) || 0, day = $('cx-day').value, sort = $('cx-sort').value;
      let list = all.filter((c) =>
        (!q || [c.name, c.title, c.context, c.bio, ...(c.specialties || [])].join(' ').toLowerCase().includes(q)) &&
        (!spec || (c.specialties || []).includes(spec)) && (!lang || (c.languages || []).includes(lang)) &&
        (!fee || c.fee <= fee) && (!day || (c.available_days || []).includes(day)));
      const soon = (c) => nextOpen(c)?.t?.getTime() ?? Infinity;
      list.sort(sort === 'fee' ? (a, b) => a.fee - b.fee : sort === 'exp' ? (a, b) => b.experience_years - a.experience_years : (a, b) => soon(a) - soon(b));
      $('cx-result-count').textContent = `${list.length} counsellor${list.length === 1 ? '' : 's'}`;
      $('counsellors-table-wrapper').innerHTML = list.length ? list.map(card).join('') : `<div class="cx-empty"><h3>No one matches those filters</h3><p>Try a different language, fee or day.</p><button type="button" class="btn btn-secondary" id="cx-reset">Clear filters</button></div>`;
    };
    async function loadCounsellors() {
      try { all = await counsellorsApi.listCounsellors(); specialtyChips(); draw(); }
      catch (e) { $('counsellors-table-wrapper').innerHTML = `<div class="cx-empty"><h3>We could not load counsellors</h3><p>Check your connection and try again.</p><button type="button" class="btn btn-secondary" id="cx-retry">Try again</button></div>`; }
    }
    ['counsellor-search-input', 'cx-lang', 'cx-fee', 'cx-day', 'cx-sort'].forEach((id) => $(id).addEventListener('input', draw));
    $('cx-specialties').addEventListener('click', (e) => { const b = e.target.closest('[data-spec]'); if (b) { spec = b.dataset.spec; specialtyChips(); draw(); } });
    $('counsellors-table-wrapper').addEventListener('click', (e) => {
      const p = e.target.closest('[data-profile]'), b = e.target.closest('[data-book]');
      if (p) profile(all.find((c) => c.id === p.dataset.profile));
      if (b) startBooking(all.find((c) => c.id === b.dataset.book));
      if (e.target.id === 'cx-reset') { ['counsellor-search-input', 'cx-lang', 'cx-fee', 'cx-day'].forEach((id) => { $(id).value = ''; }); spec = ''; specialtyChips(); draw(); }
      if (e.target.id === 'cx-retry') loadCounsellors();
    });

    // ── profile drawer ────────────────────────────────────
    function profile(c) {
      if (!c) return;
      open(`
        <header class="cx-panel-head"><span class="cx-avatar cx-avatar--lg" aria-hidden="true">${esc(initials(c.name))}</span>
          <div><h2>${esc(c.name)}</h2><p>${esc(c.title)}</p></div>
          <button type="button" class="cx-x" data-close-btn aria-label="Close">${icon('x', { size: 18 })}</button></header>
        <div class="cx-panel-body">
          <p class="cx-lead">${esc(c.bio)}</p>
          <h4>Can help with</h4><div class="cx-tagrow">${(c.specialties || []).map((s) => `<span>${esc(s)}</span>`).join('')}</div>
          <h4>Details</h4>
          <dl class="cx-dl"><dt>Experience</dt><dd>${c.experience_years} years</dd><dt>Languages</dt><dd>${esc((c.languages || []).join(', '))}</dd><dt>Fee</dt><dd>₹${c.fee} for a 50-minute session</dd><dt>Format</dt><dd>Private video call</dd></dl>
          <h4>Usually available</h4>
          <div class="cx-weekgrid">${WEEK.map((d) => `<span class="${(c.available_days || []).includes(d) ? 'is-on' : ''}">${d}</span>`).join('')}</div>
          <p class="cx-small">Times: ${esc((c.available_slots || []).join(' · '))}</p>
          <h4>What to expect</h4>
          <ul class="cx-list"><li>You send a request. The counsellor confirms it, or suggests another time.</li><li>Once confirmed, your video link appears under My sessions.</li><li>You can cancel from My sessions at any time.</li></ul>
        </div>
        <footer class="cx-panel-foot"><button type="button" class="btn btn-secondary" data-close-btn>Close</button><button type="button" class="btn btn-primary" id="cx-profile-book" ${c.is_accepting_students ? '' : 'disabled'}>Book a session</button></footer>`, 'cx-drawer');
      $('cx-profile-book')?.addEventListener('click', () => startBooking(c));
    }

    // ── booking flow ──────────────────────────────────────
    async function startBooking(c) {
      if (!c) return;
      if (!store.isAuthenticated()) { Toast.info('Please sign in to book a session.'); navigate('/auth/login'); return; }
      if (role !== 'student') { Toast.info('Only student accounts can book sessions.'); return; }
      let booked = new Set();
      try { (await counsellorsApi.bookedSlots(c.id)).forEach((b) => booked.add(`${b.date}|${b.slot}`)); } catch (e) { /* the server still prevents double booking */ }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const max = new Date(today); max.setDate(max.getDate() + 90);
      const first = nextOpen(c, booked);
      const st = { step: 1, month: new Date((first?.d || today).getFullYear(), (first?.d || today).getMonth(), 1), date: first ? key(first.d) : '', slot: '', type: '', notes: '' };

      const freeSlots = (dateStr) => (c.available_slots || []).map((s) => ({ s, t: slotToDate(dateStr, s) })).filter((x) => x.t);
      const dayOpen = (d) => d >= today && d <= max && (c.available_days || []).includes(wk(d)) && freeSlots(key(d)).some((x) => x.t > new Date() && !booked.has(`${key(d)}|${x.s}`));

      const calendar = () => {
        const y = st.month.getFullYear(), m = st.month.getMonth();
        const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
        const cells = Array(lead).fill('<span class="cx-day cx-day--pad"></span>');
        for (let i = 1; i <= days; i++) {
          const d = new Date(y, m, i), k = key(d), ok = dayOpen(d);
          cells.push(`<button type="button" class="cx-day${ok ? ' is-open' : ''}${st.date === k ? ' is-sel' : ''}${k === key(today) ? ' is-today' : ''}" data-date="${k}" ${ok ? '' : 'disabled'} aria-label="${fmtDate(d)}${ok ? '' : ', unavailable'}">${i}</button>`);
        }
        return `<div class="cx-cal"><div class="cx-cal-head"><button type="button" class="cx-x" data-nav="-1" aria-label="Previous month" ${y === today.getFullYear() && m === today.getMonth() ? 'disabled' : ''}>${icon('chevron-left', { size: 18 })}</button><b>${st.month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button type="button" class="cx-x" data-nav="1" aria-label="Next month">${icon('chevron-right', { size: 18 })}</button></div>
          <div class="cx-cal-week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="cx-cal-grid">${cells.join('')}</div>
          <p class="cx-small"><i class="cx-dot"></i> Days with open times</p></div>`;
      };
      const slots = () => {
        if (!st.date) return '<p class="cx-small">Choose a day to see times.</p>';
        const d = new Date(`${st.date}T00:00`);
        return `<h4>${fmtDate(d)}</h4><div class="cx-slots">${freeSlots(st.date).map(({ s, t }) => { const off = t <= new Date() || booked.has(`${st.date}|${s}`); return `<button type="button" class="cx-slot${st.slot === s ? ' is-sel' : ''}" data-slot="${esc(s)}" ${off ? 'disabled' : ''}>${esc(s)}${off ? '<small>taken</small>' : ''}</button>`; }).join('')}</div>`;
      };
      const stepper = () => `<ol class="cx-stepper">${['Date and time', 'About you', 'Confirm'].map((l, i) => `<li class="${st.step === i + 1 ? 'is-cur' : st.step > i + 1 ? 'is-done' : ''}"><b>${i + 1}</b>${l}</li>`).join('')}</ol>`;
      const body = () => {
        if (st.step === 1) return `<div class="cx-two">${calendar()}<div>${slots()}</div></div>`;
        if (st.step === 2) return `<h4>What would you like support with?</h4><div class="cx-types">${SUPPORT.map(([v, l, h]) => `<label class="cx-type${st.type === v ? ' is-sel' : ''}"><input type="radio" name="type" value="${v}" ${st.type === v ? 'checked' : ''}><b>${l}</b><span>${h}</span></label>`).join('')}</div>
          <label class="form-label" for="cx-notes">Anything you want the counsellor to know? (optional)</label><textarea id="cx-notes" class="form-textarea" rows="4" maxlength="1000" placeholder="Share as much or as little as you like.">${esc(st.notes)}</textarea><p class="cx-small">Only this counsellor sees what you write here.</p>`;
        const t = SUPPORT.find((x) => x[0] === st.type);
        return `<div class="cx-review"><h4>Please check your request</h4><dl class="cx-dl"><dt>Counsellor</dt><dd>${esc(c.name)}</dd><dt>When</dt><dd>${esc(nice(st.date, st.slot))} (50 min, video)</dd><dt>Topic</dt><dd>${esc(t?.[1] || '')}</dd><dt>Fee</dt><dd>₹${c.fee}</dd>${st.notes ? `<dt>Your note</dt><dd>${esc(st.notes)}</dd>` : ''}</dl><p class="cx-small">This sends a request. The counsellor confirms it, and you will see the status under My sessions. You can cancel any time.</p></div>`;
      };
      const ready = () => (st.step === 1 ? !!(st.date && st.slot) : st.step === 2 ? !!st.type : true);
      const paint = () => {
        open(`<header class="cx-panel-head"><span class="cx-avatar" aria-hidden="true">${esc(initials(c.name))}</span><div><h2>Book with ${esc(c.name)}</h2><p>₹${c.fee} · 50 minutes · video</p></div><button type="button" class="cx-x" data-close-btn aria-label="Close">${icon('x', { size: 18 })}</button></header>
          <div class="cx-panel-body">${stepper()}<div id="cx-step-body">${body()}</div><p class="cx-error" id="cx-error" role="alert"></p></div>
          <footer class="cx-panel-foot">${st.step > 1 ? '<button type="button" class="btn btn-secondary" id="cx-back">Back</button>' : '<button type="button" class="btn btn-secondary" data-close-btn>Cancel</button>'}<button type="button" class="btn btn-primary" id="cx-next" ${ready() ? '' : 'disabled'}>${st.step === 3 ? 'Send request' : 'Continue'}</button></footer>`, 'cx-modal');
        wire();
      };
      const refreshNext = () => { const b = $('cx-next'); if (b) b.disabled = !ready(); };
      const wire = () => {
        const p = layer.querySelector('.cx-panel');
        p.addEventListener('click', async (e) => {
          const nav = e.target.closest('[data-nav]'), dt = e.target.closest('[data-date]'), sl = e.target.closest('[data-slot]');
          if (nav) { st.month = new Date(st.month.getFullYear(), st.month.getMonth() + Number(nav.dataset.nav), 1); $('cx-step-body').innerHTML = body(); refreshNext(); }
          if (dt) { st.date = dt.dataset.date; st.slot = ''; $('cx-step-body').innerHTML = body(); refreshNext(); }
          if (sl) { st.slot = sl.dataset.slot; $('cx-step-body').innerHTML = body(); refreshNext(); }
          if (e.target.id === 'cx-back') { st.step--; paint(); }
          if (e.target.id === 'cx-next') {
            if (st.step < 3) { st.step++; paint(); return; }
            const btn = e.target; btn.disabled = true; btn.textContent = 'Sending…';
            try {
              const a = await appointmentsApi.bookAppointment({ counsellor_id: c.id, support_type: st.type, preferred_date: st.date, time_slot: st.slot, student_notes: st.notes.trim() || undefined });
              done(a);
            } catch (err) { $('cx-error').textContent = err.message || 'Could not send your request. Please try another time.'; btn.disabled = false; btn.textContent = 'Send request'; }
          }
        });
        p.addEventListener('input', (e) => { if (e.target.name === 'type') { st.type = e.target.value; p.querySelectorAll('.cx-type').forEach((l) => l.classList.toggle('is-sel', l.contains(e.target))); refreshNext(); } if (e.target.id === 'cx-notes') st.notes = e.target.value; });
      };
      const done = (a) => {
        open(`<div class="cx-success"><div class="cx-success-tick">${icon('check', { size: 30 })}</div><h2>Request sent</h2><p>${esc(c.name)} will confirm <b>${esc(nice(st.date, st.slot))}</b>. We will email you, and the status shows under My sessions.</p>
          <div class="cx-success-actions"><button type="button" class="btn btn-secondary" id="cx-ics">${icon('calendar', { size: 16 })} Add to calendar</button><button type="button" class="btn btn-primary" id="cx-view">View my sessions</button></div></div>`, 'cx-modal cx-modal--small');
        $('cx-ics').addEventListener('click', () => downloadIcs({ id: a?.id, title: `Counselling with ${c.name}`, date: st.date, slot: st.slot, description: 'Pending confirmation from the counsellor. Booked through Serenova.' }));
        $('cx-view').addEventListener('click', () => { close(); switchTab(true); });
        loadAppointments();
      };
      paint();
    }

    // ── my sessions ───────────────────────────────────────
    const apptCard = (a) => {
      const [label, tone] = STATUS[a.status] || [a.status, 'off'];
      const when = slotToDate(a.preferred_date, a.time_slot);
      const live = ['pending', 'confirmed'].includes(a.status);
      return `<article class="cx-appt cx-appt--${tone}">
        <div class="cx-appt-date"><b>${when ? when.getDate() : ''}</b><span>${when ? when.toLocaleDateString(undefined, { month: 'short' }) : ''}</span></div>
        <div class="cx-appt-main"><h3>${esc(a.counsellor_name || 'Counsellor')}</h3><p>${esc(a.counsellor_title || '')}</p><p class="cx-small">${when ? esc(when.toLocaleDateString(undefined, { weekday: 'long' })) : ''}, ${esc(a.time_slot)} · 50 min · ${esc((SUPPORT.find((x) => x[0] === a.support_type) || [])[1] || '')}</p>
          ${a.counsellor_message ? `<p class="cx-msg">Message from counsellor: ${esc(a.counsellor_message)}</p>` : ''}</div>
        <div class="cx-appt-side"><span class="cx-status cx-status--${tone}">${label}</span>
          <div class="cx-appt-actions">
            ${a.status === 'confirmed' && a.video_meet_link ? `<a class="btn btn-primary btn-sm" href="${esc(a.video_meet_link)}" target="_blank" rel="noopener noreferrer">${icon('video', { size: 15 })} Join video</a>` : ''}
            ${live ? `<button type="button" class="btn btn-secondary btn-sm" data-ics="${esc(a.id)}">${icon('calendar', { size: 15 })} Add to calendar</button><button type="button" class="btn btn-ghost btn-sm btn-cancel-appt" data-cancel="${esc(a.id)}">Cancel</button>` : ''}
          </div></div></article>`;
    };
    async function loadAppointments() {
      const box = $('appointments-list-container');
      if (!store.isAuthenticated()) { box.innerHTML = `<div class="cx-empty"><h3>Sign in to see your sessions</h3><p>Your requests and confirmations live in your account.</p><a href="/auth/login" class="btn btn-primary">Sign in</a></div>`; return; }
      box.innerHTML = '<div class="skeleton skeleton-block"></div>';
      try { apptCache = await appointmentsApi.listAppointments(); } catch (e) { box.innerHTML = `<div class="cx-empty"><h3>We could not load your sessions</h3><button type="button" class="btn btn-secondary" id="cx-appt-retry">Try again</button></div>`; return; }
      const now = new Date();
      const upcoming = apptCache.filter((a) => ['pending', 'confirmed'].includes(a.status) && (slotToDate(a.preferred_date, a.time_slot) || now) >= new Date(now.getTime() - 60 * 60000)).sort((a, b) => slotToDate(a.preferred_date, a.time_slot) - slotToDate(b.preferred_date, b.time_slot));
      const past = apptCache.filter((a) => !upcoming.includes(a));
      const badge = $('cx-appt-count'); badge.hidden = !upcoming.length; badge.textContent = upcoming.length;
      box.innerHTML = !apptCache.length
        ? `<div class="cx-empty"><h3>No sessions yet</h3><p>When you book, your requests and video links show up here.</p><button type="button" class="btn btn-primary" id="cx-go-find">Find a counsellor</button></div>`
        : `${upcoming.length ? `<h3 class="cx-group">Upcoming</h3><div class="cx-appt-list">${upcoming.map(apptCard).join('')}</div>` : ''}${past.length ? `<h3 class="cx-group">Past and cancelled</h3><div class="cx-appt-list">${past.map(apptCard).join('')}</div>` : ''}`;
    }
    $('appointments-list-container').addEventListener('click', async (e) => {
      const ics = e.target.closest('[data-ics]'), can = e.target.closest('[data-cancel]');
      if (ics) { const a = apptCache.find((x) => x.id === ics.dataset.ics); if (a) downloadIcs({ id: a.id, title: `Counselling with ${a.counsellor_name}`, date: a.preferred_date, slot: a.time_slot, description: a.status === 'confirmed' ? 'Confirmed session booked through Serenova.' : 'Pending confirmation from the counsellor.' }); }
      if (can) {
        if (!(await confirmDialog({ title: 'Cancel this session?', message: 'The counsellor will be told the time is free again.', confirmLabel: 'Cancel session', cancelLabel: 'Keep it', danger: true }))) return;
        try { await appointmentsApi.cancelAppointment(can.dataset.cancel); Toast.info('Session cancelled.'); loadAppointments(); } catch (err) { Toast.error(err.message || 'Could not cancel this session.'); }
      }
      if (e.target.id === 'cx-go-find') switchTab(false);
      if (e.target.id === 'cx-appt-retry') loadAppointments();
    });

    function switchTab(toAppts) {
      $('tab-counsellors-btn').classList.toggle('is-on', !toAppts); $('tab-appointments-btn').classList.toggle('is-on', toAppts);
      $('tab-counsellors-btn').setAttribute('aria-selected', String(!toAppts)); $('tab-appointments-btn').setAttribute('aria-selected', String(toAppts));
      $('panel-counsellors').hidden = toAppts; $('panel-appointments').hidden = !toAppts;
      if (toAppts) loadAppointments();
    }
    $('tab-counsellors-btn').addEventListener('click', () => switchTab(false));
    $('tab-appointments-btn').addEventListener('click', () => switchTab(true));

    loadCounsellors();
    if (store.isAuthenticated() && role === 'student') loadAppointments().catch(() => {});
    if (location.pathname === '/appointments' || new URLSearchParams(location.search).get('tab') === 'appointments') switchTab(true);
  },

  destroy() { document.body.classList.remove('cx-lock'); if (this._onKey) document.removeEventListener('keydown', this._onKey); this._cleanupNavbar?.(); },
};
