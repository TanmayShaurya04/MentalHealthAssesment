import { authApi } from '../api/auth.js';
import { store } from '../store.js';
import { Toast } from '../components/Toast.js';
import { navigate } from '../navigation.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Profile = {
  _cleanupNavbar: null,

  render() {
    const user = store.getUser() || { name: '', email: '', profile: {} };

    return `
      ${Navbar.render()}

      <main class="profile-page page-root" id="main-content">
        <div class="container container--narrow profile-container">

          <header class="page-header">
            <span class="section-eyebrow">Account Settings</span>
            <h1 class="page-title">Student Profile</h1>
            <p class="page-subtitle">Manage your personal university details and privacy preferences.</p>
          </header>

          <div class="card profile-card mt-6">
            <form id="profile-form" class="profile-form">
              
              <div class="profile-avatar-row">
                <div class="profile-avatar-large" id="avatar-preview">
                  ${(user.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 class="profile-name-display" id="profile-name-text">${user.name || 'Student'}</h3>
                  <span class="profile-email-display">${user.email}</span>
                </div>
              </div>

              <div class="form-group mt-6">
                <label for="prof-name" class="form-label">Full Name</label>
                <input
                  type="text"
                  id="prof-name"
                  class="form-input"
                  value="${user.name || ''}"
                  required
                />
              </div>

              <div class="form-row-2 mt-4">
                <div class="form-group">
                  <label for="prof-univ" class="form-label">University / College</label>
                  <input
                    type="text"
                    id="prof-univ"
                    class="form-input"
                    value="${user.profile?.university || ''}"
                  />
                </div>
                <div class="form-group">
                  <label for="prof-year" class="form-label">Year of Study</label>
                  <select id="prof-year" class="form-select">
                    <option value="1st Year" ${user.profile?.year_of_study === '1st Year' ? 'selected' : ''}>1st Year (Freshman)</option>
                    <option value="2nd Year" ${user.profile?.year_of_study === '2nd Year' ? 'selected' : ''}>2nd Year (Sophomore)</option>
                    <option value="3rd Year" ${user.profile?.year_of_study === '3rd Year' ? 'selected' : ''}>3rd Year (Junior)</option>
                    <option value="4th Year" ${user.profile?.year_of_study === '4th Year' ? 'selected' : ''}>4th Year (Senior)</option>
                    <option value="Postgraduate" ${user.profile?.year_of_study === 'Postgraduate' ? 'selected' : ''}>Postgraduate / Masters</option>
                    <option value="Ph.D." ${user.profile?.year_of_study === 'Ph.D.' ? 'selected' : ''}>Ph.D. / Research</option>
                  </select>
                </div>
              </div>

              <div class="profile-actions-row mt-6">
                <button type="submit" class="btn btn-primary" id="save-profile-btn">
                  Save Changes
                </button>
                <button type="button" class="btn btn-secondary" id="prof-logout-btn">
                  Sign out
                </button>
              </div>
            </form>
          </div>

          <!-- Privacy Notice Card -->
          <div class="card profile-privacy-card mt-6">
            <h4>Data Security & Privacy Promise</h4>
            <p class="text-xs text-ink-70 mt-2 leading-relaxed">
              Your journal entries, mood records, and self-assessment scores are strictly isolated to your account.
              No academic institution, administrator, or outside advertiser has access to your personal reflections.
            </p>
          </div>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    const form = document.getElementById('profile-form');
    const nameInput = document.getElementById('prof-name');
    const univInput = document.getElementById('prof-univ');
    const yearSelect = document.getElementById('prof-year');
    const saveBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('prof-logout-btn');

    // Fetch fresh user data
    try {
      const user = await authApi.getMe();
      if (nameInput) nameInput.value = user.name || '';
      if (univInput) univInput.value = user.profile?.university || '';
      if (yearSelect && user.profile?.year_of_study) yearSelect.value = user.profile.year_of_study;
    } catch (e) { /* ignore */ }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        await authApi.updateProfile({
          name: nameInput.value.trim(),
          university: univInput.value.trim(),
          year_of_study: yearSelect.value
        });
        Toast.success('Profile updated.');
        document.getElementById('profile-name-text').textContent = nameInput.value.trim();
        document.getElementById('avatar-preview').textContent = nameInput.value.trim().charAt(0).toUpperCase();
      } catch (err) {
        Toast.error(err.message || 'Failed to update profile.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });

    logoutBtn?.addEventListener('click', async () => {
      await authApi.logout();
      Toast.info('You have been signed out.');
      navigate('/');
    });
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
