import { chatApi } from '../api/chat.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { esc } from '../utils/html.js';

/**
 * Topic labels. These mirror backend/app/services/topic_classifier.py:
 * the server files each conversation under one of these topics.
 */
const TOPICS = {
  academic:  { label: 'Academics & exams',       color: 'var(--color-saffron)' },
  anxiety:   { label: 'Anxiety & worry',         color: 'var(--color-accent)' },
  sleep:     { label: 'Sleep & energy',          color: '#6F86A8' },
  belonging: { label: 'Loneliness & belonging',  color: 'var(--color-rose)' },
  low_mood:  { label: 'Low mood & self-worth',   color: '#8E7AA8' },
  calm:      { label: 'Calming & grounding',     color: 'var(--color-sage)' },
  general:   { label: 'General reflection',      color: 'var(--color-ink-40)' },
};
const topicOf = (s) => TOPICS[s.topic] || TOPICS.general;

/** Group sessions into Today / Yesterday / Previous 7 days / Earlier by last activity. */
function groupByDate(sessions) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const DAY = 86400000;
  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Earlier', items: [] },
  ];
  sessions.forEach((s) => {
    const diff = Math.floor((today - startOfDay(new Date(s.updated_at))) / DAY);
    const idx = diff <= 0 ? 0 : diff === 1 ? 1 : diff <= 7 ? 2 : 3;
    groups[idx].items.push(s);
  });
  return groups.filter((g) => g.items.length);
}

