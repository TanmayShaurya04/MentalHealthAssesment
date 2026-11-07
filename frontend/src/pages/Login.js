import { authApi } from '../api/auth.js';
import { navigate } from '../navigation.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Login = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="auth-page page-root" id="main-content">
        <div class="container auth-container">
          <div class="auth-card">
            
            <div class="auth-header">
              <span class="auth-eyebrow">Welcome back</span>
              <h1 class="auth-title">Sign in to your private space</h1>
              <p class="auth-subtitle">Your reflections and records are confidential and secure.</p>
            </div>

            <!-- Demo Account Helper Banner -->
            <div class="demo-credentials-banner" style="background: rgba(198, 93, 58, 0.08); border: 1px solid rgba(198, 93, 58, 0.28); border-radius: 12px; padding: 14px 18px; margin-bottom: 22px; font-size: 0.88rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <strong style="color: var(--color-ink); display: flex; align-items: center; gap: 6px;">
                  <span>🔑</span> Ready-to-Use Demo Account
                </strong>
                <button type="button" id="btn-fill-demo" style="background: var(--color-accent); color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: transform 0.15s ease;">
                  ⚡ 1-Click Demo Sign-In
                </button>
              </div>
              <p style="margin: 0; color: var(--color-ink-80); font-size: 0.82rem; line-height: 1.5;">
                Email: <code style="background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-weight: 600;">student@university.edu</code> &nbsp;•&nbsp; 
                Password: <code style="background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-weight: 600;">password123</code>
              </p>
            </div>

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
                  <label for="login-password" class="form-label">Password</label>
                  <button type="button" class="btn-toggle-pwd" id="toggle-pwd-btn">Show</button>
                </div>
                <input
                  type="password"
                  id="login-password"
                  class="form-input"
                  placeholder="••••••••••••"
                  required
                  autocomplete="current-password"
                />
              </div>

              <button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="login-submit-btn">
                <span>Sign in</span>
              </button>
            </form>

            <div class="auth-footer">
              <p>Don't have an account yet? <a href="/auth/register" class="auth-link">Create one here</a></p>
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
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
    });

    // 1-Click Demo Login: autofill & immediately submit
    document.getElementById('btn-fill-demo')?.addEventListener('click', () => {
      if (emailInput && pwdInput) {
        emailInput.value = 'student@university.edu';
        pwdInput.value = 'password123';
        pwdInput.type = 'password';
        if (toggleBtn) toggleBtn.textContent = 'Show';
        form?.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

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
        await authApi.login({ email, password });
        Toast.success('Welcome back to Serenova.');
        navigate('/dashboard');
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
