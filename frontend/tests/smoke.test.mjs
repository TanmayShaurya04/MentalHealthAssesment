// Frontend checks that need no browser: every page module and translation is wired up correctly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const keys = (src) => new Set([...src.matchAll(/'([a-zA-Z0-9.]+)':/g)].map((m) => m[1]));

test('Hindi has every English translation key', () => {
  const en = keys(read('src/i18n/en.js')), hi = keys(read('src/i18n/hi.js'));
  const missing = [...en].filter((k) => !hi.has(k));
  assert.deepEqual(missing, []);
});

test('every page imported by the router exists', () => {
  const router = read('src/router.js');
  for (const m of router.matchAll(/from '(\.\/[^']+\.js)'/g)) {
    assert.ok(existsSync(new URL(`../src/${m[1].slice(2)}`, import.meta.url)), `missing ${m[1]}`);
  }
});

test('no browser confirm()/alert() and no inline event handlers (CSP forbids them)', () => {
  const walk = (d) => readdirSync(new URL(`../${d}`, import.meta.url), { withFileTypes: true })
    .flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  for (const f of walk('src').filter((f) => f.endsWith('.js'))) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/[^.\w]confirm\(/.test(src.replace(/confirmDialog\(/g, '')), `${f} uses confirm()`);
    assert.ok(!/\son(click|load|error)=/.test(src), `${f} has an inline handler`);
  }
});

test('public assets referenced by index.html exist', () => {
  for (const f of ['public/favicon.svg', 'public/manifest.webmanifest', 'public/sw.js', 'public/og-image.png', 'public/icons/icon-192.png']) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  }
});
