/* belinus · Vibe EV charging line (B2B) — product line data, render gallery, Belgian B2B HaaS rent contract (Hardware-as-a-Service) with expression of interest.
   Loaded before the app script on the six B2B pages (EN/NL/FR/DE/IT/ES). */
(function () {
  var LANG = String(window.__B2B_LANG || "en").toLowerCase();
  var c = function () { return React.createElement.apply(React, arguments); };
  var pick = function (o) { return (o && (o[LANG] || o.en)) || ""; };
  var V = function (s) { return String(s).replace(/(\d)\.(?=\d)/g, "$1.\u2060"); }; /* keep version dots (OCPP 2.0.1) */

  /* ---------- HaaS monthly fees (Belgium, companies) ----------
     EUR per month, excl. VAT. Fill in the numbers; null = table row hidden. */
  var LEASE_PRICES = {
    "wall":   { 36: 69,  48: 59,  60: 55 },
    "single": { 36: 79,  48: 69,  60: 59 },
    "double": { 36: 149, 48: 129, 60: 109 }
  };

  /* ---------- datasheets: EN / NL / FR, other languages fall back to EN ---------- */
  var SHEET_LANG = LANG === "nl" || LANG === "fr" ? LANG : "en";
  var sheet = function (m) { return "b2c/datasheets/" + SHEET_LANG + "/belinus-vibe-" + m + "-" + SHEET_LANG + ".pdf"; };
  var SHEET_LABEL = { en: "PDF · English", nl: "PDF · Nederlands", fr: "PDF · français",
    de: "PDF · Englisch", it: "PDF · inglese", es: "PDF · inglés" }[LANG];

  var K = {
    power: { en: "Power", nl: "Vermogen", fr: "Puissance", de: "Leistung", it: "Potenza", es: "Potencia" },
    bidi: { en: "Bidirectional", nl: "Bidirectioneel", fr: "Bidirectionnel", de: "Bidirektional", it: "Bidirezionale", es: "Bidireccional" },
    backend: { en: "Backend", nl: "Backend", fr: "Backend", de: "Backend", it: "Backend", es: "Backend" },
    conn: { en: "Connector", nl: "Connector", fr: "Connecteur", de: "Anschluss", it: "Connettore", es: "Conector" },
    points: { en: "Charge points", nl: "Laadpunten", fr: "Points de charge", de: "Ladepunkte", it: "Punti di ricarica", es: "Puntos de carga" },
    install: { en: "Mounting", nl: "Plaatsing", fr: "Pose", de: "Montage", it: "Posa", es: "Montaje" }
  };
  var SV = {
    wallPower: { en: "22 kW · 3 × 32 A", nl: "22 kW · 3 × 32 A", fr: "22 kW · 3 × 32 A", de: "22 kW · 3 × 32 A", it: "22 kW · 3 × 32 A", es: "22 kW · 3 × 32 A" },
    bidi: { en: "V2G / V2H · ISO 15118-20", nl: "V2G / V2H · ISO 15118-20", fr: "V2G / V2H · ISO 15118-20", de: "V2G / V2H · ISO 15118-20", it: "V2G / V2H · ISO 15118-20", es: "V2G / V2H · ISO 15118-20" },
    backend: { en: "OCPP 2.0.1 · 1.6J", nl: "OCPP 2.0.1 · 1.6J", fr: "OCPP 2.0.1 · 1.6J", de: "OCPP 2.0.1 · 1.6J", it: "OCPP 2.0.1 · 1.6J", es: "OCPP 2.0.1 · 1.6J" },
    wallConn: { en: "Type 2, tethered 5 or 7.5 m", nl: "Type 2, vaste kabel 5 of 7,5 m", fr: "Type 2, câble fixe 5 ou 7,5 m", de: "Typ 2, fest angeschlagen 5 oder 7,5 m", it: "Tipo 2, cavo fisso 5 o 7,5 m", es: "Tipo 2, cable fijo de 5 o 7,5 m" },
    points: { en: "1 or 2 × 22 kW", nl: "1 of 2 × 22 kW", fr: "1 ou 2 × 22 kW", de: "1 oder 2 × 22 kW", it: "1 o 2 × 22 kW", es: "1 o 2 × 22 kW" },
    install: { en: "Floor-standing, foundation or anchor", nl: "Vrijstaand, op fundering of verankerd", fr: "Au sol, sur fondation ou ancrage", de: "Freistehend, Fundament oder Anker", it: "A pavimento, su fondazione o ancoraggio", es: "De pie, sobre cimentación o anclaje" }
  };
  var spec = function (k, v) { return [pick(K[k]), V(pick(SV[v]))]; };
  var WNOTE = { en: "24-hour replacement service", nl: "Vervangservice binnen 24 uur", fr: "Remplacement en 24 heures",
    de: "Austauschservice innerhalb von 24 Stunden", it: "Sostituzione entro 24 ore", es: "Sustitución en 24 horas" };

  window.EV_LINE = {
    eyebrow: { en: "EV charging", nl: "Laadinfrastructuur", fr: "Recharge de véhicules", de: "E-Mobilität", it: "Ricarica dei veicoli", es: "Recarga de vehículos" },
    title: { en: "Bidirectional charging, ready for 2027.", nl: "Bidirectioneel laden, klaar voor 2027.", fr: "La recharge bidirectionnelle, prête pour 2027.",
      de: "Bidirektionales Laden, bereit für 2027.", it: "Ricarica bidirezionale, pronta per il 2027.", es: "Recarga bidireccional, lista para 2027." },
    lead: {
      en: "Vibe is the belinus AC charger family for company sites, fleets and car parks: 22 kW per charge point, vehicle-to-grid under ISO 15118-20 and Plug & Charge, as AFIR requires for every new charge point from 1 January 2027. Designed in Belgium around the ETAPpro charging core.",
      nl: "Vibe is de AC-laadfamilie van belinus voor bedrijfssites, wagenparken en parkings: 22 kW per laadpunt, vehicle-to-grid volgens ISO 15118-20 en Plug & Charge, zoals AFIR vanaf 1 januari 2027 vereist voor elk nieuw laadpunt. Ontworpen in België rond de ETAPpro-laadkern.",
      fr: "Vibe est la famille de bornes AC belinus pour les sites d’entreprise, les flottes et les parkings : 22 kW par point de charge, vehicle-to-grid selon ISO 15118-20 et Plug & Charge, comme l’exige l’AFIR pour tout nouveau point de charge à partir du 1er janvier 2027. Conçue en Belgique autour du cœur de charge ETAPpro.",
      de: "Vibe ist die AC-Ladefamilie von belinus für Firmenstandorte, Flotten und Parkplätze: 22 kW pro Ladepunkt, Vehicle-to-Grid nach ISO 15118-20 und Plug & Charge, wie es die AFIR ab dem 1. Januar 2027 für jeden neuen Ladepunkt verlangt. In Belgien entwickelt, rund um den ETAPpro-Ladekern.",
      it: "Vibe è la famiglia di stazioni di ricarica AC belinus per sedi aziendali, flotte e parcheggi: 22 kW per punto di ricarica, vehicle-to-grid secondo ISO 15118-20 e Plug & Charge, come richiesto dall’AFIR per ogni nuovo punto di ricarica dal 1° gennaio 2027. Progettata in Belgio attorno al modulo di ricarica ETAPpro.",
      es: "Vibe es la familia de cargadores AC de belinus para sedes de empresa, flotas y aparcamientos: 22 kW por punto de carga, vehicle-to-grid según ISO 15118-20 y Plug & Charge, como exige el AFIR para todo nuevo punto de carga a partir del 1 de enero de 2027. Diseñada en Bélgica en torno al núcleo de carga ETAPpro."
    },
    why: {
      en: ["22 kW in both directions: charge the car, or return energy to the building or the grid when the vehicle supports V2G.", "ISO 15118-20 and ISO 15118-2 on board, as required by AFIR Delegated Regulation (EU) 2025/656.", "Open to any operator: OCPP 2.0.1 and 1.6J, Modbus TCP and an API for energy management.", "Smart by default: solar charging, dynamic load balancing and capacity-tariff peak shaving."],
      nl: ["22 kW in beide richtingen: de wagen laden, of energie teruggeven aan het gebouw of het net als de wagen V2G ondersteunt.", "ISO 15118-20 en ISO 15118-2 aan boord, zoals AFIR-verordening (EU) 2025/656 vereist.", "Open voor elke operator: OCPP 2.0.1 en 1.6J, Modbus TCP en een API voor energiebeheer.", "Standaard slim: laden op zonne-energie, dynamische lastverdeling en piekbeperking voor het capaciteitstarief."],
      fr: ["22 kW dans les deux sens : recharger la voiture, ou restituer de l’énergie au bâtiment ou au réseau si le véhicule gère le V2G.", "ISO 15118-20 et ISO 15118-2 intégrés, comme l’exige le règlement AFIR (UE) 2025/656.", "Ouverte à tout opérateur : OCPP 2.0.1 et 1.6J, Modbus TCP et une API pour la gestion de l’énergie.", "Intelligente de série : recharge solaire, équilibrage dynamique et écrêtage des pointes."],
      de: ["22 kW in beide Richtungen: das Auto laden oder Energie an das Gebäude oder das Netz zurückgeben, wenn das Fahrzeug V2G unterstützt.", "ISO 15118-20 und ISO 15118-2 an Bord, wie von der AFIR-Verordnung (EU) 2025/656 verlangt.", "Offen für jeden Betreiber: OCPP 2.0.1 und 1.6J, Modbus TCP und eine API für das Energiemanagement.", "Serienmäßig intelligent: Solarladen, dynamisches Lastmanagement und Lastspitzenkappung."],
      it: ["22 kW in entrambe le direzioni: ricaricare l’auto o restituire energia all’edificio o alla rete se il veicolo supporta il V2G.", "ISO 15118-20 e ISO 15118-2 a bordo, come richiesto dal regolamento AFIR (UE) 2025/656.", "Aperta a ogni operatore: OCPP 2.0.1 e 1.6J, Modbus TCP e un’API per la gestione dell’energia.", "Intelligente di serie: ricarica solare, bilanciamento dinamico del carico e riduzione dei picchi."],
      es: ["22 kW en ambos sentidos: cargar el coche o devolver energía al edificio o a la red si el vehículo admite V2G.", "ISO 15118-20 e ISO 15118-2 integrados, como exige el Reglamento AFIR (UE) 2025/656.", "Abierta a cualquier operador: OCPP 2.0.1 y 1.6J, Modbus TCP y una API para la gestión energética.", "Inteligente de serie: carga solar, equilibrado dinámico de carga y recorte de picos."]
    },
    products: [
      { name: "Vibe Wall",
        b: { en: "Bidirectional AC wallbox: 22 kW three-phase with a tethered Type 2 coiled cable and wall bracket. For company sites, small car parks and charging company cars at home.",
          nl: "Bidirectionele AC-wallbox: 22 kW driefasig met vaste type 2-spiraalkabel en muurbeugel. Voor bedrijfssites, kleine parkings en het thuisladen van bedrijfswagens.",
          fr: "Wallbox AC bidirectionnelle : 22 kW triphasé, avec câble spiralé type 2 fixe et support mural. Pour les sites d’entreprise, les petits parkings et la recharge à domicile des voitures de société.",
          de: "Bidirektionale AC-Wallbox: 22 kW dreiphasig mit fest angeschlagenem Typ-2-Spiralkabel und Wandhalterung. Für Firmenstandorte, kleine Parkplätze und das Laden von Firmenwagen zu Hause.",
          it: "Wallbox AC bidirezionale: 22 kW trifase con cavo spiralato Tipo 2 fisso e staffa a parete. Per sedi aziendali, piccoli parcheggi e la ricarica a casa delle auto aziendali.",
          es: "Wallbox AC bidireccional: 22 kW trifásica con cable espiral Tipo 2 fijo y soporte de pared. Para sedes de empresa, aparcamientos pequeños y la carga en casa de los coches de empresa." },
        specs: [spec("power", "wallPower"), spec("bidi", "bidi"), spec("backend", "backend"), spec("conn", "wallConn")],
        warranty: { years: [2, null, null], note: WNOTE },
        sheet: sheet("wall"), sheetLabel: SHEET_LABEL },
      { name: "Vibe Pole",
        b: { en: "Floor-standing charging column, single (22 kW) or double (2 × 22 kW) with dynamic load sharing between both points. For fleets, offices and car parks.",
          nl: "Vrijstaande laadzuil, enkel (22 kW) of dubbel (2 × 22 kW) met dynamische lastverdeling tussen beide punten. Voor wagenparken, kantoren en parkings.",
          fr: "Colonne de recharge au sol, simple (22 kW) ou double (2 × 22 kW) avec partage dynamique entre les deux points. Pour les flottes, les bureaux et les parkings.",
          de: "Freistehende Ladesäule, einfach (22 kW) oder doppelt (2 × 22 kW) mit dynamischer Lastverteilung zwischen beiden Punkten. Für Flotten, Büros und Parkplätze.",
          it: "Colonnina di ricarica a pavimento, singola (22 kW) o doppia (2 × 22 kW) con ripartizione dinamica del carico tra i due punti. Per flotte, uffici e parcheggi.",
          es: "Poste de carga de pie, simple (22 kW) o doble (2 × 22 kW) con reparto dinámico de la potencia entre ambos puntos. Para flotas, oficinas y aparcamientos." },
        specs: [spec("points", "points"), spec("bidi", "bidi"), spec("backend", "backend"), spec("install", "install")],
        warranty: { years: [2, null, null], note: WNOTE },
        sheet: sheet("pole"), sheetLabel: SHEET_LABEL }
    ]
  };

  /* ---------- products overview card ---------- */
  window.EV_CARD = {
    seg: pick(window.EV_LINE.eyebrow), href: "#ev-charging", sub: "Vibe Wall · Vibe Pole",
    h: pick(window.EV_LINE.title),
    b: pick({ en: "22 kW AC charging with vehicle-to-grid and Plug & Charge, compliant with the AFIR 2027 requirement. Wallbox or single and double charging column.",
      nl: "AC-laden aan 22 kW met vehicle-to-grid en Plug & Charge, conform de AFIR-verplichting van 2027. Wallbox of enkele en dubbele laadzuil.",
      fr: "Recharge AC de 22 kW avec vehicle-to-grid et Plug & Charge, conforme à l’exigence AFIR de 2027. Wallbox ou colonne simple et double.",
      de: "AC-Laden mit 22 kW, Vehicle-to-Grid und Plug & Charge, konform mit der AFIR-Vorgabe 2027. Wallbox oder einfache und doppelte Ladesäule.",
      it: "Ricarica AC da 22 kW con vehicle-to-grid e Plug & Charge, conforme al requisito AFIR 2027. Wallbox o colonnina singola e doppia.",
      es: "Carga AC de 22 kW con vehicle-to-grid y Plug & Charge, conforme al requisito AFIR de 2027. Wallbox o poste de carga simple y doble." }),
    items: [
      ["V2G", pick({ en: "Vehicle-to-grid and vehicle-to-home", nl: "Vehicle-to-grid en vehicle-to-home", fr: "Vehicle-to-grid et vehicle-to-home", de: "Vehicle-to-Grid und Vehicle-to-Home", it: "Vehicle-to-grid e vehicle-to-home", es: "Vehicle-to-grid y vehicle-to-home" })],
      ["AFIR", pick({ en: "ISO 15118-20 · ready for 1 January 2027", nl: "ISO 15118-20 · klaar voor 1 januari 2027", fr: "ISO 15118-20 · prête pour le 1er janvier 2027", de: "ISO 15118-20 · bereit für den 1. Januar 2027", it: "ISO 15118-20 · pronta per il 1° gennaio 2027", es: "ISO 15118-20 · lista para el 1 de enero de 2027" })],
      ["OCPP", pick({ en: "OCPP 2.0.1 · open to any operator", nl: "OCPP 2.0.1 · open voor elke operator", fr: "OCPP 2.0.1 · ouverte à tout opérateur", de: "OCPP 2.0.1 · offen für jeden Betreiber", it: "OCPP 2.0.1 · aperta a ogni operatore", es: "OCPP 2.0.1 · abierta a cualquier operador" })],
      ["HaaS", pick({ en: "Hardware-as-a-Service rent contract for companies in Belgium", nl: "Hardware-as-a-Service: huurcontract voor bedrijven in België", fr: "Hardware-as-a-Service : location pour les entreprises en Belgique", de: "Hardware-as-a-Service: Mietvertrag für Unternehmen in Belgien", it: "Hardware-as-a-Service: noleggio per le aziende in Belgio", es: "Hardware-as-a-Service: alquiler para empresas en Bélgica" })]
    ]
  };

  /* ---------- project request form (#request-ev-charging) ----------
     The form reads [en, nl, fr, code]; on DE/IT/ES pages slot 0 carries the page language. */
  var P = function (o, code) {
    var first = (LANG === "de" || LANG === "it" || LANG === "es") ? o[LANG] : o.en;
    var r = [first, o.nl, o.fr]; if (code) r.push(code); return r;
  };
  window.EV_PR = {
    name: P({ en: "EV charging", nl: "Laadinfrastructuur", fr: "Recharge de véhicules", de: "E-Mobilität", it: "Ricarica dei veicoli", es: "Recarga de vehículos" }),
    h: P({ en: "Your EV charging project.", nl: "Uw laadproject.", fr: "Votre projet de recharge.", de: "Ihr Ladeprojekt.", it: "Il suo progetto di ricarica.", es: "Su proyecto de recarga." }),
    tech: [
      P({ en: "Vibe Wall 22 kW", nl: "Vibe Wall 22 kW", fr: "Vibe Wall 22 kW", de: "Vibe Wall 22 kW", it: "Vibe Wall 22 kW", es: "Vibe Wall 22 kW" }, "VIBE-W"),
      P({ en: "Vibe Pole single 22 kW", nl: "Vibe Pole enkel 22 kW", fr: "Vibe Pole simple 22 kW", de: "Vibe Pole einfach 22 kW", it: "Vibe Pole singola 22 kW", es: "Vibe Pole simple 22 kW" }, "VIBE-PS"),
      P({ en: "Vibe Pole double 2 × 22 kW", nl: "Vibe Pole dubbel 2 × 22 kW", fr: "Vibe Pole double 2 × 22 kW", de: "Vibe Pole doppelt 2 × 22 kW", it: "Vibe Pole doppia 2 × 22 kW", es: "Vibe Pole doble 2 × 22 kW" }, "VIBE-PD"),
      P({ en: "HaaS rent contract (companies in Belgium)", nl: "HaaS-huurcontract (bedrijven in België)", fr: "Location HaaS (entreprises en Belgique)", de: "HaaS-Mietvertrag (Unternehmen in Belgien)", it: "Noleggio HaaS (aziende in Belgio)", es: "Alquiler HaaS (empresas en Bélgica)" }, "HAAS-BE"),
      P({ en: "Not sure yet", nl: "Nog niet zeker", fr: "Pas encore sûr", de: "Noch nicht sicher", it: "Non ancora sicuro", es: "Todavía no lo sé" }, "?")
    ],
    apps: [
      P({ en: "Company car park / offices", nl: "Bedrijfsparking / kantoren", fr: "Parking d’entreprise / bureaux", de: "Firmenparkplatz / Büros", it: "Parcheggio aziendale / uffici", es: "Aparcamiento de empresa / oficinas" }, "OFFICE"),
      P({ en: "Fleet depot", nl: "Depot voor wagenpark", fr: "Dépôt de flotte", de: "Flottendepot", it: "Deposito flotta", es: "Depósito de flota" }, "FLEET"),
      P({ en: "Home charging of company cars", nl: "Thuisladen van bedrijfswagens", fr: "Recharge à domicile des voitures de société", de: "Heimladen von Firmenwagen", it: "Ricarica a casa delle auto aziendali", es: "Carga en casa de coches de empresa" }, "HOME"),
      P({ en: "Public or semi-public car park", nl: "Publieke of semipublieke parking", fr: "Parking public ou semi-public", de: "Öffentlicher oder halböffentlicher Parkplatz", it: "Parcheggio pubblico o semipubblico", es: "Aparcamiento público o semipúblico" }, "PUBLIC"),
      P({ en: "Apartment building", nl: "Appartementsgebouw", fr: "Immeuble à appartements", de: "Mehrfamilienhaus", it: "Condominio", es: "Edificio de viviendas" }, "APT"),
      P({ en: "Installer or reseller offer", nl: "Aanbod voor installateur of verdeler", fr: "Offre installateur ou revendeur", de: "Angebot für Installateur oder Händler", it: "Offerta per installatore o rivenditore", es: "Oferta para instalador o distribuidor" }, "RESELL"),
      P({ en: "Other", nl: "Andere", fr: "Autre", de: "Sonstiges", it: "Altro", es: "Otro" }, "OTHER")
    ]
  };

  /* ---------- render gallery ---------- */
  var IMGS = [
    ["vibe-wall-day", { en: "Vibe Wall · 22 kW", nl: "Vibe Wall · 22 kW", fr: "Vibe Wall · 22 kW", de: "Vibe Wall · 22 kW", it: "Vibe Wall · 22 kW", es: "Vibe Wall · 22 kW" }],
    ["vibe-pole-double", { en: "Vibe Pole double · 2 × 22 kW", nl: "Vibe Pole dubbel · 2 × 22 kW", fr: "Vibe Pole double · 2 × 22 kW", de: "Vibe Pole doppelt · 2 × 22 kW", it: "Vibe Pole doppia · 2 × 22 kW", es: "Vibe Pole doble · 2 × 22 kW" }],
    ["vibe-pole-single", { en: "Vibe Pole single · tethered cable", nl: "Vibe Pole enkel · vaste kabel", fr: "Vibe Pole simple · câble fixe", de: "Vibe Pole einfach · festes Kabel", it: "Vibe Pole singola · cavo fisso", es: "Vibe Pole simple · cable fijo" }],
    ["vibe-wall-night", { en: "Vibe Wall · the belinus light line at night", nl: "Vibe Wall · de belinus-lichtlijn bij nacht", fr: "Vibe Wall · la ligne lumineuse belinus la nuit", de: "Vibe Wall · die belinus-Lichtlinie bei Nacht", it: "Vibe Wall · la linea luminosa belinus di notte", es: "Vibe Wall · la línea de luz belinus de noche" }]
  ];
  function EVGallery() {
    return c("div", { className: "ev-gallery" }, IMGS.map(function (x, i) {
      var cap = pick(x[1]);
      return c("figure", { key: x[0], className: "ev-shot" + (x[2] ? " is-wide" : "") },
        c("img", { src: "assets/vibe/" + x[0] + "-1600.webp", srcSet: "assets/vibe/" + x[0] + "-900.webp 900w, assets/vibe/" + x[0] + "-1600.webp 1600w",
          sizes: "(max-width: 900px) 100vw, 640px",
          alt: "belinus " + cap, width: 1600, height: 900, loading: i ? "lazy" : "eager", decoding: "async" }),
        c("figcaption", { className: "label" }, cap));
    }));
  }

  /* ---------- HaaS block: Hardware-as-a-Service rent contract (companies in Belgium) ----------
     Belgium = offer open (prices + expression of interest). Other countries = waiting list to open the offer there.
     Requests go to the Belinus admin portal (Supabase function bel-haas → table bel_haas_interest). */
  var HAAS_API = "https://cbykdhbqfgjzodldavvy.supabase.co/functions/v1/bel-haas";
  var HAAS_KEY = "sb_publishable_IBxDom__KOP-VQatBR6PsQ_cy8s-CXd";
  var CC = ["BE", "NL", "LU", "FR", "DE", "CH", "AT", "IT", "ES", "PT", "UK", "IE", "OTHER"];
  var CN = {
    en: { BE: "Belgium", NL: "Netherlands", LU: "Luxembourg", FR: "France", DE: "Germany", CH: "Switzerland", AT: "Austria", IT: "Italy", ES: "Spain", PT: "Portugal", UK: "United Kingdom", IE: "Ireland", OTHER: "Other country" },
    nl: { BE: "België", NL: "Nederland", LU: "Luxemburg", FR: "Frankrijk", DE: "Duitsland", CH: "Zwitserland", AT: "Oostenrijk", IT: "Italië", ES: "Spanje", PT: "Portugal", UK: "Verenigd Koninkrijk", IE: "Ierland", OTHER: "Ander land" },
    fr: { BE: "Belgique", NL: "Pays-Bas", LU: "Luxembourg", FR: "France", DE: "Allemagne", CH: "Suisse", AT: "Autriche", IT: "Italie", ES: "Espagne", PT: "Portugal", UK: "Royaume-Uni", IE: "Irlande", OTHER: "Autre pays" },
    de: { BE: "Belgien", NL: "Niederlande", LU: "Luxemburg", FR: "Frankreich", DE: "Deutschland", CH: "Schweiz", AT: "Österreich", IT: "Italien", ES: "Spanien", PT: "Portugal", UK: "Vereinigtes Königreich", IE: "Irland", OTHER: "Anderes Land" },
    it: { BE: "Belgio", NL: "Paesi Bassi", LU: "Lussemburgo", FR: "Francia", DE: "Germania", CH: "Svizzera", AT: "Austria", IT: "Italia", ES: "Spagna", PT: "Portogallo", UK: "Regno Unito", IE: "Irlanda", OTHER: "Altro paese" },
    es: { BE: "Bélgica", NL: "Países Bajos", LU: "Luxemburgo", FR: "Francia", DE: "Alemania", CH: "Suiza", AT: "Austria", IT: "Italia", ES: "España", PT: "Portugal", UK: "Reino Unido", IE: "Irlanda", OTHER: "Otro país" }
  };
  var LT = {
    en: { tag: "HaaS · Hardware-as-a-Service · Belgium", h: "Vibe as a service, for a fixed monthly fee.",
      b: "With HaaS (Hardware-as-a-Service), companies in Belgium rent Vibe Wall and Vibe Pole under a rent contract over 36, 48 or 60 months, without investing in the hardware.",
      inc: "Included in the monthly fee", items: ["Maintenance and 24-hour replacement service for the full term", "Back office: OCPP platform, charge sessions and reporting", "Reimbursement of home charging: the kWh charged at the employee’s home is settled with the employer", "Option to buy the charger at the end of the term"],
      how: "How it works", hows: ["Rent contract for professional customers (companies) in Belgium only.", "The contract is signed online.", "Delivery within 3 months.", "Subject to approval of the customer’s credit rating and to available financing in the financial instrument dedicated to this offer."],
      model: "Model", m: "months", per: "/ month", wall: "Vibe Wall · 22 kW", single: "Vibe Pole single · 22 kW", dbl: "Vibe Pole double · 2 × 22 kW",
      note: "Prices excl. VAT. Installation billed separately.", cta: "Confirm my interest",
      naTag: "HaaS · Hardware-as-a-Service", naH: "Not yet available in your country.",
      naB: "The Vibe HaaS rent contract is offered to companies in Belgium for now. We open it country by country, starting where companies ask for it. Register your interest: every request counts towards opening HaaS in your country.",
      naHere: "your country", naCta: "Register my interest", naNote: "Already based in Belgium? Choose Belgium in the form.",
      fTitle: "Confirm your interest in Vibe HaaS", fTitleNa: "Register your interest in Vibe HaaS",
      fLead: "This is not an order or a contract. We contact you to go through the details; the rent contract is then signed online.",
      fLeadNa: "We let you know as soon as Vibe HaaS opens in your country. Nothing to sign, no obligation.",
      sCompany: "Your company", sNeed: "Your need", country: "Country", company: "Company name", vat: "Enterprise or VAT number", contact: "Contact person", job: "Job title", email: "E-mail", phone: "Phone", street: "Street and number", zip: "Postcode", city: "Town or city",
      qty: "Number of chargers", qWall: "Vibe Wall", qSingle: "Vibe Pole single", qDbl: "Vibe Pole double", term: "Preferred term", termAny: "Not sure yet",
      use: "Where will they be used?", uses: ["Company car park / offices", "Fleet depot", "Home charging of company cars", "Public or semi-public car park", "Other"],
      start: "When do you want to start?", starts: ["As soon as possible", "Within 6 months", "Later / exploring"],
      msg: "Anything we should know?", consent: ["I agree that Belinus processes my details to handle this request, as described in the ", "privacy statement", "."],
      send: "Send my interest", sendNa: "Register my interest", sending: "Sending…", required: "Please fill in the required fields (*) and choose at least one charger.",
      fail: "Your request could not be sent right now. Please try again in a moment or e-mail service@belinus.com.",
      okH: "Thank you.", okB: "We will contact you soon to process your request.", okBNa: "Your interest is registered. We will let you know as soon as Vibe HaaS is available in your country.", back: "Back to the product page", ref: "Reference" },
    nl: { tag: "HaaS · Hardware-as-a-Service · België", h: "Vibe als dienst, voor een vast maandbedrag.",
      b: "Met HaaS (Hardware-as-a-Service) huren bedrijven in België Vibe Wall en Vibe Pole met een huurcontract over 36, 48 of 60 maanden, zonder in de hardware te investeren.",
      inc: "Inbegrepen in het maandbedrag", items: ["Onderhoud en vervangservice binnen 24 uur gedurende de hele looptijd", "Backoffice: OCPP-platform, laadsessies en rapportering", "Terugbetaling van thuisladen: de kWh die bij de werknemer thuis geladen wordt, wordt met de werkgever verrekend", "Aankoopoptie op de laadpaal aan het einde van de looptijd"],
      how: "Zo werkt het", hows: ["Huurcontract enkel voor professionele klanten (bedrijven) in België.", "Het contract wordt online ondertekend.", "Levering binnen 3 maanden.", "Onder voorbehoud van goedkeuring van de kredietwaardigheid van de klant en van beschikbare financiering in het financieringsinstrument voor dit aanbod."],
      model: "Model", m: "maanden", per: "/ maand", wall: "Vibe Wall · 22 kW", single: "Vibe Pole enkel · 22 kW", dbl: "Vibe Pole dubbel · 2 × 22 kW",
      note: "Prijzen excl. btw. Installatie apart gefactureerd.", cta: "Bevestig mijn interesse",
      naTag: "HaaS · Hardware-as-a-Service", naH: "Nog niet beschikbaar in uw land.",
      naB: "Het Vibe HaaS-huurcontract wordt voorlopig aangeboden aan bedrijven in België. We openen het land per land, te beginnen waar bedrijven erom vragen. Meld uw interesse: elke aanvraag telt om HaaS in uw land te openen.",
      naHere: "uw land", naCta: "Meld mijn interesse", naNote: "Gevestigd in België? Kies België in het formulier.",
      fTitle: "Bevestig uw interesse in Vibe HaaS", fTitleNa: "Meld uw interesse in Vibe HaaS",
      fLead: "Dit is geen bestelling en geen contract. We nemen contact met u op om de details te overlopen; daarna wordt het huurcontract online ondertekend.",
      fLeadNa: "We laten het u weten zodra Vibe HaaS in uw land beschikbaar is. Niets te ondertekenen, geen verplichting.",
      sCompany: "Uw bedrijf", sNeed: "Uw behoefte", country: "Land", company: "Bedrijfsnaam", vat: "Ondernemings- of btw-nummer", contact: "Contactpersoon", job: "Functie", email: "E-mail", phone: "Telefoon", street: "Straat en nummer", zip: "Postcode", city: "Gemeente",
      qty: "Aantal laadpalen", qWall: "Vibe Wall", qSingle: "Vibe Pole enkel", qDbl: "Vibe Pole dubbel", term: "Gewenste looptijd", termAny: "Nog niet zeker",
      use: "Waar worden ze gebruikt?", uses: ["Bedrijfsparking / kantoren", "Depot voor wagenpark", "Thuisladen van bedrijfswagens", "Publieke of semipublieke parking", "Andere"],
      start: "Wanneer wilt u starten?", starts: ["Zo snel mogelijk", "Binnen 6 maanden", "Later / verkennend"],
      msg: "Iets dat we moeten weten?", consent: ["Ik ga ermee akkoord dat Belinus mijn gegevens verwerkt om deze aanvraag te behandelen, zoals beschreven in de ", "privacyverklaring", "."],
      send: "Verstuur mijn interesse", sendNa: "Meld mijn interesse", sending: "Bezig met versturen…", required: "Vul de verplichte velden (*) in en kies minstens één laadpaal.",
      fail: "Uw aanvraag kon nu niet worden verstuurd. Probeer het zo meteen opnieuw of mail naar service@belinus.com.",
      okH: "Dank u.", okB: "We nemen binnenkort contact met u op om uw aanvraag te verwerken.", okBNa: "Uw interesse is geregistreerd. We laten het u weten zodra Vibe HaaS in uw land beschikbaar is.", back: "Terug naar de productpagina", ref: "Referentie" },
    fr: { tag: "HaaS · Hardware-as-a-Service · Belgique", h: "Vibe en service, pour une mensualité fixe.",
      b: "Avec le HaaS (Hardware-as-a-Service), les entreprises en Belgique louent Vibe Wall et Vibe Pole avec un contrat de location sur 36, 48 ou 60 mois, sans investir dans le matériel.",
      inc: "Compris dans la mensualité", items: ["Entretien et remplacement en 24 heures pendant toute la durée", "Back-office : plateforme OCPP, sessions de recharge et rapports", "Remboursement de la recharge à domicile : les kWh rechargés chez le collaborateur sont décomptés avec l’employeur", "Option d’achat de la borne en fin de contrat"],
      how: "Comment ça marche", hows: ["Contrat de location réservé aux clients professionnels (entreprises) en Belgique.", "Le contrat se signe en ligne.", "Livraison dans les 3 mois.", "Sous réserve de validation de la solvabilité du client et de financement disponible dans l’instrument financier dédié à cette offre."],
      model: "Modèle", m: "mois", per: "/ mois", wall: "Vibe Wall · 22 kW", single: "Vibe Pole simple · 22 kW", dbl: "Vibe Pole double · 2 × 22 kW",
      note: "Prix hors TVA. Installation facturée séparément.", cta: "Confirmer mon intérêt",
      naTag: "HaaS · Hardware-as-a-Service", naH: "Pas encore disponible dans votre pays.",
      naB: "Le contrat de location Vibe HaaS est pour l’instant proposé aux entreprises en Belgique. Nous l’ouvrons pays par pays, en commençant là où les entreprises le demandent. Manifestez votre intérêt : chaque demande compte pour ouvrir le HaaS dans votre pays.",
      naHere: "votre pays", naCta: "Manifester mon intérêt", naNote: "Établi en Belgique ? Choisissez la Belgique dans le formulaire.",
      fTitle: "Confirmez votre intérêt pour Vibe HaaS", fTitleNa: "Manifestez votre intérêt pour Vibe HaaS",
      fLead: "Ceci n’est ni une commande ni un contrat. Nous vous contactons pour passer les détails en revue ; le contrat de location se signe ensuite en ligne.",
      fLeadNa: "Nous vous prévenons dès que Vibe HaaS ouvre dans votre pays. Rien à signer, sans engagement.",
      sCompany: "Votre entreprise", sNeed: "Votre besoin", country: "Pays", company: "Nom de l’entreprise", vat: "N° d’entreprise ou de TVA", contact: "Personne de contact", job: "Fonction", email: "E-mail", phone: "Téléphone", street: "Rue et numéro", zip: "Code postal", city: "Commune",
      qty: "Nombre de bornes", qWall: "Vibe Wall", qSingle: "Vibe Pole simple", qDbl: "Vibe Pole double", term: "Durée souhaitée", termAny: "Pas encore sûr",
      use: "Où seront-elles utilisées ?", uses: ["Parking d’entreprise / bureaux", "Dépôt de flotte", "Recharge à domicile des voitures de société", "Parking public ou semi-public", "Autre"],
      start: "Quand voulez-vous commencer ?", starts: ["Dès que possible", "Dans les 6 mois", "Plus tard / en exploration"],
      msg: "Autre chose à nous dire ?", consent: ["J’accepte que Belinus traite mes données pour répondre à cette demande, comme décrit dans la ", "déclaration de confidentialité", "."],
      send: "Envoyer mon intérêt", sendNa: "Manifester mon intérêt", sending: "Envoi en cours…", required: "Veuillez remplir les champs obligatoires (*) et choisir au moins une borne.",
      fail: "Votre demande n’a pas pu être envoyée. Réessayez dans un instant ou écrivez à service@belinus.com.",
      okH: "Merci.", okB: "Nous vous contacterons bientôt pour traiter votre demande.", okBNa: "Votre intérêt est enregistré. Nous vous prévenons dès que Vibe HaaS est disponible dans votre pays.", back: "Retour à la page produit", ref: "Référence" },
    de: { tag: "HaaS · Hardware-as-a-Service · Belgien", h: "Vibe als Service, zu einer festen Monatsrate.",
      b: "Mit HaaS (Hardware-as-a-Service) mieten Unternehmen in Belgien Vibe Wall und Vibe Pole mit einem Mietvertrag über 36, 48 oder 60 Monate, ohne in die Hardware zu investieren.",
      inc: "In der Monatsrate enthalten", items: ["Wartung und Austauschservice innerhalb von 24 Stunden während der gesamten Laufzeit", "Backoffice: OCPP-Plattform, Ladevorgänge und Berichte", "Erstattung des Heimladens: die beim Mitarbeiter zu Hause geladenen kWh werden mit dem Arbeitgeber abgerechnet", "Kaufoption für die Ladestation am Ende der Laufzeit"],
      how: "So funktioniert es", hows: ["Mietvertrag nur für gewerbliche Kunden (Unternehmen) in Belgien.", "Der Vertrag wird online unterzeichnet.", "Lieferung innerhalb von 3 Monaten.", "Vorbehaltlich der Prüfung der Bonität des Kunden und verfügbarer Finanzierung im Finanzierungsinstrument für dieses Angebot."],
      model: "Modell", m: "Monate", per: "/ Monat", wall: "Vibe Wall · 22 kW", single: "Vibe Pole einfach · 22 kW", dbl: "Vibe Pole doppelt · 2 × 22 kW",
      note: "Preise zzgl. MwSt. Installation wird separat berechnet.", cta: "Interesse bestätigen",
      naTag: "HaaS · Hardware-as-a-Service", naH: "In Ihrem Land noch nicht verfügbar.",
      naB: "Der Vibe-HaaS-Mietvertrag wird vorerst Unternehmen in Belgien angeboten. Wir öffnen ihn Land für Land, zuerst dort, wo Unternehmen danach fragen. Melden Sie Ihr Interesse an: Jede Anfrage zählt, um HaaS in Ihrem Land zu eröffnen.",
      naHere: "Ihr Land", naCta: "Interesse anmelden", naNote: "Ihr Unternehmen sitzt in Belgien? Wählen Sie Belgien im Formular.",
      fTitle: "Bestätigen Sie Ihr Interesse an Vibe HaaS", fTitleNa: "Melden Sie Ihr Interesse an Vibe HaaS an",
      fLead: "Dies ist weder eine Bestellung noch ein Vertrag. Wir kontaktieren Sie, um die Details zu besprechen; danach wird der Mietvertrag online unterzeichnet.",
      fLeadNa: "Wir informieren Sie, sobald Vibe HaaS in Ihrem Land verfügbar ist. Nichts zu unterschreiben, unverbindlich.",
      sCompany: "Ihr Unternehmen", sNeed: "Ihr Bedarf", country: "Land", company: "Firmenname", vat: "Unternehmens- oder USt-IdNr.", contact: "Ansprechpartner", job: "Funktion", email: "E-Mail", phone: "Telefon", street: "Straße und Hausnummer", zip: "Postleitzahl", city: "Ort",
      qty: "Anzahl Ladestationen", qWall: "Vibe Wall", qSingle: "Vibe Pole einfach", qDbl: "Vibe Pole doppelt", term: "Gewünschte Laufzeit", termAny: "Noch nicht sicher",
      use: "Wo werden sie eingesetzt?", uses: ["Firmenparkplatz / Büros", "Flottendepot", "Heimladen von Firmenwagen", "Öffentlicher oder halböffentlicher Parkplatz", "Sonstiges"],
      start: "Wann möchten Sie starten?", starts: ["So bald wie möglich", "Innerhalb von 6 Monaten", "Später / noch in Prüfung"],
      msg: "Gibt es noch etwas, das wir wissen sollten?", consent: ["Ich bin damit einverstanden, dass Belinus meine Daten zur Bearbeitung dieser Anfrage verarbeitet, wie in der ", "Datenschutzerklärung", " beschrieben."],
      send: "Interesse senden", sendNa: "Interesse anmelden", sending: "Wird gesendet…", required: "Bitte füllen Sie die Pflichtfelder (*) aus und wählen Sie mindestens eine Ladestation.",
      fail: "Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es gleich noch einmal oder schreiben Sie an service@belinus.com.",
      okH: "Vielen Dank.", okB: "Wir melden uns in Kürze, um Ihre Anfrage zu bearbeiten.", okBNa: "Ihr Interesse ist registriert. Wir informieren Sie, sobald Vibe HaaS in Ihrem Land verfügbar ist.", back: "Zurück zur Produktseite", ref: "Referenz" },
    it: { tag: "HaaS · Hardware-as-a-Service · Belgio", h: "Vibe come servizio, a un canone mensile fisso.",
      b: "Con l’HaaS (Hardware-as-a-Service) le aziende in Belgio noleggiano Vibe Wall e Vibe Pole con un contratto di noleggio di 36, 48 o 60 mesi, senza investire nell’hardware.",
      inc: "Incluso nel canone mensile", items: ["Manutenzione e sostituzione entro 24 ore per tutta la durata", "Back office: piattaforma OCPP, sessioni di ricarica e report", "Rimborso della ricarica domestica: i kWh caricati a casa del dipendente vengono conteggiati con il datore di lavoro", "Opzione di acquisto della stazione alla fine del contratto"],
      how: "Come funziona", hows: ["Contratto di noleggio riservato ai clienti professionali (aziende) in Belgio.", "Il contratto si firma online.", "Consegna entro 3 mesi.", "Con riserva di approvazione del merito creditizio del cliente e di finanziamento disponibile nello strumento finanziario dedicato a questa offerta."],
      model: "Modello", m: "mesi", per: "/ mese", wall: "Vibe Wall · 22 kW", single: "Vibe Pole singola · 22 kW", dbl: "Vibe Pole doppia · 2 × 22 kW",
      note: "Prezzi IVA esclusa. Installazione fatturata a parte.", cta: "Confermi il suo interesse",
      naTag: "HaaS · Hardware-as-a-Service", naH: "Non ancora disponibile nel suo paese.",
      naB: "Il contratto di noleggio Vibe HaaS è per ora offerto alle aziende in Belgio. Lo apriamo paese per paese, partendo da dove le aziende lo richiedono. Registri il suo interesse: ogni richiesta conta per aprire l’HaaS nel suo paese.",
      naHere: "nel suo paese", naCta: "Registri il suo interesse", naNote: "La sua azienda ha sede in Belgio? Scelga il Belgio nel modulo.",
      fTitle: "Confermi il suo interesse per Vibe HaaS", fTitleNa: "Registri il suo interesse per Vibe HaaS",
      fLead: "Non si tratta di un ordine né di un contratto. La contattiamo per esaminare i dettagli; il contratto di noleggio si firma poi online.",
      fLeadNa: "La avviseremo appena Vibe HaaS sarà disponibile nel suo paese. Nulla da firmare, nessun impegno.",
      sCompany: "La sua azienda", sNeed: "La sua esigenza", country: "Paese", company: "Ragione sociale", vat: "Numero d’impresa o partita IVA", contact: "Referente", job: "Ruolo", email: "E-mail", phone: "Telefono", street: "Via e numero civico", zip: "CAP", city: "Comune",
      qty: "Numero di stazioni", qWall: "Vibe Wall", qSingle: "Vibe Pole singola", qDbl: "Vibe Pole doppia", term: "Durata preferita", termAny: "Non ancora sicuro",
      use: "Dove saranno utilizzate?", uses: ["Parcheggio aziendale / uffici", "Deposito flotta", "Ricarica a casa delle auto aziendali", "Parcheggio pubblico o semipubblico", "Altro"],
      start: "Quando desidera iniziare?", starts: ["Il prima possibile", "Entro 6 mesi", "Più avanti / in valutazione"],
      msg: "C’è altro che dovremmo sapere?", consent: ["Acconsento al trattamento dei miei dati da parte di Belinus per gestire questa richiesta, come descritto nell’", "informativa sulla privacy", "."],
      send: "Invii il suo interesse", sendNa: "Registri il suo interesse", sending: "Invio in corso…", required: "Compili i campi obbligatori (*) e scelga almeno una stazione.",
      fail: "Non è stato possibile inviare la richiesta. Riprovi tra poco o scriva a service@belinus.com.",
      okH: "Grazie.", okB: "La contatteremo presto per gestire la sua richiesta.", okBNa: "Il suo interesse è registrato. La avviseremo appena Vibe HaaS sarà disponibile nel suo paese.", back: "Torna alla pagina del prodotto", ref: "Riferimento" },
    es: { tag: "HaaS · Hardware-as-a-Service · Bélgica", h: "Vibe como servicio, por una cuota mensual fija.",
      b: "Con HaaS (Hardware-as-a-Service), las empresas en Bélgica alquilan Vibe Wall y Vibe Pole mediante un contrato de alquiler de 36, 48 o 60 meses, sin invertir en el equipo.",
      inc: "Incluido en la cuota mensual", items: ["Mantenimiento y sustitución en 24 horas durante todo el contrato", "Back office: plataforma OCPP, sesiones de carga e informes", "Reembolso de la carga en casa: los kWh cargados en casa del empleado se liquidan con la empresa", "Opción de compra del cargador al final del contrato"],
      how: "Cómo funciona", hows: ["Contrato de alquiler solo para clientes profesionales (empresas) en Bélgica.", "El contrato se firma en línea.", "Entrega en un plazo de 3 meses.", "Sujeto a la aprobación de la solvencia del cliente y a la financiación disponible en el instrumento financiero destinado a esta oferta."],
      model: "Modelo", m: "meses", per: "/ mes", wall: "Vibe Wall · 22 kW", single: "Vibe Pole simple · 22 kW", dbl: "Vibe Pole doble · 2 × 22 kW",
      note: "Precios sin IVA. Instalación facturada aparte.", cta: "Confirmar mi interés",
      naTag: "HaaS · Hardware-as-a-Service", naH: "Todavía no disponible en su país.",
      naB: "Por ahora, el contrato de alquiler Vibe HaaS se ofrece a empresas en Bélgica. Lo abrimos país por país, empezando por donde las empresas lo solicitan. Registre su interés: cada solicitud cuenta para abrir HaaS en su país.",
      naHere: "su país", naCta: "Registrar mi interés", naNote: "¿Su empresa está en Bélgica? Elija Bélgica en el formulario.",
      fTitle: "Confirme su interés en Vibe HaaS", fTitleNa: "Registre su interés en Vibe HaaS",
      fLead: "Esto no es un pedido ni un contrato. Nos pondremos en contacto con usted para revisar los detalles; después, el contrato de alquiler se firma en línea.",
      fLeadNa: "Le avisaremos en cuanto Vibe HaaS esté disponible en su país. Nada que firmar, sin compromiso.",
      sCompany: "Su empresa", sNeed: "Su necesidad", country: "País", company: "Nombre de la empresa", vat: "Número de empresa o NIF-IVA", contact: "Persona de contacto", job: "Cargo", email: "Correo electrónico", phone: "Teléfono", street: "Calle y número", zip: "Código postal", city: "Localidad",
      qty: "Número de cargadores", qWall: "Vibe Wall", qSingle: "Vibe Pole simple", qDbl: "Vibe Pole doble", term: "Duración preferida", termAny: "Todavía no lo sé",
      use: "¿Dónde se utilizarán?", uses: ["Aparcamiento de empresa / oficinas", "Depósito de flota", "Carga en casa de coches de empresa", "Aparcamiento público o semipúblico", "Otro"],
      start: "¿Cuándo quiere empezar?", starts: ["Lo antes posible", "En los próximos 6 meses", "Más adelante / explorando"],
      msg: "¿Algo más que debamos saber?", consent: ["Acepto que Belinus trate mis datos para gestionar esta solicitud, tal como se describe en la ", "declaración de privacidad", "."],
      send: "Enviar mi interés", sendNa: "Registrar mi interés", sending: "Enviando…", required: "Rellene los campos obligatorios (*) y elija al menos un cargador.",
      fail: "No se ha podido enviar su solicitud. Inténtelo de nuevo en un momento o escriba a service@belinus.com.",
      okH: "Gracias.", okB: "Nos pondremos en contacto con usted pronto para tramitar su solicitud.", okBNa: "Su interés ha quedado registrado. Le avisaremos en cuanto Vibe HaaS esté disponible en su país.", back: "Volver a la página del producto", ref: "Referencia" }
  };
  var TERMS = [36, 48, 60];
  function eur(n) {
    try { return new Intl.NumberFormat({ en: "en-BE", nl: "nl-BE", fr: "fr-BE", de: "de-BE", it: "it-IT", es: "es-ES" }[LANG] || "en-BE",
      { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); } catch (e) { return "€ " + n; }
  }
  /* current B2B region: the page's own choice (storedRegion), then every change made in the header */
  var region = null;
  function curRegion() {   /* storedRegion() lives in the page script, which runs after this file */
    if (region) return region;
    try { var r = typeof storedRegion === "function" ? storedRegion() : null; if (r && r.code) return (region = r.code); } catch (e) {}
    return { nl: "BE", fr: "BE", de: "DE", it: "IT", es: "ES" }[LANG] || "INT";
  }
  try {
    var BC = window.BelinusConsent;
    if (BC && BC.setRegion && !BC.__haasWrapped) {
      var orig = BC.setRegion; BC.__haasWrapped = true;
      BC.setRegion = function (r) { try { if (r && r.seg === "B2B" && r.code) { region = r.code; window.dispatchEvent(new CustomEvent("belinus-b2b-region", { detail: r.code })); } } catch (e) {} return orig.apply(this, arguments); };
    }
  } catch (e) {}
  var countryOf = function (code) { return CC.indexOf(code) >= 0 ? code : "OTHER"; };

  function HaasForm(p) {
    var t = p.t, h = React.useState, ce = c;
    var st = h({ country: countryOf(p.region), company: "", vat: "", contact_name: "", job_title: "", email: "", phone: "", street: "", zip: "", city: "",
      qty_wall: "", qty_single: "", qty_double: "", term_months: "", use_case: "", start_wish: "", message: "" }), f = st[0], setF = st[1];
    var cs = h(false), consent = cs[0], setConsent = cs[1];
    var hp = h(""), hpv = hp[0], setHp = hp[1];
    var ss = h("idle"), status = ss[0], setStatus = ss[1];
    var es = h(""), err = es[0], setErr = es[1];
    var ns = h(null), num = ns[0], setNum = ns[1];
    var box = React.useRef(null);
    var be = f.country === "BE";
    var cn = CN[LANG] || CN.en;
    var on = function (k) { return function (e) { var o = Object.assign({}, f); o[k] = e.target.value; setF(o); }; };
    var req = be ? ["company", "vat", "contact_name", "email", "phone", "city"] : ["company", "contact_name", "email"];
    function submit(e) {
      e.preventDefault();
      var q = (+f.qty_wall || 0) + (+f.qty_single || 0) + (+f.qty_double || 0);
      var miss = req.some(function (k) { return !String(f[k] || "").trim(); });
      if (miss || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim()) || !consent || q < 1) { setErr(t.required); return; }
      setErr(""); setStatus("sending");
      var payload = Object.assign({ action: "submit", lang: LANG, consent: true, _hp: hpv, source_url: location.href }, f, { term_months: be && f.term_months ? +f.term_months : null });
      fetch(HAAS_API, { method: "POST", headers: { "content-type": "application/json", apikey: HAAS_KEY }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j || !x.j.ok) throw new Error("fail");
          setNum(x.j.number || null); setStatus("ok");
          try { box.current && box.current.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e2) {}
          setTimeout(function () { p.onDone && p.onDone(); }, 7000);
        })
        .catch(function () { setStatus("idle"); setErr(t.fail); });
    }
    if (status === "ok") return ce("div", { ref: box, className: "login-box webform webform-ok haas-ok", role: "status", "aria-live": "polite" },
      ce("svg", { className: "b2c-thanks-check", viewBox: "0 0 52 52", "aria-hidden": "true" }, ce("circle", { cx: "26", cy: "26", r: "24" }), ce("path", { d: "M15 27 l7 7 l15 -16" })),
      ce("h3", { className: "display-sm" }, t.okH),
      ce("p", { className: "body-md", style: { margin: 0 } }, be ? t.okB : t.okBNa),
      num ? ce("p", { className: "label muted", style: { margin: 0 } }, t.ref + " HaaS-" + num) : null,
      ce("button", { type: "button", className: "btn btn-arrow", onClick: function () { p.onDone && p.onDone(); } }, t.back));
    var L = function (k, label, need, input) { return ce("label", { key: k, className: input && input.wide ? "wide" : "" }, ce("span", { className: "label" }, label, need ? " *" : ""), input.el); };
    var inp = function (k, type, ac) { return { el: ce("input", { type: type || "text", value: f[k], onChange: on(k), autoComplete: ac || "off" }) }; };
    var num3 = function (k, label) { return ce("label", { key: k }, ce("span", { className: "label" }, label), ce("input", { type: "number", min: "0", max: "999", inputMode: "numeric", value: f[k], onChange: on(k), placeholder: "0" })); };
    var sel = function (k, opts, wide) { return { wide: wide, el: ce("select", { value: f[k], onChange: on(k) }, ce("option", { value: "" }, "—"), opts.map(function (o) { return ce("option", { key: o[0], value: o[0] }, o[1]); })) }; };
    var isReq = function (k) { return req.indexOf(k) >= 0; };
    return ce("form", { ref: box, className: "login-box webform haas-form", onSubmit: submit, noValidate: true },
      ce("span", { className: "label", style: { color: "var(--brand-blue)" } }, be ? t.fTitle : t.fTitleNa),
      ce("p", { className: "body-md haas-form-lead" }, be ? t.fLead : t.fLeadNa),
      ce("h4", { className: "label haas-sec" }, t.sCompany),
      ce("div", { className: "webform-grid" },
        L("country", t.country, true, { el: ce("select", { value: f.country, onChange: on("country"), autoComplete: "country" }, CC.map(function (k) { return ce("option", { key: k, value: k }, cn[k]); })) }),
        L("company", t.company, true, inp("company", "text", "organization")),
        L("vat", t.vat, isReq("vat"), inp("vat")),
        L("contact_name", t.contact, true, inp("contact_name", "text", "name")),
        L("job_title", t.job, false, inp("job_title", "text", "organization-title")),
        L("email", t.email, true, inp("email", "email", "email")),
        L("phone", t.phone, isReq("phone"), inp("phone", "tel", "tel")),
        L("street", t.street, false, inp("street", "text", "street-address")),
        L("zip", t.zip, false, inp("zip", "text", "postal-code")),
        L("city", t.city, isReq("city"), inp("city", "text", "address-level2"))),
      ce("h4", { className: "label haas-sec" }, t.sNeed),
      ce("p", { className: "label haas-qty-h" }, t.qty, " *"),
      ce("div", { className: "haas-qty" }, num3("qty_wall", t.qWall), num3("qty_single", t.qSingle), num3("qty_double", t.qDbl)),
      ce("div", { className: "webform-grid" },
        be ? L("term_months", t.term, false, sel("term_months", TERMS.map(function (m) { return [String(m), m + " " + t.m]; }).concat([["", t.termAny]]).filter(function (o) { return o[0]; }))) : null,
        L("use_case", t.use, false, sel("use_case", t.uses.map(function (u) { return [u, u]; }))),
        L("start_wish", t.start, false, sel("start_wish", t.starts.map(function (u) { return [u, u]; }))),
        ce("label", { className: "wide" }, ce("span", { className: "label" }, t.msg), ce("textarea", { rows: "3", value: f.message, onChange: on("message") }))),
      ce("input", { className: "webform-hp", tabIndex: "-1", autoComplete: "off", "aria-hidden": "true", value: hpv, onChange: function (e) { setHp(e.target.value); }, name: "website_url" }),
      ce("label", { className: "b2c-check webform-consent" }, ce("input", { type: "checkbox", checked: consent, onChange: function (e) { setConsent(e.target.checked); } }),
        ce("span", null, t.consent[0], ce("a", { href: window.BELINUS_PRIVACY_URL || "#privacy" }, t.consent[1]), t.consent[2], " *")),
      ce("button", { type: "submit", className: "btn btn-arrow", disabled: status === "sending" }, status === "sending" ? t.sending : (be ? t.send : t.sendNa)),
      ce("p", { className: "login-note", role: "alert" }, err));
  }

  function EVLease() {
    var t = LT[LANG] || LT.en;
    var rs = React.useState(curRegion), reg = rs[0], setReg = rs[1];
    var os = React.useState(false), open = os[0], setOpen = os[1];
    var ks = React.useState(0), key = ks[0], setKey = ks[1];
    React.useEffect(function () {
      var fn = function (e) { setReg(e.detail); };
      window.addEventListener("belinus-b2b-region", fn);
      return function () { window.removeEventListener("belinus-b2b-region", fn); };
    }, []);
    var be = reg === "BE";
    var cn = CN[LANG] || CN.en;
    var cname = CC.indexOf(reg) >= 0 && reg !== "OTHER" ? cn[reg] : t.naHere;
    function done() {
      setOpen(false); setKey(key + 1);
      try { var el = document.querySelector(".pl-page") || document.body; window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: "smooth" }); } catch (e) {}
    }
    var rows = [["wall", t.wall], ["single", t.single], ["double", t.dbl]].filter(function (r) {
      var p = LEASE_PRICES[r[0]]; return p && TERMS.some(function (m) { return p[m] != null; });
    });
    var table = rows.length ? c("table", { className: "ev-lease-table" },
      c("thead", null, c("tr", null, c("th", { className: "label" }, t.model), TERMS.map(function (m) { return c("th", { key: m, className: "label" }, m + " " + t.m); }))),
      c("tbody", null, rows.map(function (r) {
        return c("tr", { key: r[0] }, c("td", null, r[1]), TERMS.map(function (m) {
          var v = LEASE_PRICES[r[0]][m];
          return c("td", { key: m, className: "num" }, v == null ? "—" : c(React.Fragment, null, eur(v), c("small", null, " " + t.per)));
        }));
      }))) : null;
    var form = open ? c(HaasForm, { key: key, t: t, region: reg, onDone: done }) : null;
    if (!be) return c("div", { className: "ev-lease is-na", id: "haas" },
      c("div", { className: "ev-lease-head" },
        c("span", { className: "eyebrow eyebrow-dot" }, t.naTag),
        c("h3", { className: "display-sm" }, t.naH),
        c("p", { className: "body-md" }, t.naB.replace("{c}", cname)),
        c("ul", { className: "haas-na-points" }, t.items.slice(0, 3).map(function (x) { return c("li", { key: x, className: "body-md" }, x); })),
        !open ? c("div", { className: "haas-actions" }, c("button", { type: "button", className: "btn btn-arrow", onClick: function () { setOpen(true); } }, t.naCta), c("p", { className: "fineprint" }, t.naNote)) : null),
      form);
    return c("div", { className: "ev-lease", id: "haas" },
      c("div", { className: "ev-lease-head" },
        c("span", { className: "eyebrow eyebrow-dot" }, t.tag),
        c("h3", { className: "display-sm" }, t.h),
        c("p", { className: "body-md" }, t.b)),
      c("div", { className: "ev-lease-body" },
        c("div", { className: "ev-lease-inc" },
          c("h4", { className: "label" }, t.inc),
          c("ul", null, t.items.map(function (x) { return c("li", { key: x, className: "body-md" }, x); })),
          c("h4", { className: "label", style: { marginTop: 24 } }, t.how),
          c("ul", null, t.hows.map(function (x) { return c("li", { key: x, className: "body-md" }, x); }))),
        c("div", { className: "ev-lease-prices" },
          table,
          c("p", { className: "fineprint" }, t.note),
          !open ? c("button", { type: "button", className: "btn btn-arrow", onClick: function () { setOpen(true); } }, t.cta) : null)),
      form);
  }

  window.EVGallery = EVGallery;
  window.EVLease = EVLease;

  var css = document.createElement("style");
  css.textContent = [
    ".ev-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:8px 0 40px}",
    ".ev-shot{margin:0;position:relative;border-radius:var(--r-md,12px);overflow:hidden;background:#0b0f13}",
    ".ev-shot.is-wide{grid-column:1/-1}",
    ".ev-shot img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}",
    ".ev-shot figcaption{position:absolute;left:0;right:0;bottom:0;padding:10px 14px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.55))}",
    ".ev-lease{margin-top:48px;border:1px solid var(--ink-4,#2a3038);border-radius:var(--r-md,12px);padding:36px 32px}",
    ".ev-lease-head{max-width:62ch}",
    ".ev-lease-head h3{margin:14px 0 12px}",
    ".ev-lease-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:32px;margin-top:28px}",
    ".ev-lease-inc ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px}",
    ".ev-lease-inc li{border-left:1px solid var(--brand-blue,#2EB9EA);padding:2px 0 2px 14px;color:var(--fg-2,#c9d1d9)}",
    ".ev-lease-prices{display:flex;flex-direction:column;gap:16px;align-items:flex-start}",
    ".ev-lease-table{width:100%;border-collapse:collapse}",
    ".ev-lease-table th,.ev-lease-table td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--ink-4,#2a3038);font-weight:300}",
    ".ev-lease-table td.num{white-space:nowrap;color:var(--brand-blue,#2EB9EA)}",
    ".ev-lease-table td.num small{color:var(--fg-3,#8a94a0)}",
    ".ev-lease-noprice{color:var(--fg-2,#c9d1d9);margin:0}",
    ".ev-lease .fineprint{margin:0}",
    ".products-grid.n4>.product-card:nth-child(5){grid-column:1/-1}",
    ".haas-form{margin-top:28px;display:flex;flex-direction:column;gap:14px}",
    ".haas-form-lead{margin:0;color:var(--fg-2,#c9d1d9);max-width:70ch}",
    ".haas-sec{margin:10px 0 0;color:var(--fg-1,#fff)}",
    ".haas-qty-h{margin:0}",
    ".haas-qty{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}",
    ".haas-ok{margin-top:28px;display:flex;flex-direction:column;gap:14px;align-items:flex-start}",
    ".haas-na-points{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:8px}",
    ".haas-na-points li{border-left:1px solid var(--brand-blue,#2EB9EA);padding:2px 0 2px 14px;color:var(--fg-2,#c9d1d9)}",
    ".haas-actions{margin-top:22px;display:flex;flex-direction:column;gap:10px;align-items:flex-start}",
    ".haas-actions .fineprint{margin:0}",
    "@media (max-width:640px){.haas-qty{grid-template-columns:1fr}}",
    "@media (max-width:900px){.ev-gallery{grid-template-columns:1fr}.ev-lease-body{grid-template-columns:1fr}.ev-lease{padding:26px 20px}.ev-lease-table th,.ev-lease-table td{padding:8px 4px;font-size:14px}}"
  ].join("\n");
  document.head.appendChild(css);
})();
