import { apiClient } from './client.js';

export const resourcesApi = {
  listResources(category = null) {
    const params = category ? { category } : null;
    return apiClient.get('/api/resources', params);
  },

  getResource(id) {
    return apiClient.get(`/api/resources/${id}`);
  }
};