export const Chat = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="chat-page page-root" id="main-content">
        <div class="chat-layout-container">

          <div class="chat-sidebar-scrim" id="chat-sidebar-scrim"></div>

          <!-- Sessions Sidebar -->
          <aside class="chat-sessions-sidebar" id="chat-sidebar" aria-label="Your conversations">
            <div class="sidebar-header">
              <h3>Reflections</h3>
              <button type="button" class="btn btn-primary btn-sm btn-new-chat" id="btn-new-chat">+ New</button>
            </div>
            <div class="topic-filter-row" id="topic-filters" role="toolbar" aria-label="Filter conversations by topic"></div>
            <div class="sessions-list" id="sessions-list">
              <div class="loading-spinner">Loading chats...</div>
            </div>
          </aside>

          <!-- Chat Window -->
          <section class="chat-main-window" aria-label="Conversation space">

            <header class="chat-window-header">
              <button type="button" class="chat-sidebar-toggle" id="chat-sidebar-toggle" aria-controls="chat-sidebar" aria-expanded="false">
                <span aria-hidden="true">☰</span> Chats
              </button>
              <div class="chat-header-text">
                <h2 class="chat-header-title">Serenova Companion</h2>
                <span class="chat-header-sub" id="chat-header-topic">Non-diagnostic • Thoughtful reflection • Completely private</span>
              </div>
              <button type="button" class="btn btn-secondary btn-sm chat-helpline-btn" id="chat-helpline-trigger-btn">
                Helplines (14416)
              </button>
            </header>

            <div class="chat-disclaimer-pill" role="note">
              <span>Serenova is an AI support companion, not a doctor or therapist. It cannot provide a clinical diagnosis or medical prescriptions.</span>
            </div>

            <!-- Messages Stream -->
            <div class="chat-messages-stream" id="messages-stream" aria-live="polite"></div>

            <!-- Suggested Starters (shown if no messages) -->
            <div class="chat-starters-tray" id="starters-tray" style="display:none;">
              <span class="starters-title">Prompt ideas:</span>
              <div class="starters-pills">
                <button type="button" class="starter-btn">"I'm feeling overwhelmed by university deadlines."</button>
                <button type="button" class="starter-btn">"Can you guide me through a 2-minute calm breath?"</button>
                <button type="button" class="starter-btn">"I feel like I don't belong and everyone is doing better than me."</button>
                <button type="button" class="starter-btn">"I'm having a hard time unwinding before sleep."</button>
              </div>
            </div>

            <!-- Input Bar -->
            <footer class="chat-input-footer">
              <form id="chat-send-form" class="chat-input-form">
                <textarea
                  id="chat-message-input"
                  class="chat-textarea"
                  placeholder="Share what's on your mind…"
                  aria-label="Your message"
                  rows="1"
                  maxlength="2000"
                  required
                ></textarea>
                <button type="submit" class="btn btn-primary btn-send-chat" id="btn-send-message">
                  Send
                </button>
              </form>
              <p class="chat-input-hint">Enter to send · Shift+Enter for a new line</p>
            </footer>

          </section>

        </div>
      </main>
    `;
  },

  async afterRender() {
    this._cleanupNavbar = initNavbar();

    let sessions = [];
    let activeSessionId = null;
    let topicFilter = '';
    const sidebarEl = document.getElementById('sessions-list');
    const sidebar = document.getElementById('chat-sidebar');
    const scrim = document.getElementById('chat-sidebar-scrim');
    const sidebarToggle = document.getElementById('chat-sidebar-toggle');
    const filtersEl = document.getElementById('topic-filters');
    const headerTopic = document.getElementById('chat-header-topic');
    const messagesEl = document.getElementById('messages-stream');
    const startersTray = document.getElementById('starters-tray');
    const sendForm = document.getElementById('chat-send-form');
    const inputEl = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('btn-send-message');
    const newChatBtn = document.getElementById('btn-new-chat');

    // Mobile: sessions live in a slide-over panel
    function setSidebar(open) {
      sidebar.classList.toggle('is-open', open);
      scrim.classList.toggle('is-open', open);
      sidebarToggle.setAttribute('aria-expanded', String(open));
    }
    sidebarToggle?.addEventListener('click', () => setSidebar(!sidebar.classList.contains('is-open')));
    scrim?.addEventListener('click', () => setSidebar(false));

    document.getElementById('chat-helpline-trigger-btn')?.addEventListener('click', () => {
      document.getElementById('open-helpline-btn')?.click();
    });

    // Auto-expand textarea
    inputEl?.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
    });

    // Enter to submit
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendForm?.requestSubmit();
      }
    });

    // ── Sessions ────────────────────────────────────────────────
    async function loadSessions({ selectFirst = true } = {}) {
      try {
        sessions = await chatApi.listSessions();
        if (sessions.length === 0) {
          const initial = await chatApi.createSession('General Reflection');
          sessions = [initial];
        }
        renderFilters();
        renderSessions();
        if (selectFirst && !activeSessionId && sessions.length > 0) {
          selectSession(sessions[0].id);
        }
      } catch (err) {
        sidebarEl.innerHTML = `<p class="error-text">Unable to load conversations.</p>`;
      }
    }

    function renderFilters() {
      const counts = sessions.reduce((acc, s) => ({ ...acc, [s.topic || 'general']: (acc[s.topic || 'general'] || 0) + 1 }), {});
      const used = Object.keys(TOPICS).filter((k) => counts[k]);
      if (used.length < 2 && !topicFilter) { filtersEl.innerHTML = ''; return; }
      filtersEl.innerHTML = [
        `<button type="button" class="topic-chip ${topicFilter === '' ? 'active' : ''}" data-topic="">All <span>${sessions.length}</span></button>`,
        ...used.map((k) => `
          <button type="button" class="topic-chip ${topicFilter === k ? 'active' : ''}" data-topic="${k}">
            <i class="topic-dot" style="background:${TOPICS[k].color}"></i>${TOPICS[k].label} <span>${counts[k]}</span>
          </button>`),
      ].join('');
      filtersEl.querySelectorAll('.topic-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          topicFilter = chip.dataset.topic;
          renderFilters();
          renderSessions();
        });
      });
    }

    function renderSessions() {
      const visible = topicFilter ? sessions.filter((s) => (s.topic || 'general') === topicFilter) : sessions;
      if (visible.length === 0) {
        sidebarEl.innerHTML = `<p class="sessions-empty">No conversations under this topic yet.</p>`;
        return;
      }
      sidebarEl.innerHTML = groupByDate(visible).map((g) => `
        <div class="session-group">
          <h4 class="session-group-label">${g.label}</h4>
          ${g.items.map((s) => {
            const t = topicOf(s);
            return `
            <div class="session-item ${s.id === activeSessionId ? 'active' : ''}" data-id="${esc(s.id)}" role="button" tabindex="0">
              <i class="topic-dot" style="background:${t.color}" aria-hidden="true"></i>
              <span class="session-main">
                <span class="session-title-text">${esc(s.title)}</span>
                <span class="session-meta">${t.label} · ${s.message_count || 0} msg${s.has_crisis ? ' · <b class="session-crisis">support shared</b>' : ''}</span>
              </span>
              <button type="button" class="btn-delete-session" data-id="${esc(s.id)}" title="Delete chat" aria-label="Delete chat ${esc(s.title)}">✕</button>
            </div>`;
          }).join('')}
        </div>
      `).join('');

      sidebarEl.querySelectorAll('.session-item').forEach((item) => {
        const open = () => { selectSession(item.dataset.id); setSidebar(false); };
        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-delete-session')) return;
          open();
        });
        item.addEventListener('keydown', (e) => {
          if (e.target !== item) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      });

      sidebarEl.querySelectorAll('.btn-delete-session').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Delete this conversation history?')) return;
          try {
            await chatApi.deleteSession(btn.dataset.id);
            if (btn.dataset.id === activeSessionId) activeSessionId = null;
            await loadSessions();
          } catch (err) {
            Toast.error('Could not delete session.');
          }
        });
      });
    }

    function updateHeader() {
      const s = sessions.find((x) => x.id === activeSessionId);
      headerTopic.textContent = s && (s.message_count || 0) > 0
        ? `Topic: ${topicOf(s).label} • Private to you`
        : 'Non-diagnostic • Thoughtful reflection • Completely private';
    }

    async function selectSession(sessionId) {
      activeSessionId = sessionId;
      renderSessions();
      updateHeader();
      messagesEl.innerHTML = `<div class="loading-spinner">Loading messages...</div>`;
      try {
        const msgs = await chatApi.getMessages(sessionId);
        renderMessages(msgs);
      } catch (e) {
        messagesEl.innerHTML = `<p class="error-text">Failed to load messages.</p>`;
      }
    }

    // ── Messages ────────────────────────────────────────────────
    function formatMessageContent(content) {
      // Escape first, then re-apply the small amount of formatting we support
      return esc(content)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/•\s/g, '<br>• ')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
    }

    function bubbleHtml(m) {
      const isUser = m.role === 'user';
      return `
        <div class="chat-bubble-row ${isUser ? 'chat-bubble-row--user' : 'chat-bubble-row--assistant'}">
          <div class="chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'} ${m.safety_flagged ? 'chat-bubble--crisis' : ''}">
            <div class="chat-bubble-author">${isUser ? 'You' : 'Serenova'}</div>
            <div class="chat-bubble-content">${formatMessageContent(m.content)}</div>
            ${m.safety_flagged ? `
              <div class="crisis-fast-dial mt-3">
                <a href="tel:14416" class="btn btn-primary btn-sm">Call Tele-MANAS (14416)</a>
                <a href="tel:9152987821" class="btn btn-secondary btn-sm">Call iCall (9152987821)</a>
              </div>
            ` : ''}
          </div>
        </div>`;
    }

    function renderMessages(msgs) {
      if (msgs.length === 0) {
        messagesEl.innerHTML = `
          <div class="chat-empty-intro">
            <div class="chat-empty-orb" aria-hidden="true"></div>
            <h3 class="font-display text-2xl text-accent font-medium">Hello there.</h3>
            <p class="text-ink-60 mt-2 max-w-md">
              Take a breath. What has been occupying your thoughts today? You can write a few sentences or explore a prompt below.
            </p>
          </div>
        `;
        startersTray.style.display = 'block';
      } else {
        startersTray.style.display = 'none';
        messagesEl.innerHTML = msgs.map(bubbleHtml).join('');
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    document.querySelectorAll('.starter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        inputEl.value = btn.textContent.replace(/"/g, '');
        inputEl.focus();
      });
    });

    // ── Send ────────────────────────────────────────────────────
    sendForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = inputEl.value.trim();
      if (!content || !activeSessionId || sendBtn.disabled) return;

      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;

      messagesEl.querySelector('.chat-empty-intro')?.remove();
      startersTray.style.display = 'none';
      messagesEl.insertAdjacentHTML('beforeend', bubbleHtml({ role: 'user', content }));
      messagesEl.insertAdjacentHTML('beforeend', `
        <div class="chat-bubble-row chat-bubble-row--assistant" id="chat-typing-indicator">
          <div class="chat-bubble chat-bubble--assistant typing-bubble" aria-label="Serenova is reflecting">
            <span class="typing-dots"><i></i><i></i><i></i></span>
          </div>
        </div>`);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        await chatApi.sendMessage(activeSessionId, content);
        const updatedMsgs = await chatApi.getMessages(activeSessionId);
        renderMessages(updatedMsgs);
        // Title / topic / crisis marker may have changed on the server
        sessions = await chatApi.listSessions();
        renderFilters();
        renderSessions();
        updateHeader();
      } catch (err) {
        document.getElementById('chat-typing-indicator')?.remove();
        Toast.error(err.message || 'Failed to send message.');
      } finally {
        sendBtn.disabled = false;
        inputEl.focus();
      }
    });

    newChatBtn?.addEventListener('click', async () => {
      try {
        const session = await chatApi.createSession('New Conversation');
        sessions.unshift(session);
        topicFilter = '';
        renderFilters();
        await selectSession(session.id);
        setSidebar(false);
        inputEl.focus();
      } catch (e) {
        Toast.error('Could not create session.');
      }
    });

    loadSessions();
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
  }
};
