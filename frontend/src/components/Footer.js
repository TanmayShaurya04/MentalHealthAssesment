/**
 * Footer.js — Serenova site footer
 *
 * Dark-background footer with nav links, tagline, and mandatory disclaimer.
 * The disclaimer is critical — this platform is NOT a medical service.
 */

import { t } from '../i18n/index.js';
import { store } from '../store.js';


export const Footer = {
  render() {
    const year = new Date().getFullYear();

    return `
      <footer class="footer" aria-label="Site footer">
        <div class="container">

          <div class="footer-grid">

            <!-- Brand column -->
            <div class="footer-brand">
              <div class="footer-logo">
                <span class="footer-logo-mark"><img class="brand-mark-image" src="/serenova-mark.svg" alt="" aria-hidden="true" /></span>
                <span class="footer-logo-text">Serenova</span>
              </div>
              <p class="footer-tagline">${t('footer.tagline')}</p>
            </div>

            <nav aria-label="Footer navigation">
              <p class="footer-heading">${t('footer.platform')}</p>
              <ul class="footer-links">
                <li><a href="/#how-it-works" class="footer-link">${t('nav.howItWorks')}</a></li>
                <li><a href="/about" class="footer-link">${t('footer.about')}</a></li>
                ${store.isAuthenticated()
                  ? `<li><a href="/settings" class="footer-link">${t('nav.settings')}</a></li>`
                  : `<li><a href="/auth/register" class="footer-link">${t('nav.getStarted')}</a></li><li><a href="/auth/login" class="footer-link">${t('nav.signIn')}</a></li>`}
              </ul>
            </nav>

            <nav aria-label="Support navigation">
              <p class="footer-heading">${t('footer.support')}</p>
              <ul class="footer-links">
                <li><a href="/resources" class="footer-link">${t('footer.resources')}</a></li>
                <li><a href="/counsellors" class="footer-link">${t('footer.bookSupport')}</a></li>
                <li><a href="/resources#helplines" class="footer-link">${t('footer.helplines')}</a></li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p class="footer-heading">${t('footer.legal')}</p>
              <ul class="footer-links">
                <li><a href="/privacy" class="footer-link">${t('footer.privacy')}</a></li>
                <li><a href="/terms" class="footer-link">${t('footer.terms')}</a></li>
              </ul>
            </nav>

          </div>

          <!-- Bottom bar -->
          <div class="footer-bottom">
            <p class="footer-copyright">© ${year} Serenova. ${t('footer.rights')}</p>
            <p class="footer-disclaimer">${t('footer.disclaimer')}</p>
          </div>

        </div>
      </footer>
    `;
  },
};
