/* Runs before first paint (blocking, tiny) so the page never flashes the wrong theme.
   Priority: the visitor's saved choice, then the system preference, then light. */
(function () {
  var root = document.documentElement;
  var theme = 'light';
  try {
    var saved = localStorage.getItem('rccg-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch (_) { /* storage unavailable: fall back to light */ }
  root.setAttribute('data-theme', theme);
  root.classList.add('js');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0a1c' : '#f8f7fb');
})();
