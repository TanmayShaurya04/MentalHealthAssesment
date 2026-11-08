/** Journal home: week strip + streak, a prompt of the day, and colourful entry cards. */
import { journalsApi } from '../api/journals.js';
import { confirmDialog } from '../components/Dialog.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { icon } from '../components/icons.js';
import { esc } from '../utils/html.js';
import { MOOD_EMOJI } from './MoodTracker.js';
import { PROMPTS, promptOfTheDay } from '../utils/journalPrompts.js';

const MOODS = [['', 'All moods'], ['very_low', 'Very low'], ['low', 'Low'], ['neutral', 'Neutral'], ['good', 'Good'], ['very_good', 'Very good']];
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const Journal = {
  _cleanupNavbar: null,

  render() {
    const today = promptOfTheDay();
    return `
      ${Navbar.render()}
      <main class="journal-page page-root jrn-page" id="main-content">
        <div class="container jrn-container">

          <header class="jrn-hero">
            <div class="jrn-hero-text">
              <span class="section-eyebrow">Your private pages</span>
              <h1 class="jrn-title">Journal</h1>
              <p class="jrn-sub">A soft place to put your thoughts down. Only you can read it.</p>
              <div class="jrn-actions">
                <a href="/journal/new" class="btn btn-primary btn-lg">${icon('message', { size: 18 })} Write something</a>
              </div>
            </div>
            <div class="jrn-streak" id="jrn-streak" aria-live="polite">
              <div class="jrn-streak-num" id="jrn-streak-num">0</div>
              <div class="jrn-streak-label">day streak</div>
              <div class="jrn-week" id="jrn-week" aria-label="This week"></div>
            </div>
          </header>

          <section class="jrn-prompt-card" aria-label="Prompt of the day">
            <div>
              <span class="jrn-chip-label">Prompt of the day</span>
              <p class="jrn-prompt-text">${esc(today.text)}</p>
            </div>
            <a href="/journal/new" class="btn btn-secondary jrn-use-prompt" data-prompt="${esc(today.text)}">Write about this ${icon('arrow-right', { size: 16 })}</a>
          </section>

          <section class="jrn-quick" aria-label="Ways to start">
            ${PROMPTS.slice(0, 6).map((p) => `<a href="/journal/new" class="jrn-quick-chip jrn-quick-chip--${p.tone}" data-prompt="${esc(p.text)}"><span aria-hidden="true">${p.emoji}</span>${esc(p.label)}</a>`).join('')}
          </section>

          <div class="jrn-toolbar">
            <label class="jrn-search">${icon('search', { size: 18 })}<input type="search" id="journal-search-input" placeholder="Search your entries" aria-label="Search entries" /></label>
            <div class="jrn-mood-filter" id="jrn-mood-filter" role="group" aria-label="Filter by mood">
              ${MOODS.map(([v, l]) => `<button type="button" data-mood="${v}" class="${v === '' ? 'is-on' : ''}" aria-pressed="${v === ''}" title="${l}">${v ? MOOD_EMOJI[v] : 'All'}</button>`).join('')}
            </div>
          </div>
          <div id="journal-tag-chips" class="jrn-tags"></div>

          <div id="journal-entries-grid" class="jrn-grid" aria-live="polite"><div class="skeleton skeleton-block"></div><div class="skeleton skeleton-block"></div><div class="skeleton skeleton-block"></div></div>
        </div>
      </main>
      ${Footer.render()}`;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();
    let all = [], mood = '', tag = '';
    const $ = (id) => document.getElementById(id);
    const grid = $('journal-entries-grid');

    // Remember a prompt chosen from a chip, then let the link open the editor
    document.querySelectorAll('[data-prompt]').forEach((a) => a.addEventListener('click', () => {
      try { sessionStorage.setItem('serenova_journal_prompt', a.dataset.prompt); } catch (e) { /* ignore */ }
    }));

    const streakAndWeek = () => {
      const days = new Set(all.map((j) => dayKey(new Date(j.created_at))));
      let streak = 0; const d = new Date();
      if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);   // today not written yet: streak is still alive
      while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
      $('jrn-streak-num').textContent = streak;
      const base = new Date(); base.setDate(base.getDate() - 6);
      $('jrn-week').innerHTML = Array.from({ length: 7 }, (_, i) => {
        const x = new Date(base); x.setDate(base.getDate() + i);
        const on = days.has(dayKey(x));
        return `<span class="jrn-day${on ? ' is-on' : ''}${i === 6 ? ' is-today' : ''}" title="${x.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}${on ? ': written' : ''}"><i>${x.toLocaleDateString(undefined, { weekday: 'narrow' })}</i></span>`;
      }).join('');
    };

    const renderTags = () => {
      const tags = [...new Set(all.flatMap((e) => e.tags || []))];
      $('journal-tag-chips').innerHTML = tags.length ? `<button type="button" class="jrn-tag${tag ? '' : ' is-on'}" data-tag="">All topics</button>${tags.map((t) => `<button type="button" class="jrn-tag${tag === t ? ' is-on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}` : '';
    };

    const draw = () => {
      const q = ($('journal-search-input')?.value || '').toLowerCase().trim();
      const list = all.filter((e) => (!q || `${e.title} ${e.content}`.toLowerCase().includes(q)) && (!mood || e.mood_level === mood) && (!tag || (e.tags || []).includes(tag)));
      if (!all.length) {
        grid.innerHTML = `<div class="jrn-empty">
          <div class="jrn-empty-art" aria-hidden="true"><span>📓</span><span>✨</span><span>🌿</span></div>
          <h2>Your first page is waiting</h2>
          <p>Write a line or a whole page. There is no right way, and nobody is grading it.</p>
          <a href="/journal/new" class="btn btn-primary">Start writing</a></div>`;
        return;
      }
      if (!list.length) { grid.innerHTML = `<div class="jrn-empty"><h2>Nothing matches</h2><p>Try another word or clear the filters.</p></div>`; return; }
      grid.innerHTML = list.map((j) => {
        const date = new Date(j.created_at);
        const words = j.content.trim().split(/\s+/).filter(Boolean).length;
        return `
        <article class="jrn-card jrn-card--${esc(j.mood_level || 'none')}" id="journal-${esc(j.id)}">
          <div class="jrn-card-top">
            <time datetime="${esc(j.created_at)}"><b>${date.getDate()}</b> ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</time>
            <span class="jrn-card-mood" title="${esc((j.mood_level || '').replace('_', ' '))}">${j.mood_level ? MOOD_EMOJI[j.mood_level] || '' : '📝'}</span>
          </div>
          <h3>${esc(j.title)}</h3>
          <p>${esc(j.content.slice(0, 170))}${j.content.length > 170 ? '…' : ''}</p>
          ${(j.tags || []).length ? `<div class="jrn-card-tags">${j.tags.slice(0, 4).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="jrn-card-foot">
            <span>${words} words</span>
            <span><a href="/journal/${esc(j.id)}" class="jrn-link">Open</a><button type="button" class="jrn-del btn-delete-journal" data-id="${esc(j.id)}" aria-label="Delete entry">${icon('trash', { size: 16 })}</button></span>
          </div>
        </article>`;
      }).join('');
    };

    async function load() {
      try { all = await journalsApi.listJournals(); }
      catch (e) { grid.innerHTML = `<div class="jrn-empty"><h2>We couldn't open your journal</h2><p>Please check your connection and try again.</p><button class="btn btn-secondary" id="jrn-retry">Try again</button></div>`; $('jrn-retry')?.addEventListener('click', load); return; }
      streakAndWeek(); renderTags(); draw();
    }

    $('journal-search-input')?.addEventListener('input', draw);
    $('jrn-mood-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mood]'); if (!b) return;
      mood = b.dataset.mood;
      $('jrn-mood-filter').querySelectorAll('button').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      draw();
    });
    $('journal-tag-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-tag]'); if (!b) return; tag = b.dataset.tag; renderTags(); draw(); });
    grid.addEventListener('click', async (e) => {
      const del = e.target.closest('.btn-delete-journal'); if (!del) return;
      if (!(await confirmDialog({ title: 'Delete this entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
      try { await journalsApi.deleteJournal(del.dataset.id); Toast.info('Entry deleted.'); load(); } catch (err) { Toast.error('Could not delete this entry.'); }
    });
    load();
  },

  destroy() { this._cleanupNavbar?.(); },
};
