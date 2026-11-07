/** Forgot password, reset password, and confirm email pages. */
import { authApi } from '../api/auth.js';
import { router } from '../router.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { esc } from '../utils/html.js';
import { icon } from '../components/icons.js';

function card(title, sub, inner) {
  return `
    ${Navbar.render()}
    <main class="auth-page page-root" id="main-content">
      <div class="container auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <h1 class="auth-title">${title}</h1>
            ${sub ? `<p class="auth-subtitle">${sub}</p>` : ''}
          </div>
          ${inner}
        </div>
      </div>
    </main>
    ${Footer.render()}`;
}
const show = (el, msg) => { el.textContent = msg; el.style.display = 'block'; };

export const ForgotPassword = {
  _c: null,
  render() {
    return card('Forgot your password?', "Enter your email and we'll send you a link to choose a new one.", `
      <form class="auth-form" id="forgot-form" novalidate>
        <div id="forgot-alert" class="auth-alert" style="display:none" role="alert"></div>
        <div class="form-group">
          <label for="forgot-email" class="form-label">Email</label>
          <input type="email" id="forgot-email" class="form-input" required autocomplete="email" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="forgot-btn"><span>Send reset link</span></button>
      </form>
      <div id="forgot-done" class="notice notice--ok" hidden></div>
      <div class="auth-footer"><p><a href="/auth/login" class="auth-link">Back to sign in</a></p></div>`);
  },
  afterRender() {
    this._c = initNavbar();
    const form = document.getElementById('forgot-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      const alertBox = document.getElementById('forgot-alert');
      alertBox.style.display = 'none';
      if (!email) return show(alertBox, 'Please enter your email.');
      const btn = document.getElementById('forgot-btn');
      btn.disabled = true;
      try {
        const res = await authApi.forgotPassword(email);
        form.hidden = true;
        const done = document.getElementById('forgot-done');
        done.hidden = false;
        done.innerHTML = `${icon('mail', { size: 20 })}<div><strong>Check your inbox</strong><p>${esc(res.message)}</p>
          ${res.dev_reset_link ? `<p class="notice-dev">Demo mode (no mail server): <a href="${esc(res.dev_reset_link)}">open the reset link</a></p>` : ''}</div>`;
      } catch (err) {
        show(alertBox, err.message);
        btn.disabled = false;
      }
    });
  },
  destroy() { this._c?.(); },
};

export const ResetPassword = {
  _c: null,
  render() {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) {
      return card('This link is incomplete', '', `<div class="auth-footer"><p><a href="/auth/forgot" class="auth-link">Request a new reset link</a></p></div>`);
    }
    return card('Choose a new password', 'At least 8 characters, with a letter and a number.', `
      <form class="auth-form" id="reset-form" novalidate>
        <div id="reset-alert" class="auth-alert" style="display:none" role="alert"></div>
        <div class="form-group">
          <label for="reset-pw" class="form-label">New password</label>
          <input type="password" id="reset-pw" class="form-input" required autocomplete="new-password" minlength="8" />
        </div>
        <div class="form-group">
          <label for="reset-pw2" class="form-label">Confirm new password</label>
          <input type="password" id="reset-pw2" class="form-input" required autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="reset-btn"><span>Update password</span></button>
      </form>`);
  },
  afterRender() {
    this._c = initNavbar();
    const form = document.getElementById('reset-form');
    if (!form) return;
    const token = new URLSearchParams(location.search).get('token');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = document.getElementById('reset-alert');
      a.style.display = 'none';
      const pw = document.getElementById('reset-pw').value;
      if (pw !== document.getElementById('reset-pw2').value) return show(a, 'The two passwords do not match.');
      const btn = document.getElementById('reset-btn');
      btn.disabled = true;
      try {
        await authApi.resetPassword(token, pw);
        Toast.success('Password updated. Please sign in.');
        router.navigate('/auth/login');
      } catch (err) {
        show(a, err.message);
        btn.disabled = false;
      }
    });
  },
  destroy() { this._c?.(); },
};

export const VerifyEmail = {
  _c: null,
  render() {
    return card('Confirming your email…', '', `<div id="verify-state" class="verify-state" role="status" aria-live="polite"><div class="loading-spinner"></div></div>`);
  },
  async afterRender() {
    this._c = initNavbar();
    const box = document.getElementById('verify-state');
    const token = new URLSearchParams(location.search).get('token');
    const next = '<p><a class="btn btn-primary" href="/">Continue</a></p>';
    if (!token) { box.innerHTML = `<p>This link is incomplete.</p>${next}`; return; }
    try {
      await authApi.verifyEmail(token);
      box.innerHTML = `<span class="verify-icon verify-icon--ok">${icon('check-circle', { size: 40 })}</span><h2>Email confirmed</h2><p>Thank you. You're all set.</p>${next}`;
      document.querySelector('.auth-title').textContent = 'All done';
      if (authApi && localStorage) { try { await authApi.getMe(); } catch (e) { /* signed out */ } }
    } catch (err) {
      box.innerHTML = `<span class="verify-icon verify-icon--bad">${icon('alert', { size: 40 })}</span><h2>We couldn't confirm that link</h2><p>${esc(err.message)}</p>${next}`;
    }
  },
  destroy() { this._c?.(); },
};
