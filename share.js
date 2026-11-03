/* belinus · hashtag spec lines + share links (LinkedIn / WhatsApp / copy) — shared by all pages */
(function () {
  var c = function () { return React.createElement.apply(React, arguments); };

  var TAGS = {
    "Kratos": ["SupercapacitorShelf", "400or800VDC", "LithiumFree", "LiquidCooled", "500kCycles", "EngineeredInEurope"],
    "Supercapacitor modules and racks": ["SupercapacitorShelf", "400or800VDC", "LithiumFree", "500kCycles", "EngineeredInEurope"],
    "SC-60138 supercapacitor cell": ["EDLC", "3800F", "LithiumFree", "500kCycles", "Minus40ToPlus65C"],
    "HUC-60138 hybrid ultracapacitor cell": ["HybridUltracapacitor", "LithiumIonCapacitor", "7000WperKg", "50kCycles", "Automotive"],
    "EnergyCabinet G1": ["CommercialStorage", "PeakShaving", "CriticalBackup", "Microgrids", "EVFleetCharging"],
    "Powerbox 640": ["PowerConversion", "EnergyCabinet", "CommercialAndIndustrial", "EngineeredInEurope"],
    "Powerbox 1250": ["PowerConversion", "EnergyCabinet", "CommercialAndIndustrial", "EngineeredInEurope"],
    "Gaia": ["BackContact", "505Wp", "FireClassA", "FullBlack", "35YearWarranty"],
    "Gaia Smart": ["BackContact", "IntegratedOptimiser", "PanelLevelMonitoring", "ModuleShutdown", "Launch2027"],
    "Theia": ["BackContact", "485Wp", "DualGlass", "FullBlack", "30YearWarranty"],
    "Helios": ["BackContact", "555Wp", "Bifacial", "FireClassA", "FlatRoofs"],
    "Helios Light": ["BackContact", "560Wp", "16kg", "LightweightRoofs", "7kgPerM2"],
    "Helios XL": ["BackContact", "670Wp", "72Cell", "LargeRoofs", "FewerPanels"],
    "Hyperion": ["BackContact", "665Wp", "75Bifacial", "HighCurrent", "UtilityScale"],
    "Hyperion 72": ["BackContact", "665Wp", "72Cell", "SolarParks", "AgriPV"],
    "Powerbox": ["HybridInverter", "SiliconCarbide", "TwoBatteryInputs", "SinglePhase", "ThreePhase"],
    "Powerbox S1-5": ["HybridInverter", "SiliconCarbide", "5kW", "SinglePhase", "TwoBatteryInputs"],
    "Powerbox S3-10": ["HybridInverter", "SiliconCarbide", "10kW", "ThreePhase", "TwoBatteryInputs"],
    "Energywall H1": ["SodiumIon", "Supercapacitor", "LithiumFree", "PlugAndPlay", "1CContinuous", "3CPeak"],
    "ETAPPro": ["EVCharger", "22kW", "IP67", "PlugAndPlay", "FollowsTheCar"],
    "Themis": ["EnergyManagement", "EdgeAI", "GridServices", "SolarBatteryEV", "Roadmap2027"]
  };
  function tagsFor(k) {
    if (!k) return null;
    k = String(k);
    if (TAGS[k]) return TAGS[k];
    if (/ETAPPro/.test(k)) return TAGS.ETAPPro;
    return null;
  }
  function HashTags(p) {
    var t = tagsFor(p.k);
    if (!t) return null;
    var out = [];
    t.forEach(function (x, i) {
      if (i) out.push(c("wbr", { key: "w" + i }));
      out.push(c("span", { key: x, className: i % 2 ? "ht-b" : "ht-w" }, "#" + x));
    });
    return c("p", { className: "hashtags" }, out);
  }

  var L = {
    en: { share: "Share", copy: "Copy link", copied: "Link copied", page: "Share this page" },
    nl: { share: "Delen", copy: "Link kopiëren", copied: "Link gekopieerd", page: "Deel deze pagina" },
    fr: { share: "Partager", copy: "Copier le lien", copied: "Lien copié", page: "Partager cette page" },
    de: { share: "Teilen", copy: "Link kopieren", copied: "Link kopiert", page: "Diese Seite teilen" },
    es: { share: "Compartir", copy: "Copiar enlace", copied: "Enlace copiado", page: "Compartir esta página" },
    it: { share: "Condividi", copy: "Copia link", copied: "Link copiato", page: "Condividi questa pagina" }
  };
  function lang() { var l = (document.documentElement.lang || "en").slice(0, 2).toLowerCase(); return L[l] ? l : "en"; }
  function slug(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  /* products with their own preview card get a /share/<lang>/<key>/ page (static og tags for LinkedIn / WhatsApp) */
  var CARD = { "kratos": "kratos", "supercapacitor-modules-and-racks": "kratos", "energywall-h1": "energywall",
    "gaia": "gaia", "gaia-smart": "gaia", "powerbox": "powerbox", "powerbox-s1-5": "powerbox", "powerbox-s3-10": "powerbox",
    "etappro": "etappro", "laadpaal-etappro": "etappro", "borne-de-recharge-etappro": "etappro", "ev-charger-etappro": "etappro" };
  function shareUrl(sl) {
    var path = location.pathname + (sl ? "?p=" + encodeURIComponent(sl) : "") + (location.hash || "");
    var key = sl && CARD[sl];
    if (key) return "https://www.belinus.com/share/" + lang() + "/" + key + "/?to=" + encodeURIComponent(path);
    return "https://www.belinus.com" + path;
  }

  var ICON_LI = c("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": "true" },
    c("path", { fill: "currentColor", d: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11.25H3zM9.5 9.75h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.6 4.77 6v5.7h-4v-5.05c0-1.2-.02-2.75-1.7-2.75-1.7 0-1.95 1.3-1.95 2.66V21H9.5z" }));
  var ICON_WA = c("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": "true" },
    c("path", { fill: "currentColor", d: "M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.92 9.92 0 1 0 12.04 2zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.07.9.9-2.98-.2-.31a8.2 8.2 0 1 1 6.87 3.72zm4.5-6.13c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.96-.14.17-.29.19-.54.06a6.73 6.73 0 0 1-1.98-1.22 7.43 7.43 0 0 1-1.37-1.71c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47a.9.9 0 0 0-.66.31 2.77 2.77 0 0 0-.86 2.06 4.8 4.8 0 0 0 1 2.56 11 11 0 0 0 4.22 3.73c.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" }));
  var ICON_LINK = c("svg", { viewBox: "0 0 24 24", width: 15, height: 15, "aria-hidden": "true" },
    c("path", { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", d: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" }));

  function ShareRow(p) {
    var t = L[lang()];
    var st = React.useState(false), done = st[0], setDone = st[1];
    var url = shareUrl(p.page ? "" : (p.slug || ""));
    var title = p.title ? ("belinus " + p.title) : (document.title || "belinus");
    var li = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url);
    var wa = "https://wa.me/?text=" + encodeURIComponent(title + " — " + url);
    function copy(e) {
      e.preventDefault(); e.stopPropagation();
      var ok = function () { setDone(true); setTimeout(function () { setDone(false); }, 1800); };
      try { navigator.clipboard.writeText(url).then(ok, ok); } catch (x) { ok(); }
    }
    var stop = function (e) { e.stopPropagation(); };
    return c("div", { className: "share-row" + (p.page ? " is-page" : ""), onClick: stop },
      c("span", { className: "share-label label" }, p.page ? t.page : t.share),
      c("a", { href: li, target: "_blank", rel: "noopener", className: "share-btn", "aria-label": "LinkedIn", title: "LinkedIn" }, ICON_LI),
      c("a", { href: wa, target: "_blank", rel: "noopener", className: "share-btn", "aria-label": "WhatsApp", title: "WhatsApp" }, ICON_WA),
      c("button", { type: "button", className: "share-btn", onClick: copy, "aria-label": t.copy, title: done ? t.copied : t.copy }, ICON_LINK),
      done ? c("span", { className: "share-done label" }, t.copied) : null);
  }

  /* deep link: ?p=slug scrolls to that product once the page has rendered */
  try {
    var want = new URLSearchParams(location.search).get("p");
    if (want) {
      var n = 0, iv = setInterval(function () {
        var el = document.getElementById("p-" + want) || (want === "kratos" && document.getElementById("kratos"));
        if (el || ++n > 40) {
          clearInterval(iv);
          if (el) setTimeout(function () {
            var y = el.getBoundingClientRect().top + scrollY - 150;
            scrollTo({ top: y, behavior: "smooth" });
            el.classList.add("is-shared");
          }, 250);
        }
      }, 120);
    }
  } catch (e) {}


  /* Region badge opens the drawer straight on the locale selector (no menu items in the way) */
  function regionTap(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var b = document.body;
    if (t.closest(".region-badge")) {
      b.classList.add("drawer-region-mode");
      setTimeout(function () { var db = document.querySelector(".drawer-body"); if (db) db.scrollTop = 0; }, 30);
    } else if (t.closest(".drawer-close, .drawer-backdrop") || (t.closest("button") && !t.closest(".drawer") && b.classList.contains("drawer-region-mode"))) {
      setTimeout(function () { b.classList.remove("drawer-region-mode"); }, 450);
    }
  }
  document.addEventListener("pointerdown", regionTap, true);
  document.addEventListener("click", regionTap, true);

  var css = document.createElement("style");
  css.textContent = [
    ".hashtags{margin:0;font-size:17px;line-height:1.5;letter-spacing:0;font-weight:300;color:var(--fg-1,#fff)}",
    ".hashtags span{white-space:nowrap;font-weight:300}",
    ".hashtags .ht-b{color:var(--brand-blue,#2EB9EA)}",
    ".share-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
    ".share-label{color:var(--fg-3,#8a94a0);margin-right:4px}",
    ".share-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;border:1px solid var(--ink-4,#2a3038);color:var(--fg-2,#c9d1d9);background:transparent;cursor:pointer;transition:color .2s,border-color .2s;padding:0}",
    ".share-btn:hover{color:var(--brand-blue,#2EB9EA);border-color:rgba(46,185,234,.6)}",
    ".share-done{color:var(--brand-blue,#2EB9EA)}",
    ".share-row.is-page{justify-content:flex-start;padding:20px 0 0}",
    ".is-shared{box-shadow:0 0 0 1px rgba(46,185,234,.7)}",
    "body.drawer-region-mode .drawer-nav, body.drawer-region-mode .drawer-login, body.drawer-region-mode .drawer-head .label{display:none}",
    "body.drawer-region-mode .drawer-body{padding-top:4px}",
    "body.drawer-region-mode .drawer-section{margin-top:0}",
    "body.drawer-region-mode .drawer-section-head .label{font-size:13px;color:var(--fg-1,#fff)}"
  ].join("\n");
  document.head.appendChild(css);

  window.HashTags = HashTags;
  window.ShareRow = ShareRow;
  window.bSlug = slug;
})();
