/**
 * Navbar.js — Serenova site navigation
 *
 * Dynamically adapts based on authentication status (store.isAuthenticated()).
 * Provides direct access to:
 *   - Student dashboard, mood, journal, assessment, AI companion, counsellors, resources
 *   - Quick-access verified helpline modal
 *   - Profile & logout
 */

import { store } from '../store.js';
import { authApi } from '../api/auth.js';
import { router, homeFor } from '../router.js';
import { icon } from './icons.js';
import { t, getLang, setLang, LANGS } from '../i18n/index.js';
import { getTheme, toggleTheme } from '../utils/theme.js';
import { apiClient } from '../api/client.js';
import { esc } from '../utils/html.js';

const LOGO_SVG = `
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"
       xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" stroke="#C65D3A" stroke-width="1.5" opacity="0.55"/>
    <circle cx="14" cy="14" r="5"  fill="#C65D3A"/>
  </svg>
`;

/** Links per role: [href, i18n key (desktop), i18n key or label (drawer)] */
function linksFor(user) {
  if (user?.role === 'counsellor') return [['/counsellor', 'nav.myPortal', 'nav.myPortal'], ['/resources', 'nav.resources', 'nav.resources']];
  if (user?.role === 'admin') return [['/admin', 'nav.insights', 'nav.insights'], ['/counsellors', 'nav.counsellors', 'nav.counsellors']];
  return [
    ['/dashboard', 'nav.dashboard', 'nav.dashboard'], ['/mood', 'nav.mood', 'nav.mobile.mood'],
    ['/journal', 'nav.journal', 'nav.mobile.journal'], ['/assessment', 'nav.screening', 'nav.mobile.screening'],
    ['/chat', 'nav.companion', 'nav.mobile.companion'], ['/counsellors', 'nav.counsellors', 'nav.counsellors'],
    ['/resources', 'nav.resources', 'nav.resources'],
  ];
}

function toolButtons() {
  const dark = getTheme() === 'dark';
  const other = LANGS.find((l) => l.code !== getLang()) || LANGS[0];
  return `
    <button class="navbar-icon-btn" type="button" data-action="theme" aria-label="${esc(t('nav.theme'))}" title="${esc(t('nav.theme'))}">
      ${icon(dark ? 'sun' : 'moon', { size: 18 })}
    </button>
    <button class="navbar-icon-btn navbar-lang-btn" type="button" data-action="lang" data-lang="${other.code}" aria-label="${esc(t('nav.language'))}: ${esc(other.label)}" title="${esc(t('nav.language'))}">
      ${icon('globe', { size: 18 })}<span>${esc(other.label)}</span>
    </button>`;
}

