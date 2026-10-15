import { apiClient } from './client.js';

export const chatApi = {
  createSession(title = 'New Reflection') {
    return apiClient.post('/api/chat/sessions', { title });
  },

  listSessions() {
    return apiClient.get('/api/chat/sessions');
  },

  getMessages(sessionId) {
    return apiClient.get(`/api/chat/sessions/${sessionId}/messages`);
  },

  sendMessage(sessionId, content) {
    return apiClient.post(`/api/chat/sessions/${sessionId}/messages`, { content });
  },

  deleteSession(sessionId) {
    return apiClient.delete(`/api/chat/sessions/${sessionId}`);
  }
};
