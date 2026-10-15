/**
 * store.js — Serenova minimal global state
 *
 * v1 Architecture Note (Phase 2 Decision):
 *   JWT is stored in sessionStorage. This is a deliberate v1 choice:
 *   - Safer than localStorage (cleared on tab close, not accessible to other tabs)
 *   - Auth logic is isolated here so the storage strategy can be changed later
 *     without touching any other module.
 */

const TOKEN_KEY = 'serenova_token';
const USER_KEY = 'serenova_user';

function createStore() {
  const initialToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
  let initialUser = null;
  try {
    const rawUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(USER_KEY) : null;
    if (rawUser) initialUser = JSON.parse(rawUser);
  } catch (e) {
    initialUser = null;
  }

  let state = {
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!initialToken,
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn({ ...state }));
  }

  return {
    // ── Auth (v1: sessionStorage) ─────────────────────────────
    setToken(token) {
      state.token = token;
      state.isAuthenticated = !!token;
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        state.user = null;
      }
      notify();
    },

    getToken() {
      return state.token;
    },

    setUser(user) {
      state.user = user;
      state.isAuthenticated = !!state.token;
      if (user) {
        try { sessionStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) {}
      } else {
        sessionStorage.removeItem(USER_KEY);
      }
      notify();
    },

    getUser() {
      return state.user;
    },

    isAuthenticated() {
      return !!(state.token);
    },

    logout() {
      this.setToken(null);
    },

    // ── Subscriptions ─────────────────────────────────────────
    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },

    // ── Read snapshot ─────────────────────────────────────────
    getState() {
      return { ...state };
    },
  };
}

export const store = createStore();
