/**
 * router.js — Serenova SPA Router
 *
 * Full client-side history router with protected route guards and dynamic page lifecycles.
 */

import { store } from './store.js';
import { Landing } from './pages/Landing.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { Dashboard } from './pages/Dashboard.js';
import { MoodTracker } from './pages/MoodTracker.js';
import { Journal } from './pages/Journal.js';
import { JournalEntry } from './pages/JournalEntry.js';
import { Assessment } from './pages/Assessment.js';
import { AssessmentResults } from './pages/AssessmentResults.js';
import { Chat } from './pages/Chat.js';
import { Counsellors } from './pages/Counsellors.js';
import { Resources } from './pages/Resources.js';
import { Profile } from './pages/Profile.js';

const ROUTES = [
  { path: '/',                   page: Landing,           requiresAuth: false },
  { path: '/auth/login',         page: Login,             guestOnly: true },
  { path: '/auth/register',      page: Register,          guestOnly: true },
  { path: '/dashboard',          page: Dashboard,         requiresAuth: true },
  { path: '/mood',               page: MoodTracker,       requiresAuth: true },
  { path: '/journal',            page: Journal,           requiresAuth: true },
  { path: '/journal/:id',        page: JournalEntry,      requiresAuth: true },
  { path: '/assessment',         page: Assessment,        requiresAuth: true },
  { path: '/assessment/results', page: AssessmentResults, requiresAuth: true },
  { path: '/chat',               page: Chat,              requiresAuth: true },
  { path: '/counsellors',        page: Counsellors,       requiresAuth: false },
  { path: '/appointments',       page: Counsellors,       requiresAuth: true },
  { path: '/resources',          page: Resources,         requiresAuth: false },
  { path: '/profile',            page: Profile,           requiresAuth: true },
];

class Router {
  constructor() {
    this.currentPage = null;
    this.appEl = null;
  }

  init() {
    this.appEl = document.getElementById('app');
    if (!this.appEl) {
      console.error('[Router] #app element not found.');
      return;
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => this.navigate(location.pathname, false));

    // Intercept clicks on local <a> tags
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore external or hash-only links
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) return;

      e.preventDefault();
      this.navigate(href);
    });

    // Initial render
    this.navigate(location.pathname, false);
  }

  navigate(path, pushState = true) {
    const isAuth = store.isAuthenticated();

    // Match route
    let matched = this.match(path) || this.match('/');
    let targetRoute = matched;

    // 1. Auth Guard: Requires Auth
    if (targetRoute.requiresAuth && !isAuth) {
      this.navigate('/auth/login', pushState);
      return;
    }

    // 2. Guest Guard: Redirect logged-in users away from login/register to dashboard
    if (targetRoute.guestOnly && isAuth) {
      this.navigate('/dashboard', pushState);
      return;
    }

    // Tear down previous page
    if (this.currentPage?.destroy) {
      try { this.currentPage.destroy(); } catch (e) { /* ignore */ }
    }

    const page = targetRoute.page;

    // Render HTML
    const html = page.render(targetRoute.params || {});
    this.appEl.innerHTML = html;

    // Update history
    if (pushState) {
      history.pushState({}, '', path);
    }

    // Reset scroll
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Execute lifecycle hooks
    this.currentPage = page;
    if (page.afterRender) {
      page.afterRender(targetRoute.params || {});
    }
  }

  match(path) {
    for (const route of ROUTES) {
      if (route.path === path) return { ...route, params: {} };

      // Parameterized routes (e.g. /journal/:id)
      const routeParts = route.path.split('/');
      const pathParts  = path.split('/');
      if (routeParts.length !== pathParts.length) continue;

      const params = {};
      let matched = true;
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          matched = false;
          break;
        }
      }
      if (matched) return { ...route, params };
    }
    return null;
  }
}

export const router = new Router();
