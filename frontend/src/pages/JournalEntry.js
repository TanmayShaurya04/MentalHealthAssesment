/** Journal editor: prompt chips, emoji mood, tags, autosaved draft, focus mode. */
import { journalsApi } from '../api/journals.js';
import { confirmDialog } from '../components/Dialog.js';
import { Toast } from '../components/Toast.js';
import { navigate } from '../navigation.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { esc } from '../utils/html.js';
import { MOOD_EMOJI } from './MoodTracker.js';
import { PROMPTS } from '../utils/journalPrompts.js';
import { attachEmojiDock } from '../utils/emojiDock.js';

const MOODS = [['very_low', 'Very low'], ['low', 'Low'], ['neutral', 'Neutral'], ['good', 'Good'], ['very_good', 'Very good']];
const SUGGESTED_TAGS = ['Study', 'Exams', 'Family', 'Friends', 'Sleep', 'Gratitude', 'Health', 'Future'];
const DRAFT_KEY = 'serenova_journal_draft_v1';

const store = {
  get() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  clear() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } },
};

export const JournalEntry = {
  _cleanupNavbar: null,
  _dockOff: null,

  render(params) {
    const isNew = !params.id || params.id === 'new';
    const now = new Date();
    return `
      ${Navbar.render()}
      <main class="journal-editor-page page-root jrn-editor-page" id="main-content">
        <div class="container jrn-editor-wrap">
          <div class="jrn-editor-top">
            <a href="/journal" class="btn btn-ghost btn-sm">← Journal</a>
            <span class="jrn-private">Private to you</span>
            <button type="button" class="btn btn-ghost btn-sm" id="jrn-focus-toggle" aria-pressed="false">Focus mode</button>
          </div>

          <form id="journal-editor-form" class="jrn-paper" novalidate>
            <div class="jrn-paper-date">${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <input type="text" id="entry-title" class="jrn-title-input" placeholder="Give today a title" maxlength="120" required aria-label="Title" />

            <fieldset class="jrn-moodpick">
              <legend>How are you feeling while writing?</legend>
              <div class="jrn-moods" id="jrn-moods">
                ${MOODS.map(([v, l]) => `<button type="button" class="jrn-mood-btn mood-emoji" data-mood="${v}" aria-pressed="false" aria-label="${l}" title="${l}" style="--emoji-size:34px">${MOOD_EMOJI[v]}</button>`).join('')}
              </div>
            </fieldset>

            <div class="jrn-prompts" id="editor-prompt-row" aria-label="Writing prompts">
              <span class="jrn-chip-label">Need a nudge?</span>
              ${PROMPTS.map((p) => `<button type="button" class="jrn-quick-chip jrn-quick-chip--${p.tone} editor-prompt-btn" data-prompt="${esc(p.text)}"><span aria-hidden="true">${p.emoji}</span>${esc(p.label)}</button>`).join('')}
            </div>

            <textarea id="entry-content" class="jrn-textarea" placeholder="Write freely. Nobody else sees this page…" required aria-label="Entry"></textarea>

            <div class="jrn-tagbox">
              <div class="jrn-tagrow" id="jrn-tagrow"></div>
              <input type="text" id="entry-tags" class="jrn-tag-input" placeholder="Add a tag and press Enter" aria-label="Add tag" maxlength="24" />
              <div class="jrn-suggest" id="jrn-suggest">${SUGGESTED_TAGS.map((t) => `<button type="button" data-add="${t}">+ ${t}</button>`).join('')}</div>
            </div>

            <div class="jrn-footer">
              <div class="jrn-stats"><span id="journal-word-count">0 words</span><span id="jrn-read">· 0 min read</span><span id="jrn-saved" class="jrn-saved" aria-live="polite"></span></div>
              <div class="jrn-footer-actions">
                ${!isNew ? `<button type="button" class="btn btn-ghost text-error btn-sm" id="btn-delete-entry">Delete</button>` : ''}
                <a href="/journal" class="btn btn-secondary btn-sm">Cancel</a>
                <button type="submit" class="btn btn-primary" id="btn-save-entry">Save entry</button>
              </div>
            </div>
          </form>
        </div>
      </main>
      ${Footer.render()}`;
  },

  async afterRender(params) {
    this._cleanupNavbar = initNavbar();
    const isNew = !params.id || params.id === 'new';
    const $ = (id) => document.getElementById(id);
    const titleEl = $('entry-title'), contentEl = $('entry-content'), tagInput = $('entry-tags'), saveBtn = $('btn-save-entry');
    let mood = '', tags = [], timer = null, saved = false;

    const renderTags = () => {
      $('jrn-tagrow').innerHTML = tags.map((t) => `<span class="jrn-tag-pill">#${esc(t)}<button type="button" data-rm="${esc(t)}" aria-label="Remove ${esc(t)}">×</button></span>`).join('');
      $('jrn-suggest').querySelectorAll('button').forEach((b) => { b.hidden = tags.some((t) => t.toLowerCase() === b.dataset.add.toLowerCase()); });
    };
    const addTag = (t) => { t = t.trim().replace(/^#/, ''); if (t && tags.length < 8 && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) { tags.push(t); renderTags(); touch(); } };
    const setMood = (m) => { mood = mood === m ? '' : m; $('jrn-moods').querySelectorAll('button').forEach((b) => { const on = b.dataset.mood === mood; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on); }); touch(); };
    const stats = () => {
      const w = contentEl.value.trim().split(/\s+/).filter(Boolean).length;
      $('journal-word-count').textContent = `${w} ${w === 1 ? 'word' : 'words'}`;
      $('jrn-read').textContent = `· ${Math.max(w ? 1 : 0, Math.round(w / 200))} min read`;
    };
    const autosize = () => { contentEl.style.height = 'auto'; contentEl.style.height = `${Math.max(280, contentEl.scrollHeight)}px`; };
    // Draft autosave is only for brand-new entries
    const touch = () => { stats(); autosize(); if (!isNew) return; clearTimeout(timer); timer = setTimeout(() => { if (titleEl.value || contentEl.value) { store.set({ title: titleEl.value, content: contentEl.value, mood, tags }); $('jrn-saved').textContent = '· draft saved on this device'; } }, 700); };

    // Load existing entry or restore draft / chosen prompt
    if (!isNew) {
      try {
        const e = await journalsApi.getJournal(params.id);
        titleEl.value = e.title || ''; contentEl.value = e.content || ''; tags = [...(e.tags || [])]; if (e.mood_level) setMood(e.mood_level);
      } catch (err) { Toast.error('Could not load this entry.'); navigate('/journal'); return; }
    } else {
      let prompt = null; try { prompt = sessionStorage.getItem('serenova_journal_prompt'); sessionStorage.removeItem('serenova_journal_prompt'); } catch (e) { /* ignore */ }
      const d = store.get();
      if (d && (d.title || d.content) && !prompt) { titleEl.value = d.title || ''; contentEl.value = d.content || ''; tags = d.tags || []; if (d.mood) setMood(d.mood); $('jrn-saved').textContent = '· restored your unsaved draft'; }
      else if (prompt) contentEl.value = `${prompt}\n\n`;
    }
    renderTags(); stats(); autosize();
    this._dockOff = attachEmojiDock($('jrn-moods'));
    (isNew ? titleEl : contentEl).focus();

    $('jrn-moods').addEventListener('click', (e) => { const b = e.target.closest('[data-mood]'); if (b) setMood(b.dataset.mood); });
    $('editor-prompt-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-prompt]'); if (!b) return;
      const v = contentEl.value.trim(); contentEl.value = `${v}${v ? '\n\n' : ''}${b.dataset.prompt} `;
      contentEl.focus(); contentEl.setSelectionRange(contentEl.value.length, contentEl.value.length); touch();
    });
    $('jrn-suggest').addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (b) addTag(b.dataset.add); });
    $('jrn-tagrow').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { tags = tags.filter((t) => t !== b.dataset.rm); renderTags(); touch(); } });
    tagInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput.value); tagInput.value = ''; } });
    tagInput.addEventListener('blur', () => { if (tagInput.value.trim()) { addTag(tagInput.value); tagInput.value = ''; } });
    contentEl.addEventListener('input', touch); titleEl.addEventListener('input', touch);
    $('jrn-focus-toggle').addEventListener('click', (e) => { const on = document.body.classList.toggle('jrn-focus'); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'Exit focus' : 'Focus mode'; });

    $('journal-editor-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = titleEl.value.trim() || 'Untitled', content = contentEl.value.trim();
      if (!content) { Toast.error('Write a little something first.'); contentEl.focus(); return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      const body = { title, content, mood_level: mood || null, tags };
      try {
        if (isNew) await journalsApi.createJournal(body); else await journalsApi.updateJournal(params.id, body);
        saved = true; store.clear(); Toast.success(isNew ? 'Saved to your journal.' : 'Entry updated.'); navigate('/journal');
      } catch (err) { Toast.error(err.message || 'Could not save this entry.'); saveBtn.disabled = false; saveBtn.textContent = 'Save entry'; }
    });
    $('btn-delete-entry')?.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Delete this entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
      try { await journalsApi.deleteJournal(params.id); Toast.info('Entry removed.'); navigate('/journal'); } catch (err) { Toast.error('Could not delete this entry.'); }
    });
  },

  destroy() { document.body.classList.remove('jrn-focus'); this._dockOff?.(); this._cleanupNavbar?.(); },
};
