/**
 * i18n — English and Hindi for the main screens (navigation, footer, dashboard, sign-in, consent, settings).
 * Long-form content (articles, legal pages, AI replies) stays in English for now.
 * Add a language: copy the `en` block, translate it, and register it in DICTS + LANGS.
 */
import { en } from './en.js';
import { hi } from './hi.js';

const DICTS = { en, hi };
export const LANGS = [{ code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }];
const KEY = 'serenova_lang';

let current = 'en';
try { current = localStorage.getItem(KEY) || 'en'; } catch (e) { /* ignore */ }
if (!DICTS[current]) current = 'en';

export function getLang() { return current; }

export function setLang(code) {
  if (!DICTS[code]) return;
  current = code;
  try { localStorage.setItem(KEY, code); } catch (e) { /* ignore */ }
  document.documentElement.setAttribute('lang', code);
}

/** t('nav.dashboard')  or  t('dash.greeting', { name: 'Asha' }). Falls back to English, then to the key. */
export function t(key, vars = {}) {
  const raw = DICTS[current][key] ?? DICTS.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
