/**
 * Dock-style magnification: emojis grow as the pointer (or a finger) moves near them,
 * like the macOS Dock. Pure enhancement: without it the buttons still work.
 */
export function attachEmojiDock(container, { max = 1.55, radius = 120 } = {}) {
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const items = [...container.querySelectorAll('.mood-emoji')];
  const reset = () => items.forEach((el) => el.style.removeProperty('--dock'));
  const onMove = (e) => {
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const k = Math.max(0, 1 - d / radius);
      el.style.setProperty('--dock', (1 + (max - 1) * k * k).toFixed(3));
    });
  };
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerleave', reset);
  container.addEventListener('pointercancel', reset);
  return () => { container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerleave', reset); reset(); };
}
