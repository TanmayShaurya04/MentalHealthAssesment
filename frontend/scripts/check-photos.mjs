// Checks every Unsplash photo ID in src/assets/images.js and lists the ones that do not load.
// Run from the frontend folder:  npm run check:photos
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/assets/images.js', import.meta.url), 'utf8');
const entries = [...src.matchAll(/^\s*([A-Za-z0-9_]+):\s*\{\s*id:\s*'([^']+)'/gm)].map(([, key, id]) => ({ key, id }));
if (!entries.length) { console.error('No photo entries found in images.js'); process.exit(2); }

const check = async ({ key, id }) => {
  try {
    const res = await fetch(`https://images.unsplash.com/photo-${id}?w=100&q=40`, { method: 'GET', signal: AbortSignal.timeout(15000) });
    return { key, id, ok: res.ok && (res.headers.get('content-type') || '').startsWith('image/'), status: res.status };
  } catch (e) { return { key, id, ok: false, status: e.cause?.code || e.name }; }
};

const results = [];
for (let i = 0; i < entries.length; i += 8) results.push(...await Promise.all(entries.slice(i, i + 8).map(check)));

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length} of ${results.length} photos load.\n`);
if (bad.length) {
  console.log('These do NOT load. Replace their id in src/assets/images.js (keep the key):\n');
  bad.forEach((r) => console.log(`  ${r.key.padEnd(18)} ${r.id}   (${r.status})`));
  console.log('\nSend this list to Claude and it will pick replacements.');
  process.exit(1);
}
console.log('All photos load.');
