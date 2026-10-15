import { apiClient } from './client.js';

export const appointmentsApi = {
  bookAppointment(data) {
    return apiClient.post('/api/appointments', data);
  },

  listAppointments() {
    return apiClient.get('/api/appointments');
  },

  getAppointment(id) {
    return apiClient.get(`/api/appointments/${id}`);
  },

  cancelAppointment(id) {
    return apiClient.patch(`/api/appointments/${id}/cancel`, {});
  },

  updateStatus(id, status) {
    return apiClient.patch(`/api/appointments/${id}/status`, { status });
  }
};
