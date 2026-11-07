/**
 * Navigation bridge for page modules.
 * Keeps route consumers independent from router.js, avoiding a router/page import cycle.
 */
export function navigate(path, pushState = true) {
  if (window.router) {
    window.router.navigate(path, pushState);
    return;
  }

  window.location.assign(path);
}
