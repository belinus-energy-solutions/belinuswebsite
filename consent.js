/* =====================================================================
   Belinus — cookie consent + remembered region (shared by B2B and B2C)
   ---------------------------------------------------------------------
   Categories
     necessary    always on   · stores the consent choice itself
     preferences  opt-in      · remembers region, language and B2B/B2C
     statistics   opt-in      · reserved; no statistics tools are active
   Storage: a first-party cookie, mirrored in localStorage as a fallback
   for browsers or frames that block cookies. Every access is guarded.
   Consent is asked again after 6 months or when CONSENT_VERSION changes.
   ===================================================================== */
(function () {
  var CONSENT_KEY = 'belinus_consent';
  var REGION_KEY = 'belinus_region';
  var CONSENT_VERSION = 1;
  var CONSENT_DAYS = 182;   // re-ask after ~6 months
  var REGION_DAYS = 365;

  /* ---------- low-level storage ---------- */
  function setCookie(name, value, days) {
    try {
      var exp = new Date(Date.now() + days * 864e5).toUTCString();
      var secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/; SameSite=Lax' + secure;
    } catch (e) {}
    try { localStorage.setItem(name, value); } catch (e) {}
  }
  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      if (m) return decodeURIComponent(m[1]);
    } catch (e) {}
    try { return localStorage.getItem(name); } catch (e) { return null; }
  }
  function delCookie(name) {
    try { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax'; } catch (e) {}
    try { localStorage.removeItem(name); } catch (e) {}
  }
  function readJSON(name) {
    var raw = getCookie(name);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* ---------- consent ---------- */
  function getConsent() {
    var c = readJSON(CONSENT_KEY);
    if (!c || c.v !== CONSENT_VERSION) return null;
    if (!c.ts || Date.now() - c.ts > CONSENT_DAYS * 864e5) return null;
    return c;
  }
  var listeners = [];
  function setConsent(choice) {
    var c = {
      v: CONSENT_VERSION,
      necessary: true,
      preferences: !!choice.preferences,
      statistics: !!choice.statistics,
      ts: Date.now()
    };
    setCookie(CONSENT_KEY, JSON.stringify(c), CONSENT_DAYS);
    if (!c.preferences) delCookie(REGION_KEY);       // withdrawal removes stored preferences
    else if (pendingRegion) storeRegion(pendingRegion);
    listeners.forEach(function (fn) { try { fn(c); } catch (e) {} });
    return c;
  }

  /* ---------- remembered region ---------- */
  var pendingRegion = null;  // last choice made before consent was given
  function storeRegion(r) {
    setCookie(REGION_KEY, JSON.stringify({ code: r.code, lang: r.lang, seg: r.seg }), REGION_DAYS);
  }
  function setRegion(r) {
    pendingRegion = r;
    var c = getConsent();
    if (c && c.preferences) storeRegion(r);
  }
  function getRegion() {
    var c = getConsent();
    if (!c || !c.preferences) return null;
    var r = readJSON(REGION_KEY);
    return r && r.seg ? r : null;
  }

  /* ---------- texts ---------- */
  var T = {
    en: {
      title: 'Cookies on belinus.com',
      body: 'We use necessary cookies to make this website work. With your permission we also remember your region, language and whether you visit the business (B2B) or private (B2C) site. We do not use advertising cookies.',
      accept: 'Accept all', reject: 'Necessary only', settings: 'Settings', save: 'Save choices',
      policy: 'Privacy & cookie policy',
      nec: 'Necessary', necD: 'Store your cookie choice. Always on.',
      pref: 'Preferences', prefD: 'Remember your region, language and B2B or B2C site for your next visit. Kept for 12 months.',
      stat: 'Statistics', statD: 'Anonymous visitor statistics. Not in use at the moment; only activated with your consent.',
      always: 'Always on', close: 'Close'
    },
    nl: {
      title: 'Cookies op belinus.com',
      body: 'We gebruiken noodzakelijke cookies om deze website te laten werken. Met je toestemming onthouden we ook je regio, taal en of je de zakelijke (B2B) of particuliere (B2C) site bezoekt. We gebruiken geen advertentiecookies.',
      accept: 'Alles aanvaarden', reject: 'Enkel noodzakelijke', settings: 'Instellingen', save: 'Keuze bewaren',
      policy: 'Privacy- en cookiebeleid',
      nec: 'Noodzakelijk', necD: 'Bewaren je cookiekeuze. Altijd actief.',
      pref: 'Voorkeuren', prefD: 'Onthouden je regio, taal en B2B- of B2C-site voor je volgende bezoek. Bewaard gedurende 12 maanden.',
      stat: 'Statistieken', statD: 'Anonieme bezoekersstatistieken. Momenteel niet in gebruik; enkel met je toestemming.',
      always: 'Altijd actief', close: 'Sluiten'
    },
    fr: {
      title: 'Cookies sur belinus.com',
      body: 'Nous utilisons des cookies nécessaires au fonctionnement de ce site. Avec votre accord, nous retenons aussi votre région, votre langue et votre choix entre le site professionnel (B2B) et particulier (B2C). Nous n’utilisons pas de cookies publicitaires.',
      accept: 'Tout accepter', reject: 'Nécessaires uniquement', settings: 'Paramètres', save: 'Enregistrer',
      policy: 'Politique de confidentialité et cookies',
      nec: 'Nécessaires', necD: 'Enregistrent votre choix de cookies. Toujours actifs.',
      pref: 'Préférences', prefD: 'Retiennent votre région, votre langue et le site B2B ou B2C pour votre prochaine visite. Conservés 12 mois.',
      stat: 'Statistiques', statD: 'Statistiques de visite anonymes. Pas utilisées actuellement ; uniquement avec votre accord.',
      always: 'Toujours actifs', close: 'Fermer'
    },
    de: {
      title: 'Cookies auf belinus.com',
      body: 'Wir verwenden notwendige Cookies, damit diese Website funktioniert. Mit Ihrer Einwilligung merken wir uns auch Ihre Region, Sprache und ob Sie die Geschäftskunden- (B2B) oder Privatkunden-Website (B2C) besuchen. Wir verwenden keine Werbe-Cookies.',
      accept: 'Alle akzeptieren', reject: 'Nur notwendige', settings: 'Einstellungen', save: 'Auswahl speichern',
      policy: 'Datenschutz- und Cookie-Richtlinie',
      nec: 'Notwendig', necD: 'Speichern Ihre Cookie-Auswahl. Immer aktiv.',
      pref: 'Präferenzen', prefD: 'Merken sich Region, Sprache und B2B- oder B2C-Website für Ihren nächsten Besuch. Gespeichert für 12 Monate.',
      stat: 'Statistik', statD: 'Anonyme Besucherstatistik. Derzeit nicht im Einsatz; nur mit Ihrer Einwilligung.',
      always: 'Immer aktiv', close: 'Schließen'
    }
  };
  function lang() {
    var l = (window.BELINUS_LANG || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    return T[l] ? l : 'en';
  }

  /* ---------- UI ---------- */
  var CSS =
    '.bc-wrap{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;display:flex;justify-content:center;pointer-events:none;font-family:"Arial Nova",Arial,Helvetica,sans-serif}' +
    '.bc-card{pointer-events:auto;width:100%;max-width:760px;background:#111419;color:#E8ECF1;border:1px solid #2A313B;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:22px 24px;animation:bcIn .35s cubic-bezier(.2,.7,.2,1)}' +
    '@keyframes bcIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}' +
    '.bc-title{font-size:16px;font-weight:700;margin:0 0 8px;color:#fff}' +
    '.bc-body{font-size:14px;line-height:1.55;margin:0;color:#B8C0CA}' +
    '.bc-body a{color:#2EB9EA;text-decoration:underline}' +
    '.bc-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;align-items:center}' +
    '.bc-btn{font:inherit;font-size:14px;font-weight:600;border-radius:999px;padding:10px 18px;cursor:pointer;border:1px solid #3A4350;background:transparent;color:#E8ECF1;min-height:40px}' +
    '.bc-btn:hover{border-color:#2EB9EA}' +
    '.bc-btn.bc-primary{background:#2EB9EA;border-color:#2EB9EA;color:#0A0C0F}' +
    '.bc-btn.bc-primary:hover{background:#5BCBF0}' +
    '.bc-btn:focus-visible,.bc-switch input:focus-visible+span{outline:2px solid #2EB9EA;outline-offset:2px}' +
    '.bc-link{font:inherit;font-size:14px;background:none;border:0;color:#B8C0CA;text-decoration:underline;cursor:pointer;padding:8px 4px;margin-left:auto}' +
    '.bc-cats{margin:16px 0 0;border-top:1px solid #2A313B}' +
    '.bc-cat{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;padding:14px 0;border-bottom:1px solid #2A313B}' +
    '.bc-cat strong{display:block;font-size:14px;color:#fff;margin-bottom:3px}' +
    '.bc-cat span.d{font-size:13px;line-height:1.5;color:#8E98A5}' +
    '.bc-always{font-size:12px;color:#2EB9EA;white-space:nowrap;padding-top:2px}' +
    '.bc-switch{position:relative;flex:0 0 auto;width:44px;height:24px}' +
    '.bc-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}' +
    '.bc-switch span{position:absolute;inset:0;border-radius:999px;background:#2A313B;transition:background .2s}' +
    '.bc-switch span:after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}' +
    '.bc-switch input:checked+span{background:#2EB9EA}' +
    '.bc-switch input:checked+span:after{transform:translateX(20px)}' +
    '@media (max-width:560px){.bc-wrap{left:8px;right:8px;bottom:8px}.bc-card{padding:18px}.bc-btn{flex:1 1 auto}.bc-link{margin-left:0}}' +
    '@media (prefers-reduced-motion:reduce){.bc-card{animation:none}.bc-switch span,.bc-switch span:after{transition:none}}';

  var root = null;
  function injectCSS() {
    if (document.getElementById('bc-style')) return;
    var s = document.createElement('style'); s.id = 'bc-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function close() { if (root) { root.remove(); root = null; } }

  function render(showSettings) {
    injectCSS(); close();
    var t = T[lang()];
    var cur = getConsent() || { preferences: false, statistics: false };
    var policy = window.BELINUS_PRIVACY_URL || '#privacy';
    root = document.createElement('div');
    root.className = 'bc-wrap';
    root.innerHTML =
      '<div class="bc-card" role="dialog" aria-modal="false" aria-labelledby="bc-t" aria-describedby="bc-b">' +
        '<p class="bc-title" id="bc-t">' + t.title + '</p>' +
        '<p class="bc-body" id="bc-b">' + t.body + ' <a href="' + policy + '">' + t.policy + '</a></p>' +
        (showSettings ?
          '<div class="bc-cats">' +
            '<div class="bc-cat"><div><strong>' + t.nec + '</strong><span class="d">' + t.necD + '</span></div><span class="bc-always">' + t.always + '</span></div>' +
            '<div class="bc-cat"><div><strong>' + t.pref + '</strong><span class="d">' + t.prefD + '</span></div><label class="bc-switch"><input type="checkbox" id="bc-pref" aria-label="' + t.pref + '"' + (cur.preferences ? ' checked' : '') + '><span></span></label></div>' +
            '<div class="bc-cat"><div><strong>' + t.stat + '</strong><span class="d">' + t.statD + '</span></div><label class="bc-switch"><input type="checkbox" id="bc-stat" aria-label="' + t.stat + '"' + (cur.statistics ? ' checked' : '') + '><span></span></label></div>' +
          '</div>' : '') +
        '<div class="bc-actions">' +
          '<button type="button" class="bc-btn" data-a="reject">' + t.reject + '</button>' +
          (showSettings
            ? '<button type="button" class="bc-btn" data-a="save">' + t.save + '</button>'
            : '<button type="button" class="bc-btn" data-a="settings">' + t.settings + '</button>') +
          '<button type="button" class="bc-btn bc-primary" data-a="accept">' + t.accept + '</button>' +
        '</div>' +
      '</div>';
    root.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (!a) return;
      if (a === 'accept') { setConsent({ preferences: true, statistics: true }); close(); }
      else if (a === 'reject') { setConsent({ preferences: false, statistics: false }); close(); }
      else if (a === 'settings') { render(true); }
      else if (a === 'save') {
        setConsent({
          preferences: root.querySelector('#bc-pref').checked,
          statistics: root.querySelector('#bc-stat').checked
        });
        close();
      }
    });
    document.body.appendChild(root);
  }

  function init() { if (!getConsent()) render(false); }

  window.BelinusConsent = {
    getConsent: getConsent,
    setConsent: setConsent,
    openSettings: function () { render(true); },
    onChange: function (fn) { listeners.push(fn); },
    getRegion: getRegion,
    setRegion: setRegion
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
