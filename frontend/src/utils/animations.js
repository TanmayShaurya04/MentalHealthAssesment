/**
 * animations.js — shared motion helpers (called once per page render by the router).
 *
 *  - [data-reveal] / .reveal : fade-and-rise when scrolled into view
 *  - [data-stagger]          : children get an incremental --i delay for staggered entrances
 *  - [data-count]            : number counts up from 0 when it appears
 *
 * Everything is skipped when the user prefers reduced motion.
 */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let observer = null;

function ensureObserver() {
  if (observer || !('IntersectionObserver' in window)) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      if (el.hasAttribute('data-count')) countUp(el);
      observer.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  return observer;
}

export function countUp(el) {
  const target = parseFloat(el.getAttribute('data-count'));
  if (Number.isNaN(target)) return;
  const decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
  if (reduced()) { el.textContent = target.toFixed(decimals); return; }
  const duration = 900;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initAnimations(root = document) {
  // Stagger: give each direct child an index for CSS transition-delay
  root.querySelectorAll('[data-stagger]').forEach((parent) => {
    [...parent.children].forEach((child, i) => child.style.setProperty('--i', i));
  });

  const targets = root.querySelectorAll('.reveal:not(.visible), [data-reveal]:not(.visible)');
  const obs = ensureObserver();
  targets.forEach((el) => {
    if (!obs || reduced()) {
      el.classList.add('visible');
      if (el.hasAttribute('data-count')) countUp(el);
    } else {
      obs.observe(el);
    }
  });
}
