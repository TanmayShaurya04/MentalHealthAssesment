import { journalsApi } from '../api/journals.js';
import { Toast } from '../components/Toast.js';
import { router } from '../router.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Journal = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="journal-page page-root" id="main-content">
        <div class="container journal-container">

          <header class="page-header flex-between">
            <div>
              <span class="section-eyebrow">Private Pages</span>
              <h1 class="page-title">Personal Journal</h1>
              <p class="page-subtitle">
                An encrypted, private sanctuary for your raw, unedited thoughts.
              </p>
            </div>
            <div>
              <a href="/journal/new" class="btn btn-primary btn-lg">+ Write Reflection</a>
            </div>
          </header>

          <!-- Search and Filter Bar -->
          <div class="journal-toolbar">
            <div class="search-input-wrap">
              <input
                type="text"
                id="journal-search-input"
                class="form-input"
                placeholder="Search reflections by title or content..."
              />
            </div>
            <div id="journal-tag-chips" class="journal-tag-chips">
              <!-- Dynamically populated tags -->
            </div>
          </div>

          <!-- Entries Grid -->
          <div id="journal-entries-grid" class="journal-entries-grid mt-6">
            <div class="loading-spinner">Opening your journal...</div>
          </div>

        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    let allEntries = [];
    let selectedTag = null;
    const grid = document.getElementById('journal-entries-grid');
    const searchInput = document.getElementById('journal-search-input');
    const tagsContainer = document.getElementById('journal-tag-chips');

    async function loadJournals() {
      try {
        allEntries = await journalsApi.listJournals();
        renderTags();
        filterAndRender();
      } catch (err) {
        grid.innerHTML = `<p class="error-text">Unable to load journal reflections at this time.</p>`;
      }
    }

    function renderTags() {
      if (!tagsContainer) return;
      const tagsSet = new Set();
      allEntries.forEach(e => (e.tags || []).forEach(t => tagsSet.add(t)));

      if (tagsSet.size === 0) {
        tagsContainer.innerHTML = '';
        return;
      }

      const tagsArray = Array.from(tagsSet);
      tagsContainer.innerHTML = `
        <button type="button" class="tag-chip ${!selectedTag ? 'active' : ''}" data-tag="">All</button>
        ${tagsArray.map(t => `
          <button type="button" class="tag-chip ${selectedTag === t ? 'active' : ''}" data-tag="${t}">#${t}</button>
        `).join('')}
      `;

      tagsContainer.querySelectorAll('.tag-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedTag = btn.dataset.tag || null;
          renderTags();
          filterAndRender();
        });
      });
    }

    function filterAndRender() {
      const q = searchInput?.value.toLowerCase().trim() || '';

      const filtered = allEntries.filter(entry => {
        const matchesQuery = !q ||
          entry.title.toLowerCase().includes(q) ||
          entry.content.toLowerCase().includes(q);

        const matchesTag = !selectedTag || (entry.tags || []).includes(selectedTag);
        return matchesQuery && matchesTag;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <p>No journal reflections found.</p>
            <a href="/journal/new" class="btn btn-primary btn-sm mt-3">Start your first reflection</a>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(j => {
        const dateStr = new Date(j.created_at).toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
        return `
          <article class="card journal-card" id="journal-${j.id}">
            <div class="journal-card-header">
              <span class="journal-card-date">${dateStr}</span>
              ${j.mood_level ? `<span class="badge badge-surface">${j.mood_level.replace('_', ' ')}</span>` : ''}
            </div>

            <h3 class="journal-card-title">${j.title}</h3>
            <p class="journal-card-content">${j.content.slice(0, 180)}${j.content.length > 180 ? '...' : ''}</p>

            ${(j.tags || []).length > 0 ? `
              <div class="journal-card-tags">
                ${j.tags.map(t => `<span class="badge badge-surface">#${t}</span>`).join('')}
              </div>
            ` : ''}

            <div class="journal-card-footer">
              <a href="/journal/${j.id}" class="btn btn-outline btn-sm">Read & Edit</a>
              <button type="button" class="btn-ghost btn-sm btn-delete-journal text-error" data-id="${j.id}">Delete</button>
            </div>
          </article>
        `;
      }).join('');

      // Wire delete
      grid.querySelectorAll('.btn-delete-journal').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) return;
          try {
            await journalsApi.deleteJournal(btn.dataset.id);
            Toast.info('Journal entry deleted.');
            loadJournals();
          } catch (e) {
            Toast.error('Could not delete journal entry.');
          }
        });
      });
    }

    searchInput?.addEventListener('input', filterAndRender);
    loadJournals();
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
