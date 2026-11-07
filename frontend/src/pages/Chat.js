import { chatApi } from '../api/chat.js';
import { Toast } from '../components/Toast.js';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

export const Chat = {
  _cleanupNavbar: null,

  render() {
    return `
      ${Navbar.render()}

      <main class="chat-page page-root" id="main-content">
        <div class="chat-layout-container">

          <!-- Sessions Sidebar -->
          <aside class="chat-sessions-sidebar" id="chat-sidebar">
            <div class="sidebar-header">
              <h3>Reflections</h3>
              <button type="button" class="btn btn-primary btn-sm btn-new-chat" id="btn-new-chat">+ New</button>
            </div>
            <div class="sessions-list" id="sessions-list">
              <div class="loading-spinner">Loading chats...</div>
            </div>
          </aside>

          <!-- Chat Window -->
          <section class="chat-main-window" aria-label="Conversation space">
            
            <header class="chat-window-header">
              <div>
                <h2 class="chat-header-title">Serenova Companion</h2>
                <span class="chat-header-sub">Non-diagnostic • Thoughtful reflection • Completely private</span>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="chat-helpline-trigger-btn">
                Emergency Helplines (14416)
              </button>
            </header>

          <div class="chat-disclaimer-pill" role="note">
              <span>Serenova is a support companion, not a doctor or therapist. It cannot diagnose or prescribe. Replies use what you share in this conversation and your recent check-in themes.</span>
            </div>

            <!-- Messages Stream -->
            <div class="chat-messages-stream" id="messages-stream">
              <!-- Dynamically populated messages -->
            </div>

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
                  placeholder="Share what's on your mind... (Press Enter to send, Shift+Enter for new line)"
                  rows="1"
                  required
                ></textarea>
                <button type="submit" class="btn btn-primary btn-send-chat" id="btn-send-message">
                  Send
                </button>
              </form>
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
    const sidebarEl = document.getElementById('sessions-list');
    const messagesEl = document.getElementById('messages-stream');
    const startersTray = document.getElementById('starters-tray');
    const sendForm = document.getElementById('chat-send-form');
    const inputEl = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('btn-send-message');
    const newChatBtn = document.getElementById('btn-new-chat');

    // Wire emergency modal button in chat
    document.getElementById('chat-helpline-trigger-btn')?.addEventListener('click', () => {
      document.getElementById('open-helpline-btn')?.click();
    });

    // Auto-expand textarea
    inputEl?.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });

    // Enter to submit
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendForm?.dispatchEvent(new Event('submit'));
      }
    });

    // 1. Load Sessions
    async function loadSessions() {
      try {
        sessions = await chatApi.listSessions();
        if (sessions.length === 0) {
          // Auto create initial session
          const initial = await chatApi.createSession('General Reflection');
          sessions = [initial];
        }
        renderSessions();
        if (!activeSessionId && sessions.length > 0) {
          selectSession(sessions[0].id);
        }
      } catch (err) {
        sidebarEl.innerHTML = `<p class="error-text">Unable to load conversations.</p>`;
      }
    }

    function renderSessions() {
      sidebarEl.innerHTML = sessions.map(s => `
        <div class="session-item ${s.id === activeSessionId ? 'active' : ''}" data-id="${s.id}">
          <span class="session-title-text">${s.title}</span>
          <button type="button" class="btn-delete-session" data-id="${s.id}" title="Delete chat" aria-label="Delete chat">✕</button>
        </div>
      `).join('');

      // Wire session clicks
      sidebarEl.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-delete-session')) return;
          selectSession(item.dataset.id);
        });
      });

      // Wire delete session
      sidebarEl.querySelectorAll('.btn-delete-session').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const sId = btn.dataset.id;
          if (!confirm('Delete this conversation history?')) return;
          try {
            await chatApi.deleteSession(sId);
            activeSessionId = null;
            loadSessions();
          } catch (e) {
            Toast.error('Could not delete session.');
          }
        });
      });
    }

    // 2. Select Session
    async function selectSession(sessionId) {
      activeSessionId = sessionId;
      renderSessions();
      messagesEl.innerHTML = `<div class="loading-spinner">Loading messages...</div>`;

      try {
        const msgs = await chatApi.getMessages(sessionId);
        renderMessages(msgs);
      } catch (e) {
        messagesEl.innerHTML = `<p class="error-text">Failed to load messages.</p>`;
      }
    }

    // 3. Render Messages
    function renderMessages(msgs) {
      if (msgs.length === 0) {
        messagesEl.innerHTML = `
          <div class="chat-empty-intro">
            <h3 class="font-display text-2xl text-accent font-medium">Hello there.</h3>
            <p class="text-ink-60 mt-2 max-w-md">
              Take a breath. What has been occupying your thoughts today? You can write a few sentences or explore a prompt below.
            </p>
          </div>
        `;
        startersTray.style.display = 'block';
      } else {
        startersTray.style.display = 'none';
        messagesEl.innerHTML = msgs.map(m => {
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
            </div>
          `;
        }).join('');
      }

      // Scroll to bottom
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function formatMessageContent(content) {
      // Basic markdown bold & list formatting
      let formatted = content
        .replace(/•\s/g, '<br>• ')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return formatted.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    }

    // 4. Starter pills
    document.querySelectorAll('.starter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        inputEl.value = btn.textContent.replace(/"/g, '');
        inputEl.focus();
      });
    });

    // 5. Send message
    sendForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = inputEl.value.trim();
      if (!content || !activeSessionId) return;

      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;

      // Append user bubble optimistically
      const tempUserRow = document.createElement('div');
      tempUserRow.className = 'chat-bubble-row chat-bubble-row--user';
      tempUserRow.innerHTML = `
        <div class="chat-bubble chat-bubble--user">
          <div class="chat-bubble-author">You</div>
          <div class="chat-bubble-content">${formatMessageContent(content)}</div>
        </div>
      `;
      startersTray.style.display = 'none';
      messagesEl.appendChild(tempUserRow);

      // Typing indicator
      const typingRow = document.createElement('div');
      typingRow.className = 'chat-bubble-row chat-bubble-row--assistant';
      typingRow.id = 'chat-typing-indicator';
      typingRow.innerHTML = `
        <div class="chat-bubble chat-bubble--assistant typing-bubble">
          <span class="typing-copy">Serenova is reflecting</span><span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
      `;
      messagesEl.appendChild(typingRow);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        await chatApi.sendMessage(activeSessionId, content);
        // Thoughtful reflection delay for a calm, natural conversational pace
        await new Promise(r => setTimeout(r, 650));
        const updatedMsgs = await chatApi.getMessages(activeSessionId);
        renderMessages(updatedMsgs);
      } catch (err) {
        document.getElementById('chat-typing-indicator')?.remove();
        Toast.error(err.message || 'Failed to send message.');
      } finally {
        sendBtn.disabled = false;
        inputEl.focus();
      }
    });

    // 6. New chat
    newChatBtn?.addEventListener('click', async () => {
      try {
        const session = await chatApi.createSession('New Conversation');
        sessions.unshift(session);
        selectSession(session.id);
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
