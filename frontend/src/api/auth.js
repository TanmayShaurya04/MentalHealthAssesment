import { apiClient } from './client.js';
import { store } from '../store.js';

export const authApi = {
  async register(data) {
    const res = await apiClient.post('/api/auth/register', data);
    store.setUser(res.user);
    return res;
  },

  async login(credentials) {
    const res = await apiClient.post('/api/auth/login', credentials);
    store.setUser(res.user);
    return res;
  },

  async logout() {
    try { await apiClient.post('/api/auth/logout', {}); } catch (e) { /* ignore */ }
    store.logout();
  },

  /** Called once at start-up: if the session cookie is still valid, restore the signed-in user. */
  async restore() {
    try {
      const user = await apiClient.get('/api/users/me');
      store.setUser(user);
    } catch (e) {
      store.logout();
    }
  },

  async getMe() {
    const user = await apiClient.get('/api/users/me');
    store.setUser(user);
    return user;
  },

  async updateProfile(profileData) {
    const user = await apiClient.patch('/api/users/me', profileData);
    store.setUser(user);
    return user;
  },

  forgotPassword(email) { return apiClient.post('/api/auth/forgot-password', { email }); },
  resetPassword(token, new_password) { return apiClient.post('/api/auth/reset-password', { token, new_password }); },
  verifyEmail(token) { return apiClient.post('/api/auth/verify-email', { token }); },
  resendVerification() { return apiClient.post('/api/auth/resend-verification', {}); },

  changePassword(current_password, new_password) {
    return apiClient.post('/api/users/me/change-password', { current_password, new_password });
  },
  async recordConsent(version) {
    await apiClient.post('/api/users/me/consent', { version });
    return this.getMe();
  },
  exportData() { return apiClient.get('/api/users/me/export'); },
  async deleteAccount(password) {
    const res = await apiClient.request('/api/users/me', { method: 'DELETE', body: JSON.stringify({ password }) });
    store.logout();
    return res;
  },
  getConfig() { return apiClient.get('/api/config'); },
};
