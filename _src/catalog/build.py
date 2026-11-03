#!/usr/bin/env python3
"""Build /legacy.js, /catalog.json and the archive datasheets from catalog.py.
Run: python3 _src/catalog/build.py   (from anywhere)"""
import json, re, pathlib, subprocess, sys, html
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import catalog as C

SITE = pathlib.Path(__file__).resolve().parents[2]
L6 = C.L6

def res(v, lang):
    v = re.sub(r"@(\w+)", lambda m: C.V[m.group(1)][lang], v)
    if lang != "en":
        v = re.sub(r"(\d)\.(\d)", r"\1,\2", v)
    return v

def item(p, lang):
    return {"id": p["id"], "cat": p["cat"], "name": p["name"], "years": res(p["years"], lang), "desc": p["desc"][lang],
            "warranty": p["warranty"], "sheet": p["sheet"],
            "specs": [[C.K[k][lang], res(v, lang)] for k, v in p["specs"]]}

UI = {
 "en": {"link": "Discontinued items", "linkSub": {"solar": "Earlier Belinus solar panels (2022 – 2025): specifications, archive datasheets, warranty and service.", "inverter": "Earlier inverters in Belinus installations (Solis): specifications, archive datasheets, warranty and service."},
        "title": {"solar": "Discontinued solar panels", "inverter": "Discontinued inverters"}, "eyebrow": "No longer sold",
        "lead": "These products are no longer sold. Your warranty and service continue under the terms in your sales documents. Find your model, download its archive datasheet, register your installation in the customer portal or ask our service team for help.",
        "sold": "Sold", "sheet": "Archive datasheet", "pdf": "PDF · English", "service": "Request service or warranty", "register": "Register in the customer portal",
        "maker": "Manufacturer warranty (Solis), handled through Belinus.", "contract": "Warranty as stated in your sales documents.",
        "extendH": "Extend your installation", "extendB": "Add panels, a home battery, an EV charger or energy management to an existing Belinus system. We check compatibility with what you already have.", "extendCta": "Request an extension quote",
        "back": {"solar": "← Current solar panels", "inverter": "← Current products"}},
 "nl": {"link": "Niet meer leverbaar", "linkSub": {"solar": "Eerdere Belinus-zonnepanelen (2022 – 2025): specificaties, archiefdatasheets, garantie en service.", "inverter": "Eerdere omvormers in Belinus-installaties (Solis): specificaties, archiefdatasheets, garantie en service."},
        "title": {"solar": "Zonnepanelen die niet meer leverbaar zijn", "inverter": "Omvormers die niet meer leverbaar zijn"}, "eyebrow": "Niet meer leverbaar",
        "lead": "Deze producten worden niet meer verkocht. Uw garantie en service lopen door volgens de voorwaarden in uw aankoopdocumenten. Zoek uw model, download de archiefdatasheet, registreer uw installatie in het klantenportaal of vraag hulp aan onze serviceploeg.",
        "sold": "Verkocht", "sheet": "Archiefdatasheet", "pdf": "PDF · Engelstalig", "service": "Service of garantie aanvragen", "register": "Registreren in het klantenportaal",
        "maker": "Fabrieksgarantie (Solis), afgehandeld via Belinus.", "contract": "Garantie volgens uw aankoopdocumenten.",
        "extendH": "Uw installatie uitbreiden", "extendB": "Voeg panelen, een thuisbatterij, een laadpaal of energiebeheer toe aan een bestaand Belinus-systeem. We controleren de compatibiliteit met wat u al hebt.", "extendCta": "Offerte voor uitbreiding aanvragen",
        "back": {"solar": "← Huidige zonnepanelen", "inverter": "← Huidige producten"}},
 "fr": {"link": "Produits arrêtés", "linkSub": {"solar": "Anciens panneaux solaires Belinus (2022 – 2025) : caractéristiques, fiches d’archive, garantie et service.", "inverter": "Anciens onduleurs des installations Belinus (Solis) : caractéristiques, fiches d’archive, garantie et service."},
        "title": {"solar": "Panneaux solaires arrêtés", "inverter": "Onduleurs arrêtés"}, "eyebrow": "Plus commercialisé",
        "lead": "Ces produits ne sont plus vendus. Votre garantie et le service continuent selon les conditions de vos documents d’achat. Trouvez votre modèle, téléchargez sa fiche d’archive, enregistrez votre installation dans le portail client ou demandez de l’aide à notre service.",
        "sold": "Vendu", "sheet": "Fiche d’archive", "pdf": "PDF · anglais", "service": "Demander un service ou la garantie", "register": "Enregistrer dans le portail client",
        "maker": "Garantie fabricant (Solis), traitée par Belinus.", "contract": "Garantie selon vos documents d’achat.",
        "extendH": "Étendre votre installation", "extendB": "Ajoutez des panneaux, une batterie domestique, une borne de recharge ou une gestion de l’énergie à un système Belinus existant. Nous vérifions la compatibilité avec ce que vous avez déjà.", "extendCta": "Demander un devis d’extension",
        "back": {"solar": "← Panneaux solaires actuels", "inverter": "← Produits actuels"}},
 "de": {"link": "Nicht mehr lieferbar", "linkSub": {"solar": "Frühere Belinus-Solarmodule (2022 – 2025): technische Daten, Archivdatenblätter, Garantie und Service.", "inverter": "Frühere Wechselrichter in Belinus-Installationen (Solis): technische Daten, Archivdatenblätter, Garantie und Service."},
        "title": {"solar": "Nicht mehr lieferbare Solarmodule", "inverter": "Nicht mehr lieferbare Wechselrichter"}, "eyebrow": "Nicht mehr im Verkauf",
        "lead": "Diese Produkte werden nicht mehr verkauft. Garantie und Service gelten weiter gemäß Ihren Kaufunterlagen. Finden Sie Ihr Modell, laden Sie das Archivdatenblatt herunter, registrieren Sie Ihre Anlage im Kundenportal oder wenden Sie sich an unser Serviceteam.",
        "sold": "Verkauft", "sheet": "Archivdatenblatt", "pdf": "PDF · Englisch", "service": "Service oder Garantie anfragen", "register": "Im Kundenportal registrieren",
        "maker": "Herstellergarantie (Solis), abgewickelt über Belinus.", "contract": "Garantie gemäß Ihren Kaufunterlagen.",
        "extendH": "Anlage erweitern", "extendB": "Ergänzen Sie ein bestehendes Belinus-System um Module, einen Heimspeicher, eine Wallbox oder ein Energiemanagement. Wir prüfen die Kompatibilität mit Ihrer vorhandenen Anlage.", "extendCta": "Angebot für Erweiterung anfragen",
        "back": {"solar": "← Aktuelle Solarmodule", "inverter": "← Aktuelle Produkte"}},
 "es": {"link": "Productos descatalogados", "linkSub": {"solar": "Paneles solares Belinus anteriores (2022 – 2025): especificaciones, fichas de archivo, garantía y servicio.", "inverter": "Inversores anteriores de instalaciones Belinus (Solis): especificaciones, fichas de archivo, garantía y servicio."},
        "title": {"solar": "Paneles solares descatalogados", "inverter": "Inversores descatalogados"}, "eyebrow": "Ya no se comercializa",
        "lead": "Estos productos ya no se venden. Su garantía y el servicio continúan según las condiciones de sus documentos de compra. Busque su modelo, descargue su ficha de archivo, registre su instalación en el portal de clientes o pida ayuda a nuestro servicio técnico.",
        "sold": "Vendido", "sheet": "Ficha de archivo", "pdf": "PDF · inglés", "service": "Solicitar servicio o garantía", "register": "Registrar en el portal de clientes",
        "maker": "Garantía del fabricante (Solis), gestionada a través de Belinus.", "contract": "Garantía según sus documentos de compra.",
        "extendH": "Amplíe su instalación", "extendB": "Añada paneles, una batería doméstica, un cargador o gestión energética a un sistema Belinus existente. Comprobamos la compatibilidad con lo que ya tiene.", "extendCta": "Solicitar presupuesto de ampliación",
        "back": {"solar": "← Paneles solares actuales", "inverter": "← Productos actuales"}},
 "it": {"link": "Prodotti fuori produzione", "linkSub": {"solar": "Precedenti pannelli solari Belinus (2022 – 2025): specifiche, schede d’archivio, garanzia e assistenza.", "inverter": "Precedenti inverter nelle installazioni Belinus (Solis): specifiche, schede d’archivio, garanzia e assistenza."},
        "title": {"solar": "Pannelli solari fuori produzione", "inverter": "Inverter fuori produzione"}, "eyebrow": "Non più in vendita",
        "lead": "Questi prodotti non sono più in vendita. Garanzia e assistenza proseguono secondo le condizioni dei suoi documenti d’acquisto. Trovi il suo modello, scarichi la scheda d’archivio, registri l’impianto nel portale clienti o chieda aiuto al nostro servizio di assistenza.",
        "sold": "Venduto", "sheet": "Scheda d’archivio", "pdf": "PDF · inglese", "service": "Richiedere assistenza o garanzia", "register": "Registrare nel portale clienti",
        "maker": "Garanzia del produttore (Solis), gestita tramite Belinus.", "contract": "Garanzia secondo i suoi documenti d’acquisto.",
        "extendH": "Ampliare l’impianto", "extendB": "Aggiunga pannelli, una batteria domestica, una wallbox o la gestione dell’energia a un sistema Belinus esistente. Verifichiamo la compatibilità con ciò che ha già.", "extendCta": "Richiedere un preventivo di ampliamento",
        "back": {"solar": "← Pannelli solari attuali", "inverter": "← Prodotti attuali"}},
}

