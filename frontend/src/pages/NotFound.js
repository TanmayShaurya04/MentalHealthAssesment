import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { icon } from '../components/icons.js';
import { store } from '../store.js';

export const NotFound = {
  _c: null,
  render() {
    const home = store.isAuthenticated() ? '/dashboard' : '/';
    return `
      ${Navbar.render()}
      <main class="page-root notfound" id="main-content">
        <div class="container notfound-inner">
          <span class="notfound-icon">${icon('compass', { size: 44 })}</span>
          <p class="auth-eyebrow">Error 404</p>
          <h1 class="notfound-title">We couldn't find that page</h1>
          <p class="notfound-text">The link may be old or mistyped. Nothing is wrong with your account or your data.</p>
          <div class="notfound-actions">
            <a class="btn btn-primary" href="${home}">Back to ${store.isAuthenticated() ? 'dashboard' : 'home'}</a>
            <a class="btn btn-secondary" href="/resources">Browse resources</a>
          </div>
        </div>
      </main>
      ${Footer.render()}`;
  },
  afterRender() { this._c = initNavbar(); },
  destroy() { this._c?.(); },
};
