/**
 * main.js — Serenova SPA entry point
 */

import './styles/global.css';
import './styles/components.css';
import './styles/app.css';
import './styles/polish.css';
import './styles/platform.css';

import { router } from './router.js';
import { store } from './store.js';
import { authApi } from './api/auth.js';
import { apiClient } from './api/client.js';
import { initAnimations } from './utils/animations.js';
import { setLang } from './i18n/index.js';

window.router = router;
window.store = store;

// Show browser crashes in the server log, so problems after launch don't go unnoticed
function report(message) {
  try {
    fetch('/api/client-errors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ page: location.pathname, message: String(message).slice(0, 300) }),
    });
  } catch (e) { /* never let reporting break the app */ }
}
window.addEventListener('error', (e) => report(e.message));
window.addEventListener('unhandledrejection', (e) => report(e.reason?.message || e.reason));

// Photo frames: show the gradient instead of a broken image, and fade photos in when ready
document.addEventListener('error', (e) => { if (e.target?.matches?.('.photo img')) e.target.remove(); }, true);
document.addEventListener('load', (e) => { if (e.target?.matches?.('.photo img')) e.target.classList.add('is-loaded'); }, true);

async function start() {
  // The session lives in an httpOnly cookie: ask the server whether it is still valid
  await authApi.restore();
  const lang = store.getUser()?.profile?.language;
  if (lang) setLang(lang);
  router.init();
}
start();

// Installable app + offline shell
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
