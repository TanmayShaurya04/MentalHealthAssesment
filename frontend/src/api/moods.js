import { apiClient } from './client.js';

export const moodsApi = {
  logMood(data) {
    return apiClient.post('/api/moods', data);
  },

  listMoods(limit = 30) {
    return apiClient.get('/api/moods', { limit });
  },

  getLatestMood() {
    return apiClient.get('/api/moods/latest');
  },

  getStats() {
    return apiClient.get('/api/moods/stats');
  },

  deleteMood(id) {
    return apiClient.delete(`/api/moods/${id}`);
  }
};
