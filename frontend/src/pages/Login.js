import { authApi } from '../api/auth.js';
import { router, homeFor } from '../router.js';
import { t } from '../i18n/index.js';
import { icon } from '../components/icons.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { photo } from '../assets/images.js';

export const Login = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="auth-page page-root" id="main-content">
        <div class="container auth-container auth-container--split">
          <aside class="auth-photo" aria-hidden="true">
            ${photo('walk', { w: 900, eager: true })}
            <div class="auth-photo-caption">
              <p>Your space to pause, write and be heard.</p>
            </div>
          </aside>
          <div class="auth-card">
            
            <div class="auth-header">
              <span class="auth-eyebrow">${t('auth.welcomeBack')}</span>
              <h1 class="auth-title">${t('auth.signInTitle')}</h1>
              <p class="auth-subtitle">${t('auth.signInSub')}</p>
            </div>

            <!-- Filled in only when the server runs in demo mode (see /api/config) -->
            <div id="demo-slot"></div>

            <form class="auth-form" id="login-form" novalidate>
              <div id="auth-error-alert" class="auth-alert" style="display:none;" role="alert"></div>

              <div class="form-group">
                <label for="login-email" class="form-label">University / Personal Email</label>
                <input
                  type="email"
                  id="login-email"
                  class="form-input"
                  placeholder="name@university.edu"
                  required
                  autocomplete="email"
                />
              </div>

              <div class="form-group">
                <div class="form-label-row">
                  <label for="login-password" class="form-label">${t('auth.password')}</label>
                  <button type="button" class="btn-toggle-pwd" id="toggle-pwd-btn" aria-controls="login-password">${t('auth.show')}</button>
                </div>
                <input
                  type="password"
                  id="login-password"
                  class="form-input"
                  placeholder="Your password"
                  required
                  autocomplete="current-password"
                />
              </div>

              <button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="login-submit-btn">
                <span>${t('auth.signInBtn')}</span>
              </button>
              <p class="auth-forgot"><a href="/auth/forgot" class="auth-link">${t('auth.forgot')}</a></p>
            </form>

            <div class="auth-footer">
              <p>${t('auth.noAccount')} <a href="/auth/register" class="auth-link">${t('auth.createAccount')}</a></p>
              <p class="auth-disclaimer">
                Serenova is a non-diagnostic well-being support platform.
              </p>
            </div>

          </div>
        </div>
      </main>

      ${Footer.render()}
    `;
  },

  afterRender() {
    this._cleanupNavbar = initNavbar();

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const pwdInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('toggle-pwd-btn');
    const submitBtn = document.getElementById('login-submit-btn');
    const alertBox = document.getElementById('auth-error-alert');

    // Toggle password visibility
    toggleBtn?.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? t('auth.hide') : t('auth.show');
    });

    // Demo helper: only when the server says it is running in demo mode
    authApi.getConfig().then((cfg) => {
      if (!cfg.demo_mode) return;
      const slot = document.getElementById('demo-slot');
      if (!slot) return;
      slot.innerHTML = `
        <div class="demo-banner">
          <div class="demo-banner-head"><strong>${icon('key', { size: 16 })} Demo mode</strong>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-fill-demo">Use demo student</button></div>
          <p>This is a test environment with sample data. Student: <code>student@university.edu</code>.
          Counsellor and admin demo logins use the same password.</p>
        </div>`;
      document.getElementById('btn-fill-demo').addEventListener('click', () => {
        emailInput.value = 'student@university.edu';
        pwdInput.value = cfg.demo_password || '';
      });
    }).catch(() => {});

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      const email = emailInput.value.trim();
      const password = pwdInput.value;

      if (!email || !password) {
        alertBox.textContent = 'Please provide both your email and password.';
        alertBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Signing in...</span>';

      try {
        const res = await authApi.login({ email, password });
        Toast.success('Welcome back to Serenova.');
        router.navigate(homeFor(res.user));
      } catch (err) {
        alertBox.textContent = err.message || 'Incorrect email or password.';
        alertBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign in</span>';
      }
    });
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
