/**
 * Toast.js — Serenova notification system
 *
 * Lightweight toast utility. No dependencies.
 * Usage:
 *   import { Toast } from '../components/Toast.js';
 *   Toast.show('Saved!', 'success');
 *   Toast.show('Something went wrong', 'error');
 *   Toast.show('Note updated', 'info');
 */

function getContainer() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'false');
    document.body.appendChild(el);
  }
  return el;
}

function createToastEl(message, type) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="toast-dot" aria-hidden="true"></span>
    <span class="toast-message">${message}</span>
  `;
  return el;
}

export const Toast = {
  /**
   * @param {string}  message
   * @param {'info'|'success'|'error'} type
   * @param {number}  duration  ms before auto-dismiss (default 4000)
   */
  show(message, type = 'info', duration = 4000) {
    const container = getContainer();
    const el = createToastEl(message, type);

    container.appendChild(el);

    // Auto-dismiss
    const dismiss = () => {
      el.classList.add('toast-leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      // Fallback if animation doesn't fire
      setTimeout(() => el.remove(), 400);
    };

    const timer = setTimeout(dismiss, duration);

    // Allow click to dismiss early
    el.addEventListener('click', () => {
      clearTimeout(timer);
      dismiss();
    });
  },

  success(message, duration) { this.show(message, 'success', duration); },
  error(message, duration)   { this.show(message, 'error',   duration); },
  info(message, duration)    { this.show(message, 'info',    duration); },
};
