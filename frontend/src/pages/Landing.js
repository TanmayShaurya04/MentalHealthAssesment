/**
 * Landing.js — Serenova Landing Page
 *
 * Renders all 12 landing page sections:
 *   1. Navbar
 *   2. Hero (editorial heading + EmotionalWeather canvas)
 *   3. Philosophy strip
 *   4. How it works (numbered steps)
 *   5. Feature: Mood tracking
 *   6. Feature: Journal
 *   7. Feature: AI companion
 *   8. Feature: Self-assessment
 *   9. Resources preview
 *  10. Privacy & safety
 *  11. CTA
 *  12. Footer
 *
 * afterRender() initialises all interactivity.
 * destroy() cleans up all listeners and animation frames.
 */

import '../styles/landing.css';
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { photo } from '../assets/images.js';

/* ──────────────────────────────────────────────────────────────
   EMOTIONAL WEATHER CANVAS
   Abstract atmospheric animation with 5 emotional states.
   Uses 4 overlapping radial-gradient blobs on a warm ivory canvas.
   ────────────────────────────────────────────────────────────── */

class EmotionalWeather {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.t      = 0;
    this.raf    = null;
    this.current = 'calm';
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 4 blobs — each has its own orbit offset and size factor */
    this.blobs = [
      { phase: 0,               orbX: 0.24, orbY: 0.19, rf: 0.40 },
      { phase: Math.PI / 2,     orbX: 0.19, orbY: 0.24, rf: 0.32 },
      { phase: Math.PI,         orbX: 0.16, orbY: 0.17, rf: 0.25 },
      { phase: Math.PI * 1.5,   orbX: 0.13, orbY: 0.15, rf: 0.20 },
    ];

