import { resourcesApi } from '../api/resources.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Resources = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="resources-page page-root" id="main-content">
        <div class="container resources-container">

          <header class="page-header">
            <span class="section-eyebrow">Curated Guides</span>
            <h1 class="page-title">Well-Being & Student Life Resources</h1>
            <p class="page-subtitle">
              Evidence-informed reflections and grounded practices for surviving and thriving in university.
            </p>
          </header>

          <!-- Category Filter Bar -->
          <div class="resources-filter-bar">
            <button type="button" class="res-filter-btn active" data-cat="">All Guides</button>
            <button type="button" class="res-filter-btn" data-cat="study_stress">Academic Pressures</button>
            <button type="button" class="res-filter-btn" data-cat="sleep">Rest & Recovery</button>
            <button type="button" class="res-filter-btn" data-cat="emotional_balance">Emotional Health</button>
            <button type="button" class="res-filter-btn" data-cat="crisis">Verified Helplines</button>
          </div>

          <!-- Resources Grid -->
          <div id="resources-grid" class="resources-full-grid mt-8">
            <div class="loading-spinner">Loading resources...</div>
          </div>

        </div>

        <!-- Resource Reader Modal -->
        <div class="modal-backdrop" id="reader-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="reader-title">
          <div class="modal-card reader-modal-card">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow" id="reader-category">Category</span>
                <h3 id="reader-title" class="modal-title font-display text-2xl">Resource Title</h3>
              </div>
              <button type="button" class="modal-close-btn" id="close-reader-btn" aria-label="Close dialog">✕</button>
            </div>
            <div class="reader-modal-body" id="reader-body">
              <!-- Content injected here -->
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-close-reader-bottom">Done reading</button>
            </div>
          </div>
        </div>
      </main>

      ${Footer.render()}
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    let allResources = [];
    let currentCategory = '';
    const grid = document.getElementById('resources-grid');
    const filterBtns = document.querySelectorAll('.res-filter-btn');

    const modal = document.getElementById('reader-modal');
    const closeBtn = document.getElementById('close-reader-btn');
    const closeBottomBtn = document.getElementById('btn-close-reader-bottom');
    const readerTitle = document.getElementById('reader-title');
    const readerCat = document.getElementById('reader-category');
    const readerBody = document.getElementById('reader-body');

    function openReader(r) {
      if (!r || !modal) return;
      readerCat.textContent = r.category_label || r.category;
      readerTitle.textContent = r.title;
      // Convert markdown headers/bullets
      let html = r.content
        .replace(/### (.*?)\n/g, '<h4 class="font-display text-xl text-ink font-medium mt-4 mb-2">$1</h4>')
        .replace(/#### (.*?)\n/g, '<h5 class="text-base text-accent font-medium mt-3 mb-1">$1</h5>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/•\s/g, '<br>• ')
        .replace(/\n\n/g, '<p class="mt-3 leading-relaxed text-ink-80">')
        .replace(/\n/g, '<br>');

      readerBody.innerHTML = html;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeReader() {
      modal?.classList.remove('open');
      modal?.setAttribute('aria-hidden', 'true');
    }

    closeBtn?.addEventListener('click', closeReader);
    closeBottomBtn?.addEventListener('click', closeReader);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeReader();
    });

    async function loadResources() {
      try {
        allResources = await resourcesApi.listResources();
        renderResources();
      } catch (err) {
        grid.innerHTML = `<p class="error-text">Unable to load well-being resources.</p>`;
      }
    }

    function renderResources() {
      const filtered = currentCategory
        ? allResources.filter(r => r.category === currentCategory)
        : allResources;

      if (filtered.length === 0) {
        grid.innerHTML = `<p class="empty-text">No guides found in this category.</p>`;
        return;
      }

      grid.innerHTML = filtered.map(r => `
        <article class="card resource-full-card ${r.is_crisis_helpline ? 'card-crisis-highlight' : ''}" id="resource-${r.id}">
          <div class="card-header-row">
            <span class="badge ${r.is_crisis_helpline ? 'badge-accent' : 'badge-surface'}">${r.category_label || r.category}</span>
            <span class="text-xs text-ink-60">${r.read_time}</span>
          </div>

          <h3 class="resource-card-heading mt-3">${r.title}</h3>
          <p class="resource-card-summary text-ink-70 mt-2">${r.summary}</p>

          <div class="resource-card-tags mt-4">
            ${(r.tags || []).map(t => `<span class="tag-pill-xs">#${t}</span>`).join('')}
          </div>

          <div class="resource-card-footer mt-5">
            <button type="button" class="btn btn-primary btn-sm btn-read-resource" data-id="${r.id}">
              Read Guide →
            </button>
          </div>
        </article>
      `).join('');

      grid.querySelectorAll('.btn-read-resource').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = allResources.find(item => item.id === btn.dataset.id);
          openReader(r);
        });
      });
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderResources();
      });
    });

    loadResources();
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
