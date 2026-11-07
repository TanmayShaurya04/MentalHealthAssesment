import { journalsApi } from '../api/journals.js';
import { confirmDialog } from '../components/Dialog.js';
import { Toast } from '../components/Toast.js';
import { router } from '../router.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const JournalEntry = {
  _cleanupNavbar: null,

  render(params) {
    const isNew = !params.id || params.id === 'new';

    return `
      ${Navbar.render()}

      <main class="journal-editor-page page-root" id="main-content">
        <div class="container container--narrow editor-container">

          <div class="editor-top-nav">
            <a href="/journal" class="btn btn-ghost btn-sm">← Back to Journal</a>
            <span class="editor-privacy-indicator">🔒 Encrypted & Private</span>
          </div>

          <form id="journal-editor-form" class="journal-editor-card card mt-4">
            <div id="editor-status" class="editor-status-bar" style="display:none;"></div>

            <div class="form-group">
              <input
                type="text"
                id="entry-title"
                class="editor-title-input"
                placeholder="Title your thoughts..."
                required
              />
            </div>

            <div class="editor-meta-row">
              <div class="meta-item">
                <label for="entry-mood" class="form-label text-xs">Associated Mood</label>
                <select id="entry-mood" class="form-select form-select-sm">
                  <option value="">No specific mood</option>
                  <option value="very_low">Very Low</option>
                  <option value="low">Low</option>
                  <option value="neutral">Neutral</option>
                  <option value="good">Good</option>
                  <option value="very_good">Very Good</option>
                </select>
              </div>

              <div class="meta-item flex-1">
                <label for="entry-tags" class="form-label text-xs">Tags (comma separated)</label>
                <input
                  type="text"
                  id="entry-tags"
                  class="form-input form-input-sm"
                  placeholder="e.g. Midterms, Gratitude, Sleep"
                />
              </div>
            </div>

            <div class="form-group mt-4">
              <textarea
                id="entry-content"
                class="editor-content-textarea"
                placeholder="Write freely. No one else has access to this space..."
                required
              ></textarea>
            </div>

            <div class="editor-actions-row">
              ${!isNew ? `
                <button type="button" class="btn btn-ghost text-error btn-sm" id="btn-delete-entry">Delete entry</button>
              ` : `<span></span>`}
              <div class="flex-gap-2">
                <a href="/journal" class="btn btn-secondary btn-sm">Cancel</a>
                <button type="submit" class="btn btn-primary btn-sm" id="btn-save-entry">Save reflection</button>
              </div>
            </div>
          </form>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender(params) {
    this._cleanupNavbar = initNavbar();

    const isNew = !params.id || params.id === 'new';
    const form = document.getElementById('journal-editor-form');
    const titleInput = document.getElementById('entry-title');
    const moodSelect = document.getElementById('entry-mood');
    const tagsInput = document.getElementById('entry-tags');
    const contentInput = document.getElementById('entry-content');
    const saveBtn = document.getElementById('btn-save-entry');
    const deleteBtn = document.getElementById('btn-delete-entry');

    // If editing existing entry, load it
    if (!isNew) {
      try {
        const entry = await journalsApi.getJournal(params.id);
        titleInput.value = entry.title || '';
        if (entry.mood_level) moodSelect.value = entry.mood_level;
        if (entry.tags) tagsInput.value = entry.tags.join(', ');
        contentInput.value = entry.content || '';
      } catch (e) {
        Toast.error('Could not load journal entry.');
        router.navigate('/journal');
      }
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      const mood_level = moodSelect.value || null;
      const rawTags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

      try {
        if (isNew) {
          await journalsApi.createJournal({
            title,
            content,
            mood_level,
            tags: rawTags
          });
          Toast.success('Reflection saved to your journal.');
        } else {
          await journalsApi.updateJournal(params.id, {
            title,
            content,
            mood_level,
            tags: rawTags
          });
          Toast.success('Reflection updated.');
        }
        router.navigate('/journal');
      } catch (err) {
        Toast.error(err.message || 'Failed to save reflection.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save reflection';
      }
    });

    deleteBtn?.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Delete this entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
      try {
        await journalsApi.deleteJournal(params.id);
        Toast.info('Journal entry removed.');
        router.navigate('/journal');
      } catch (err) {
        Toast.error('Failed to delete entry.');
      }
    });
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
