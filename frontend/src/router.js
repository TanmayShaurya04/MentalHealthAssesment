/**
 * router.js — Serenova SPA Router
 *
 * Full client-side history router with protected route guards and dynamic page lifecycles.
 */

import { store } from './store.js';
import { initAnimations } from './utils/animations.js';
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
import { NotFound } from './pages/NotFound.js';
import { Privacy, Terms } from './pages/Legal.js';
import { About } from './pages/About.js';
import { ForgotPassword, ResetPassword, VerifyEmail } from './pages/AccountLinks.js';
import { Settings } from './pages/Settings.js';
import { CounsellorPortal } from './pages/CounsellorPortal.js';
import { AdminInsights } from './pages/AdminInsights.js';
import { ConsentModal, CONSENT_VERSION } from './components/ConsentModal.js';

const SITE = 'Serenova';
const STUDENT = ['student'];

// title: shown in the browser tab and announced to screen readers on navigation
const ROUTES = [
  { path: '/',                   page: Landing,           title: 'Student Well-Being',  requiresAuth: false },
  { path: '/login',              page: Login,             title: 'Sign in',             guestOnly: true },
  { path: '/auth/login',         page: Login,             title: 'Sign in',             guestOnly: true },
  { path: '/register',           page: Register,          title: 'Create your account', guestOnly: true },
  { path: '/auth/register',      page: Register,          title: 'Create your account', guestOnly: true },
  { path: '/auth/forgot',        page: ForgotPassword,    title: 'Forgot password' },
  { path: '/auth/reset',         page: ResetPassword,     title: 'Choose a new password' },
  { path: '/auth/verify',        page: VerifyEmail,       title: 'Confirm your email' },
  { path: '/dashboard',          page: Dashboard,         title: 'Dashboard',           requiresAuth: true, roles: STUDENT },
  { path: '/mood',               page: MoodTracker,       title: 'Mood Tracker',        requiresAuth: true, roles: STUDENT },
  { path: '/journal',            page: Journal,           title: 'Private Journal',     requiresAuth: true, roles: STUDENT },
  { path: '/journal/:id',        page: JournalEntry,      title: 'Journal entry',       requiresAuth: true, roles: STUDENT },
  { path: '/assessment',         page: Assessment,        title: 'Well-Being Screening', requiresAuth: true, roles: STUDENT },
  { path: '/assessment/results', page: AssessmentResults, title: 'Your results',        requiresAuth: true, roles: STUDENT },
  { path: '/chat',               page: Chat,              title: 'AI Companion',        requiresAuth: true, roles: STUDENT },
  { path: '/counsellors',        page: Counsellors,       title: 'Counsellors',         requiresAuth: false },
  { path: '/appointments',       page: Counsellors,       title: 'My appointments',     requiresAuth: true, roles: STUDENT },
  { path: '/resources',          page: Resources,         title: 'Resources',           requiresAuth: false },
  { path: '/profile',            page: Profile,           title: 'My profile',          requiresAuth: true },
  { path: '/settings',           page: Settings,          title: 'Settings',            requiresAuth: true },
  { path: '/counsellor',         page: CounsellorPortal,  title: 'Counsellor portal',   requiresAuth: true, roles: ['counsellor'] },
  { path: '/admin',              page: AdminInsights,     title: 'Insights',            requiresAuth: true, roles: ['admin'] },
  { path: '/privacy',            page: Privacy,           title: 'Privacy Policy' },
  { path: '/terms',              page: Terms,             title: 'Terms of Use' },
  { path: '/about',              page: About,             title: 'About' },
];

const NOT_FOUND = { path: '*', page: NotFound, title: 'Page not found' };

/** Where each role lands after signing in */
export function homeFor(user) {
  return user?.role === 'counsellor' ? '/counsellor' : user?.role === 'admin' ? '/admin' : '/dashboard';
}

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

  navigate(path, pushState = true, replace = false) {
    const isAuth = store.isAuthenticated();

    // Match route (unknown addresses get a proper 404 page instead of silently showing the home page)
    const [pathOnly] = path.split(/[?#]/);
    let targetRoute = this.match(pathOnly) || { ...NOT_FOUND, params: {} };
    const user = store.getUser();

    // 1. Auth Guard: Requires Auth
    if (targetRoute.requiresAuth && !isAuth) {
      this.navigate('/auth/login', pushState, !pushState);
      return;
    }

    // 2. Guest Guard: Redirect logged-in users away from login/register to dashboard
    if (targetRoute.guestOnly && isAuth) {
      this.navigate(homeFor(user), pushState, !pushState);
      return;
    }

    // 3. Role guard: counsellors and admins have their own area; students can't open it (and vice versa)
    if (targetRoute.roles && isAuth && !targetRoute.roles.includes(user?.role || 'student')) {
      this.navigate(homeFor(user), pushState, !pushState);
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
    } else if (replace) {
      history.replaceState({}, '', path);   // redirected on first load: fix the address bar too
    }

    // Per-page title, then reset scroll and move keyboard focus to the new page (helps screen-reader users)
    document.title = targetRoute.path === '/' ? `${SITE} — ${targetRoute.title}` : `${targetRoute.title} · ${SITE}`;
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Execute lifecycle hooks
    this.currentPage = page;
    if (page.afterRender) {
      page.afterRender(targetRoute.params || {});
    }

    // Shared entrance / scroll-reveal animations
    initAnimations(this.appEl);
    const main = this.appEl.querySelector('main, #main-content');
    if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }

    // First visit after sign-up: ask for consent before using anything that stores personal reflections
    if (targetRoute.requiresAuth && user?.role === 'student' && user.consent?.version !== CONSENT_VERSION) {
      ConsentModal.open();
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
