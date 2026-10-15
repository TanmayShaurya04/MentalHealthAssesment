import { apiClient } from './client.js';

export const journalsApi = {
  createJournal(data) {
    return apiClient.post('/api/journals', data);
  },

  listJournals(params = {}) {
    return apiClient.get('/api/journals', params);
  },

  getJournal(id) {
    return apiClient.get(`/api/journals/${id}`);
  },

  updateJournal(id, data) {
    return apiClient.patch(`/api/journals/${id}`, data);
  },

  deleteJournal(id) {
    return apiClient.delete(`/api/journals/${id}`);
  }
};
