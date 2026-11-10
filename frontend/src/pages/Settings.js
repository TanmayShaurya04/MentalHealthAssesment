import { authApi } from '../api/auth.js';
import { router } from '../router.js';
import { store } from '../store.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { confirmDialog } from '../components/Dialog.js';
import { icon } from '../components/icons.js';
import { esc } from '../utils/html.js';
import { t, setLang, getLang, LANGS } from '../i18n/index.js';
import { getTheme, setTheme } from '../utils/theme.js';
import { getGuard, setGuard } from '../components/Guards.js';

export const Settings = {
  _c: null,
  render() {
    const u = store.getUser() || {};
    const verified = !!u.email_verified;
    const isStudent = (u.role || 'student') === 'student';
    return `
      ${Navbar.render()}
      <main class="page-root settings-page" id="main-content">
        <div class="container settings-container">
          <h1 class="legal-title">${t('settings.title')}</h1>
          <p class="settings-sub">${esc(u.name || '')} · ${esc(u.email || '')}</p>

          <section class="settings-card" aria-labelledby="s-email">
            <h2 id="s-email">${t('settings.emailStatus')}</h2>
            <p class="settings-row">
              <span class="pill ${verified ? 'pill--ok' : 'pill--warn'}">${icon(verified ? 'check-circle' : 'alert', { size: 14 })} ${verified ? t('settings.verified') : t('settings.notVerified')}</span>
              ${verified ? '' : `<button type="button" class="btn btn-secondary btn-sm" id="resend-verify">${t('settings.resend')}</button>`}
            </p>
          </section>

          <section class="settings-card" aria-labelledby="s-look">
            <h2 id="s-look">${t('settings.appearance')}</h2>
            <div class="settings-row">
              <span id="theme-label">${t('settings.theme')}</span>
              <div class="segmented" role="group" aria-labelledby="theme-label">
                <button type="button" data-theme-set="light" class="${getTheme() === 'light' ? 'is-on' : ''}" aria-pressed="${getTheme() === 'light'}">${icon('sun', { size: 16 })} ${t('settings.light')}</button>
                <button type="button" data-theme-set="dark" class="${getTheme() === 'dark' ? 'is-on' : ''}" aria-pressed="${getTheme() === 'dark'}">${icon('moon', { size: 16 })} ${t('settings.dark')}</button>
              </div>
            </div>
            <div class="settings-row">
              <label for="lang-select">${t('settings.language')}</label>
              <select id="lang-select" class="form-input form-select-sm">
                ${LANGS.map((l) => `<option value="${l.code}" ${l.code === getLang() ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}
              </select>
            </div>
          </section>

          ${isStudent ? `
          <section class="settings-card" aria-labelledby="s-rem">
            <h2 id="s-rem">${t('settings.reminders')}</h2>
            <label class="check-row">
              <input type="checkbox" id="reminder-toggle" ${u.profile?.daily_reminder ? 'checked' : ''} />
              <span>${t('settings.dailyReminder')}</span>
            </label>
          </section>` : ''}

          <section class="settings-card" aria-labelledby="s-pw">
            <h2 id="s-pw">${t('settings.password')}</h2>
            <form id="pw-form" class="settings-form" novalidate>
              <div id="pw-alert" class="auth-alert" style="display:none" role="alert"></div>
              <div class="form-group"><label class="form-label" for="pw-cur">${t('settings.currentPassword')}</label>
                <input class="form-input" id="pw-cur" type="password" autocomplete="current-password" required /></div>
              <div class="form-group"><label class="form-label" for="pw-new">${t('settings.newPassword')}</label>
                <input class="form-input" id="pw-new" type="password" autocomplete="new-password" minlength="8" required />
                <p class="form-hint">At least 8 characters, with a letter and a number.</p></div>
              <button type="submit" class="btn btn-primary">${t('settings.updatePassword')}</button>
            </form>
          </section>

          ${isStudent ? `
          <section class="settings-card" aria-labelledby="s-data">
            <h2 id="s-data">${t('settings.data')}</h2>
            <div class="settings-row settings-row--stack">
              <div><strong>${t('settings.download')}</strong><p class="form-hint">${t('settings.downloadHint')}</p></div>
              <button type="button" class="btn btn-secondary" id="export-btn">${icon('download', { size: 16 })} ${t('settings.download')}</button>
            </div>
            <div class="settings-row settings-row--stack danger-zone">
              <div><strong>${t('settings.delete')}</strong><p class="form-hint">${t('settings.deleteHint')}</p></div>
              <button type="button" class="btn btn-danger" id="delete-btn">${icon('trash', { size: 16 })} ${t('settings.delete')}</button>
            </div>
          </section>` : ''}

          <section class="settings-card" aria-labelledby="s-priv">
            <h2 id="s-priv">Privacy on shared screens</h2>
            <div class="settings-row"><span>Quick exit button (press Esc twice to leave instantly)</span>
              <label class="switch"><input type="checkbox" id="guard-quick" ${getGuard('quick') ? 'checked' : ''}><span class="visually-hidden">Quick exit</span></label></div>
            <div class="settings-row"><span>Lock the screen after 5 idle minutes</span>
              <label class="switch"><input type="checkbox" id="guard-lock" ${getGuard('lock') ? 'checked' : ''}><span class="visually-hidden">Screen lock</span></label></div>
            <p class="form-hint">Saved on this device only.${isStudent ? ' <a href="/safety-plan">Open my safety plan</a>' : ''}</p>
          </section>

          <p class="settings-legal"><a href="/privacy">${t('footer.privacy')}</a> · <a href="/terms">${t('footer.terms')}</a></p>
        </div>
      </main>
      ${Footer.render()}`;
  },

  afterRender() {
    this._c = initNavbar();
    const $ = (id) => document.getElementById(id);

    document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
      setTheme(b.dataset.themeSet);
      document.querySelectorAll('[data-theme-set]').forEach((x) => {
        const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on));
      });
    }));

    $('lang-select')?.addEventListener('change', async (e) => {
      setLang(e.target.value);
      try { await authApi.updateProfile({ language: e.target.value }); } catch (err) { /* offline: local choice still applies */ }
      router.navigate('/settings', false);
    });

    $('guard-quick')?.addEventListener('change', (e) => setGuard('quick', e.target.checked));
    $('guard-lock')?.addEventListener('change', (e) => setGuard('lock', e.target.checked));

    $('reminder-toggle')?.addEventListener('change', async (e) => {
      try {
        await authApi.updateProfile({ daily_reminder: e.target.checked });
        Toast.success(e.target.checked ? 'Daily reminder is on.' : 'Daily reminder is off.');
      } catch (err) { e.target.checked = !e.target.checked; Toast.error(err.message); }
    });

    $('resend-verify')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        const r = await authApi.resendVerification();
        Toast.success(r.message);
        if (r.dev_verify_link) Toast.info('Demo mode: confirmation link printed in the server console.');
      } catch (err) { Toast.error(err.message); e.target.disabled = false; }
    });

    $('pw-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = $('pw-alert'); a.style.display = 'none';
      try {
        await authApi.changePassword($('pw-cur').value, $('pw-new').value);
        e.target.reset();
        Toast.success('Password updated.');
      } catch (err) { a.textContent = err.message; a.style.display = 'block'; }
    });

    $('export-btn')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        const data = await authApi.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `serenova-my-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        Toast.success('Your data has been downloaded.');
      } catch (err) { Toast.error(err.message); }
      $('export-btn').disabled = false;
    });

    $('delete-btn')?.addEventListener('click', async () => {
      const pw = await confirmDialog({
        title: t('settings.delete'),
        message: 'This permanently deletes your account, moods, journal, screenings, chats and appointments. Type your password to confirm.',
        confirmLabel: t('settings.delete'), danger: true,
        input: { type: 'password', label: t('settings.currentPassword'), autocomplete: 'current-password' },
      });
      if (!pw) return;
      try {
        await authApi.deleteAccount(pw);
        Toast.success('Your account has been deleted.');
        router.navigate('/');
      } catch (err) { Toast.error(err.message); }
    });
  },
  destroy() { this._c?.(); },
};
