// Runs before the page paints, so there is no flash of the wrong theme.
(function () {
  try {
    var saved = localStorage.getItem('serenova_theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var lang = localStorage.getItem('serenova_lang');
    if (lang) document.documentElement.setAttribute('lang', lang);
  } catch (e) {}
})();
