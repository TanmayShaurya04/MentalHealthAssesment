import { apiClient } from './client.js';

export const counsellorsApi = {
  listCounsellors(filters = {}) {
    return apiClient.get('/api/counsellors', filters);
  },

  bookedSlots(id) {
    return apiClient.get(`/api/counsellors/${id}/booked`);
  },

  getCounsellor(id) {
    return apiClient.get(`/api/counsellors/${id}`);
  }
};
