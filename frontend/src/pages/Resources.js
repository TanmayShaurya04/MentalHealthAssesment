/** Resources: searchable library of guides, each with its own photo, plus a quick-relief strip and a reader. */
import { resourcesApi } from '../api/resources.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { photo, RESOURCE_PHOTO } from '../assets/images.js';
import { icon } from '../components/icons.js';
import { esc } from '../utils/html.js';

const CATS = [
  ['', 'All guides'], ['study_stress', 'Academic Pressures'], ['sleep', 'Rest & Recovery'], ['emotional_balance', 'Emotional Health'],
  ['social', 'Friends & Family'], ['body', 'Body & Habits'], ['crisis', 'Verified Helplines'],
];
const img = (r, w) => photo(r.image || RESOURCE_PHOTO[r.category] || 'sunrise', { w, cls: 'resource-thumb' });

/** Tiny, safe markdown: ### / #### headings, "- " bullets, **bold**, paragraphs. */
function renderMarkdown(src) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const out = []; let list = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`); list = []; } };
  for (const line of String(src || '').split('\n')) {
    if (/^####\s+/.test(line)) { flush(); out.push(`<h5>${inline(line.replace(/^####\s+/, ''))}</h5>`); }
    else if (/^###\s+/.test(line)) { flush(); out.push(`<h4>${inline(line.replace(/^###\s+/, ''))}</h4>`); }
    else if (/^[-•]\s+/.test(line)) list.push(line.replace(/^[-•]\s+/, ''));
    else if (!line.trim()) flush();
    else { flush(); out.push(`<p>${inline(line)}</p>`); }
  }
  flush();
  return out.join('');
}

export const Resources = {
  _cleanupNavbar: null,
  _onKey: null,

  render() {
    return `
      ${Navbar.render()}
      <main class="resources-page page-root rs-page" id="main-content">
        <div class="container resources-container">
          <header class="rs-head">
            <div>
              <span class="section-eyebrow">Guides</span>
              <h1 class="page-title">Resources for student life</h1>
              <p class="page-subtitle">Short, practical guides on stress, sleep, friendships and feeling better. Most take three minutes to read.</p>
            </div>
            <label class="rs-search">${icon('search', { size: 18 })}<input type="search" id="rs-search" placeholder="Search guides" aria-label="Search guides" /></label>
          </header>

          <section id="rs-feature" class="rs-feature" hidden></section>
          <section id="rs-quick" hidden>
            <h2 class="rs-h2">Quick relief <span>under 3 minutes</span></h2>
            <div class="rs-quick-row" id="rs-quick-row"></div>
          </section>

          <div class="resources-filter-bar rs-chips" id="rs-chips" role="group" aria-label="Topics"></div>
          <p class="rs-count" id="rs-count" aria-live="polite"></p>
          <div id="resources-grid" class="resources-full-grid"><div class="skeleton skeleton-block"></div><div class="skeleton skeleton-block"></div><div class="skeleton skeleton-block"></div></div>

          <aside class="rs-help"><div><b>If things feel too heavy right now</b><p>Tele-MANAS is free and open 24x7: <a href="tel:14416">14416</a>. In an emergency call <a href="tel:112">112</a>.</p></div><a class="btn btn-secondary" href="/counsellors">Talk to a counsellor</a></aside>
        </div>

        <div class="modal-backdrop" id="reader-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="reader-title">
          <div class="modal-card reader-modal-card rs-reader">
            <div class="rs-reader-photo" id="reader-photo"></div>
            <div class="modal-header">
              <div><span class="modal-eyebrow" id="reader-category"></span><h3 id="reader-title" class="modal-title font-display text-2xl"></h3><p class="rs-reader-meta" id="reader-meta"></p></div>
              <button type="button" class="modal-close-btn" id="close-reader-btn" aria-label="Close dialog">${icon('x', { size: 18 })}</button>
            </div>
            <div class="reader-modal-body rs-prose" id="reader-body"></div>
            <div class="modal-footer rs-reader-foot">
              <button type="button" class="btn btn-ghost btn-sm" id="rs-prev">← Previous</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-close-reader-bottom">Done reading</button>
              <button type="button" class="btn btn-primary btn-sm" id="rs-next">Next →</button>
            </div>
          </div>
        </div>
      </main>
      ${Footer.render()}`;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();
    const $ = (id) => document.getElementById(id);
    let all = [], cat = '', visible = [], current = -1;
    const modal = $('reader-modal');

    const card = (r) => `
      <article class="card resource-full-card rs-card ${r.is_crisis_helpline ? 'card-crisis-highlight' : ''}" id="resource-${esc(r.id)}">
        ${img(r, 640)}
        <div class="card-header-row"><span class="badge ${r.is_crisis_helpline ? 'badge-accent' : 'badge-surface'}">${esc(r.category_label || r.category)}</span><span class="text-xs text-ink-60">${esc(r.read_time)}</span></div>
        <h3 class="resource-card-heading mt-3">${esc(r.title)}</h3>
        <p class="resource-card-summary text-ink-70 mt-2">${esc(r.summary)}</p>
        <div class="resource-card-tags mt-4">${(r.tags || []).map((t) => `<span class="tag-pill-xs">#${esc(t)}</span>`).join('')}</div>
        <div class="resource-card-footer mt-5"><button type="button" class="btn btn-primary btn-sm btn-read-resource" data-id="${esc(r.id)}">Read guide →</button></div>
      </article>`;

    function open(i) {
      const r = visible[i]; if (!r) return;
      current = i;
      $('reader-category').textContent = r.category_label || r.category;
      $('reader-title').textContent = r.title;
      $('reader-meta').textContent = r.read_time;
      $('reader-photo').innerHTML = img(r, 900);
      $('reader-body').innerHTML = renderMarkdown(r.content) + ((r.tags || []).length ? `<div class="resource-card-tags mt-4">${r.tags.map((t) => `<span class="tag-pill-xs">#${esc(t)}</span>`).join('')}</div>` : '');
      $('reader-body').scrollTop = 0; modal.scrollTop = 0;
      $('rs-prev').disabled = i === 0; $('rs-next').disabled = i === visible.length - 1;
      modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('cx-lock');
      $('close-reader-btn').focus();
    }
    const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('cx-lock'); };
    $('close-reader-btn').addEventListener('click', close); $('btn-close-reader-bottom').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    $('rs-prev').addEventListener('click', () => open(current - 1)); $('rs-next').addEventListener('click', () => open(current + 1));
    this._onKey = (e) => { if (!modal.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' && current < visible.length - 1) open(current + 1); if (e.key === 'ArrowLeft' && current > 0) open(current - 1); };
    document.addEventListener('keydown', this._onKey);

    function chips() {
      $('rs-chips').innerHTML = CATS.map(([v, l]) => {
        const n = v ? all.filter((r) => r.category === v).length : all.length;
        return n || !v ? `<button type="button" class="res-filter-btn${cat === v ? ' active' : ''}" data-cat="${v}" aria-pressed="${cat === v}">${l} <small>${n}</small></button>` : '';
      }).join('');
    }
    function draw() {
      const q = $('rs-search').value.toLowerCase().trim();
      visible = all.filter((r) => (!cat || r.category === cat) && (!q || `${r.title} ${r.summary} ${(r.tags || []).join(' ')}`.toLowerCase().includes(q)));
      $('rs-count').textContent = `${visible.length} guide${visible.length === 1 ? '' : 's'}`;
      $('resources-grid').innerHTML = visible.length ? visible.map(card).join('') : `<p class="empty-text">No guides match. Try another word or topic.</p>`;
      const browsing = !q && !cat;
      const feat = all.find((r) => r.featured);
      $('rs-feature').hidden = !(browsing && feat);
      if (browsing && feat) $('rs-feature').innerHTML = `<div class="rs-feature-photo">${img(feat, 900)}</div><div class="rs-feature-body"><span class="badge badge-accent">Start here</span><h2>${esc(feat.title)}</h2><p>${esc(feat.summary)}</p><button type="button" class="btn btn-primary btn-read-resource" data-id="${esc(feat.id)}">Read guide →</button></div>`;
      const quick = all.filter((r) => r.quick);
      $('rs-quick').hidden = !(browsing && quick.length);
      $('rs-quick-row').innerHTML = quick.map((r) => `<button type="button" class="rs-quick-card btn-read-resource" data-id="${esc(r.id)}"><span class="rs-quick-img">${img(r, 240)}</span><span><b>${esc(r.title)}</b><small>${esc(r.read_time)}</small></span></button>`).join('');
    }
    document.querySelector('.resources-container').addEventListener('click', (e) => {
      const b = e.target.closest('.btn-read-resource');
      if (b) { const r = all.find((x) => x.id === b.dataset.id); const i = visible.indexOf(r); if (i >= 0) open(i); else { visible = all; open(all.indexOf(r)); } return; }
      const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; chips(); draw(); }
    });
    $('rs-search').addEventListener('input', draw);

    try { all = await resourcesApi.listResources(); chips(); draw(); }
    catch (err) { $('resources-grid').innerHTML = `<p class="error-text">We could not load the guides. Please check your connection and try again.</p>`; }
  },

  destroy() { document.body.classList.remove('cx-lock'); if (this._onKey) document.removeEventListener('keydown', this._onKey); this._cleanupNavbar?.(); },
};
