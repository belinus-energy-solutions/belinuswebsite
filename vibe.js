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

  /* ================= Vibe product page (#vibe), drawer product submenu, company / employee calculator ================= */
  var VT = {
    en: { eyebrow: "EV charging · Vibe", h: "Vibe. Charging in both directions.", lead: "The belinus AC charger for company sites, fleets and the home of every employee with a company car: 22 kW, vehicle-to-grid under ISO 15118-20, Plug & Charge and OCPP 2.0.1, ready for the AFIR requirement of 1 January 2027.",
      ctaCalc: "Calculate your advantage", ctaHaas: "Hardware-as-a-Service", formats: "Two formats", formatsH: "On the wall or on a column.", life: "In real life", lifeH: "Made for the driveway and the car park.",
      featH: "Why Vibe", calcEb: "Advantage calculator · Belgium", calcH: "What Vibe brings your company and your employees.", back: "← EV charging", all: "All products", sheet: "Data sheet", discover: "Discover Vibe",
      band: "Vibe Wall and Vibe Pole: product images, vehicle renders, the advantage calculator and the HaaS rent contract on one page." },
    nl: { eyebrow: "Laadinfrastructuur · Vibe", h: "Vibe. Laden in beide richtingen.", lead: "De AC-laadpaal van belinus voor bedrijfssites, wagenparken en de woning van elke werknemer met een bedrijfswagen: 22 kW, vehicle-to-grid volgens ISO 15118-20, Plug & Charge en OCPP 2.0.1, klaar voor de AFIR-verplichting van 1 januari 2027.",
      ctaCalc: "Bereken uw voordeel", ctaHaas: "Hardware-as-a-Service", formats: "Twee formaten", formatsH: "Aan de muur of op een zuil.", life: "In het echt", lifeH: "Gemaakt voor de oprit en de parking.",
      featH: "Waarom Vibe", calcEb: "Voordeelcalculator · België", calcH: "Wat Vibe uw bedrijf en uw werknemers oplevert.", back: "← Laadinfrastructuur", all: "Alle producten", sheet: "Datasheet", discover: "Ontdek Vibe",
      band: "Vibe Wall en Vibe Pole: productbeelden, beelden met wagens, de voordeelcalculator en het HaaS-huurcontract op één pagina." },
    fr: { eyebrow: "Recharge de véhicules · Vibe", h: "Vibe. La recharge dans les deux sens.", lead: "La borne AC belinus pour les sites d’entreprise, les flottes et le domicile de chaque collaborateur avec une voiture de société : 22 kW, vehicle-to-grid selon ISO 15118-20, Plug & Charge et OCPP 2.0.1, prête pour l’exigence AFIR du 1er janvier 2027.",
      ctaCalc: "Calculez votre avantage", ctaHaas: "Hardware-as-a-Service", formats: "Deux formats", formatsH: "Au mur ou sur colonne.", life: "En situation", lifeH: "Conçue pour l’allée et le parking.",
      featH: "Pourquoi Vibe", calcEb: "Calculateur d’avantage · Belgique", calcH: "Ce que Vibe apporte à votre entreprise et à vos collaborateurs.", back: "← Recharge de véhicules", all: "Tous les produits", sheet: "Fiche technique", discover: "Découvrir Vibe",
      band: "Vibe Wall et Vibe Pole : images produit, rendus avec véhicules, calculateur d’avantage et contrat de location HaaS sur une seule page." },
    de: { eyebrow: "E-Mobilität · Vibe", h: "Vibe. Laden in beide Richtungen.", lead: "Die AC-Ladestation von belinus für Firmenstandorte, Flotten und das Zuhause jedes Mitarbeiters mit Firmenwagen: 22 kW, Vehicle-to-Grid nach ISO 15118-20, Plug & Charge und OCPP 2.0.1, bereit für die AFIR-Vorgabe ab dem 1. Januar 2027.",
      ctaCalc: "Vorteil berechnen", ctaHaas: "Hardware-as-a-Service", formats: "Zwei Formate", formatsH: "An der Wand oder als Säule.", life: "Im Einsatz", lifeH: "Gemacht für Einfahrt und Parkplatz.",
      featH: "Warum Vibe", calcEb: "Vorteilsrechner · Belgien", calcH: "Was Vibe Ihrem Unternehmen und Ihren Mitarbeitern bringt.", back: "← E-Mobilität", all: "Alle Produkte", sheet: "Datenblatt", discover: "Vibe entdecken",
      band: "Vibe Wall und Vibe Pole: Produktbilder, Renderings mit Fahrzeugen, der Vorteilsrechner und der HaaS-Mietvertrag auf einer Seite." },
    it: { eyebrow: "Ricarica dei veicoli · Vibe", h: "Vibe. Ricarica in entrambe le direzioni.", lead: "La stazione di ricarica AC belinus per sedi aziendali, flotte e la casa di ogni dipendente con auto aziendale: 22 kW, vehicle-to-grid secondo ISO 15118-20, Plug & Charge e OCPP 2.0.1, pronta per il requisito AFIR dal 1° gennaio 2027.",
      ctaCalc: "Calcoli il suo vantaggio", ctaHaas: "Hardware-as-a-Service", formats: "Due formati", formatsH: "A parete o su colonnina.", life: "Nella realtà", lifeH: "Pensata per il vialetto e il parcheggio.",
      featH: "Perché Vibe", calcEb: "Calcolatore del vantaggio · Belgio", calcH: "Cosa porta Vibe alla sua azienda e ai suoi dipendenti.", back: "← Ricarica dei veicoli", all: "Tutti i prodotti", sheet: "Scheda tecnica", discover: "Scopri Vibe",
      band: "Vibe Wall e Vibe Pole: immagini del prodotto, render con i veicoli, il calcolatore del vantaggio e il noleggio HaaS in un’unica pagina." },
    es: { eyebrow: "Recarga de vehículos · Vibe", h: "Vibe. Carga en ambos sentidos.", lead: "El cargador AC de belinus para sedes de empresa, flotas y la casa de cada empleado con coche de empresa: 22 kW, vehicle-to-grid según ISO 15118-20, Plug & Charge y OCPP 2.0.1, listo para el requisito AFIR del 1 de enero de 2027.",
      ctaCalc: "Calcule su ventaja", ctaHaas: "Hardware-as-a-Service", formats: "Dos formatos", formatsH: "En la pared o en poste.", life: "En situación real", lifeH: "Pensado para la entrada de casa y el aparcamiento.",
      featH: "Por qué Vibe", calcEb: "Calculadora de ventajas · Bélgica", calcH: "Lo que Vibe aporta a su empresa y a sus empleados.", back: "← Recarga de vehículos", all: "Todos los productos", sheet: "Ficha técnica", discover: "Descubra Vibe",
      band: "Vibe Wall y Vibe Pole: imágenes del producto, renders con vehículos, la calculadora de ventajas y el alquiler HaaS en una sola página." }
  };
  var FEAT = {
    en: [["22 kW, in both directions.", "Three-phase 32 A charging, and bidirectional power transfer to the building or the grid via ISO 15118-20 when the vehicle supports AC V2G."], ["Ready for 1 January 2027.", "EN ISO 15118-20:2022 and ISO 15118-2, as AFIR Delegated Regulation (EU) 2025/656 requires for every new public and private Mode 3 charge point."], ["Plug & Charge.", "The car identifies itself through its contract certificate. No card, no app. RFID and app remain available."], ["Smart energy, by default.", "Solar surplus charging, dynamic load balancing and capacity-tariff peak shaving through the P1 meter (MTAP) or current clamps (CTAP)."], ["Open to any operator.", "OCPP 2.0.1 and 1.6J, Modbus TCP and an API for EMS integration. Multiple CPO cards on one private charge point."], ["Designed in Belgium.", "Extruded aluminium housing with the belinus light line, over-the-air updates and a 24-hour replacement service."]],
    nl: [["22 kW, in beide richtingen.", "Driefasig laden aan 32 A en bidirectionele energieoverdracht naar het gebouw of het net via ISO 15118-20, als de wagen AC-V2G ondersteunt."], ["Klaar voor 1 januari 2027.", "EN ISO 15118-20:2022 en ISO 15118-2, zoals de AFIR-verordening (EU) 2025/656 vereist voor elk nieuw publiek en privaat Mode 3-laadpunt."], ["Plug & Charge.", "De wagen identificeert zich met zijn contractcertificaat. Geen kaart, geen app. RFID en app blijven beschikbaar."], ["Standaard slim met energie.", "Laden op zonne-overschot, dynamische lastverdeling en piekbeperking (capaciteitstarief) via de P1-meter (MTAP) of stroomtangen (CTAP)."], ["Open voor elke operator.", "OCPP 2.0.1 en 1.6J, Modbus TCP en een API voor EMS-integratie. Meerdere CPO-kaarten op één privaat laadpunt."], ["Ontworpen in België.", "Behuizing in geëxtrudeerd aluminium met de belinus-lichtlijn, over-the-air-updates en vervangservice binnen 24 uur."]],
    fr: [["22 kW, dans les deux sens.", "Recharge triphasée 32 A et transfert d’énergie bidirectionnel vers le bâtiment ou le réseau via ISO 15118-20, si le véhicule gère le V2G AC."], ["Prête pour le 1er janvier 2027.", "EN ISO 15118-20:2022 et ISO 15118-2, comme l’exige le règlement AFIR (UE) 2025/656 pour tout nouveau point de charge Mode 3 public ou privé."], ["Plug & Charge.", "Le véhicule s’identifie par son certificat de contrat. Ni carte, ni appli. Le RFID et l’appli restent disponibles."], ["L’énergie intelligente, de série.", "Recharge sur surplus solaire, équilibrage dynamique et écrêtage des pointes via le compteur P1 (MTAP) ou des pinces de courant (CTAP)."], ["Ouverte à tout opérateur.", "OCPP 2.0.1 et 1.6J, Modbus TCP et une API pour l’intégration EMS. Plusieurs cartes CPO sur un même point de charge privé."], ["Conçue en Belgique.", "Boîtier en aluminium extrudé avec la ligne lumineuse belinus, mises à jour à distance et remplacement en 24 heures."]],
    de: [["22 kW, in beide Richtungen.", "Dreiphasiges Laden mit 32 A und bidirektionale Energieübertragung an das Gebäude oder das Netz über ISO 15118-20, wenn das Fahrzeug AC-V2G unterstützt."], ["Bereit für den 1. Januar 2027.", "EN ISO 15118-20:2022 und ISO 15118-2, wie es die AFIR-Verordnung (EU) 2025/656 für jeden neuen öffentlichen und privaten Mode-3-Ladepunkt verlangt."], ["Plug & Charge.", "Das Auto identifiziert sich über sein Vertragszertifikat. Keine Karte, keine App. RFID und App bleiben verfügbar."], ["Serienmäßig intelligent.", "Laden mit Solarüberschuss, dynamisches Lastmanagement und Lastspitzenkappung über den P1-Zähler (MTAP) oder Stromzangen (CTAP)."], ["Offen für jeden Betreiber.", "OCPP 2.0.1 und 1.6J, Modbus TCP und eine API für die EMS-Anbindung. Mehrere CPO-Karten an einem privaten Ladepunkt."], ["In Belgien entwickelt.", "Gehäuse aus stranggepresstem Aluminium mit der belinus-Lichtlinie, Over-the-Air-Updates und Austauschservice innerhalb von 24 Stunden."]],
    it: [["22 kW, in entrambe le direzioni.", "Ricarica trifase a 32 A e trasferimento bidirezionale di energia verso l’edificio o la rete tramite ISO 15118-20, se il veicolo supporta il V2G AC."], ["Pronta per il 1° gennaio 2027.", "EN ISO 15118-20:2022 e ISO 15118-2, come richiesto dal regolamento AFIR (UE) 2025/656 per ogni nuovo punto di ricarica Mode 3 pubblico e privato."], ["Plug & Charge.", "L’auto si identifica con il suo certificato di contratto. Nessuna tessera, nessuna app. RFID e app restano disponibili."], ["Intelligente di serie.", "Ricarica con il surplus solare, bilanciamento dinamico del carico e riduzione dei picchi tramite il contatore P1 (MTAP) o pinze amperometriche (CTAP)."], ["Aperta a ogni operatore.", "OCPP 2.0.1 e 1.6J, Modbus TCP e un’API per l’integrazione EMS. Più tessere CPO su un unico punto di ricarica privato."], ["Progettata in Belgio.", "Involucro in alluminio estruso con la linea luminosa belinus, aggiornamenti over-the-air e sostituzione entro 24 ore."]],
    es: [["22 kW, en ambos sentidos.", "Carga trifásica a 32 A y transferencia bidireccional de energía al edificio o a la red mediante ISO 15118-20, si el vehículo admite V2G AC."], ["Listo para el 1 de enero de 2027.", "EN ISO 15118-20:2022 e ISO 15118-2, como exige el Reglamento AFIR (UE) 2025/656 para todo nuevo punto de carga Mode 3 público y privado."], ["Plug & Charge.", "El coche se identifica con su certificado de contrato. Sin tarjeta, sin app. El RFID y la app siguen disponibles."], ["Inteligente de serie.", "Carga con excedente solar, equilibrado dinámico de carga y recorte de picos mediante el contador P1 (MTAP) o pinzas de corriente (CTAP)."], ["Abierto a cualquier operador.", "OCPP 2.0.1 y 1.6J, Modbus TCP y una API para la integración con el EMS. Varias tarjetas CPO en un mismo punto de carga privado."], ["Diseñado en Bélgica.", "Carcasa de aluminio extruido con la línea de luz belinus, actualizaciones remotas y sustitución en 24 horas."]]
  };

  /* ---------- calculator: employer and employee advantage of home charging a company car, Belgium ----------
     Same assumptions as the belinus home calculator: 18 kWh/100 km incl. losses, public AC €0.50/kWh,
     CREG reimbursement rate Q4 2026 per region (incl. VAT), smart charging −4 c€/kWh, solar valued at 4 c€/kWh. */
  var VC_CREG = { VL: .3225, BR: .3688, WA: .3779 }, VC_PUBLIC = .5, VC_KWH_KM = .18, VC_SMART = .04, VC_SOLAR = .04;
  var CT = {
    en: { cars: "Company cars charging at home", km: "Kilometres per car per year", home: "Share of the kilometres charged at home", region: "Region", vl: "Flanders", br: "Brussels", wa: "Wallonia",
      model: "Charger at the employee’s home (HaaS)", term: "HaaS term", m: "months", smart: "Smart charging with a dynamic contract", solar: "Share charged with the employee’s own solar panels",
      co: "Company advantage", coB: "Home charging reimbursed at the CREG rate instead of public charging with a charge card, minus the HaaS fee.", coSave: "Saving on charging", coFee: "HaaS fee", coNet: "Net advantage", perYear: "per year", perCarMonth: "per car per month",
      ee: "Employee advantage", eeB: "Difference between the CREG reimbursement and what charging really costs the employee at home.", eeZero: "With a standard contract the reimbursement roughly covers the cost. Smart charging and solar panels make the difference.", perEmployee: "per employee per year", kwh: "kWh per car per year",
      how: "How we calculate", note: "Belinus estimate. Consumption 18 kWh per 100 km including charging losses. Public charging €0.50/kWh (average AC rate in Belgium 2026: €0.40–0.55). Home price and reimbursement at the CREG rate for Q4 2026 per region (Flanders 32.25, Brussels 36.88, Wallonia 37.79 c€/kWh, incl. VAT). Smart charging: about 4 c€/kWh cheaper. Solar power valued at the lost feed-in fee (4 c€/kWh). HaaS fee excl. VAT; installation is billed separately and not included. Tax effects are not included.", src: "Source CREG rate" },
    nl: { cars: "Bedrijfswagens die thuis laden", km: "Kilometers per wagen per jaar", home: "Deel van de kilometers thuis geladen", region: "Gewest", vl: "Vlaanderen", br: "Brussel", wa: "Wallonië",
      model: "Laadpaal bij de werknemer thuis (HaaS)", term: "Looptijd HaaS", m: "maanden", smart: "Slim laden met een dynamisch contract", solar: "Deel geladen met de eigen zonnepanelen van de werknemer",
      co: "Voordeel voor het bedrijf", coB: "Thuisladen terugbetaald aan het CREG-tarief in plaats van publiek laden met een laadpas, min het HaaS-maandbedrag.", coSave: "Besparing op laden", coFee: "HaaS-maandbedragen", coNet: "Netto voordeel", perYear: "per jaar", perCarMonth: "per wagen per maand",
      ee: "Voordeel voor de werknemer", eeB: "Verschil tussen de CREG-terugbetaling en wat het laden de werknemer thuis echt kost.", eeZero: "Met een gewoon contract dekt de terugbetaling ongeveer de kosten. Slim laden en zonnepanelen maken het verschil.", perEmployee: "per werknemer per jaar", kwh: "kWh per wagen per jaar",
      how: "Hoe we rekenen", note: "Raming van belinus. Verbruik 18 kWh per 100 km inclusief laadverliezen. Publiek laden € 0,50/kWh (gemiddeld AC-tarief in België 2026: € 0,40–0,55). Thuisprijs en terugbetaling aan het CREG-tarief Q4 2026 per gewest (Vlaanderen 32,25, Brussel 36,88, Wallonië 37,79 c€/kWh, incl. btw). Slim laden: ongeveer 4 c€/kWh goedkoper. Zonnestroom gewaardeerd aan de gemiste injectievergoeding (4 c€/kWh). HaaS-maandbedrag excl. btw; installatie wordt apart gefactureerd en is niet meegerekend. Fiscale effecten zijn niet meegerekend.", src: "Bron CREG-tarief" },
    fr: { cars: "Voitures de société rechargées à domicile", km: "Kilomètres par voiture et par an", home: "Part des kilomètres rechargés à domicile", region: "Région", vl: "Flandre", br: "Bruxelles", wa: "Wallonie",
      model: "Borne au domicile du collaborateur (HaaS)", term: "Durée HaaS", m: "mois", smart: "Recharge intelligente avec un contrat dynamique", solar: "Part rechargée avec les panneaux solaires du collaborateur",
      co: "Avantage pour l’entreprise", coB: "Recharge à domicile remboursée au tarif CREG au lieu de la recharge publique avec une carte, moins la mensualité HaaS.", coSave: "Économie sur la recharge", coFee: "Mensualités HaaS", coNet: "Avantage net", perYear: "par an", perCarMonth: "par voiture et par mois",
      ee: "Avantage pour le collaborateur", eeB: "Différence entre le remboursement CREG et ce que la recharge coûte réellement au collaborateur à domicile.", eeZero: "Avec un contrat classique, le remboursement couvre à peu près les coûts. La recharge intelligente et les panneaux solaires font la différence.", perEmployee: "par collaborateur et par an", kwh: "kWh par voiture et par an",
      how: "Comment nous calculons", note: "Estimation belinus. Consommation de 18 kWh aux 100 km, pertes de recharge comprises. Recharge publique à 0,50 €/kWh (tarif AC moyen en Belgique en 2026 : 0,40–0,55 €). Prix à domicile et remboursement au tarif CREG du T4 2026 par région (Flandre 32,25, Bruxelles 36,88, Wallonie 37,79 c€/kWh, TVA comprise). Recharge intelligente : environ 4 c€/kWh de moins. Électricité solaire valorisée au tarif d’injection perdu (4 c€/kWh). Mensualité HaaS hors TVA ; l’installation est facturée séparément et n’est pas comprise. Les effets fiscaux ne sont pas pris en compte.", src: "Source tarif CREG" },
    de: { cars: "Firmenwagen, die zu Hause laden", km: "Kilometer pro Fahrzeug und Jahr", home: "Anteil der zu Hause geladenen Kilometer", region: "Region", vl: "Flandern", br: "Brüssel", wa: "Wallonien",
      model: "Ladestation beim Mitarbeiter zu Hause (HaaS)", term: "HaaS-Laufzeit", m: "Monate", smart: "Intelligentes Laden mit dynamischem Tarif", solar: "Anteil, der mit eigenen Solarmodulen des Mitarbeiters geladen wird",
      co: "Vorteil für das Unternehmen", coB: "Heimladen zum CREG-Satz erstattet statt öffentlichem Laden mit Ladekarte, abzüglich der HaaS-Rate.", coSave: "Einsparung beim Laden", coFee: "HaaS-Raten", coNet: "Nettovorteil", perYear: "pro Jahr", perCarMonth: "pro Fahrzeug und Monat",
      ee: "Vorteil für den Mitarbeiter", eeB: "Differenz zwischen der CREG-Erstattung und den tatsächlichen Ladekosten des Mitarbeiters zu Hause.", eeZero: "Mit einem Standardtarif deckt die Erstattung etwa die Kosten. Intelligentes Laden und Solarmodule machen den Unterschied.", perEmployee: "pro Mitarbeiter und Jahr", kwh: "kWh pro Fahrzeug und Jahr",
      how: "So rechnen wir", note: "Schätzung von belinus. Verbrauch 18 kWh pro 100 km inklusive Ladeverlusten. Öffentliches Laden 0,50 €/kWh (durchschnittlicher AC-Tarif in Belgien 2026: 0,40–0,55 €). Heimpreis und Erstattung zum CREG-Satz Q4 2026 je Region (Flandern 32,25, Brüssel 36,88, Wallonien 37,79 c€/kWh, inkl. MwSt.). Intelligentes Laden: etwa 4 c€/kWh günstiger. Solarstrom bewertet mit der entgangenen Einspeisevergütung (4 c€/kWh). HaaS-Rate zzgl. MwSt.; die Installation wird separat berechnet und ist nicht enthalten. Steuerliche Effekte sind nicht berücksichtigt.", src: "Quelle CREG-Satz" },
    it: { cars: "Auto aziendali ricaricate a casa", km: "Chilometri per auto all’anno", home: "Quota dei chilometri ricaricati a casa", region: "Regione", vl: "Fiandre", br: "Bruxelles", wa: "Vallonia",
      model: "Stazione a casa del dipendente (HaaS)", term: "Durata HaaS", m: "mesi", smart: "Ricarica intelligente con un contratto dinamico", solar: "Quota ricaricata con i pannelli solari del dipendente",
      co: "Vantaggio per l’azienda", coB: "Ricarica domestica rimborsata alla tariffa CREG invece della ricarica pubblica con tessera, meno il canone HaaS.", coSave: "Risparmio sulla ricarica", coFee: "Canoni HaaS", coNet: "Vantaggio netto", perYear: "all’anno", perCarMonth: "per auto al mese",
      ee: "Vantaggio per il dipendente", eeB: "Differenza tra il rimborso CREG e il costo reale della ricarica a casa del dipendente.", eeZero: "Con un contratto standard il rimborso copre circa i costi. Ricarica intelligente e pannelli solari fanno la differenza.", perEmployee: "per dipendente all’anno", kwh: "kWh per auto all’anno",
      how: "Come calcoliamo", note: "Stima belinus. Consumo di 18 kWh per 100 km incluse le perdite di ricarica. Ricarica pubblica a 0,50 €/kWh (tariffa AC media in Belgio nel 2026: 0,40–0,55 €). Prezzo domestico e rimborso alla tariffa CREG del T4 2026 per regione (Fiandre 32,25, Bruxelles 36,88, Vallonia 37,79 c€/kWh, IVA inclusa). Ricarica intelligente: circa 4 c€/kWh in meno. Energia solare valorizzata alla tariffa di immissione persa (4 c€/kWh). Canone HaaS IVA esclusa; l’installazione è fatturata a parte e non è inclusa. Gli effetti fiscali non sono considerati.", src: "Fonte tariffa CREG" },
    es: { cars: "Coches de empresa que cargan en casa", km: "Kilómetros por coche al año", home: "Parte de los kilómetros cargados en casa", region: "Región", vl: "Flandes", br: "Bruselas", wa: "Valonia",
      model: "Cargador en casa del empleado (HaaS)", term: "Duración HaaS", m: "meses", smart: "Carga inteligente con un contrato dinámico", solar: "Parte cargada con las placas solares del empleado",
      co: "Ventaja para la empresa", coB: "Carga en casa reembolsada a la tarifa CREG en lugar de la carga pública con tarjeta, menos la cuota HaaS.", coSave: "Ahorro en la carga", coFee: "Cuotas HaaS", coNet: "Ventaja neta", perYear: "al año", perCarMonth: "por coche al mes",
      ee: "Ventaja para el empleado", eeB: "Diferencia entre el reembolso CREG y lo que la carga cuesta realmente al empleado en casa.", eeZero: "Con un contrato normal, el reembolso cubre aproximadamente el coste. La carga inteligente y las placas solares marcan la diferencia.", perEmployee: "por empleado al año", kwh: "kWh por coche al año",
      how: "Cómo calculamos", note: "Estimación de belinus. Consumo de 18 kWh por 100 km, pérdidas de carga incluidas. Carga pública a 0,50 €/kWh (tarifa AC media en Bélgica en 2026: 0,40–0,55 €). Precio en casa y reembolso a la tarifa CREG del T4 2026 por región (Flandes 32,25, Bruselas 36,88, Valonia 37,79 c€/kWh, IVA incluido). Carga inteligente: unos 4 c€/kWh más barata. Energía solar valorada a la compensación por vertido perdida (4 c€/kWh). Cuota HaaS sin IVA; la instalación se factura aparte y no está incluida. No se tienen en cuenta los efectos fiscales.", src: "Fuente tarifa CREG" }
  };
  var CREG_URL = { nl: "https://www.creg.be/nl/consumenten/prijzen-en-tarieven/tarief-voor-terugbetaling-thuisladen-bedrijfswagens", fr: "https://www.creg.be/fr/consommateurs/prix-et-tarifs/tarif-pour-le-remboursement-de-la-recharge-domicile-des-vehicules-de-societe" };
  function VibeCalc() {
    var t = CT[LANG] || CT.en, S = React.useState;
    var a = S("10"), cars = a[0], setCars = a[1];
    var b = S("30000"), km = b[0], setKm = b[1];
    var d = S(.8), home = d[0], setHome = d[1];
    var e = S("VL"), reg = e[0], setReg = e[1];
    var g = S(48), term = g[0], setTerm = g[1];
    var h = S(true), smart = h[0], setSmart = h[1];
    var i = S(0), solar = i[0], setSolar = i[1];
    var loc = { en: "en-GB", nl: "nl-BE", fr: "fr-BE", de: "de-BE", it: "it-IT", es: "es-ES" }[LANG] || "en-GB";
    var money = function (v) { return (LANG === "en" ? "€" : "€ ") + Math.round(v).toLocaleString(loc); };
    var nCars = Math.max(0, Math.min(10000, parseInt(String(cars).replace(/\D/g, ""), 10) || 0));
    var kmCar = Math.max(0, Math.min(200000, parseInt(String(km).replace(/\D/g, ""), 10) || 0));
    var kwh = kmCar * home * VC_KWH_KM;                              /* per car per year, charged at home */
    var creg = VC_CREG[reg];
    var real = (1 - solar) * (creg - (smart ? VC_SMART : 0)) + solar * VC_SOLAR;
    var save = nCars * kwh * (VC_PUBLIC - creg);
    var fee = LEASE_PRICES.wall && LEASE_PRICES.wall[term] != null ? LEASE_PRICES.wall[term] : 0;
    var fees = nCars * fee * 12;
    var net = save - fees;
    var emp = Math.max(0, kwh * (creg - real));
    var seg = function (val, cur, set, label) { return c("button", { type: "button", key: String(val), className: "evs-seg" + (cur === val ? " is-on" : ""), "aria-pressed": cur === val, onClick: function () { set(val); } }, label); };
    return c("div", { className: "evs-grid vc-grid" },
      c("form", { className: "evs-in", onSubmit: function (ev) { ev.preventDefault(); } },
        c("label", { htmlFor: "vc-cars" }, c("span", { className: "label" }, t.cars), c("input", { id: "vc-cars", inputMode: "numeric", value: cars, onChange: function (ev) { setCars(ev.target.value); } })),
        c("label", { htmlFor: "vc-km" }, c("span", { className: "label" }, t.km), c("input", { id: "vc-km", inputMode: "numeric", value: km, onChange: function (ev) { setKm(ev.target.value); } }), c("small", null, Math.round(kwh).toLocaleString(loc), " ", t.kwh)),
        c("fieldset", null, c("legend", { className: "label" }, t.home), c("div", { className: "evs-segs" }, [.5, .65, .8, .95].map(function (v) { return seg(v, home, setHome, Math.round(v * 100) + " %"); }))),
        c("fieldset", null, c("legend", { className: "label" }, t.region), c("div", { className: "evs-segs" }, seg("VL", reg, setReg, t.vl), seg("BR", reg, setReg, t.br), seg("WA", reg, setReg, t.wa))),
        c("fieldset", null, c("legend", { className: "label" }, t.term, " · ", t.model), c("div", { className: "evs-segs" }, TERMS.map(function (m) { return seg(m, term, setTerm, m + " " + t.m + (LEASE_PRICES.wall && LEASE_PRICES.wall[m] != null ? " · " + money(LEASE_PRICES.wall[m]) : "")); }))),
        c("fieldset", null, c("legend", { className: "label" }, t.solar), c("div", { className: "evs-segs" }, [0, .25, .5].map(function (v) { return seg(v, solar, setSolar, Math.round(v * 100) + " %"); }))),
        c("label", { className: "evs-check", htmlFor: "vc-smart" }, c("input", { id: "vc-smart", type: "checkbox", checked: smart, onChange: function (ev) { setSmart(ev.target.checked); } }), c("span", null, t.smart))),
      c("div", { className: "evs-out", "aria-live": "polite" },
        c("div", { className: "evs-card" },
          c("span", { className: "label" }, t.co),
          c("div", { className: "evs-big" }, money(net), c("small", null, t.perYear)),
          c("dl", null,
            c("div", null, c("dt", null, t.coSave), c("dd", null, money(save))),
            c("div", null, c("dt", null, t.coFee), c("dd", null, "− " + money(fees))),
            c("div", null, c("dt", null, t.coNet), c("dd", null, nCars ? money(net / nCars / 12) + " " + t.perCarMonth : "—"))),
          c("p", null, t.coB)),
        c("div", { className: "evs-card" },
          c("span", { className: "label" }, t.ee),
          c("div", { className: "evs-big" }, money(emp), c("small", null, t.perEmployee)),
          c("p", null, emp < 1 ? t.eeZero : t.eeB))),
      c("details", { className: "calc-details vc-details" }, c("summary", { className: "label" }, t.how),
        c("p", { className: "fineprint evs-note" }, t.note, " ", c("a", { href: CREG_URL[LANG] || CREG_URL.nl, target: "_blank", rel: "noopener" }, t.src, " ↗"))));
  }

  var pickName = function (d) { return (LANG === "nl" && d.name_nl) || (LANG === "fr" && d.name_fr) || (window.xl ? window.xl(d.name) : d.name); };
  function scrollToId(id, tries) {
    var el = document.getElementById(id);
    if (el) { var y = el.getBoundingClientRect().top + scrollY - 110; window.scrollTo({ top: y, behavior: "smooth" }); return; }
    if ((tries || 0) < 30) setTimeout(function () { scrollToId(id, (tries || 0) + 1); }, 100);
  }
  function goTo(hash, id) {
    if (location.hash !== "#" + hash) location.hash = hash;
    if (id) setTimeout(function () { scrollToId(id, 0); }, 120);
  }

  function VibePage() {
    var t = VT[LANG] || VT.en, f = FEAT[LANG] || FEAT.en, line = window.EV_LINE;
    var PIMG = { "Vibe Wall": [["vibe-wall-product", 620, 1275]], "Vibe Pole": [["vibe-pole-single-product", 900, 1211], ["vibe-pole-double-product", 900, 1211]] };
    var plUi = (window.PL_UI || {});
    return c("section", { className: "pl-page vibe-page" },
      c("div", { className: "wrap" },
        c("a", { href: "#ev-charging", className: "pl-back label" }, t.back),
        c("div", { className: "vibe-hero" },
          c("div", { className: "vibe-hero-text" },
            c("span", { className: "eyebrow eyebrow-dot" }, t.eyebrow),
            c("h1", { className: "display-mid" }, t.h),
            c("p", { className: "body-lg" }, t.lead),
            c(window.HashTags || function () { return null; }, { k: "Vibe Wall" }),
            c("div", { className: "vibe-cta" },
              c("a", { href: "#vibe", className: "btn btn-arrow", onClick: function (ev) { ev.preventDefault(); scrollToId("vibe-calc", 0); } }, t.ctaCalc),
              c("a", { href: "#vibe", className: "btn-ghost label", onClick: function (ev) { ev.preventDefault(); scrollToId("haas", 0); } }, t.ctaHaas, " →"))),
          c("figure", { className: "ev-shot vibe-hero-img" },
            c("img", { src: "assets/vibe/vibe-pole-double-1600.webp", srcSet: "assets/vibe/vibe-pole-double-900.webp 900w, assets/vibe/vibe-pole-double-1600.webp 1600w", sizes: "(max-width: 900px) 100vw, 640px", alt: "belinus Vibe Pole", width: 1600, height: 900 }))),
        c("div", { className: "section-head vibe-sec" }, c("span", { className: "eyebrow eyebrow-dot" }, t.formats), c("h2", { className: "display-mid" }, t.formatsH)),
        c("div", { className: "vibe-products" }, line.products.map(function (d) {
          var slug = d.name === "Vibe Wall" ? "vibe-wall" : "vibe-pole";
          return c("article", { key: d.name, id: slug, className: "vibe-prod" },
            c("div", { className: "vibe-prod-imgs" }, PIMG[d.name].map(function (im) { return c("img", { key: im[0], src: "assets/vibe/" + im[0] + ".webp", alt: "belinus " + d.name, width: im[1], height: im[2], loading: "lazy", decoding: "async" }); })),
            c("div", { className: "vibe-prod-body" },
              c("h3", { className: "display-sm" }, d.name),
              c("p", { className: "body-md" }, d.b[LANG] || d.b.en),
              c(window.HashTags || function () { return null; }, { k: d.name }),
              c("dl", { className: "pl-specs" }, d.specs.map(function (s) { return c("div", { key: s[0] }, c("dt", { className: "label" }, s[0]), c("dd", null, s[1])); })),
              c(window.WarrantyStrip || function () { return null; }, d.warranty),
              c("a", { className: "pl-sheet", href: d.sheet, target: "_blank", rel: "noopener", download: true }, c("span", null, t.sheet), c("span", { className: "mono" }, d.sheetLabel, " ↓")),
              c(window.ShareRow || function () { return null; }, { slug: slug, title: d.name })));
        })),
        c("div", { className: "section-head vibe-sec" }, c("span", { className: "eyebrow eyebrow-dot" }, t.life), c("h2", { className: "display-mid" }, t.lifeH)),
        c(EVGallery, null),
        c("div", { className: "section-head vibe-sec" }, c("span", { className: "eyebrow eyebrow-dot" }, t.featH)),
        c("div", { className: "vibe-feats" }, f.map(function (x, k) { return c("div", { key: k, className: "vibe-feat" }, c("span", { className: "mono" }, "0" + (k + 1)), c("h3", { className: "body-lg" }, x[0]), c("p", { className: "body-md" }, x[1])); })),
        c("div", { className: "section-head vibe-sec", id: "vibe-calc" }, c("span", { className: "eyebrow eyebrow-dot" }, t.calcEb), c("h2", { className: "display-mid", style: { maxWidth: "24ch" } }, t.calcH)),
        c(VibeCalc, null),
        c(EVLease, null),
        c("div", { className: "pl-foot" },
          c("a", { href: "#ev-charging", className: "btn-ghost label" }, t.back),
          c("a", { href: "#products", className: "btn-ghost label" }, t.all, " →")),
        c(window.ShareRow || function () { return null; }, { slug: "vibe-wall", title: "Vibe" })));
  }

  /* banner on the EV charging line page, pointing to the Vibe page */
  function EVBand() {
    var t = VT[LANG] || VT.en;
    return c("a", { className: "vibe-band", href: "#vibe" },
      c("img", { src: "assets/vibe/vibe-wall-day-1600.webp", srcSet: "assets/vibe/vibe-wall-day-900.webp 900w, assets/vibe/vibe-wall-day-1600.webp 1600w", sizes: "(max-width: 900px) 100vw, 700px", alt: "belinus Vibe Wall", width: 1600, height: 900 }),
      c("span", { className: "vibe-band-text" }, c("span", { className: "eyebrow eyebrow-dot" }, "Vibe"), c("span", { className: "display-sm" }, t.h), c("span", { className: "body-md" }, t.band), c("span", { className: "btn btn-arrow" }, t.discover)));
  }

  /* drawer: product categories and product names under "Products" */
  var KRATOS_NAME = "Kratos";
  function EVProductsSub(p) {
    var L = window.PRODUCT_LINES || {}, S = React.useState;
    var o = S(null), open = o[0], setOpen = o[1];
    var order = ["solar", "power-storage", "commercial-industrial", "residential", "ev-charging"].filter(function (k) { return L[k]; });
    var items = function (k) {
      var line = L[k], out = [];
      (line.groups || [{ products: line.products }]).forEach(function (g) { (g.products || []).forEach(function (d) { out.push({ name: pickName(d), hash: k, id: "p-" + (window.bSlug ? window.bSlug(d.name) : d.name) }); }); });
      if (k === "power-storage") out.unshift({ name: KRATOS_NAME, hash: "kratos", id: "kratos" });
      if (k === "ev-charging") out = [{ name: "Vibe Wall", hash: "vibe", id: "vibe-wall" }, { name: "Vibe Pole", hash: "vibe", id: "vibe-pole" }];
      return out;
    };
    return c("div", { className: "dsub" }, order.map(function (k) {
      var lbl = (L[k].eyebrow && (L[k].eyebrow[LANG] || (window.xl ? window.xl(L[k].eyebrow.en) : L[k].eyebrow.en))) || k;
      var isOpen = open === k;
      return c("div", { key: k, className: "dsub-cat" + (isOpen ? " is-open" : "") },
        c("div", { className: "dsub-row" },
          c("a", { href: "#" + k, onClick: function () { p.close && p.close(); } }, lbl),
          c("button", { type: "button", className: "dsub-tog", "aria-expanded": isOpen, "aria-label": lbl, onClick: function () { setOpen(isOpen ? null : k); } }, c("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, c("path", { d: "M6 9l6 6 6-6" })))),
        isOpen ? c("ul", null, items(k).map(function (it) {
          return c("li", { key: it.id + it.name }, c("a", { href: "#" + it.hash, onClick: function (ev) { ev.preventDefault(); p.close && p.close(); goTo(it.hash, it.id); } }, it.name));
        })) : null);
    }));
  }

  window.VibePage = VibePage;
  window.EVBand = EVBand;
  window.EVProductsSub = EVProductsSub;
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
    ".evs-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 32px; margin-top: 8px; align-items: start; }",
    ".evs-in { display: grid; gap: 22px; border: 1px solid var(--ink-4); border-radius: var(--r-md); padding: 28px; min-width: 0; }",
    ".evs-in fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 10px; min-width: 0; }",
    ".evs-in legend, .evs-in label > .label { color: var(--fg-3); margin-bottom: 10px; display: block; }",
    ".evs-segs { display: flex; flex-wrap: wrap; gap: 8px; }",
    ".evs-seg { font: inherit; font-size: 14px; color: var(--fg-2); background: transparent; border: 1px solid var(--ink-5, #3a414a); border-radius: var(--r-pill, 999px); padding: 9px 16px; cursor: pointer; }",
    ".evs-seg.is-on { color: var(--fg-1); border-color: var(--brand-blue); background: rgba(46,185,234,0.12); }",
    ".evs-seg:focus-visible, .evs-in input:focus-visible { outline: 2px solid var(--brand-blue); outline-offset: 2px; }",
    ".evs-in label { display: grid; gap: 6px; }",
    ".evs-in input:not([type=checkbox]) { font: inherit; font-size: 20px; color: var(--fg-1); background: var(--ink-2, #0e1216); border: 1px solid var(--ink-5, #3a414a); border-radius: var(--r-sm, 8px); padding: 12px 14px; width: 100%; max-width: 240px; font-variant-numeric: tabular-nums; }",
    ".evs-in small { color: var(--fg-3); font-size: 12px; }",
    ".evs-check { display: flex !important; align-items: flex-start; gap: 12px !important; font-size: 15px; color: var(--fg-2); cursor: pointer; }",
    ".evs-check input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--brand-blue); flex: 0 0 auto; }",
    ".evs-out { display: grid; gap: 16px; min-width: 0; }",
    ".evs-card { border: 1px solid rgba(46,185,234,0.4); background: rgba(46,185,234,0.06); border-radius: var(--r-md); padding: 26px 28px; display: grid; gap: 10px; }",
    ".evs-card > .label { color: var(--brand-blue); }",
    ".evs-big { font-size: clamp(40px, 5vw, 60px); font-weight: 300; line-height: 1; color: var(--fg-1); font-variant-numeric: tabular-nums; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }",
    ".evs-big small { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--fg-3); }",
    ".evs-card p { margin: 0; font-size: 14px; color: var(--fg-2); line-height: 1.6; }",
    ".evs-card dl { margin: 6px 0 0; display: grid; }",
    ".evs-card dl div { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-top: 1px solid var(--ink-4); font-size: 15px; color: var(--fg-2); }",
    ".evs-card dd { margin: 0; color: var(--fg-1); font-variant-numeric: tabular-nums; }",
    ".evs-note { margin-top: 16px; max-width: 110ch; }",
    ".evs-note a { color: var(--brand-blue); text-decoration: none; }",
    ".calc-details { grid-column: 1 / -1; margin-top: 8px; }",
    ".calc-details > summary { cursor: pointer; list-style: none; color: var(--fg-3); display: inline-flex; align-items: center; gap: 8px; padding: 6px 0; }",
    ".calc-details > summary::-webkit-details-marker { display: none; }",
    ".calc-details > summary::before { content: \"+\"; display: inline-block; width: 14px; color: var(--brand-blue); font-size: 14px; }",
    ".calc-details[open] > summary::before { content: \"\\2212\"; }",
    ".calc-details > summary:hover { color: var(--fg-1); }",
    "@media (max-width: 900px) { .evs-grid { grid-template-columns: 1fr; } .evs-in, .evs-card { padding: 22px 18px; } .evs-seg { font-size: 13px; padding: 8px 14px; } }",
    ".vibe-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:40px;align-items:center;margin:8px 0 24px}",
    ".vibe-hero h1{margin:16px 0 20px}",
    ".vibe-hero .body-lg{margin:0 0 20px;color:var(--fg-2,#c9d1d9)}",
    ".vibe-cta{display:flex;flex-wrap:wrap;gap:16px 28px;align-items:center;margin-top:24px}",
    ".vibe-hero-img{margin:0}",
    ".vibe-sec{margin-top:72px}",
    ".vibe-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}",
    ".vibe-prod{border:1px solid var(--ink-4,#2a3038);border-radius:var(--r-md,12px);overflow:hidden;display:flex;flex-direction:column}",
    ".vibe-prod-imgs{display:flex;justify-content:center;gap:8px;background:#e9e7e4;padding:18px 18px 0}",
    ".vibe-prod-imgs img{display:block;height:300px;width:auto;max-width:48%;object-fit:contain}",
    ".vibe-prod-body{padding:26px 24px;display:flex;flex-direction:column;gap:16px}",
    ".vibe-prod-body h3,.vibe-prod-body p{margin:0}",
    ".vibe-feats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 32px}",
    ".vibe-feat{border-top:1px solid var(--ink-4,#2a3038);padding-top:16px}",
    ".vibe-feat .mono{color:var(--brand-blue,#2EB9EA);font-size:12px}",
    ".vibe-feat h3{margin:8px 0 6px}",
    ".vibe-feat p{margin:0;color:var(--fg-2,#c9d1d9)}",
    ".vc-grid{margin-top:8px}",
    ".vc-grid .evs-card dl{margin:14px 0}",
    ".vc-details{grid-column:1/-1}",
    ".vibe-band{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:0;border:1px solid var(--ink-4,#2a3038);border-radius:var(--r-md,12px);overflow:hidden;margin:8px 0 40px;text-decoration:none;color:inherit;transition:border-color .3s}",
    ".vibe-band:hover{border-color:var(--brand-blue,#2EB9EA)}",
    ".vibe-band img{display:block;width:100%;height:100%;object-fit:cover;aspect-ratio:16/9}",
    ".vibe-band-text{display:flex;flex-direction:column;gap:14px;padding:32px 28px;justify-content:center;align-items:flex-start}",
    ".vibe-band-text .body-md{color:var(--fg-2,#c9d1d9)}",
    ".dsub{padding:2px 0 10px 8px}",
    ".dsub-cat{border-bottom:1px solid var(--ink-4,rgba(127,127,127,.18))}",
    ".dsub-row{display:flex;align-items:center;justify-content:space-between;gap:12px}",
    ".dsub-row a{flex:1;padding:11px 0;font-size:16px;color:var(--fg-2,#c9d1d9);text-decoration:none}",
    ".dsub-row a:hover{color:var(--brand-blue,#2EB9EA)}",
    ".dsub-tog{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;color:var(--fg-3,#8a94a0)}",
    ".dsub-tog svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;transition:transform .25s}",
    ".dsub-cat.is-open .dsub-tog svg{transform:rotate(180deg)}",
    ".dsub ul{list-style:none;margin:0 0 10px;padding:0 0 0 14px;border-left:1px solid var(--brand-blue,#2EB9EA)}",
    ".dsub li a{display:block;padding:6px 0;font-size:14px;color:var(--fg-3,#8a94a0);text-decoration:none}",
    ".dsub li a:hover{color:var(--brand-blue,#2EB9EA)}",
    "@media (max-width:900px){.vibe-hero,.vibe-products,.vibe-band{grid-template-columns:1fr}.vibe-feats{grid-template-columns:1fr}.vibe-prod-imgs img{height:220px}}",
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