data = {l: [item(p, l) for p in C.DISCONTINUED] for l in L6}

JS = r"""/* belinus · discontinued products (generated by _src/catalog/build.py — do not edit by hand) */
(function () {
  var D = __DATA__, U = __UI__;
  var c = function () { return React.createElement.apply(React, arguments); };
  function lang() { var l = (document.documentElement.lang || "en").slice(0, 2).toLowerCase(); return D[l] ? l : "en"; }
  function isB2C() { return !!window.__B2C_PAGE_LANG || /\/b2c\//.test(location.pathname); }
  function root() { return isB2C() ? "../" : ""; }
  var PORTAL = "https://www.belinus.com/portal/#/products/register?p=";
  function routes() {
    return isB2C() ? { solar: "#zonnepanelen", inverter: "#omvormer", service: "#klantenservice", contact: "#contact" }
                   : { solar: "#solar", inverter: "#residential", service: "#support", contact: "#contact" };
  }
  function LegacyLink(p) {
    var u = U[lang()];
    return c("a", { href: "#discontinued-" + (p.cat === "inverter" ? "inverters" : "solar"), className: "legacy-link" },
      c("span", { className: "legacy-link-t" }, c("span", { className: "label" }, u.link), c("span", { className: "legacy-link-sub" }, u.linkSub[p.cat])),
      c("span", { className: "legacy-link-arrow", "aria-hidden": "true" }, "→"));
  }
  function Warranty(p) {
    var u = U[lang()], w = p.w;
    if (w && w.years && window.WarrantyStrip) return c(window.WarrantyStrip, { years: w.years });
    return c("p", { className: "pl-project label" }, w && w.maker ? u.maker : u.contract);
  }
  function LegacyPage(p) {
    var l = lang(), u = U[l], r = routes(), items = D[l].filter(function (x) { return x.cat === p.cat; });
    return c("section", { className: "pl-page legacy-page" + (isB2C() ? " b2c-page" : "") },
      c("div", { className: "wrap" },
        c("a", { href: r[p.cat], className: "pl-back label" }, u.back[p.cat]),
        c("div", { className: "section-head" },
          c("span", { className: "eyebrow eyebrow-dot" }, u.eyebrow),
          c("h2", { className: "display-mid", style: { maxWidth: "24ch" } }, u.title[p.cat]),
          c("p", { className: "body-lg", style: { marginTop: 28, maxWidth: "62ch" } }, u.lead)),
        c("div", { className: "pl-grid" }, items.map(function (x) {
          return c("article", { key: x.id, id: "p-" + x.id, className: "pl-card legacy-card" },
            c("h3", { className: "display-sm" }, x.name, c("span", { className: "legacy-badge label" }, u.sold + " " + x.years)),
            c("p", { className: "body-md" }, x.desc),
            c("dl", { className: "pl-specs" }, x.specs.slice(1).map(function (s) { return c("div", { key: s[0] }, c("dt", { className: "label" }, s[0]), c("dd", null, s[1])); })),
            c("div", { className: "warranty-wrap" }, c(Warranty, { w: x.warranty })),
            c("div", { className: "pl-actions" },
              c("a", { className: "pl-sheet", href: root() + x.sheet, target: "_blank", rel: "noopener" }, c("span", null, u.sheet), c("span", { className: "mono" }, u.pdf, " ↓")),
              c("div", { className: "legacy-actions" },
                c("a", { className: "label", href: r.service }, u.service, " →"),
                c("a", { className: "label", href: PORTAL + x.id, target: "_blank", rel: "noopener" }, u.register, " ↗"))));
        })),
        c("div", { className: "legacy-extend" },
          c("div", null, c("h3", { className: "display-sm" }, u.extendH), c("p", { className: "body-md" }, u.extendB)),
          c("a", { href: r.contact, className: "btn btn-arrow" }, u.extendCta))));
  }
  var css = document.createElement("style");
  css.textContent = [
    ".legacy-link{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:28px 0 8px;padding:22px 26px;border:1px solid var(--ink-4,#2a3038);border-radius:var(--r-md,14px);color:var(--fg-1,#fff);text-decoration:none;transition:border-color .3s}",
    ".legacy-link:hover{border-color:rgba(46,185,234,.6)}",
    ".legacy-link-t{display:flex;flex-direction:column;gap:6px}",
    ".legacy-link .label{color:var(--brand-blue,#2EB9EA)}",
    ".legacy-link-sub{font-size:15px;font-weight:300;color:var(--fg-2,#c9d1d9)}",
    ".legacy-link-arrow{font-size:20px;color:var(--brand-blue,#2EB9EA)}",
    ".legacy-badge{display:block;margin-top:10px;color:var(--fg-3,#8a94a0);font-size:10px}",
    ".legacy-actions{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:14px}",
    ".legacy-actions a{color:var(--brand-blue,#2EB9EA);text-decoration:none}",
    ".legacy-extend{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;margin:48px 0 24px;padding:32px;border:1px solid var(--ink-4,#2a3038);border-radius:var(--r-md,14px)}",
    ".legacy-extend .body-md{margin:10px 0 0;max-width:60ch}",
    ".legacy-page{padding-bottom:40px}"
  ].join("\n");
  document.head.appendChild(css);
  window.LegacyLink = LegacyLink;
  window.LegacyPage = LegacyPage;
})();
"""
js = JS.replace("__DATA__", json.dumps(data, ensure_ascii=False)).replace("__UI__", json.dumps(UI, ensure_ascii=False))
(SITE / "legacy.js").write_text(js)

