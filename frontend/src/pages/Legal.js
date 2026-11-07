import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';

function shell(title, updated, body) {
  return `
    ${Navbar.render()}
    <main class="page-root legal-page" id="main-content">
      <div class="container legal-container">
        <p class="auth-eyebrow">Last updated ${updated}</p>
        <h1 class="legal-title">${title}</h1>
        <div class="prose">${body}</div>
      </div>
    </main>
    ${Footer.render()}`;
}
const mk = (render) => ({ _c: null, render, afterRender() { this._c = initNavbar(); }, destroy() { this._c?.(); } });

export const Privacy = mk(() => shell('Privacy Policy', '6 November 2026', `
  <p>Serenova is a student well-being platform. This page explains in plain words what we keep, who can see it, and how you stay in control. <em>This is a project template: have it reviewed by your institution's legal team and replace the contact details before launch.</em></p>
  <h2>What we store</h2>
  <ul>
    <li><strong>Account:</strong> name, email, university, year of study, and a securely hashed password.</li>
    <li><strong>Your records:</strong> mood logs, journal entries, screening answers and results, AI companion chats, and appointment requests.</li>
    <li><strong>Settings:</strong> theme, language, reminder preference, and the date you accepted these terms.</li>
  </ul>
  <h2>Who can see it</h2>
  <ul>
    <li><strong>Only you</strong> can read your journal, mood logs, screening results and chats.</li>
    <li><strong>A counsellor</strong> you book sees your name, university and the note you wrote in the booking form. Nothing else.</li>
    <li><strong>Administrators</strong> see only anonymous counts (for example "how many students took a screening"). Groups smaller than five are hidden.</li>
  </ul>
  <h2>Safety messages</h2>
  <p>If something you write suggests you may be in danger, Serenova shows helpline numbers. We record only that this happened (when, and in which feature), <strong>never what you wrote and never who you are</strong>.</p>
  <h2>AI companion</h2>
  <p>Messages you send to the companion may be processed by an AI provider to produce a reply. The companion is not a therapist and can make mistakes.</p>
  <h2>Your controls</h2>
  <ul>
    <li><strong>Download</strong> everything we hold about you from Settings → Your data.</li>
    <li><strong>Delete</strong> your account and all records permanently from Settings. This cannot be undone.</li>
    <li><strong>Reminders</strong> by email are off unless you turn them on.</li>
  </ul>
  <h2>Security</h2>
  <p>Sessions use secure, httpOnly cookies. Passwords are hashed with bcrypt. Connections should always use HTTPS in production.</p>
  <h2>Contact</h2>
  <p>Questions or requests: <strong>[your support email here]</strong>.</p>`));

export const Terms = mk(() => shell('Terms of Use', '6 November 2026', `
  <p><em>Project template: have it reviewed before launch.</em></p>
  <h2>What Serenova is</h2>
  <p>A self-help and support tool for students. It offers mood tracking, journaling, a non-diagnostic screening, an AI companion, resources and a way to request counselling.</p>
  <h2>What it is not</h2>
  <ul>
    <li>It is <strong>not</strong> a medical or emergency service and does not diagnose or treat any condition.</li>
    <li>Screening results are for reflection. Only a qualified professional can assess your health.</li>
    <li>The AI companion is not a therapist and can be wrong.</li>
  </ul>
  <h2>If you are in danger</h2>
  <p>Call <strong>112</strong> for emergencies, or <strong>Tele-MANAS 14416</strong> (free, 24x7). Do not wait for a reply from Serenova.</p>
  <h2>Using your account</h2>
  <ul>
    <li>Keep your password private and use accurate details when you book.</li>
    <li>Do not use Serenova to harass others or to share anyone else's personal information.</li>
    <li>Counselling sessions depend on counsellor availability and are confirmed by the counsellor.</li>
  </ul>
  <h2>Ending your use</h2>
  <p>You can delete your account at any time from Settings.</p>`));
