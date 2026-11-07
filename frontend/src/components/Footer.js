/**
 * Footer.js — Serenova site footer
 *
 * Dark-background footer with nav links, tagline, and mandatory disclaimer.
 * The disclaimer is critical — this platform is NOT a medical service.
 */

export const Footer = {
  render() {
    const year = new Date().getFullYear();

    return `
      <footer class="footer" aria-label="Site footer">
        <div class="container">

          <div class="footer-grid">

            <!-- Brand column -->
            <div class="footer-brand">
              <div class="footer-logo">
                <span class="footer-logo-mark"><img class="brand-mark-image" src="/serenova-mark.svg" alt="" aria-hidden="true" /></span>
                <span class="footer-logo-text">Serenova</span>
              </div>
              <p class="footer-tagline">
                A private digital space for student well-being.
                Not a medical service.
              </p>
            </div>

            <!-- Navigation column -->
            <nav aria-label="Footer navigation">
              <p class="footer-heading">Platform</p>
              <ul class="footer-links">
                <li><a href="/#how-it-works" class="footer-link">How it works</a></li>
                <li><a href="/resources"      class="footer-link">Resources</a></li>
                <li><a href="/auth/register"  class="footer-link">Get started</a></li>
                <li><a href="/auth/login"     class="footer-link">Sign in</a></li>
              </ul>
            </nav>

            <!-- Support column -->
            <nav aria-label="Support navigation">
              <p class="footer-heading">Support</p>
              <ul class="footer-links">
                <li><a href="/resources" class="footer-link">Well-being resources</a></li>
                <li><a href="/appointments" class="footer-link">Book support</a></li>
              </ul>
            </nav>

          </div>

          <!-- Bottom bar -->
          <div class="footer-bottom">
            <p class="footer-copyright">© ${year} Serenova. All rights reserved.</p>
            <p class="footer-disclaimer">
              Serenova is a well-being support tool, not a medical or clinical service.
              AI responses are general supportive information only and do not constitute
              professional mental health advice, diagnosis, or treatment.
              If you are in crisis or need immediate help, please contact a qualified
              professional or emergency service.
            </p>
          </div>

        </div>
      </footer>
    `;
  },
};
