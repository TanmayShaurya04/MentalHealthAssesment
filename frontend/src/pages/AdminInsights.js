/** Admin: anonymous aggregate insights, safety-trigger log, and counsellor logins. */
import { apiClient } from '../api/client.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { icon } from '../components/icons.js';
import { esc } from '../utils/html.js';

const LABELS = {
  minimal: 'Minimal', mild: 'Mild', moderate: 'Moderate', moderately_severe: 'Moderately severe', severe: 'Severe',
  pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', declined: 'Declined', completed: 'Completed',
  academic: 'Academics', anxiety: 'Anxiety', sleep: 'Sleep', belonging: 'Belonging', low_mood: 'Low mood', calm: 'Calming', general: 'General',
  chat: 'AI companion', assessment: 'Screening', journal: 'Journal',
};
const label = (k) => LABELS[k] || String(k).replace(/_/g, ' ');

function bars(title, data, floor) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, v]) => v || 0));
  return `<section class="settings-card"><h2>${title}</h2>${entries.length ? `<ul class="bar-list">${entries.map(([k, v]) => `
    <li><span class="bar-label">${esc(label(k))}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${v == null ? 0 : Math.round((v / max) * 100)}%"></span></span>
      <span class="bar-val">${v == null ? `&lt;${floor}` : v}</span></li>`).join('')}</ul>` : '<p class="empty-state">No data yet.</p>'}</section>`;
}

export const AdminInsights = {
  _c: null,
  render() {
    return `
      ${Navbar.render()}
      <main class="page-root portal-page" id="main-content">
        <div class="container portal-container">
          <p class="auth-eyebrow">Administrator</p>
          <h1 class="legal-title">Campus insights</h1>
          <p class="settings-sub" id="admin-note">Anonymous counts only. No names, messages, journal text or individual scores.</p>
          <div id="admin-body" aria-live="polite"><div class="skeleton skeleton-block"></div></div>
        </div>
      </main>
      ${Footer.render()}`;
  },
  async afterRender() {
    this._c = initNavbar();
    const body = document.getElementById('admin-body');
    try {
      const [s, crisis, accounts] = await Promise.all([
        apiClient.get('/api/admin/stats'), apiClient.get('/api/admin/crisis-events'), apiClient.get('/api/admin/counsellors'),
      ]);
      const floor = s.min_group_size;
      const stat = (n, l) => `<div class="stat-card"><span class="stat-num">${n ?? '–'}</span><span class="stat-label">${l}</span></div>`;
      body.innerHTML = `
        <div class="stat-row">
          ${stat(s.students.total, 'Students')}${stat(s.students.active_last_7_days, 'Active this week')}
          ${stat(s.average_mood_30_days, 'Avg mood, 30 days (1–5)')}${stat(s.crisis_events.last_30_days, 'Safety triggers, 30 days')}
        </div>
        ${floor > 0 ? `<p class="form-hint">Groups smaller than ${floor} are hidden to protect privacy.</p>` : '<p class="form-hint">Demo mode: small-group hiding is off so you can see sample data.</p>'}
        <div class="insight-grid">
          ${bars('Latest screening result', s.screening_latest_by_category, floor)}
          ${bars('Appointments', s.appointments_by_status, floor)}
          ${bars('What students talk about', s.companion_topics, floor)}
          ${bars('Safety triggers by feature (30 days)', s.crisis_events.by_source, 0)}
        </div>

        <section class="settings-card"><h2>Safety-trigger log</h2>
          <p class="form-hint">Time and feature only. What was written, and by whom, is never recorded.</p>
          ${crisis.length ? `<ul class="log-list">${crisis.slice(0, 20).map((c) => `<li>${icon('shield', { size: 16 })} <span>${esc(label(c.source))}</span><time>${esc(new Date(c.created_at).toLocaleString())}</time></li>`).join('')}</ul>` : '<p class="empty-state">No triggers recorded.</p>'}
        </section>

        <section class="settings-card"><h2>Counsellor logins</h2>
          <table class="table"><thead><tr><th>Counsellor</th><th>Login email</th><th></th></tr></thead><tbody>
            ${accounts.map((c) => `<tr><td>${esc(c.name)} ${c.is_demo ? '<span class="pill">Demo</span>' : ''}</td>
              <td>${esc(c.login_email || '—')}</td>
              <td>${c.login_email ? '' : `<button class="btn btn-secondary btn-sm" data-create="${esc(c.id)}" data-name="${esc(c.name)}">Create login</button>`}</td></tr>`).join('')}
          </tbody></table>
          <form id="acct-form" class="settings-form" hidden>
            <h3 id="acct-title"></h3>
            <div class="form-group"><label class="form-label" for="acct-email">Login email</label><input id="acct-email" type="email" class="form-input" required /></div>
            <div class="form-group"><label class="form-label" for="acct-pw">Temporary password</label><input id="acct-pw" type="password" class="form-input" minlength="8" autocomplete="new-password" required />
              <p class="form-hint">Share it securely; they can change it in Settings.</p></div>
            <button class="btn btn-primary" type="submit">Create login</button>
          </form>
        </section>`;

      let target = null;
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-create]'); if (!b) return;
        target = { id: b.dataset.create, name: b.dataset.name };
        const f = document.getElementById('acct-form'); f.hidden = false;
        document.getElementById('acct-title').textContent = `Login for ${target.name}`;
        document.getElementById('acct-email').focus();
      });
      document.getElementById('acct-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiClient.post('/api/admin/counsellor-accounts', {
            counsellor_id: target.id, name: target.name,
            email: document.getElementById('acct-email').value.trim(), password: document.getElementById('acct-pw').value,
          });
          Toast.success('Login created.');
          this.afterRender();
        } catch (err) { Toast.error(err.message); }
      });
    } catch (err) {
      body.innerHTML = `<div class="empty-state empty-state--error">${icon('alert', { size: 32 })}<p>${esc(err.message)}</p></div>`;
    }
  },
  destroy() { this._c?.(); },
};
