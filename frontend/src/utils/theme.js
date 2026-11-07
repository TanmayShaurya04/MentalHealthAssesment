/** Light / dark theme. The first paint is handled by /theme-init.js; this lets the user switch. */
const KEY = 'serenova_theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171A18' : '#F6F1E8');
  window.dispatchEvent(new CustomEvent('serenova:theme', { detail: theme }));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
