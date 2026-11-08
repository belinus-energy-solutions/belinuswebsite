/* belinus.com light/dark toggle. Dark is the standard look; light is remembered per browser (same key as the investor portal). */
(function () {
  var KEY = 'belinus_theme', root = document.documentElement;
  try { if (localStorage.getItem(KEY) === 'light') root.dataset.theme = 'light'; } catch (e) {}
  var css = [
    'html[data-theme=light]{color-scheme:light;--ink-0:#fff;--ink-1:#F5F6F7;--ink-2:#fff;--ink-3:#EEF0F3;--ink-4:#E0E4E9;--ink-5:#C4CBD3;--fg-1:#0A0C0F;--fg-2:#3A424D;--fg-3:#5A6370;--fg-4:#8A929C;--brand-blue:#0F7FAB;--success:#1F7A4D;--shadow-card:0 8px 24px rgba(10,12,15,.06),0 1px 2px rgba(10,12,15,.05);--shadow-lift:0 24px 60px rgba(10,12,15,.12)}',
    'html[data-theme=light],html[data-theme=light] body{background:#F5F6F7;color:#0A0C0F}',
    'html[data-theme=light] body::before{background:none!important}',
    'html[data-theme=light] .hero-section,html[data-theme=light] .kband,html[data-theme=light] .home-energy,html[data-theme=light] .puma-break{color:#fff;--ink-0:#000;--ink-1:#0A0C0F;--ink-2:#121519;--ink-3:#1C2128;--ink-4:#272D36;--ink-5:#3A424D;--fg-1:#fff;--fg-2:rgba(255,255,255,.72);--fg-3:rgba(255,255,255,.48);--fg-4:rgba(255,255,255,.24);--brand-blue:#2EB9EA}',
    'html[data-theme=light] .kband{background:radial-gradient(60% 80% at 75% 50%,rgba(46,185,234,.10),transparent 70%),#000}',
    'html[data-theme=light] .hero-section{background:#000}',
    'html[data-theme=light] .site-header,html[data-theme=light] .site-header.is-scrolled{background:rgba(255,255,255,.96);backdrop-filter:blur(18px) saturate(140%);border-bottom:1px solid var(--ink-4)}',
    'html[data-theme=light] .qa-bar,html[data-theme=light] .qa-panel{background:#E6F4FA}',
    'html[data-theme=light] .drawer{background:rgba(255,255,255,.98);box-shadow:none}',
    'html[data-theme=light] .drawer-backdrop{background:rgba(10,12,15,.3)}',
    'html[data-theme=light] .ref-logo,html[data-theme=light] .partner-logo-tile,html[data-theme=light] .supplier img{background:#0A0C0F;border-radius:8px;padding:6px}',
    'html[data-theme=light] .press-preview:not(.press-light){background:#0A0C0F;--fg-1:#fff}',
    'html[data-theme=light] .kratos figure{background:#000;border-radius:12px;padding:12px;color:#fff;--fg-1:#fff;--fg-2:rgba(255,255,255,.72);--fg-3:rgba(255,255,255,.6)}',
    '.theme-btn{width:36px;height:36px;flex:none;display:inline-grid;place-items:center;border-radius:50%;border:1px solid var(--ink-5);background:none;color:var(--fg-2);padding:0;cursor:pointer;transition:all 200ms cubic-bezier(.22,1,.36,1)}',
    '.theme-btn:hover{border-color:#2EB9EA;color:#2EB9EA}.theme-btn:focus-visible{outline:2px solid #2EB9EA;outline-offset:2px}.theme-btn svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.5;fill:none;stroke-linecap:round;stroke-linejoin:round}'
  ].join('');
  var st = document.createElement('style'); st.id = 'belinus-theme'; st.textContent = css; document.head ? document.head.appendChild(st) : root.appendChild(st);
  var LABEL = { nl: ['Licht thema', 'Donker thema'], fr: ['Thème clair', 'Thème sombre'], de: ['Helles Design', 'Dunkles Design'], it: ['Tema chiaro', 'Tema scuro'], es: ['Tema claro', 'Tema oscuro'], en: ['Light theme', 'Dark theme'] };
  var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  function paint(b) {
    var light = root.dataset.theme === 'light', l = LABEL[(root.lang || 'en').slice(0, 2)] || LABEL.en, t = l[light ? 1 : 0];
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (light ? MOON : SUN) + '</svg>'; b.title = t; b.setAttribute('aria-label', t);
  }
  function make() {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'theme-btn'; paint(b);
    b.addEventListener('click', function () {
      var light = root.dataset.theme !== 'light';
      if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
      try { localStorage.setItem(KEY, light ? 'light' : 'dark'); } catch (e) {}
      paint(b);
    });
    return b;
  }
  function mount() {
    var host = document.querySelector('.site-header-right');
    if (host && !host.querySelector('.theme-btn')) host.insertBefore(make(), host.querySelector('.header-cta'));
  }
  new MutationObserver(mount).observe(root, { childList: true, subtree: true });
})();
