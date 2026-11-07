/**
 * ConsentModal.js — shown once to signed-in students until they accept the current version.
 * The acceptance (version + time) is stored on the account, so it follows them across devices.
 */
import { authApi } from '../api/auth.js';
import { router } from '../router.js';
import { t } from '../i18n/index.js';
import { Toast } from './Toast.js';

export const CONSENT_VERSION = '2026-11';
let el = null;

export const ConsentModal = {
  open() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'dialog-backdrop open';
    el.innerHTML = `
      <div class="dialog-card consent-card" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 class="dialog-title" id="consent-title">${t('consent.title')}</h2>
        <p class="dialog-message">${t('consent.intro')}</p>
        <ul class="consent-list">
          <li>${t('consent.p1')}</li><li>${t('consent.p2')}</li><li>${t('consent.p3')}</li><li>${t('consent.p4')}</li>
        </ul>
        <p class="consent-links"><a href="/privacy" target="_blank" rel="noopener">${t('consent.read')}</a></p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" id="consent-decline">${t('consent.decline')}</button>
          <button type="button" class="btn btn-primary" id="consent-accept">${t('consent.accept')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add('dialog-open');
    el.querySelector('#consent-accept').focus();

    el.querySelector('#consent-accept').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await authApi.recordConsent(CONSENT_VERSION); ConsentModal.close(); }
      catch (err) { Toast.error(err.message); e.target.disabled = false; }
    });
    el.querySelector('#consent-decline').addEventListener('click', async () => {
      ConsentModal.close();
      await authApi.logout();
      router.navigate('/');
    });
    // Keep keyboard focus inside the dialog
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...el.querySelectorAll('button, a[href]')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  },
  close() {
    el?.remove(); el = null;
    document.body.classList.remove('dialog-open');
  },
};