# portal catalogue (nl/fr/en): current + discontinued + other
portal = {"current": C.CURRENT, "other": C.OTHER,
          "discontinued": {l: [item(p, l) for p in C.DISCONTINUED] for l in ["nl", "fr", "en"]}}
(SITE / "_src" / "catalog" / "portal-catalog.json").write_text(json.dumps(portal, ensure_ascii=False))

# archive datasheets (English)
out = SITE / "b2c" / "datasheets" / "archive"; out.mkdir(parents=True, exist_ok=True)
logo = (SITE / "assets" / "press" / "belinus-logo-blue.svg").read_text()
fontdir = (SITE / "fonts").as_uri()
pages = []
for p in C.DISCONTINUED:
    x = item(p, "en")
    rows = "".join(f"<tr><th>{html.escape(k)}</th><td>{html.escape(v)}</td></tr>" for k, v in x["specs"])
    w = p["warranty"]
    wtxt = ("Product warranty {0} years · performance warranty {1} years · service warranty {2} years, as stated in the sales documents."
            .format(*w["years"]) if w and w.get("years") else
            "Manufacturer warranty (Solis), handled through Belinus." if w and w.get("maker") else
            "Warranty as stated in the sales documents.")
    kind = "Solar panel" if p["cat"] == "solar" else "Hybrid inverter"
    pages.append((p["id"], f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face{{font-family:AN;src:url({fontdir}/ArialNova-Light.woff2);font-weight:300}}
@font-face{{font-family:AN;src:url({fontdir}/ArialNova.woff2);font-weight:400}}
@font-face{{font-family:AN;src:url({fontdir}/ArialNova-Bold.woff2);font-weight:700}}
@page{{size:A4;margin:0}}*{{box-sizing:border-box}}
body{{margin:0;font-family:AN,Arial,sans-serif;color:#0b0f14;font-weight:300}}
.page{{width:210mm;height:297mm;padding:18mm 18mm 16mm;position:relative}}
.top{{display:flex;justify-content:space-between;align-items:flex-start}}
.top svg{{height:12mm;width:auto}}
.tag{{text-align:right;font-size:8.5pt;letter-spacing:.18em;text-transform:uppercase;color:#6b7684;line-height:1.6}}
.tag b{{color:#2EB9EA;font-weight:400}}
h1{{font-size:34pt;font-weight:300;margin:12mm 0 2mm;letter-spacing:-.01em}}
.kind{{font-size:9pt;letter-spacing:.2em;text-transform:uppercase;color:#2EB9EA}}
.desc{{font-size:11.5pt;line-height:1.55;max-width:150mm;margin:5mm 0 6mm;color:#2a323c}}
table{{width:100%;border-collapse:collapse;font-size:10pt}}
th,td{{text-align:left;padding:2.1mm 0;border-bottom:.3mm solid #dde2e8;vertical-align:top}}
th{{width:62mm;font-weight:400;letter-spacing:.12em;text-transform:uppercase;font-size:7.5pt;color:#6b7684;padding-top:2.6mm}}
.box{{margin-top:6mm;padding:5mm 6mm;border:.3mm solid #2EB9EA;border-radius:3mm;font-size:9.5pt;line-height:1.55}}
.box b{{font-weight:700}}
.foot{{position:absolute;left:18mm;right:18mm;bottom:12mm;font-size:7.5pt;color:#6b7684;display:flex;justify-content:space-between;border-top:.3mm solid #dde2e8;padding-top:3mm}}
</style></head><body><div class="page">
<div class="top">{logo}<div class="tag">Archive datasheet<br><b>Discontinued product</b><br>Sold {html.escape(x['years'])}</div></div>
<h1>{html.escape(x['name'])}</h1><div class="kind">{kind}</div>
<p class="desc">{html.escape(x['desc'])}</p>
<table>{rows}</table>
<div class="box"><b>Warranty and service.</b> {wtxt} This product is no longer sold; warranty and service continue under the terms that came with your installation. Request service at belinus.com or service@belinus.com. The original datasheet is available on request.</div>
<div class="foot"><span>Belinus Energy BV · Frankrijklei 5 · 2000 Antwerp · Belgium · www.belinus.com</span><span>Archive sheet · {pathlib.Path(p['sheet']).stem} · 2026-11</span></div>
</div></body></html>"""))

tmp = SITE / "_src" / "catalog" / "_html"; tmp.mkdir(exist_ok=True)
for pid, h in pages:
    (tmp / f"{pid}.html").write_text(h)
node = r"""
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await b.newPage();
for(const [f,o] of JSON.parse(process.argv[process.argv.length-1])){await p.goto('file://'+f);await p.waitForTimeout(300);await p.pdf({path:o,format:'A4',printBackground:true,preferCSSPageSize:true});}
await b.close();})();"""
jobs = [[str(tmp / f"{pid}.html"), str(out / f"belinus-{pid}-en.pdf")] for pid, _ in pages]
subprocess.run(["node", "-e", node, json.dumps(jobs)], check=True)
print("legacy.js", len(js), "pdfs", len(jobs))