export const Navbar = {
  render({ transparent = false } = {}) {
    const isAuth = store.isAuthenticated();
    const user = store.getUser();
    const userName = user?.name ? user.name.split(' ')[0] : 'Student';
    const path = window.location.pathname;
    const active = (href) => {
      const on = href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
      return on ? ' is-active" aria-current="page' : '';
    };
    const links = isAuth ? linksFor(user) : [];
    const home = isAuth ? homeFor(user) : '/';

    return `
      <nav
        class="navbar navbar--${isAuth ? 'auth' : 'guest'}${transparent ? ' navbar--transparent' : ''}"
        aria-label="Main navigation"
        id="site-navbar"
      >
        <div class="container navbar-inner">

          <a href="${home}" class="navbar-logo" aria-label="Serenova — Home">
            <span class="navbar-logo-mark">${LOGO_SVG}</span>
            <span class="navbar-logo-text">Serenova</span>
          </a>

          <div class="navbar-links">
            ${isAuth ? `
              ${links.map(([href, key]) => `<a href="${href}" class="navbar-link${active(href)}">${t(key)}</a>`).join('')}

              <button class="navbar-helpline-btn" id="open-helpline-btn" type="button" title="${esc(t('nav.helplines247'))}">
                <span class="helpline-dot" aria-hidden="true"></span>
                <span>${t('nav.helpline')}</span>
              </button>
              ${toolButtons()}
              <a href="/settings" class="navbar-user-badge" title="${esc(t('nav.settings'))}">
                <span class="user-avatar-circle">${esc(userName.charAt(0).toUpperCase())}</span>
                <span class="user-name-text">${esc(userName)}</span>
              </a>
              <button class="navbar-link btn-logout" id="navbar-logout-btn" type="button">${t('nav.logout')}</button>
            ` : `
              <a href="/#how-it-works" class="navbar-link">${t('nav.howItWorks')}</a>
              <a href="/counsellors" class="navbar-link${active('/counsellors')}">${t('nav.counsellors')}</a>
              <a href="/resources" class="navbar-link${active('/resources')}">${t('nav.resources')}</a>

              <button class="navbar-helpline-btn" id="open-helpline-btn" type="button" title="${esc(t('nav.helplines247'))}">
                <span class="helpline-dot" aria-hidden="true"></span>
                <span>${t('nav.helpline')}</span>
              </button>
              ${toolButtons()}
              <a href="/auth/login" class="navbar-link">${t('nav.signIn')}</a>
              <a href="/auth/register" class="btn btn-primary btn-sm">${t('nav.getStarted')}</a>
            `}
          </div>

          <button
            class="navbar-toggle"
            aria-expanded="false"
            aria-controls="mobile-nav"
            aria-label="${esc(t('nav.openMenu'))}"
            id="navbar-toggle-btn"
            type="button"
          >
            <span class="navbar-toggle-bar" aria-hidden="true"></span>
            <span class="navbar-toggle-bar" aria-hidden="true"></span>
            <span class="navbar-toggle-bar" aria-hidden="true"></span>
          </button>
        </div>
      </nav>

      <div class="navbar-backdrop" id="navbar-backdrop" aria-hidden="true"></div>
      <div
        class="navbar-mobile"
        id="mobile-nav"
        inert
        role="dialog"
        aria-modal="false"
        aria-label="Mobile navigation"
      >
        ${isAuth ? `
          <p class="navbar-mobile-greeting">${esc(t('nav.hello', { name: userName }))}</p>
          ${links.map(([href, , key], i) => `<a href="${href}" class="navbar-mobile-link" style="--i:${i}">${t(key)}</a>`).join('')}
          <a href="/settings" class="navbar-mobile-link" style="--i:${links.length}">${t('nav.settings')}</a>
          <div class="navbar-mobile-tools">${toolButtons()}</div>
          <div class="navbar-mobile-actions">
            <button type="button" class="btn btn-primary navbar-mobile-cta" id="mobile-helpline-btn">${t('nav.helplines247')}</button>
            <button type="button" class="btn btn-ghost navbar-mobile-cta" id="mobile-logout-btn">${t('nav.logout')}</button>
          </div>
        ` : `
          <a href="/#how-it-works" class="navbar-mobile-link" style="--i:0">${t('nav.howItWorks')}</a>
          <a href="/counsellors" class="navbar-mobile-link" style="--i:1">${t('nav.counsellors')}</a>
          <a href="/resources" class="navbar-mobile-link" style="--i:2">${t('nav.resources')}</a>
          <a href="/auth/login" class="navbar-mobile-link" style="--i:3">${t('nav.signIn')}</a>
          <div class="navbar-mobile-tools">${toolButtons()}</div>
          <div class="navbar-mobile-actions">
            <a href="/auth/register" class="btn btn-primary navbar-mobile-cta">${t('nav.getStarted')}</a>
            <button type="button" class="btn btn-secondary navbar-mobile-cta" id="mobile-helpline-btn">${t('nav.helplines247')}</button>
          </div>
        `}
      </div>

      <!-- Quick Helpline Modal (Accessible from anywhere) -->
      <div class="helpline-modal-backdrop" id="helpline-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="helpline-title">
        <div class="helpline-modal-card">
          <div class="helpline-modal-header">
            <div>
              <span class="helpline-badge">Immediate 24x7 Support</span>
              <h3 id="helpline-title" class="helpline-modal-title">You don't have to carry this alone</h3>
            </div>
            <button class="modal-close-btn" id="close-helpline-btn" aria-label="Close dialog">${icon('x', { size: 18 })}</button>
          </div>
          <p class="helpline-modal-desc">
            If you are in deep distress, feeling unsafe, or needing an immediate human voice, please reach out to these free, verified services:
          </p>
          <div class="helpline-list">
            <a href="tel:14416" class="helpline-item">
              <div class="helpline-item-info">
                <span class="helpline-item-name">Tele-MANAS (Govt. of India)</span>
                <span class="helpline-item-hours">24x7 Toll-Free • Multi-lingual counseling</span>
              </div>
              <span class="helpline-item-dial">Dial 14416 →</span>
            </a>
            <a href="tel:18005990019" class="helpline-item">
              <div class="helpline-item-info">
                <span class="helpline-item-name">KIRAN Mental Health Helpline</span>
                <span class="helpline-item-hours">24x7 Toll-Free • Govt. psychosocial support</span>
              </div>
              <span class="helpline-item-dial">1800-599-0019 →</span>
            </a>
            <a href="tel:9152987821" class="helpline-item">
              <div class="helpline-item-info">
                <span class="helpline-item-name">iCall Psychosocial Helpline</span>
                <span class="helpline-item-hours">Mon–Sat, 10 AM – 8 PM • TISS Mumbai</span>
              </div>
              <span class="helpline-item-dial">9152987821 →</span>
            </a>
            <a href="tel:9999666555" class="helpline-item">
              <div class="helpline-item-info">
                <span class="helpline-item-name">Vandrevala Foundation</span>
                <span class="helpline-item-hours">24x7 Free Crisis Counseling</span>
              </div>
              <span class="helpline-item-dial">9999 666 555 →</span>
            </a>
            <a href="tel:112" class="helpline-item helpline-item--emergency">
              <div class="helpline-item-info">
                <span class="helpline-item-name">National Emergency Services</span>
                <span class="helpline-item-hours">Immediate medical or safety response</span>
              </div>
              <span class="helpline-item-dial">Dial 112 →</span>
            </a>
          </div>
          <div class="helpline-modal-footer">
            <p>Serenova is a support tool, not an emergency response provider.</p>
          </div>
        </div>
      </div>
    `;
  },
};

