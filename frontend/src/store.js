/**
 * store.js — Serenova minimal global state
 *
 * Sign-in is carried by an httpOnly cookie that the server sets. JavaScript on the page can never
 * read it, so a script injected into the page can't steal the session. This store only remembers the
 * signed-in user's public profile (name, role) so the interface can render; it holds no secret.
 */

const USER_KEY = 'serenova_user';

function createStore() {
  let user = null;
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(USER_KEY) : null;
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    user = null;
  }

  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn({ user }));

  return {
    setUser(next) {
      user = next;
      try {
        if (next) sessionStorage.setItem(USER_KEY, JSON.stringify(next));
        else sessionStorage.removeItem(USER_KEY);
      } catch (e) { /* storage unavailable: the cookie still works */ }
      notify();
    },

    getUser() { return user; },
    isAuthenticated() { return !!user; },
    getRole() { return user?.role || 'student'; },
    logout() { this.setUser(null); },

    subscribe(fn) {
      listeners.add(fn);
      fn({ user });
      return () => listeners.delete(fn);
    },
  };
}

export const store = createStore();
