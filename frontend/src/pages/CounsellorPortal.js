/** Counsellor portal: incoming requests, confirm / decline / reschedule, private notes, availability. */
import { apiClient } from '../api/client.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { confirmDialog } from '../components/Dialog.js';
import { icon } from '../components/icons.js';
import { esc } from '../utils/html.js';

const TYPE = {
  academic_stress: 'Academic stress', anxiety_mindfulness: 'Anxiety & mindfulness',
  personal_counselling: 'Personal counselling', general_support: 'General support',
};
const STATUS_LABEL = { pending: 'Needs reply', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled by student', completed: 'Completed' };
const FILTERS = [['pending', 'Needs reply'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['', 'All']];

export const CounsellorPortal = {
  _c: null, state: { filter: 'pending', items: [], summary: null, avail: null },

  render() {
    return `
      ${Navbar.render()}
      <main class="page-root portal-page" id="main-content">
        <div class="container portal-container">
          <header class="portal-head">
            <p class="auth-eyebrow">Counsellor portal</p>
            <h1 class="legal-title" id="portal-name">Welcome</h1>
            <p class="settings-sub">You see only a student's name, university and the note they wrote when booking.</p>
          </header>
          <div class="stat-row" id="portal-stats" aria-live="polite">${[0, 1, 2, 3].map(() => '<div class="stat-card skeleton"></div>').join('')}</div>

          <section class="settings-card" aria-labelledby="req-h">
            <div class="portal-toolbar">
              <h2 id="req-h">Requests</h2>
              <div class="segmented" role="group" aria-label="Filter requests" id="portal-filters">
                ${FILTERS.map(([v, l]) => `<button type="button" data-filter="${v}" class="${v === 'pending' ? 'is-on' : ''}" aria-pressed="${v === 'pending'}">${l}</button>`).join('')}
              </div>
            </div>
            <div id="portal-list" class="portal-list" aria-live="polite"><div class="skeleton skeleton-block"></div></div>
          </section>

          <section class="settings-card" aria-labelledby="av-h">
            <h2 id="av-h">My availability</h2>
            <div id="avail-box"><div class="skeleton skeleton-block"></div></div>
          </section>
        </div>
      </main>
      ${Footer.render()}`;
  },

  async afterRender() {
    this._c = initNavbar();
    const $ = (id) => document.getElementById(id);
    this.state = { filter: 'pending', items: [], summary: null, avail: null };

    $('portal-filters').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]'); if (!b) return;
      this.state.filter = b.dataset.filter;
      $('portal-filters').querySelectorAll('button').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      this.load();
    });
    $('portal-list').addEventListener('click', (e) => this.onAction(e));
    await Promise.all([this.loadSummary(), this.load(), this.loadAvail()]);
  },

  async loadSummary() {
    try {
      const s = await apiClient.get('/api/counsellor/summary');
      document.getElementById('portal-name').textContent = `Welcome, ${s.counsellor.name}`;
      const card = (n, l) => `<div class="stat-card"><span class="stat-num">${n}</span><span class="stat-label">${l}</span></div>`;
      document.getElementById('portal-stats').innerHTML = card(s.pending, 'Need a reply') + card(s.upcoming, 'Upcoming') + card(s.completed, 'Completed') + card(s.total, 'All requests');
    } catch (err) { document.getElementById('portal-stats').innerHTML = `<p class="empty-state">${esc(err.message)}</p>`; }
  },

  async load() {
    const box = document.getElementById('portal-list');
    try {
      this.state.items = await apiClient.get('/api/counsellor/appointments', this.state.filter ? { status: this.state.filter } : undefined);
    } catch (err) {
      box.innerHTML = this.errorBlock(err.message); return;
    }
    const items = this.state.items;
    if (!items.length) {
      box.innerHTML = `<div class="empty-state">${icon('inbox', { size: 32 })}<p>Nothing here right now.</p></div>`; return;
    }
    box.innerHTML = items.map((a) => `
      <article class="req-card" data-id="${esc(a.id)}">
        <div class="req-top">
          <div>
            <h3>${esc(a.student_name)}</h3>
            <p class="req-meta">${esc(a.student_university || 'University not given')} · ${esc(TYPE[a.support_type] || a.support_type)}</p>
          </div>
          <span class="pill pill--${esc(a.status)}">${esc(STATUS_LABEL[a.status] || a.status)}</span>
        </div>
        <p class="req-when">${icon('calendar', { size: 16 })} ${esc(a.preferred_date)} · ${icon('clock', { size: 16 })} ${esc(a.time_slot)}</p>
        ${a.student_notes ? `<blockquote class="req-note">${esc(a.student_notes)}</blockquote>` : ''}
        ${a.status === 'pending' || a.status === 'confirmed' ? `
          <label class="form-label" for="msg-${esc(a.id)}">Message to student (optional)</label>
          <input class="form-input" id="msg-${esc(a.id)}" maxlength="500" placeholder="e.g. Please keep a quiet room ready" />
          <div class="req-actions">
            ${a.status === 'pending' ? `<button class="btn btn-primary btn-sm" data-act="confirmed">Confirm</button>` : `<button class="btn btn-primary btn-sm" data-act="completed">Mark completed</button>`}
            <button class="btn btn-secondary btn-sm" data-act="reschedule">Suggest new time</button>
            ${a.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-act="declined">Decline</button>` : ''}
          </div>
          <div class="req-reschedule" hidden>
            <input class="form-input" type="date" data-r="date" value="${esc(a.preferred_date)}" aria-label="New date" />
            <input class="form-input" type="text" data-r="slot" value="${esc(a.time_slot)}" aria-label="New time, like 10:30 AM" placeholder="10:30 AM" />
            <button class="btn btn-primary btn-sm" data-act="reschedule-save">Save and confirm</button>
          </div>` : ''}
        <details class="req-private"><summary>Private session note (only you see this)</summary>
          <textarea class="form-input" rows="3" maxlength="4000" data-note>${esc(a.counsellor_note || '')}</textarea>
          <button class="btn btn-secondary btn-sm" data-act="note">Save note</button>
        </details>
      </article>`).join('');
  },

  errorBlock(msg) {
    return `<div class="empty-state empty-state--error">${icon('alert', { size: 32 })}<p>${esc(msg)}</p></div>`;
  },

  async onAction(e) {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const card = btn.closest('.req-card'); const id = card.dataset.id; const act = btn.dataset.act;
    const msg = card.querySelector(`#msg-${CSS.escape(id)}`)?.value.trim();
    const call = (body) => apiClient.patch(`/api/counsellor/appointments/${id}`, body);
    try {
      if (act === 'reschedule') { card.querySelector('.req-reschedule').hidden = false; return; }
      if (act === 'note') {
        await apiClient.put(`/api/counsellor/appointments/${id}/note`, { note: card.querySelector('[data-note]').value });
        Toast.success('Note saved.'); return;
      }
      btn.disabled = true;
      if (act === 'declined') {
        if (!(await confirmDialog({ title: 'Decline this request?', message: 'The student will be told you cannot take this slot.', confirmLabel: 'Decline', danger: true }))) { btn.disabled = false; return; }
        await call({ status: 'declined', message: msg || undefined });
      } else if (act === 'reschedule-save') {
        await call({ preferred_date: card.querySelector('[data-r="date"]').value, time_slot: card.querySelector('[data-r="slot"]').value.trim(), message: msg || undefined });
      } else {
        await call({ status: act, message: msg || undefined });
      }
      Toast.success('Updated. The student has been notified.');
      await Promise.all([this.loadSummary(), this.load()]);
    } catch (err) { Toast.error(err.message); btn.disabled = false; }
  },

  async loadAvail() {
    const box = document.getElementById('avail-box');
    try {
      const a = await apiClient.get('/api/counsellor/availability');
      box.innerHTML = `
        <form id="avail-form" class="settings-form">
          <fieldset class="day-picker"><legend class="form-label">Days you take sessions</legend>
            ${a.all_days.map((d) => `<label class="chip-check"><input type="checkbox" name="day" value="${esc(d)}" ${a.available_days.includes(d) ? 'checked' : ''}/><span>${esc(d.slice(0, 3))}</span></label>`).join('')}
          </fieldset>
          <div class="form-group"><label class="form-label" for="slots">Time slots (comma separated)</label>
            <input class="form-input" id="slots" value="${esc(a.available_slots.join(', '))}" placeholder="10:00 AM, 11:30 AM, 03:00 PM" /></div>
          <label class="check-row"><input type="checkbox" id="accepting" ${a.is_accepting_students ? 'checked' : ''}/><span>I'm accepting new students</span></label>
          <button class="btn btn-primary" type="submit">Save availability</button>
        </form>`;
      document.getElementById('avail-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiClient.put('/api/counsellor/availability', {
            available_days: [...e.target.querySelectorAll('[name=day]:checked')].map((x) => x.value),
            available_slots: document.getElementById('slots').value.split(',').map((s) => s.trim()).filter(Boolean),
            is_accepting_students: document.getElementById('accepting').checked,
          });
          Toast.success('Availability saved.');
          this.loadAvail();
        } catch (err) { Toast.error(err.message); }
      });
    } catch (err) { box.innerHTML = this.errorBlock(err.message); }
  },
  destroy() { this._c?.(); },
};