    /* State definitions — colors, movement speed, orbit spread, scale */
    this.states = {
      calm: {
        colors: [
          'rgba(198, 93,  58, 0.14)',
          'rgba(216, 164, 71, 0.11)',
          'rgba(201, 143,134, 0.09)',
          'rgba(138, 158,138, 0.07)',
        ],
        speed: 0.0012, spread: 0.28, scale: 1.00,
      },
      cloudy: {
        colors: [
          'rgba(224, 217, 207, 0.70)',
          'rgba(201, 143, 134, 0.18)',
          'rgba( 32,  32,  29, 0.06)',
          'rgba(138, 158, 138, 0.10)',
        ],
        speed: 0.0028, spread: 0.38, scale: 0.88,
      },
      overwhelmed: {
        colors: [
          'rgba(198,  93,  58, 0.28)',
          'rgba( 32,  32,  29, 0.10)',
          'rgba(201, 143, 134, 0.22)',
          'rgba(198,  93,  58, 0.10)',
        ],
        speed: 0.0055, spread: 0.50, scale: 1.10,
      },
      focused: {
        colors: [
          'rgba(138, 158, 138, 0.22)',
          'rgba( 32,  32,  29, 0.07)',
          'rgba(216, 164,  71, 0.10)',
          'rgba(138, 158, 138, 0.08)',
        ],
        speed: 0.0007, spread: 0.16, scale: 0.84,
      },
      hopeful: {
        colors: [
          'rgba(216, 164,  71, 0.24)',
          'rgba(198,  93,  58, 0.12)',
          'rgba(201, 143, 134, 0.10)',
          'rgba(246, 241, 232, 0.38)',
        ],
        speed: 0.0022, spread: 0.30, scale: 1.05,
      },
    };

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._resize();
    this._start();
  }

  _resize() {
    const parent  = this.canvas.parentElement;
    const size    = Math.min(parent.clientWidth, 460);
    this.canvas.width  = size;
    this.canvas.height = size;
    if (this.reduced) this._drawFrame(); // re-draw static frame on resize
  }

  setState(name) {
    if (this.states[name]) this.current = name;
  }

  _start() {
    if (this.reduced) {
      this._drawFrame();
      return;
    }
    const loop = () => {
      this.t += 1;
      this._drawFrame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  _drawFrame() {
    const { ctx, canvas, blobs, t } = this;
    const s  = this.states[this.current];
    const w  = canvas.width;
    const h  = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);

    ctx.clearRect(0, 0, w, h);

    blobs.forEach((blob, i) => {
      const orbAmp = base * s.spread * 2.8;
      const x = cx + Math.sin(t * s.speed + blob.phase)         * blob.orbX * orbAmp;
      const y = cy + Math.cos(t * s.speed * 0.73 + blob.phase)  * blob.orbY * orbAmp;
      const r = base * blob.rf * s.scale;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, s.colors[i]);
      grad.addColorStop(1, 'rgba(246, 241, 232, 0)');

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
  }
}

/* ──────────────────────────────────────────────────────────────
   HTML SECTIONS
   Each section is a function returning an HTML string.
   ────────────────────────────────────────────────────────────── */

function heroSection() {
  return `
    <section class="hero" id="hero" aria-labelledby="hero-heading">
      <div class="container hero-container">

        <!-- Text column -->
        <div class="hero-text">
          <span class="hero-eyebrow" aria-hidden="true">For students, by design</span>

          <h1 class="hero-heading" id="hero-heading">
            A quieter space,<br>
            <em>when you need<br>it most.</em>
          </h1>

          <p class="hero-body">
            Track how you're feeling. Write through your thoughts. Find support
            that meets you where you are — in a private space built around your
            well-being, not your performance.
          </p>

          <div class="hero-actions">
            <a href="/auth/register" class="btn btn-primary btn-lg">
              Begin your journey
            </a>
            <a href="#how-it-works" class="btn btn-ghost btn-lg scroll-to" data-target="how-it-works">
              How it works
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 2v10M2 7l5 5 5-5"
                      stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Visual column: Emotional Weather canvas -->
        <div class="hero-visual">
          <div class="weather-frame">
            <canvas
              id="emotional-weather"
              role="img"
              aria-label="Abstract visualization of emotional states — soft, shifting shapes representing different moods"
            ></canvas>
          </div>

          <!-- State selector -->
          <div
            class="weather-states"
            role="group"
            aria-label="Explore emotional states"
          >
            <button class="weather-state-btn active" data-state="calm">Calm</button>
            <button class="weather-state-btn" data-state="cloudy">Cloudy</button>
            <button class="weather-state-btn" data-state="overwhelmed">Overwhelmed</button>
            <button class="weather-state-btn" data-state="focused">Focused</button>
            <button class="weather-state-btn" data-state="hopeful">Hopeful</button>
          </div>

          <p class="weather-caption" aria-hidden="true">
            Emotions shift. That's human.
          </p>
        </div>

      </div>

      <!-- Animated scroll indicator -->
      <div class="scroll-indicator" aria-hidden="true">
        <div class="scroll-indicator-line"></div>
      </div>
    </section>
  `;
}

function philosophySection() {
  return `
    <section class="philosophy section" aria-label="Platform philosophy">
      <div class="container container--narrow">
        <blockquote class="philosophy-quote">
          <p>
            "University life rarely feels like what the brochures showed.
            The pressure to perform, fit in, and figure yourself out —
            all at once — can be quietly overwhelming."
          </p>
        </blockquote>
        <p class="philosophy-body">
          Serenova isn't here to fix that. It's a companion for the days
          when you need to pause, understand yourself a little better,
          and find a gentle path forward — on your own terms.
        </p>
      </div>
    </section>
  `;
}

function momentsSection() {
  return `
    <section class="moments section" aria-labelledby="moments-heading">
      <div class="container">
        <div class="section-header reveal">
          <span class="section-eyebrow">Made for student life</span>
          <h2 class="section-heading" id="moments-heading">Small moments of calm,<br>between everything else.</h2>
        </div>
        <div class="moments-grid" data-stagger>
          <figure class="moment moment--tall reveal">
            ${photo('meditation', { w: 900 })}
            <figcaption><strong>Pause</strong><span>Two-minute grounding between lectures.</span></figcaption>
          </figure>
          <figure class="moment reveal">
            ${photo('journal', { w: 800 })}
            <figcaption><strong>Write</strong><span>A private journal that stays yours.</span></figcaption>
          </figure>
          <figure class="moment reveal">
            ${photo('students', { w: 800 })}
            <figcaption><strong>Connect</strong><span>Counsellors who understand campus life.</span></figcaption>
          </figure>
        </div>
      </div>
    </section>
  `;
}

function howItWorksSection() {
  const steps = [
    {
      n: '01',
      title: 'Check in',
      body: 'Start by logging how you\'re feeling. A mood level, a short note. No pressure, no judgment. Just a moment for yourself.',
    },
    {
      n: '02',
      title: 'Write it out',
      body: 'Your journal is private. Always. Write without self-editing — your thoughts stay between you and the page.',
    },
    {
      n: '03',
      title: 'Talk it through',
      body: 'When you need to think out loud, the AI companion listens. It offers reflection, not diagnosis. Support, not prescription.',
    },
    {
      n: '04',
      title: 'Find your footing',
      body: 'Curated resources, well-being guidance, and counselling support when you\'re ready to take the next step.',
    },
  ];

  return `
    <section class="how-it-works section" id="how-it-works" aria-labelledby="hiw-heading">
      <div class="container">
        <div class="section-header reveal">
          <span class="section-eyebrow">The process</span>
          <h2 class="section-heading" id="hiw-heading">Simple. Private. Yours.</h2>
        </div>
        <div class="steps-grid">
          ${steps.map((s) => `
            <div class="step reveal">
              <span class="step-number" aria-hidden="true">${s.n}</span>
              <div>
                <h3 class="step-title">${s.title}</h3>
                <p class="step-body">${s.body}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function moodFeatureSection() {
  return `
    <section class="feature-section section" aria-labelledby="feature-mood-heading">
      <div class="container">
        <div class="feature-grid">

          <div class="feature-text reveal">
            <span class="feature-eyebrow">Mood tracking</span>
            <h2 class="feature-heading" id="feature-mood-heading">
              Know yourself,<br>one day at a time.
            </h2>
            <p class="feature-body">
              Five simple mood levels. An optional note. A timestamp.
              That's all it takes to begin understanding your emotional
              patterns — without turning self-care into a chore.
            </p>
            <a href="/auth/register" class="feature-cta" aria-label="Start tracking your mood">
              Start tracking
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M7 2l5 5-5 5"
                      stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>

          <div class="feature-visual reveal" aria-hidden="true">
            <div class="feature-visual-box">
              <!-- Abstract mood constellation -->
              <div class="mood-constellation" role="presentation">
                <div class="mood-orb-wrap">
                  <div class="mood-orb mood-orb--1"></div>
                  <span class="mood-orb-label">Very low</span>
                </div>
                <div class="mood-orb-wrap">
                  <div class="mood-orb mood-orb--2"></div>
                  <span class="mood-orb-label">Low</span>
                </div>
                <div class="mood-orb-wrap">
                  <div class="mood-orb mood-orb--3"></div>
                  <span class="mood-orb-label">Neutral</span>
                </div>
                <div class="mood-orb-wrap">
                  <div class="mood-orb mood-orb--4"></div>
                  <span class="mood-orb-label">Good</span>
                </div>
                <div class="mood-orb-wrap">
                  <div class="mood-orb mood-orb--5"></div>
                  <span class="mood-orb-label">Very good</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;
}

function journalFeatureSection() {
  return `
    <section class="feature-section section" aria-labelledby="feature-journal-heading">
      <div class="container">
        <div class="feature-grid feature-grid--reverse">

          <div class="feature-text reveal">
            <span class="feature-eyebrow">Private journal</span>
            <h2 class="feature-heading" id="feature-journal-heading">
              Private thoughts deserve<br>private pages.
            </h2>
            <p class="feature-body">
              Your journal is encrypted and visible only to you.
              Write without self-editing. Return when you're ready.
              No counsellor, no algorithm, reads your entries.
            </p>
            <a href="/auth/register" class="feature-cta" aria-label="Open your journal">
              Open your journal
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M7 2l5 5-5 5"
                      stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>

          <div class="feature-visual reveal" aria-hidden="true">
            <div class="feature-visual-box">
              <!-- Abstract journal notebook -->
              <div class="journal-notebook" role="presentation">
                <p class="journal-date-label">Today</p>
                <div class="journal-line journal-line--full"></div>
                <div class="journal-line journal-line--full"></div>
                <div class="journal-line journal-line--partial"></div>
                <div class="journal-line journal-line--full"></div>
                <div class="journal-line journal-line--short"></div>
                <span class="journal-cursor" aria-hidden="true"></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;
}

function aiFeatureSection() {
  return `
    <section class="feature-section section" aria-labelledby="feature-ai-heading">
      <div class="container">
        <div class="feature-grid">

          <div class="feature-text reveal">
            <span class="feature-eyebrow">AI companion</span>
            <h2 class="feature-heading" id="feature-ai-heading">
              A conversation that meets<br>you where you are.
            </h2>
            <p class="feature-body">
              Not a chatbot. Not a search engine.
              An AI companion that listens, reflects, and gently suggests —
              without diagnosing, prescribing, or replacing the people
              who truly know you.
            </p>
            <a href="/auth/register" class="feature-cta" aria-label="Start a conversation">
              Start a conversation
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M7 2l5 5-5 5"
                      stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>

          <div class="feature-visual reveal" aria-hidden="true">
            <div class="feature-visual-box">
              <!-- Abstract chat preview -->
              <div class="chat-preview" role="presentation">
                <div class="chat-bubble chat-bubble--user">
                  <span class="chat-label">You</span>
                  <div class="bubble-line bubble-line--full"></div>
                  <div class="bubble-line bubble-line--partial"></div>
                </div>
                <div class="chat-bubble chat-bubble--ai">
                  <span class="chat-label">Serenova</span>
                  <div class="bubble-line bubble-line--full"></div>
                  <div class="bubble-line bubble-line--full"></div>
                  <div class="bubble-line bubble-line--short"></div>
                </div>
                <div class="chat-bubble chat-bubble--user">
                  <span class="chat-label">You</span>
                  <div class="bubble-line bubble-line--partial"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;
}

function assessmentFeatureSection() {
  return `
    <section class="feature-section section" aria-labelledby="feature-assessment-heading">
      <div class="container">
        <div class="feature-grid feature-grid--reverse">

          <div class="feature-text reveal">
            <span class="feature-eyebrow">Well-being screening</span>
            <h2 class="feature-heading" id="feature-assessment-heading">
              Understand your<br>well-being, not define it.
            </h2>
            <p class="feature-body">
              A short, reflective questionnaire to help you gauge where you are.
              Not a diagnosis — a starting point for self-understanding.
              Results are private and always come with a clear disclaimer.
            </p>
            <a href="/auth/register" class="feature-cta" aria-label="Take a screening">
              Take a screening
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M7 2l5 5-5 5"
                      stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>

          <div class="feature-visual reveal" aria-hidden="true">
            <div class="feature-visual-box">
              <!-- Abstract assessment card -->
              <div class="assessment-preview-card" role="presentation">
                <div class="assessment-progress-row">
                  <div class="assessment-progress-dot done"></div>
                  <div class="assessment-progress-dot done"></div>
                  <div class="assessment-progress-dot active"></div>
                  <div class="assessment-progress-dot"></div>
                  <div class="assessment-progress-dot"></div>
                  <div class="assessment-progress-dot"></div>
                  <div class="assessment-progress-dot"></div>
                  <div class="assessment-progress-dot"></div>
                  <div class="assessment-progress-dot"></div>
                  <div class="assessment-progress-dot"></div>
                </div>
                <div class="assessment-q-line assessment-q-line--full"     style="margin-top:1.5rem;"></div>
                <div class="assessment-q-line assessment-q-line--partial"  style="margin-top:0.5rem;"></div>
                <div class="assessment-options-row">
                  <span class="assessment-option-chip">Rarely</span>
                  <span class="assessment-option-chip selected">Sometimes</span>
                  <span class="assessment-option-chip">Often</span>
                  <span class="assessment-option-chip">Nearly always</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;
}

function resourcesPreviewSection() {
  const cards = [
    {
      tag: 'Study stress',
      title: 'When exam pressure becomes too much',
      excerpt: 'Practical strategies for managing academic stress before it manages you.',
    },
    {
      tag: 'Rest & routine',
      title: 'Building a sleep rhythm that actually works',
      excerpt: 'Small, sustainable changes that help your body and mind recover.',
    },
    {
      tag: 'Emotional well-being',
      title: 'Why feeling lost doesn\'t mean you\'re failing',
      excerpt: 'On navigating uncertainty, identity, and the messy middle of university life.',
    },
  ];

  return `
    <section class="resources-preview section" aria-labelledby="resources-heading">
      <div class="container">

        <div class="resources-header">
          <div class="reveal">
            <span class="section-eyebrow">Resources</span>
            <h2 class="section-heading" id="resources-heading">
              Guidance when you<br>need direction.
            </h2>
          </div>
          <a href="/resources" class="btn btn-outline reveal">
            Browse all resources
          </a>
        </div>

        <div class="resources-grid">
          ${cards.map((c, i) => `
            <a
              href="/resources"
              class="resource-card reveal"
              style="transition-delay: ${i * 80}ms"
              aria-label="${c.title}"
            >
              <span class="resource-category-tag">${c.tag}</span>
              <h3 class="resource-title">${c.title}</h3>
              <p class="resource-excerpt">${c.excerpt}</p>
              <span class="resource-arrow" aria-hidden="true">↗</span>
            </a>
          `).join('')}
        </div>

      </div>
    </section>
  `;
}

function privacySection() {
  const points = [
    {
      icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
               <rect x="3" y="8" width="12" height="9" rx="2" stroke="#C65D3A" stroke-width="1.4"/>
               <path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="#C65D3A" stroke-width="1.4" stroke-linecap="round"/>
             </svg>`,
      title: 'Your journal is yours alone',
      body:  'No counsellor, no admin, and no algorithm reads your journal entries. They are private by design.',
    },
    {
      icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
               <circle cx="9" cy="9" r="6.5" stroke="#C65D3A" stroke-width="1.4"/>
               <path d="M9 5.5v4l2.5 2" stroke="#C65D3A" stroke-width="1.4" stroke-linecap="round"/>
             </svg>`,
      title: 'A support tool, not a medical service',
      body:  'All AI responses are general well-being guidance. Serenova does not diagnose, prescribe, or replace professional care.',
    },
    {
      icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
               <path d="M3 5l6-2 6 2v5c0 3-6 5-6 5S3 13 3 10V5z" stroke="#C65D3A" stroke-width="1.4" stroke-linejoin="round"/>
               <path d="M6.5 9l2 2 3-3" stroke="#C65D3A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>`,
      title: 'No ads. No profiling.',
      body:  'Your well-being data is never shared with advertisers or used for profiling. It exists only to support you.',
    },
  ];

  return `
    <section class="privacy-section section" aria-labelledby="privacy-heading">
      <div class="container">

        <div class="reveal">
          <span class="section-eyebrow">Trust & safety</span>
          <h2 class="section-heading" id="privacy-heading">
            Your privacy is foundational.
          </h2>
        </div>

        <div class="privacy-grid">
          ${points.map((p) => `
            <div class="privacy-point reveal">
              <div class="privacy-icon">${p.icon}</div>
              <h3 class="privacy-point-title">${p.title}</h3>
              <p class="privacy-point-body">${p.body}</p>
            </div>
          `).join('')}
        </div>

        <p class="privacy-disclaimer reveal">
          <strong>Important:</strong>
          Serenova is not a substitute for professional mental health care, counselling,
          or emergency services. If you are in crisis or immediate distress,
          please reach out to a qualified professional or trusted person in your life.
          Crisis support information is available in our
          <a href="/resources" style="color:var(--color-accent);">Resources</a> section.
        </p>

      </div>
    </section>
  `;
}

function ctaSection() {
  return `
    <section class="cta-section" aria-labelledby="cta-heading">
      <div class="container">
        <div class="cta-inner">
          <h2 class="cta-heading" id="cta-heading">
            Ready when<br>you are.
          </h2>
          <p class="cta-body">
            Begin for free. No credit card.
            Just a quieter corner of the internet, waiting for you.
          </p>
          <div class="cta-actions">
            <a href="/auth/register" class="btn btn-primary-inverted btn-lg">
              Create your space
            </a>
            <a href="/auth/login" class="btn btn-ghost-inverted btn-lg">
              Already have an account
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ──────────────────────────────────────────────────────────────
   SCROLL-IN REVEAL (Intersection Observer)
   ────────────────────────────────────────────────────────────── */

function initReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    // Skip animation — make everything visible immediately
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    return null;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  return observer;
}

/* ──────────────────────────────────────────────────────────────
   SMOOTH SCROLL for anchor links
   ────────────────────────────────────────────────────────────── */

function initSmoothScroll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handler = (e) => {
    const btn = e.target.closest('.scroll-to');
    if (!btn) return;
    const targetId = btn.dataset.target;
    const target   = targetId ? document.getElementById(targetId) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  };

  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}

/* ──────────────────────────────────────────────────────────────
   PAGE MODULE EXPORT
   ────────────────────────────────────────────────────────────── */

export const Landing = {
  _weather:       null,
  _cleanupNavbar: null,
  _observer:      null,
  _cleanupScroll: null,

  render() {
    return `
      ${Navbar.render({ transparent: true })}

      <main id="main-content" class="page-root">
        ${heroSection()}
        ${philosophySection()}
        ${momentsSection()}
        ${howItWorksSection()}
        ${moodFeatureSection()}
        ${journalFeatureSection()}
        ${aiFeatureSection()}
        ${assessmentFeatureSection()}
        ${resourcesPreviewSection()}
        ${privacySection()}
        ${ctaSection()}
      </main>

      ${Footer.render()}
    `;
  },

  afterRender() {
    /* 1. Navbar */
    this._cleanupNavbar = initNavbar();

    /* 2. Emotional Weather canvas */
    const canvas = document.getElementById('emotional-weather');
    if (canvas) {
      this._weather = new EmotionalWeather(canvas);

      // Wire state selector buttons
      const buttons = document.querySelectorAll('.weather-state-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          this._weather.setState(btn.dataset.state);
        });
        // Initial aria state
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
      });
    }

    /* 3. Scroll-in reveal */
    this._observer = initReveal();

    /* 4. Smooth scroll for anchor buttons */
    this._cleanupScroll = initSmoothScroll();
  },

  destroy() {
    if (this._cleanupNavbar) this._cleanupNavbar();
    if (this._weather)       this._weather.destroy();
    if (this._observer)      this._observer.disconnect();
    if (this._cleanupScroll) this._cleanupScroll();
  },
};
