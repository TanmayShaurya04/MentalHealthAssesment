import { authApi } from '../api/auth.js';
import { router } from '../router.js';
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
        router.navigate('/dashboard');
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
