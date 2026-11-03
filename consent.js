/* Always show the site on belinus.com: visitors arriving on Bunny's default
   address (belinuswebsite.b-cdn.net) are sent to the same page on belinus.com. */
(function () {
  try {
    if (/\.b-cdn\.net$/i.test(location.hostname)) {
      location.replace('https://belinus.com' + location.pathname + location.search + location.hash);
    }
  } catch (e) {}
})();
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
    },
    it: {
      title: 'Cookie su belinus.com',
      body: 'Utilizziamo cookie necessari per il funzionamento di questo sito. Con il suo consenso memorizziamo anche la sua regione, la lingua e se visita il sito per le aziende (B2B) o per i privati (B2C). Non utilizziamo cookie pubblicitari.',
      accept: 'Accetta tutti', reject: 'Solo necessari', settings: 'Impostazioni', save: 'Salva le scelte',
      policy: 'Informativa su privacy e cookie',
      nec: 'Necessari', necD: 'Memorizzano la sua scelta sui cookie. Sempre attivi.',
      pref: 'Preferenze', prefD: 'Memorizzano regione, lingua e sito B2B o B2C per la sua prossima visita. Conservati per 12 mesi.',
      stat: 'Statistiche', statD: 'Statistiche anonime sui visitatori. Attualmente non in uso; attivate solo con il suo consenso.',
      always: 'Sempre attivi', close: 'Chiudi'
    },
    es: {
      title: 'Cookies en belinus.com',
      body: 'Utilizamos cookies necesarias para que este sitio web funcione. Con su consentimiento, también recordamos su región, su idioma y si visita el sitio para empresas (B2B) o para particulares (B2C). No utilizamos cookies publicitarias.',
      accept: 'Aceptar todas', reject: 'Solo las necesarias', settings: 'Configuración', save: 'Guardar selección',
      policy: 'Política de privacidad y cookies',
      nec: 'Necesarias', necD: 'Guardan su elección de cookies. Siempre activas.',
      pref: 'Preferencias', prefD: 'Recuerdan su región, idioma y sitio B2B o B2C para su próxima visita. Se conservan durante 12 meses.',
      stat: 'Estadísticas', statD: 'Estadísticas anónimas de visitas. Actualmente no se utilizan; solo se activan con su consentimiento.',
      always: 'Siempre activas', close: 'Cerrar'
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


  /* ---------- first-visit locale suggestion ---------- */
  var LC = {
    countries: [
      { code: 'INT', name: 'International', b2b: ['en','nl'] },
      { code: 'BE', name: 'België / Belgique', b2b: ['nl','fr','en'], b2c: ['nl','fr','en'] },
      { code: 'NL', name: 'Nederland', b2b: ['nl','en'], b2c: ['nl','en'] },
      { code: 'FR', name: 'France', b2b: ['fr','en'] },
      { code: 'DE', name: 'Deutschland', b2b: ['de','en'] },
      { code: 'CH', name: 'Schweiz / Suisse / Svizzera', b2b: ['de','fr','it','en'] },
      { code: 'LU', name: 'Luxembourg', b2b: ['fr','de','en'] },
      { code: 'UK', name: 'United Kingdom', b2b: ['en'] },
      { code: 'IT', name: 'Italia', b2b: ['it','en'] },
      { code: 'ES', name: 'España', b2b: ['es','en'] }
    ],
    langName: { nl: 'Nederlands', fr: 'Français', en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano' },
    tz: { 'Europe/Brussels': 'BE', 'Europe/Amsterdam': 'NL', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Zurich': 'CH',
          'Europe/Luxembourg': 'LU', 'Europe/London': 'UK', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES' },
    b2bFile: { en: 'index.html', nl: 'nl.html', fr: 'fr.html', de: 'de.html', it: 'it.html', es: 'es.html' },
    b2cFile: { nl: 'index.html', fr: 'fr.html', en: 'en.html' }
  };
  var LT = {
    nl: { title: 'Welkom bij belinus', lead: 'We stellen je regio en taal voor op basis van je browser. Klopt dit?', home: 'Voor thuis', homeSub: 'Particulieren · België en Nederland', biz: 'Voor bedrijven', bizSub: 'Industrie, partners en projecten', country: 'Land', language: 'Taal', remember: 'Onthoud mijn keuze voor volgende bezoeken', rememberSub: 'We bewaren hiervoor 12 maanden een voorkeurscookie.', policy: 'Privacy- en cookiebeleid', confirm: 'Bevestigen', decline: 'Nee, dank je' },
    fr: { title: 'Bienvenue chez belinus', lead: 'Nous vous proposons une région et une langue d’après votre navigateur. Est-ce correct ?', home: 'Pour la maison', homeSub: 'Particuliers · Belgique et Pays-Bas', biz: 'Pour les entreprises', bizSub: 'Industrie, partenaires et projets', country: 'Pays', language: 'Langue', remember: 'Mémoriser mon choix pour mes prochaines visites', rememberSub: 'Nous conservons pour cela un cookie de préférences pendant 12 mois.', policy: 'Politique de confidentialité et cookies', confirm: 'Confirmer', decline: 'Non merci' },
    en: { title: 'Welcome to belinus', lead: 'We suggest a region and language based on your browser. Is this right?', home: 'For your home', homeSub: 'Private customers · Belgium and the Netherlands', biz: 'For business', bizSub: 'Industry, partners and projects', country: 'Country', language: 'Language', remember: 'Remember my choice for future visits', rememberSub: 'For this we keep a preference cookie for 12 months.', policy: 'Privacy & cookie policy', confirm: 'Confirm', decline: 'No, thanks' },
    de: { title: 'Willkommen bei belinus', lead: 'Wir schlagen Ihnen Region und Sprache anhand Ihres Browsers vor. Stimmt das?', home: 'Für Ihr Zuhause', homeSub: 'Privatkunden · Belgien und Niederlande', biz: 'Für Unternehmen', bizSub: 'Industrie, Partner und Projekte', country: 'Land', language: 'Sprache', remember: 'Meine Auswahl für künftige Besuche speichern', rememberSub: 'Dafür speichern wir 12 Monate lang ein Präferenz-Cookie.', policy: 'Datenschutz- und Cookie-Richtlinie', confirm: 'Bestätigen', decline: 'Nein, danke' },
    es: { title: 'Bienvenido a belinus', lead: 'Le proponemos una región y un idioma según su navegador. ¿Es correcto?', home: 'Para su hogar', homeSub: 'Particulares · Bélgica y Países Bajos', biz: 'Para empresas', bizSub: 'Industria, socios y proyectos', country: 'País', language: 'Idioma', remember: 'Recordar mi elección para próximas visitas', rememberSub: 'Para ello guardamos una cookie de preferencias durante 12 meses.', policy: 'Política de privacidad y cookies', confirm: 'Confirmar', decline: 'No, gracias' },
    it: { title: 'Benvenuto in belinus', lead: 'Le proponiamo una regione e una lingua in base al suo browser. È corretto?', home: 'Per la casa', homeSub: 'Privati · Belgio e Paesi Bassi', biz: 'Per le aziende', bizSub: 'Industria, partner e progetti', country: 'Paese', language: 'Lingua', remember: 'Ricorda la mia scelta per le prossime visite', rememberSub: 'A tal fine conserviamo un cookie di preferenza per 12 mesi.', policy: 'Informativa su privacy e cookie', confirm: 'Conferma', decline: 'No, grazie' }
  };
  function lcCountry(code) { for (var i = 0; i < LC.countries.length; i++) if (LC.countries[i].code === code) return LC.countries[i]; return null; }
  function lcLangs(code, seg) { var c = lcCountry(code); return c ? (seg === 'B2C' ? c.b2c : c.b2b) || null : null; }
  function isB2CPage() { return /\/b2c\//.test(location.pathname); }
  function detect() {
    var list = [];
    try { list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).slice(); } catch (e) { list = ['en']; }
    var lang = 'en', regionFromLang = null;
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i] || '').toLowerCase(), base = tag.slice(0, 2);
      if (!regionFromLang && tag.length >= 5) regionFromLang = tag.slice(3, 5).toUpperCase();
      if (LC.langName[base]) { lang = base; if (tag.length >= 5) regionFromLang = tag.slice(3, 5).toUpperCase(); break; }
    }
    if (regionFromLang === 'GB') regionFromLang = 'UK';
    var tzc = null;
    try { tzc = LC.tz[Intl.DateTimeFormat().resolvedOptions().timeZone] || null; } catch (e) {}
    var country = tzc || (lcCountry(regionFromLang) ? regionFromLang : null) || 'INT';
    var seg = isB2CPage() ? 'B2C' : 'B2B';
    if (seg === 'B2C' && !lcLangs(country, 'B2C')) seg = 'B2B';
    return { country: country, lang: lang, seg: seg };
  }
  function fit(st) {
    if (st.seg === 'B2C' && !lcLangs(st.country, 'B2C')) st.country = 'BE';
    var ls = lcLangs(st.country, st.seg) || ['en'];
    if (ls.indexOf(st.lang) < 0) st.lang = ls.indexOf('en') >= 0 ? 'en' : ls[0];
    return st;
  }
  function targetUrl(st) {
    if (st.seg === 'B2C') return '/b2c/' + LC.b2cFile[st.lang] + '?c=' + st.country + '&l=' + st.lang;
    return '/' + LC.b2bFile[st.lang] + '?c=' + st.country;
  }
  var LCSS =
    '.bl-wrap{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);font-family:"Arial Nova",Arial,Helvetica,sans-serif}' +
    '.bl-card{width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;background:#111419;color:#E8ECF1;border:1px solid #2A313B;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);padding:26px 24px;animation:bcIn .35s cubic-bezier(.2,.7,.2,1)}' +
    '.bl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 8px}' +
    '.bl-title{font-size:20px;font-weight:400;margin:0;color:#fff}' +
    '.bl-ui{font:inherit;font-size:12px;letter-spacing:.06em;background:none;border:1px solid #3A4350;border-radius:999px;color:#B8C0CA;padding:5px 12px;cursor:pointer;white-space:nowrap}' +
    '.bl-ui:hover{border-color:#2EB9EA;color:#fff}' +
    '.bl-lead{font-size:14px;line-height:1.55;margin:0 0 18px;color:#B8C0CA}' +
    '.bl-seg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}' +
    '.bl-opt{font:inherit;text-align:left;cursor:pointer;background:transparent;color:#E8ECF1;border:1px solid #3A4350;border-radius:12px;padding:12px 14px;display:grid;gap:3px}' +
    '.bl-opt b{font-size:15px;font-weight:600}.bl-opt span{font-size:12px;color:#8E98A5;line-height:1.4}' +
    '.bl-opt[aria-pressed="true"]{border-color:#2EB9EA;background:rgba(46,185,234,.08)}' +
    '.bl-opt:disabled{opacity:.4;cursor:default}' +
    '.bl-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}' +
    '.bl-row label{display:grid;gap:6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8E98A5}' +
    '.bl-row select{font:inherit;font-size:14px;letter-spacing:0;text-transform:none;color:#E8ECF1;background:#0A0C0F;border:1px solid #3A4350;border-radius:10px;padding:10px 12px;width:100%}' +
    '.bl-rem{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.45;color:#E8ECF1;cursor:pointer;margin-bottom:6px}' +
    '.bl-rem input{margin-top:3px;width:16px;height:16px;accent-color:#2EB9EA;flex:0 0 auto}' +
    '.bl-rem small{display:block;font-size:12px;color:#8E98A5}' +
    '.bl-rem a{color:#2EB9EA}' +
    '.bl-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}' +
    '.bl-actions .bc-btn{min-width:130px}' +
    '@media (max-width:480px){.bl-card{padding:20px 18px}.bl-seg,.bl-row{grid-template-columns:1fr}.bl-actions .bc-btn{flex:1 1 auto}}' +
    '@media (prefers-reduced-motion:reduce){.bl-card{animation:none}}';
  function renderLocale() {
    injectCSS();
    if (!document.getElementById('bl-style')) { var st0 = document.createElement('style'); st0.id = 'bl-style'; st0.textContent = LCSS; document.head.appendChild(st0); }
    var det = detect(), st = fit({ country: det.country, lang: det.lang, seg: det.seg });
    var native = LT[det.lang] ? det.lang : 'en', ui = native;
    var wrap = document.createElement('div');
    wrap.className = 'bl-wrap';
    function opts(list, cur, label) {
      return list.map(function (v) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label(v) + '</option>'; }).join('');
    }
    function draw() {
      var t = LT[ui] || LT.en;
      var cs = LC.countries.filter(function (c) { return st.seg === 'B2C' ? c.b2c : c.b2b; }).map(function (c) { return c.code; });
      var policy = window.BELINUS_PRIVACY_URL || (isB2CPage() ? '../index.html#privacy' : '#privacy');
      var rem = wrap.querySelector('#bl-rem'); var remOn = rem ? rem.checked : false;
      wrap.innerHTML =
        '<div class="bl-card" role="dialog" aria-modal="true" aria-labelledby="bl-t">' +
          '<div class="bl-head"><p class="bl-title" id="bl-t">' + t.title + '</p>' + (native !== 'en' ? '<button type="button" class="bl-ui" data-ui="' + (ui === 'en' ? native : 'en') + '" lang="' + (ui === 'en' ? native : 'en') + '">' + (ui === 'en' ? LC.langName[native] : 'English') + '</button>' : '') + '</div>' +
          '<p class="bl-lead">' + t.lead + '</p>' +
          '<div class="bl-seg">' +
            '<button type="button" class="bl-opt" data-seg="B2C" aria-pressed="' + (st.seg === 'B2C') + '"><b>' + t.home + '</b><span>' + t.homeSub + '</span></button>' +
            '<button type="button" class="bl-opt" data-seg="B2B" aria-pressed="' + (st.seg === 'B2B') + '"><b>' + t.biz + '</b><span>' + t.bizSub + '</span></button>' +
          '</div>' +
          '<div class="bl-row">' +
            '<label>' + t.country + '<select id="bl-c">' + opts(cs, st.country, function (c) { return lcCountry(c).name; }) + '</select></label>' +
            '<label>' + t.language + '<select id="bl-l">' + opts(lcLangs(st.country, st.seg), st.lang, function (l) { return LC.langName[l]; }) + '</select></label>' +
          '</div>' +
          '<label class="bl-rem"><input type="checkbox" id="bl-rem"' + (remOn ? ' checked' : '') + '><span>' + t.remember + '<small>' + t.rememberSub + ' <a href="' + policy + '">' + t.policy + '</a></small></span></label>' +
          '<div class="bl-actions">' +
            '<button type="button" class="bc-btn" data-a="no">' + t.decline + '</button>' +
            '<button type="button" class="bc-btn bc-primary" data-a="ok">' + t.confirm + '</button>' +
          '</div>' +
        '</div>';
      wrap.querySelector('#bl-c').onchange = function (e) { st.country = e.target.value; fit(st); draw(); };
      wrap.querySelector('#bl-l').onchange = function (e) { st.lang = e.target.value; draw(); };
    }
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-seg],[data-a],[data-ui]') : null;
      if (!b) return;
      var seg = b.getAttribute('data-seg'), a = b.getAttribute('data-a'), u = b.getAttribute('data-ui');
      if (u) { ui = u; draw(); try { wrap.querySelector('.bl-ui').focus(); } catch (e2) {} return; }
      if (seg) { st.seg = seg; fit(st); draw(); return; }
      var remember = wrap.querySelector('#bl-rem').checked;
      if (a === 'no') { setConsent({ preferences: false, statistics: false }); wrap.remove(); return; }
      if (a === 'ok') {
        if (remember) setRegion({ code: st.country, lang: st.lang.toUpperCase(), seg: st.seg });
        setConsent({ preferences: remember, statistics: false });
        var url = targetUrl(st), here = location.pathname.replace(/\/$/, '/index.html') + location.search;
        var sameSeg = (st.seg === 'B2C') === isB2CPage();
        wrap.remove();
        if (url !== here) location.href = url + (sameSeg ? location.hash : '');
      }
    });
    draw();
    document.body.appendChild(wrap);
    try { wrap.querySelector('[data-a="ok"]').focus(); } catch (e) {}
  }
  function wantsLocale() {
    if (getConsent()) return false;
    var q = '';
    try { q = location.search; } catch (e) {}
    if (/[?&]c=/.test(q)) return false;                       // short links / QR codes already choose a locale
    if (/^#(privacy|terms)$/.test(location.hash)) return false; // let people read the policy first
    if (/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent || '')) return false;
    return true;
  }
  function init() { if (wantsLocale()) renderLocale(); else if (!getConsent()) render(false); }

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
