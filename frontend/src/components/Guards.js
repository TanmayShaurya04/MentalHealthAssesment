/**
 * Guards.js: discretion and privacy helpers for signed-in users.
 *  - Quick Exit: a floating button (and pressing Escape twice) leaves Serenova at once for a neutral page.
 *  - Screen lock: after 5 idle minutes the screen is covered until the account password is entered.
 * Both can be switched off in Settings (stored per browser).
 */
import { store } from '../store.js';
import { apiClient } from '../api/client.js';
import { authApi } from '../api/auth.js';
import { esc } from '../utils/html.js';

const IDLE_MS = 5 * 60 * 1000;
const EXIT_URL = 'https://en.wikipedia.org/wiki/Main_Page';
const KEYS = { quick: 'serenova_quickexit', lock: 'serenova_autolock' };

export function getGuard(name) {
  try { return localStorage.getItem(KEYS[name]) !== 'off'; } catch (e) { return true; }
}
export function setGuard(name, on) {
  try { localStorage.setItem(KEYS[name], on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  refreshGuards();
}

let started = false;
let idleTimer = null;
let lastEsc = 0;
let locked = false;

function quickExit() {
  // Replace the history entry so Back does not return to Serenova
  try { sessionStorage.clear(); } catch (e) { /* ignore */ }
  location.replace(EXIT_URL);
}

function ensureButton() {
  let btn = document.getElementById('quick-exit');
  const show = !!store.getUser() && getGuard('quick');
  if (show && !btn) {
    btn = document.createElement('button');
    btn.id = 'quick-exit';
    btn.type = 'button';
    btn.className = 'quick-exit';
    btn.setAttribute('aria-label', 'Quick exit: leave this site immediately');
    btn.innerHTML = '<span aria-hidden="true">✕</span> Quick exit <kbd>Esc ×2</kbd>';
    btn.addEventListener('click', quickExit);
    document.body.appendChild(btn);
  } else if (!show && btn) btn.remove();
}

function lock() {
  if (locked || !store.getUser() || !getGuard('lock')) return;
  locked = true;
  const user = store.getUser();
  const el = document.createElement('div');
  el.className = 'lock-screen';
  el.id = 'lock-screen';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'lock-h');
  el.innerHTML = `
    <form class="lock-card" id="lock-form">
      <div class="lock-ico" aria-hidden="true">🔒</div>
      <h2 id="lock-h">Screen locked</h2>
      <p>Locked after a few minutes of inactivity to keep your space private. Enter your password to continue, ${esc((user.name || '').split(' ')[0])}.</p>
      <label class="visually-hidden" for="lock-pw">Password</label>
      <input class="form-input" id="lock-pw" type="password" autocomplete="current-password" placeholder="Password" required>
      <div class="form-alert" id="lock-err" role="alert" style="display:none"></div>
      <button class="btn btn-primary" type="submit">Unlock</button>
      <button class="btn btn-ghost" type="button" id="lock-out">Sign out instead</button>
    </form>`;
  document.body.appendChild(el);
  document.body.classList.add('is-locked');
  const pw = el.querySelector('#lock-pw');
  pw.focus();
  el.querySelector('#lock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = el.querySelector('#lock-err');
    try {
      await apiClient.post('/api/users/me/verify-password', { password: pw.value });
      unlock();
    } catch (ex) {
      err.textContent = ex.status === 400 ? 'That password is not correct.' : 'Could not check right now. Your session may have ended; try signing out.';
      err.style.display = 'block'; pw.select();
    }
  });
  el.querySelector('#lock-out').addEventListener('click', async () => { unlock(); await authApi.logout(); window.router?.navigate('/'); });
  // Keep Tab inside the lock card
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('input,button')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

function unlock() {
  document.getElementById('lock-screen')?.remove();
  document.body.classList.remove('is-locked');
  locked = false;
  resetIdle();
}

function resetIdle() {
  clearTimeout(idleTimer);
  if (locked || !store.getUser() || !getGuard('lock')) return;
  idleTimer = setTimeout(lock, IDLE_MS);
}

export function refreshGuards() {
  if (locked && !store.getUser()) unlock();
  ensureButton();
  resetIdle();
}

export function initGuards() {
  if (started) return;
  started = true;
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { if (!locked) resetIdle(); }, { passive: true }));
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || locked || !store.getUser() || !getGuard('quick')) return;
    // Ignore Escape presses that are just closing a dialog or menu
    const now = Date.now();
    if (now - lastEsc < 600) quickExit();
    lastEsc = now;
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resetIdle(); });
  store.subscribe?.(refreshGuards);
  refreshGuards();
}