export function initNavbar() {
  const navbar    = document.getElementById('site-navbar');
  const toggleBtn = document.getElementById('navbar-toggle-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (!navbar) return () => {};

  // Scroll: transparent -> frosted glass
  const SCROLL_THRESHOLD = 40;
  function onScroll() {
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    navbar.classList.toggle('navbar--scrolled', scrolled);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu (slide-in drawer, scroll lock, focus return, Esc / backdrop / resize close)
  const backdrop = document.getElementById('navbar-backdrop');
  const DESKTOP_MQ = window.matchMedia(
    navbar.classList.contains('navbar--auth') ? '(min-width: 1100px)' : '(min-width: 820px)'
  );

  function toggleMenu(open, { returnFocus = true } = {}) {
    if (!toggleBtn || !mobileNav) return;
    const isOpen = open ?? (toggleBtn.getAttribute('aria-expanded') !== 'true');
    const wasOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.setAttribute('aria-label', isOpen ? t('nav.closeMenu') : t('nav.openMenu'));
    mobileNav.classList.toggle('open', isOpen);
    backdrop?.classList.toggle('open', isOpen);
    navbar.classList.toggle('navbar--open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
    if (isOpen) {
      mobileNav.removeAttribute('inert');
      mobileNav.querySelector('a, button')?.focus({ preventScroll: true });
    } else {
      mobileNav.setAttribute('inert', '');
      if (wasOpen && returnFocus) toggleBtn.focus({ preventScroll: true });
    }
  }
  toggleBtn?.addEventListener('click', () => toggleMenu());
  backdrop?.addEventListener('click', () => toggleMenu(false));
  mobileNav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMenu(false, { returnFocus: false }));
  });
  const onBreakpoint = (e) => { if (e.matches) toggleMenu(false, { returnFocus: false }); };
  DESKTOP_MQ.addEventListener('change', onBreakpoint);

  // Helpline modal logic
  const modal = document.getElementById('helpline-modal');
  const openBtn = document.getElementById('open-helpline-btn');
  const mobileOpenBtn = document.getElementById('mobile-helpline-btn');
  const closeBtn = document.getElementById('close-helpline-btn');

  function openHelpline() {
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeHelpline() {
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  openBtn?.addEventListener('click', openHelpline);
  mobileOpenBtn?.addEventListener('click', () => {
    toggleMenu(false, { returnFocus: false });
    openHelpline();
  });
  closeBtn?.addEventListener('click', closeHelpline);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeHelpline();
  });

  // Logout handlers
  const handleLogout = async () => {
    await authApi.logout();
    router.navigate('/');
  };

  // Theme and language toggles (desktop bar + drawer)
  const onTools = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'theme') {
      toggleTheme();
      const dark = getTheme() === 'dark';
      document.querySelectorAll('[data-action="theme"]').forEach((b) => { b.innerHTML = icon(dark ? 'sun' : 'moon', { size: 18 }); });
    } else if (btn.dataset.action === 'lang') {
      setLang(btn.dataset.lang);
      if (store.isAuthenticated()) apiClient.patch('/api/users/me', { language: btn.dataset.lang }).catch(() => {});
      router.navigate(location.pathname + location.search, false);
    }
  };
  navbar.addEventListener('click', onTools);
  mobileNav?.addEventListener('click', onTools);

  document.getElementById('navbar-logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogout);

  function onKeydown(e) {
    if (e.key === 'Escape') {
      toggleMenu(false);
      closeHelpline();
    }
  }
  document.addEventListener('keydown', onKeydown);

  return function cleanup() {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('keydown', onKeydown);
    DESKTOP_MQ.removeEventListener('change', onBreakpoint);
    document.body.classList.remove('nav-open');
  };
}
