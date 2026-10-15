import { apiClient } from './client.js';
import { store } from '../store.js';

export const authApi = {
  async register(data) {
    const res = await apiClient.post('/api/auth/register', data);
    if (res.access_token) {
      store.setToken(res.access_token);
      store.setUser(res.user);
    }
    return res;
  },

  async login(credentials) {
    const res = await apiClient.post('/api/auth/login', credentials);
    if (res.access_token) {
      store.setToken(res.access_token);
      store.setUser(res.user);
    }
    return res;
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (e) {
      // ignore
    } finally {
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
  }
};
