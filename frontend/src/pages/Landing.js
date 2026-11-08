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
    if (!this.states[name]) return;
    this.current = name;
    const visual = MOOD_VISUALS[name];
    const photo = document.getElementById('weather-photo');
    const emoji = document.getElementById('weather-emoji');
    const caption = document.getElementById('weather-caption');
    const photoLabel = document.getElementById('weather-photo-label');
    const featurePhoto = document.getElementById('mood-feature-photo');
    const featureEmoji = document.getElementById('mood-feature-emoji');
    const featureMood = document.getElementById('mood-feature-name');
    const featureTitle = document.getElementById('mood-feature-title');
    const featureCopy = document.getElementById('mood-feature-copy');
    const featureScale = document.getElementById('mood-feature-scale');
    const featureCurrent = document.querySelector('.mood-console-current');
    if (photo) {
      photo.style.backgroundImage = `linear-gradient(180deg, rgba(24,29,25,.06), rgba(24,29,25,.58)), url("${visual.image}")`;
      photo.setAttribute('aria-label', `${visual.label} mood landscape`);
      photo.classList.remove('is-changing');
      void photo.offsetWidth;
      photo.classList.add('is-changing');
    }
    if (emoji) emoji.textContent = visual.emoji;
    if (caption) caption.textContent = visual.caption;
    if (photoLabel) photoLabel.textContent = `${visual.label} is welcome here`;
    if (featurePhoto) {
      featurePhoto.style.backgroundImage = `linear-gradient(90deg,rgba(24,29,25,.68),rgba(24,29,25,.06)),url("${visual.image}")`;
      featurePhoto.setAttribute('aria-label', `${visual.label} mood landscape`);
      featurePhoto.classList.remove('is-changing');
      void featurePhoto.offsetWidth;
      featurePhoto.classList.add('is-changing');
    }
    if (featureEmoji) featureEmoji.textContent = visual.emoji;
    if (featureMood) featureMood.textContent = visual.level;
    if (featureTitle) featureTitle.textContent = visual.title;
    if (featureCopy) featureCopy.textContent = visual.description;
    if (featureScale) featureScale.style.setProperty('--mood-progress', `${visual.progress}%`);
    if (featureCurrent) featureCurrent.textContent = visual.label;
    document.querySelectorAll('[data-mood-action]').forEach((link) => {
      const action = visual.actions[Number(link.dataset.moodAction)];
      link.href = action.href;
      link.querySelector('.mood-action-label').textContent = action.label;
    });
    document.querySelector('.weather-frame')?.setAttribute('data-mood', name);
    document.querySelectorAll('[data-mood-choice]').forEach((choice) => {
      const active = choice.dataset.state === name;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
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

const MOOD_VISUALS = {
  calm: { label: 'Calm', level: 'IN BETWEEN', emoji: '😌', caption: 'A quiet moment, just for you.', title: 'Somewhere in the middle.', description: 'No need to have it all figured out. A small check-in is enough.', progress: 52, image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85', actions: [{ label: 'Write a reflection', href: '/journal' }, { label: 'Talk it through', href: '/chat' }] },
  cloudy: { label: 'Cloudy', level: 'A LITTLE LOW', emoji: '🌥️', caption: 'It is okay if today feels a little unclear.', title: 'A little cloudy today.', description: 'You can take this one moment at a time. Pick a small thing that feels manageable.', progress: 28, image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85', actions: [{ label: 'Try a grounding guide', href: '/resources' }, { label: 'Write it out', href: '/journal' }] },
  overwhelmed: { label: 'Overwhelmed', level: 'TAKING IT SLOW', emoji: '🌊', caption: 'One breath. One small step at a time.', title: 'One thing at a time.', description: 'You do not have to solve the whole day right now. Choose the support that feels right.', progress: 12, image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85', actions: [{ label: 'Talk with Serenova', href: '/chat' }, { label: 'Find a counsellor', href: '/counsellors' }] },
  focused: { label: 'Focused', level: 'FEELING GOOD', emoji: '🌿', caption: 'Come back to what is here, right now.', title: 'Finding your rhythm.', description: 'Notice what is helping you feel present, and give that feeling a little space.', progress: 76, image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85', actions: [{ label: 'Explore student guides', href: '/resources' }, { label: 'Save a reflection', href: '/journal' }] },
  hopeful: { label: 'Hopeful', level: 'FEELING BRIGHT', emoji: '✨', caption: 'There is room for things to shift.', title: 'Make room for this feeling.', description: 'Notice what has been supporting you today. You can come back to it later.', progress: 94, image: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=85', actions: [{ label: 'Save a reflection', href: '/journal' }, { label: 'Browse well-being guides', href: '/resources' }] },
};

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

        <!-- Visual column: photographic emotional weather, linked to both mood selectors -->
        <div class="hero-visual">
          <div class="weather-frame" data-mood="calm">
            <div class="weather-photo" id="weather-photo" role="img" aria-label="A peaceful student taking a mindful pause" style="background-image:linear-gradient(180deg,rgba(24,29,25,.06),rgba(24,29,25,.58)),url('${MOOD_VISUALS.calm.image}')"></div>
            <canvas
              id="emotional-weather"
              aria-hidden="true"
            ></canvas>
            <div class="weather-photo-overlay" aria-live="polite">
              <span class="weather-emoji" id="weather-emoji" aria-hidden="true">${MOOD_VISUALS.calm.emoji}</span>
              <span class="weather-photo-label" id="weather-photo-label">${MOOD_VISUALS.calm.label} is welcome here</span>
            </div>
          </div>

          <!-- State selector -->
          <div
            class="weather-states"
            role="group"
            aria-label="Explore emotional states"
          >
            <button class="weather-state-btn active" data-mood-choice data-state="calm" aria-pressed="true">😌 Calm</button>
            <button class="weather-state-btn" data-mood-choice data-state="cloudy" aria-pressed="false">🌥️ Cloudy</button>
            <button class="weather-state-btn" data-mood-choice data-state="overwhelmed" aria-pressed="false">🌊 Overwhelmed</button>
            <button class="weather-state-btn" data-mood-choice data-state="focused" aria-pressed="false">🌿 Focused</button>
            <button class="weather-state-btn" data-mood-choice data-state="hopeful" aria-pressed="false">✨ Hopeful</button>
          </div>

          <p class="weather-caption" id="weather-caption" aria-live="polite">
            ${MOOD_VISUALS.calm.caption}
          </p>
        </div>

      </div>
      <div class="hero-trust-line"><span>🔒 Private by design</span><i aria-hidden="true"></i><span>🌱 Notice · Reflect · Grow</span></div>

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
      n: '01', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m5 24 9 9 16-17M18 24l9 9 16-17" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'Check in',
      body: 'Start by logging how you\'re feeling. A mood level, a short note. No pressure, no judgment. Just a moment for yourself.',
    },
    {
      n: '02', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="m8 34 22-22a5 5 0 0 1 7 0l1 1a5 5 0 0 1 0 7L16 42l-11 3z"/><path fill="var(--color-background)" d="m30 16 5 5-17 17-5-5z"/><path fill="currentColor" d="m5 45 11-3-8-8z"/></svg>',
      title: 'Write it out',
      body: 'Your journal is private. Always. Write without self-editing — your thoughts stay between you and the page.',
    },
    {
      n: '03', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M6 7h27a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H20l-10 7v-7H6a6 6 0 0 1-6-6V13a6 6 0 0 1 6-6"/><path fill="var(--color-background)" d="M10 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4m9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/><path fill="currentColor" d="M30 32h7a5 5 0 0 1 5 5v3h-5l-6 4v-4a5 5 0 0 1-4-5v-2z"/></svg>',
      title: 'Talk it through',
      body: 'When you need to think out loud, the AI companion listens. It offers reflection, not diagnosis. Support, not prescription.',
    },
    {
      n: '04', icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="currentColor"/><circle cx="24" cy="24" r="14" fill="var(--color-background)"/><circle cx="24" cy="24" r="8" fill="currentColor"/><circle cx="24" cy="24" r="3" fill="var(--color-background)"/><path fill="currentColor" d="M22 2h4v7h-4zm0 37h4v7h-4zM2 22h7v4H2zm37 0h7v4h-7z"/></svg>',
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
              <div class="step-mark"><span class="step-number" aria-hidden="true">${s.n}</span><span class="step-icon" aria-hidden="true">${s.icon}</span></div>
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

function moduleGallerySection() {
  const modules = [
    { title: 'Pause', subtitle: 'A gentle mood check-in, at your own pace.', href: '/mood', image: 'photo-1506126613408-eca07ce68773', className: 'module-gallery-card--pause' },
    { title: 'Write', subtitle: 'A private page for whatever is on your mind.', href: '/journal', image: 'photo-1455390582262-044cdead277a', className: 'module-gallery-card--write' },
    { title: 'Talk it through', subtitle: 'A thoughtful companion for the in-between moments.', href: '/chat', image: 'photo-1529156069898-49953e39b3ac', className: 'module-gallery-card--companion' },
    { title: 'Check in', subtitle: 'A reflective screening, never a diagnosis.', href: '/assessment', image: 'photo-1516321318423-f06f85e504b3', className: 'module-gallery-card--screening' },
    { title: 'Find your footing', subtitle: 'Grounded guides for student life.', href: '/resources', image: 'photo-1507842217343-583bb7270b66', className: 'module-gallery-card--resources' },
    { title: 'Connect', subtitle: 'Find professional support when you are ready.', href: '/counsellors', image: 'photo-1521737711867-e3b97375f902', className: 'module-gallery-card--connect' },
  ];

  return `
    <section class="module-gallery section" aria-labelledby="module-gallery-heading">
      <div class="container">
        <div class="module-gallery-heading reveal">
          <span class="section-eyebrow">Made for student life</span>
          <h2 class="section-heading" id="module-gallery-heading">Small moments of calm,<br>between everything else.</h2>
        </div>
        <div class="module-gallery-grid">
          ${modules.map((item, index) => `
            <a class="module-gallery-card ${item.className} reveal" href="${item.href}" style="--module-image:url('https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=1200&q=85');transition-delay:${index * 60}ms" aria-label="${item.title}: ${item.subtitle}">
              <span class="module-gallery-copy"><strong>${item.title}</strong><small>${item.subtitle}</small></span>
            </a>
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
              <!-- Interactive mood selector, synchronized with the emotional weather above -->
              <div class="mood-console">
                <div class="mood-console-topline"><span>YOUR EMOTIONAL WEATHER</span><span id="mood-feature-name">IN BETWEEN</span></div>
                <div class="mood-console-photo" id="mood-feature-photo" role="img" aria-label="Calm mood landscape" style="background-image:linear-gradient(90deg,rgba(24,29,25,.68),rgba(24,29,25,.06)),url('${MOOD_VISUALS.calm.image}')">
                  <span class="mood-console-emoji" id="mood-feature-emoji" aria-hidden="true">${MOOD_VISUALS.calm.emoji}</span>
                  <div class="mood-console-copy"><h3 id="mood-feature-title">${MOOD_VISUALS.calm.title}</h3><p id="mood-feature-copy">${MOOD_VISUALS.calm.description}</p></div>
                  <span class="mood-console-mark" aria-hidden="true">SERENOVA · NOTICE · REFLECT · GROW</span>
                </div>
                <div class="mood-console-scale-row"><span>HOW ARE YOU FEELING?</span><div class="mood-console-track" id="mood-feature-scale" style="--mood-progress:${MOOD_VISUALS.calm.progress}%"><span></span></div><span class="mood-console-current">Neutral</span></div>
                <div class="mood-constellation" role="group" aria-label="Choose a feeling to update the emotional weather">
                  <button type="button" class="mood-orb-wrap mood-orb-wrap--low" data-mood-choice data-state="overwhelmed" aria-pressed="false" aria-label="Very low, overwhelmed"><span class="mood-orb">😮‍💨</span><span class="mood-orb-label">Very low</span></button>
                  <button type="button" class="mood-orb-wrap mood-orb-wrap--soft" data-mood-choice data-state="cloudy" aria-pressed="false" aria-label="Low, cloudy"><span class="mood-orb">😔</span><span class="mood-orb-label">Low</span></button>
                  <button type="button" class="mood-orb-wrap mood-orb-wrap--neutral active" data-mood-choice data-state="calm" aria-pressed="true" aria-label="Neutral, calm"><span class="mood-orb">😌</span><span class="mood-orb-label">Neutral</span></button>
                  <button type="button" class="mood-orb-wrap mood-orb-wrap--good" data-mood-choice data-state="focused" aria-pressed="false" aria-label="Good, focused"><span class="mood-orb">🙂</span><span class="mood-orb-label">Good</span></button>
                  <button type="button" class="mood-orb-wrap mood-orb-wrap--bright" data-mood-choice data-state="hopeful" aria-pressed="false" aria-label="Very good, hopeful"><span class="mood-orb">😊</span><span class="mood-orb-label">Very good</span></button>
                </div>
                <div class="mood-next-step"><div class="mood-next-intro"><span>ONE GENTLE NEXT STEP</span><p>Choose a space that feels helpful</p></div><a href="/journal" data-mood-action="0"><span class="mood-action-label">Write a reflection</span><span aria-hidden="true">↗</span></a><a href="/chat" data-mood-action="1"><span class="mood-action-label">Talk it through</span><span aria-hidden="true">↗</span></a></div>
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
              Your journal is private and visible only to you.
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
            <div class="feature-visual-box feature-visual-box--photo">
              <div class="feature-photo-card feature-photo-card--journal" style="--feature-image:url('https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85')">
                <span class="feature-photo-kicker">PRIVATE BY DESIGN <span aria-hidden="true">↗</span></span>
                <div class="journal-prompt-float"><span aria-hidden="true">✍️</span><div><small>A GENTLE START</small><p>One thing I handled today, however small, was…</p></div></div>
                <div class="feature-photo-copy"><h3>A page that stays yours.</h3><p>Write a little. Write a lot. Begin anywhere.</p></div>
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
            <div class="feature-visual-box feature-visual-box--photo">
              <div class="feature-photo-card feature-photo-card--companion" style="--feature-image:url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85')">
                <span class="feature-photo-kicker">A THOUGHTFUL COMPANION <span aria-hidden="true">✦</span></span>
                <div class="companion-message-float"><span class="companion-avatar" aria-hidden="true">S</span><p>What feels most important to you right now?</p><span class="companion-message-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
                <div class="feature-photo-copy"><h3>You can start wherever you are.</h3><p>Reflection and support, without judgement.</p></div>
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
            <div class="feature-visual-box feature-visual-box--photo">
              <div class="feature-photo-card feature-photo-card--screening" style="--feature-image:url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85')">
                <span class="feature-photo-kicker">A CHECK-IN, NOT A DIAGNOSIS <span aria-hidden="true">◌</span></span>
                <div class="screening-stat-float"><strong>04</strong><span>MINUTES<br>FOR YOU</span><i aria-hidden="true">✦</i></div>
                <div class="feature-photo-copy"><h3>Understand your own patterns.</h3><p>Private, reflective and always on your terms.</p></div>
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
      image: 'photo-1434030216411-0b793f4b4173', icon: '✎',
    },
    {
      tag: 'Rest & routine',
      title: 'Building a sleep rhythm that actually works',
      excerpt: 'Small, sustainable changes that help your body and mind recover.',
      image: 'photo-1470770841072-f978cf4d019e', icon: '☾',
    },
    {
      tag: 'Emotional well-being',
      title: 'Why feeling lost doesn\'t mean you\'re failing',
      excerpt: 'On navigating uncertainty, identity, and the messy middle of university life.',
      image: 'photo-1470252649378-9c29740c9fa8', icon: '✦',
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
              <span class="resource-card-photo" style="--resource-image:url('https://images.unsplash.com/${c.image}?auto=format&fit=crop&w=900&q=80')"><span aria-hidden="true">${c.icon}</span></span>
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
        ${moduleGallerySection()}
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
      const buttons = document.querySelectorAll('[data-mood-choice]');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
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
