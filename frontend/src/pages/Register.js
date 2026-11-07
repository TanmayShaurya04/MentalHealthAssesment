import { authApi } from '../api/auth.js';
import { navigate } from '../navigation.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Register = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="auth-page page-root" id="main-content">
        <div class="container auth-container">
          <div class="auth-card">
            
            <div class="auth-header">
              <span class="auth-eyebrow">Start your journey</span>
              <h1 class="auth-title">Create your student account</h1>
              <p class="auth-subtitle">A calm, private space for your mental health and reflections.</p>
            </div>

            <form class="auth-form" id="register-form" novalidate>
              <div id="register-error-alert" class="auth-alert" style="display:none;" role="alert"></div>

              <div class="form-group">
                <label for="reg-name" class="form-label">Full Name</label>
                <input
                  type="text"
                  id="reg-name"
                  class="form-input"
                  placeholder="e.g. Aarav Sharma"
                  required
                  autocomplete="name"
                />
              </div>

              <div class="form-group">
                <label for="reg-email" class="form-label">Email Address</label>
                <input
                  type="email"
                  id="reg-email"
                  class="form-input"
                  placeholder="name@university.edu"
                  required
                  autocomplete="email"
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label for="reg-university" class="form-label">University / College</label>
                  <input
                    type="text"
                    id="reg-university"
                    class="form-input"
                    placeholder="e.g. Delhi University"
                  />
                </div>
                <div class="form-group">
                  <label for="reg-year" class="form-label">Year of Study</label>
                  <select id="reg-year" class="form-select">
                    <option value="1st Year">1st Year (Freshman)</option>
                    <option value="2nd Year">2nd Year (Sophomore)</option>
                    <option value="3rd Year">3rd Year (Junior)</option>
                    <option value="4th Year">4th Year (Senior)</option>
                    <option value="Postgraduate">Postgraduate / Masters</option>
                    <option value="Ph.D.">Ph.D. / Research</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="reg-password" class="form-label">Password (Minimum 8 characters)</label>
                <input
                  type="password"
                  id="reg-password"
                  class="form-input"
                  placeholder="At least 8 characters"
                  required
                  autocomplete="new-password"
                />
              </div>

              <div class="form-group">
                <label for="reg-confirm-password" class="form-label">Confirm Password</label>
                <input
                  type="password"
                  id="reg-confirm-password"
                  class="form-input"
                  placeholder="Repeat your password"
                  required
                  autocomplete="new-password"
                />
              </div>

              <div class="form-terms">
                <label class="terms-label">
                  <input type="checkbox" id="terms-agree" required />
                  <span>I understand that Serenova is a non-diagnostic well-being support companion, not a medical or psychiatric provider.</span>
                </label>
              </div>

              <button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="reg-submit-btn">
                <span>Create my account</span>
              </button>
            </form>

            <div class="auth-footer">
              <p>Already have an account? <a href="/auth/login" class="auth-link">Sign in</a></p>
            </div>

          </div>
        </div>
      </main>

      ${Footer.render()}
    `;
  },

  afterRender() {
    this._cleanupNavbar = initNavbar();

    const form = document.getElementById('register-form');
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const univInput = document.getElementById('reg-university');
    const yearInput = document.getElementById('reg-year');
    const pwdInput = document.getElementById('reg-password');
    const confirmPwdInput = document.getElementById('reg-confirm-password');
    const termsCheck = document.getElementById('terms-agree');
    const submitBtn = document.getElementById('reg-submit-btn');
    const alertBox = document.getElementById('register-error-alert');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const university = univInput.value.trim();
      const year_of_study = yearInput.value;
      const password = pwdInput.value;
      const confirmPwd = confirmPwdInput.value;

      if (!name || !email || !password) {
        alertBox.textContent = 'Please fill out your name, email, and password.';
        alertBox.style.display = 'block';
        return;
      }

      if (password.length < 8) {
        alertBox.textContent = 'Password must be at least 8 characters long.';
        alertBox.style.display = 'block';
        return;
      }

      if (password !== confirmPwd) {
        alertBox.textContent = 'Passwords do not match.';
        alertBox.style.display = 'block';
        return;
      }

      if (!termsCheck.checked) {
        alertBox.textContent = 'Please confirm the non-diagnostic support agreement checkbox.';
        alertBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating account...</span>';

      try {
        await authApi.register({
          name,
          email,
          password,
          university,
          year_of_study
        });
        Toast.success('Account created successfully! Welcome to Serenova.');
        navigate('/dashboard');
      } catch (err) {
        alertBox.textContent = err.message || 'Registration failed. Email might already be taken.';
        alertBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create my account</span>';
      }
    });
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
