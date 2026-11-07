import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { icon } from '../components/icons.js';
import { photo } from '../assets/images.js';

export const About = {
  _c: null,
  render() {
    const pillars = [
      ['shield', 'Private by design', 'Your journal and chats are visible only to you. Counsellors see just what you share in a booking.'],
      ['heart', 'Gentle, not clinical', 'Tools for reflection and early support. We never diagnose, and we point to people when it matters.'],
      ['users', 'Real humans nearby', 'Book a counsellor, or reach a free 24x7 helpline from any page.'],
      ['chart', 'Built on standard scales', 'The screening uses PHQ-9 and GAD-7 with their published cut-points, plus a short student check-in.'],
    ];
    return `
      ${Navbar.render()}
      <main class="page-root legal-page" id="main-content">
        <div class="container legal-container">
          <p class="auth-eyebrow">About</p>
          <h1 class="legal-title">A calmer place to check in with yourself</h1>
          <div class="about-hero">${photo('walk', { w: 1000 })}</div>
          <p class="about-lead">Serenova began as a student project to make early mental-health support easier to reach on campus: private, free to start, and kind in tone.</p>
          <div class="about-grid">
            ${pillars.map(([i, h, p]) => `<div class="about-card"><span class="about-card-icon">${icon(i, { size: 22 })}</span><h2>${h}</h2><p>${p}</p></div>`).join('')}
          </div>
          <div class="callout"><strong>Important:</strong> Serenova is not a medical or emergency service. In an emergency call 112; for free support any time call Tele-MANAS 14416.</div>
        </div>
      </main>
      ${Footer.render()}`;
  },
  afterRender() { this._c = initNavbar(); },
  destroy() { this._c?.(); },
};
