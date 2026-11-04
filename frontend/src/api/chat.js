import { apiClient } from './client.js';

export const chatApi = {
  createSession(title = 'New Conversation') {
    return apiClient.post('/api/chat/sessions', { title });
  },

  listSessions(topic) {
    return apiClient.get('/api/chat/sessions', topic ? { topic } : undefined);
  },

  listTopics() {
    return apiClient.get('/api/chat/topics');
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
