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
import { router } from '../router.js';

const LOGO_SVG = `
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"
       xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" stroke="#C65D3A" stroke-width="1.5" opacity="0.55"/>
    <circle cx="14" cy="14" r="5"  fill="#C65D3A"/>
  </svg>
`;

export const Navbar = {
  render({ transparent = false } = {}) {
    const isAuth = store.isAuthenticated();
    const user = store.getUser();
    const userName = user?.name ? user.name.split(' ')[0] : 'Student';

    return `
      <nav
        class="navbar${transparent ? ' navbar--transparent' : ''}"
        aria-label="Main navigation"
        id="site-navbar"
      >
        <div class="container navbar-inner">

          <!-- Logo -->
          <a href="${isAuth ? '/dashboard' : '/'}" class="navbar-logo" aria-label="Serenova — Home">
            <span class="navbar-logo-mark">${LOGO_SVG}</span>
            <span class="navbar-logo-text">Serenova</span>
          </a>

          <!-- Desktop links -->
          <div class="navbar-links" role="list">
            ${isAuth ? `
              <a href="/dashboard" class="navbar-link" role="listitem">Dashboard</a>
              <a href="/mood" class="navbar-link" role="listitem">Mood</a>
              <a href="/journal" class="navbar-link" role="listitem">Journal</a>
              <a href="/assessment" class="navbar-link" role="listitem">Screening</a>
              <a href="/chat" class="navbar-link" role="listitem">Companion</a>
              <a href="/counsellors" class="navbar-link" role="listitem">Counsellors</a>
              <a href="/resources" class="navbar-link" role="listitem">Resources</a>
              
              <button class="navbar-helpline-btn" id="open-helpline-btn" type="button" title="Immediate 24x7 Support">
                <span class="helpline-dot" aria-hidden="true"></span>
                <span>Helpline</span>
              </button>

              <a href="/profile" class="navbar-user-badge" title="My Profile">
                <span class="user-avatar-circle">${userName.charAt(0).toUpperCase()}</span>
                <span class="user-name-text">${userName}</span>
              </a>

              <button class="navbar-link btn-logout" id="navbar-logout-btn" type="button">Logout</button>
            ` : `
              <a href="/#how-it-works" class="navbar-link" role="listitem">How it works</a>
              <a href="/counsellors" class="navbar-link" role="listitem">Counsellors</a>
              <a href="/resources" class="navbar-link" role="listitem">Resources</a>
              
              <button class="navbar-helpline-btn" id="open-helpline-btn" type="button" title="Immediate 24x7 Support">
                <span class="helpline-dot" aria-hidden="true"></span>
                <span>Helpline</span>
              </button>

              <a href="/auth/login" class="navbar-link" role="listitem">Sign in</a>
              <a href="/auth/register" class="btn btn-primary btn-sm" role="listitem">Get started</a>
            `}
          </div>

          <!-- Mobile toggle -->
          <button
            class="navbar-toggle"
            aria-expanded="false"
            aria-controls="mobile-nav"
            aria-label="Open navigation menu"
            id="navbar-toggle-btn"
          >
            <span class="navbar-toggle-bar" aria-hidden="true"></span>
            <span class="navbar-toggle-bar" aria-hidden="true"></span>
            <span class="navbar-toggle-bar" aria-hidden="true"></span>
          </button>
        </div>
      </nav>

      <!-- Mobile navigation drawer -->
      <div
        class="navbar-mobile"
        id="mobile-nav"
        aria-hidden="true"
        role="navigation"
        aria-label="Mobile navigation"
      >
        ${isAuth ? `
          <a href="/dashboard" class="navbar-mobile-link">Dashboard</a>
          <a href="/mood" class="navbar-mobile-link">Mood Tracker</a>
          <a href="/journal" class="navbar-mobile-link">Private Journal</a>
          <a href="/assessment" class="navbar-mobile-link">Self-Assessment</a>
          <a href="/chat" class="navbar-mobile-link">AI Companion</a>
          <a href="/counsellors" class="navbar-mobile-link">Counsellors & Appointments</a>
          <a href="/resources" class="navbar-mobile-link">Well-Being Resources</a>
          <a href="/profile" class="navbar-mobile-link">My Profile (${userName})</a>
          <button class="btn btn-secondary navbar-mobile-cta" id="mobile-helpline-btn">Verified Helplines</button>
          <button class="btn btn-ghost navbar-mobile-cta" id="mobile-logout-btn">Log out</button>
        ` : `
          <a href="/#how-it-works" class="navbar-mobile-link">How it works</a>
          <a href="/counsellors" class="navbar-mobile-link">Counsellors & Support</a>
          <a href="/resources" class="navbar-mobile-link">Resources</a>
          <a href="/auth/login" class="navbar-mobile-link">Sign in</a>
          <button class="btn btn-secondary navbar-mobile-cta" id="mobile-helpline-btn">Verified Helplines</button>
          <a href="/auth/register" class="btn btn-primary navbar-mobile-cta">Get started</a>
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
            <button class="modal-close-btn" id="close-helpline-btn" aria-label="Close dialog">✕</button>
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

  // Mobile menu
  function toggleMenu(open) {
    const isOpen = open ?? (toggleBtn.getAttribute('aria-expanded') !== 'true');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    mobileNav?.classList.toggle('open', isOpen);
    mobileNav?.setAttribute('aria-hidden', String(!isOpen));
  }
  toggleBtn?.addEventListener('click', () => toggleMenu());
  mobileNav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMenu(false));
  });

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
    toggleMenu(false);
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
  };
}
