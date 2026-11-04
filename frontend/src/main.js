/**
 * main.js — Serenova SPA entry point
 *
 * Imports global styles, initialises the router and session.
 * The #app div in index.html is the mount point.
 */

import './styles/global.css';
import './styles/components.css';
import './styles/app.css';
import './styles/polish.css';

import { router } from './router.js';
import { store } from './store.js';
import { authApi } from './api/auth.js';

// Expose on window for easy client-side routing & inspection
window.router = router;
window.store = store;

// Pre-fetch profile if session token exists
if (store.isAuthenticated()) {
  authApi.getMe().catch(() => {
    // If token invalid, store.logout() will be triggered automatically
  });
}

// Mount the SPA
router.init();
