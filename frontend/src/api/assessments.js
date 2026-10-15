import { apiClient } from './client.js';

export const assessmentsApi = {
  getQuestions() {
    return apiClient.get('/api/assessments/questions');
  },

  submitAssessment(answers) {
    return apiClient.post('/api/assessments', { answers });
  },

  listAssessments(limit = 10) {
    return apiClient.get('/api/assessments', { limit });
  },

  getLatestAssessment() {
    return apiClient.get('/api/assessments/latest');
  }
};
