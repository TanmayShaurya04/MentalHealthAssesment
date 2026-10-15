/**
 * api/client.js — Serenova API Client
 *
 * Base fetch wrapper. All API modules use this.
 * Handles:
 *   - Base URL from environment variable (VITE_API_BASE_URL)
 *   - Authorization header injection (from store)
 *   - JSON serialisation / deserialisation
 *   - Consistent error shape
 *   - HTTP status → error mapping
 */

import { store } from '../store.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * @typedef {Object} ApiError
 * @property {number} status
 * @property {string} message
 * @property {Object} [detail]
 */

class ApiError extends Error {
  constructor(status, message, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Core fetch wrapper.
 * @param {string} path — API path, e.g. '/api/auth/login'
 * @param {RequestInit} options
 * @returns {Promise<any>} parsed JSON response
 * @throws {ApiError}
 */
async function request(path, options = {}) {
  const token = store.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new ApiError(0, 'Network error. Please check your connection.');
  }

  // No content (e.g. 204)
  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      (typeof data === 'string' ? data : `Request failed (${response.status})`);

    // 401 → clear auth state
    if (response.status === 401) {
      store.logout();
    }

    throw new ApiError(response.status, message, data);
  }

  return data;
}

// ── Convenience methods ────────────────────────────────────────

export const apiClient = {
  get(path, params) {
    const url = params
      ? `${path}?${new URLSearchParams(params)}`
      : path;
    return request(url, { method: 'GET' });
  },

  post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch(path, body) {
    return request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  put(path, body) {
    return request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(path) {
    return request(path, { method: 'DELETE' });
  },

  ApiError,
};
