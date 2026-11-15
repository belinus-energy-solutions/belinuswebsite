/* belinus · Vibe EV charging line (B2B) — product line data, render gallery, Belgian B2B lease block.
   Loaded before the app script on the six B2B pages (EN/NL/FR/DE/IT/ES). */
(function () {
  var LANG = String(window.__B2B_LANG || "en").toLowerCase();
  var c = function () { return React.createElement.apply(React, arguments); };
  var pick = function (o) { return (o && (o[LANG] || o.en)) || ""; };
  var V = function (s) { return String(s).replace(/(\d)\.(?=\d)/g, "$1.\u2060"); }; /* keep version dots (OCPP 2.0.1) */

  /* ---------- Lease prices (Belgium, companies) ----------
     EUR per month, excl. VAT. Fill in the numbers; null = table row hidden. */
  var LEASE_PRICES = {
    "wall":   { 36: null, 48: null, 60: null },
    "single": { 36: null, 48: null, 60: null },
    "double": { 36: null, 48: null, 60: null }
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
      ["BE", pick({ en: "Monthly lease for companies in Belgium", nl: "Maandelijkse lease voor bedrijven in België", fr: "Location mensuelle pour les entreprises en Belgique", de: "Monatliches Leasing für Unternehmen in Belgien", it: "Leasing mensile per le aziende in Belgio", es: "Leasing mensual para empresas en Bélgica" })]
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
      P({ en: "Lease for companies in Belgium", nl: "Lease voor bedrijven in België", fr: "Location pour entreprises en Belgique", de: "Leasing für Unternehmen in Belgien", it: "Leasing per aziende in Belgio", es: "Leasing para empresas en Bélgica" }, "LEASE-BE"),
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

  /* ---------- lease block (companies in Belgium) ---------- */
  var LT = {
    en: { tag: "Lease · companies in Belgium", h: "Vibe for a fixed monthly fee.", b: "Companies in Belgium can lease Vibe Wall and Vibe Pole for a fixed monthly fee over 36, 48 or 60 months, without investing in the hardware up front.",
      inc: "Included in the monthly fee", items: ["Maintenance and 24-hour replacement service for the full term", "Back office: OCPP platform, charge sessions and reporting", "Reimbursement of home charging: the kWh charged at the employee’s home is settled with the employer", "Option to buy the charger at the end of the term"],
      model: "Model", m: "months", per: "/ month", wall: "Vibe Wall · 22 kW", single: "Vibe Pole single · 22 kW", dbl: "Vibe Pole double · 2 × 22 kW",
      note: "Prices excl. VAT. Offer for companies with a Belgian enterprise number.", cta: "Request a lease offer", noPrice: "Ask us for the monthly fee for your number of charge points." },
    nl: { tag: "Lease · bedrijven in België", h: "Vibe voor een vast maandbedrag.", b: "Bedrijven in België leasen Vibe Wall en Vibe Pole voor een vast maandbedrag over 36, 48 of 60 maanden, zonder vooraf in de hardware te investeren.",
      inc: "Inbegrepen in het maandbedrag", items: ["Onderhoud en vervangservice binnen 24 uur gedurende de hele looptijd", "Backoffice: OCPP-platform, laadsessies en rapportering", "Terugbetaling van thuisladen: de kWh die bij de werknemer thuis geladen wordt, wordt met de werkgever verrekend", "Aankoopoptie op de laadpaal aan het einde van de looptijd"],
      model: "Model", m: "maanden", per: "/ maand", wall: "Vibe Wall · 22 kW", single: "Vibe Pole enkel · 22 kW", dbl: "Vibe Pole dubbel · 2 × 22 kW",
      note: "Prijzen excl. btw. Aanbod voor bedrijven met een Belgisch ondernemingsnummer.", cta: "Vraag een leaseofferte aan", noPrice: "Vraag ons het maandbedrag voor uw aantal laadpunten." },
    fr: { tag: "Location · entreprises en Belgique", h: "Vibe pour une mensualité fixe.", b: "Les entreprises en Belgique peuvent louer Vibe Wall et Vibe Pole pour une mensualité fixe sur 36, 48 ou 60 mois, sans investir d’avance dans le matériel.",
      inc: "Compris dans la mensualité", items: ["Entretien et remplacement en 24 heures pendant toute la durée", "Back-office : plateforme OCPP, sessions de recharge et rapports", "Remboursement de la recharge à domicile : les kWh rechargés chez le collaborateur sont décomptés avec l’employeur", "Option d’achat de la borne en fin de contrat"],
      model: "Modèle", m: "mois", per: "/ mois", wall: "Vibe Wall · 22 kW", single: "Vibe Pole simple · 22 kW", dbl: "Vibe Pole double · 2 × 22 kW",
      note: "Prix hors TVA. Offre réservée aux entreprises disposant d’un numéro d’entreprise belge.", cta: "Demander une offre de location", noPrice: "Demandez-nous la mensualité pour votre nombre de points de charge." },
    de: { tag: "Leasing · Unternehmen in Belgien", h: "Vibe zu einer festen Monatsrate.", b: "Unternehmen in Belgien leasen Vibe Wall und Vibe Pole zu einer festen Monatsrate über 36, 48 oder 60 Monate, ohne vorab in die Hardware zu investieren.",
      inc: "In der Monatsrate enthalten", items: ["Wartung und Austauschservice innerhalb von 24 Stunden während der gesamten Laufzeit", "Backoffice: OCPP-Plattform, Ladevorgänge und Berichte", "Erstattung des Heimladens: die beim Mitarbeiter zu Hause geladenen kWh werden mit dem Arbeitgeber abgerechnet", "Kaufoption für die Ladestation am Ende der Laufzeit"],
      model: "Modell", m: "Monate", per: "/ Monat", wall: "Vibe Wall · 22 kW", single: "Vibe Pole einfach · 22 kW", dbl: "Vibe Pole doppelt · 2 × 22 kW",
      note: "Preise zzgl. MwSt. Angebot für Unternehmen mit belgischer Unternehmensnummer.", cta: "Leasingangebot anfragen", noPrice: "Fragen Sie uns nach der Monatsrate für Ihre Anzahl an Ladepunkten." },
    it: { tag: "Leasing · aziende in Belgio", h: "Vibe a un canone mensile fisso.", b: "Le aziende in Belgio possono noleggiare Vibe Wall e Vibe Pole a un canone mensile fisso per 36, 48 o 60 mesi, senza investire in anticipo nell’hardware.",
      inc: "Incluso nel canone mensile", items: ["Manutenzione e sostituzione entro 24 ore per tutta la durata", "Back office: piattaforma OCPP, sessioni di ricarica e report", "Rimborso della ricarica domestica: i kWh caricati a casa del dipendente vengono conteggiati con il datore di lavoro", "Opzione di acquisto della stazione alla fine del contratto"],
      model: "Modello", m: "mesi", per: "/ mese", wall: "Vibe Wall · 22 kW", single: "Vibe Pole singola · 22 kW", dbl: "Vibe Pole doppia · 2 × 22 kW",
      note: "Prezzi IVA esclusa. Offerta per aziende con numero d’impresa belga.", cta: "Richieda un’offerta di leasing", noPrice: "Ci chieda il canone mensile per il suo numero di punti di ricarica." },
    es: { tag: "Leasing · empresas en Bélgica", h: "Vibe por una cuota mensual fija.", b: "Las empresas en Bélgica pueden contratar Vibe Wall y Vibe Pole en leasing por una cuota mensual fija durante 36, 48 o 60 meses, sin invertir por adelantado en el equipo.",
      inc: "Incluido en la cuota mensual", items: ["Mantenimiento y sustitución en 24 horas durante todo el contrato", "Back office: plataforma OCPP, sesiones de carga e informes", "Reembolso de la carga en casa: los kWh cargados en casa del empleado se liquidan con la empresa", "Opción de compra del cargador al final del contrato"],
      model: "Modelo", m: "meses", per: "/ mes", wall: "Vibe Wall · 22 kW", single: "Vibe Pole simple · 22 kW", dbl: "Vibe Pole doble · 2 × 22 kW",
      note: "Precios sin IVA. Oferta para empresas con número de empresa belga.", cta: "Solicite una oferta de leasing", noPrice: "Consulte la cuota mensual para su número de puntos de carga." }
  };
  var TERMS = [36, 48, 60];
  function eur(n) {
    try { return new Intl.NumberFormat({ en: "en-BE", nl: "nl-BE", fr: "fr-BE", de: "de-BE", it: "it-IT", es: "es-ES" }[LANG] || "en-BE",
      { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); } catch (e) { return "€ " + n; }
  }
  function EVLease() {
    var t = LT[LANG] || LT.en;
    var rows = [["wall", t.wall], ["single", t.single], ["double", t.dbl]].filter(function (r) {
      var p = LEASE_PRICES[r[0]]; return p && TERMS.some(function (m) { return p[m] != null; });
    });
    return c("div", { className: "ev-lease", id: "lease" },
      c("div", { className: "ev-lease-head" },
        c("span", { className: "eyebrow eyebrow-dot" }, t.tag),
        c("h3", { className: "display-sm" }, t.h),
        c("p", { className: "body-md" }, t.b)),
      c("div", { className: "ev-lease-body" },
        c("div", { className: "ev-lease-inc" },
          c("h4", { className: "label" }, t.inc),
          c("ul", null, t.items.map(function (x) { return c("li", { key: x, className: "body-md" }, x); }))),
        c("div", { className: "ev-lease-prices" },
          rows.length ? c("table", { className: "ev-lease-table" },
            c("thead", null, c("tr", null, c("th", { className: "label" }, t.model),
              TERMS.map(function (m) { return c("th", { key: m, className: "label" }, m + " " + t.m); }))),
            c("tbody", null, rows.map(function (r) {
              return c("tr", { key: r[0] }, c("td", null, r[1]), TERMS.map(function (m) {
                var v = LEASE_PRICES[r[0]][m];
                return c("td", { key: m, className: "num" }, v == null ? "—" : c(React.Fragment, null, eur(v), c("small", null, " " + t.per)));
              }));
            }))) : c("p", { className: "body-md ev-lease-noprice" }, t.noPrice),
          c("p", { className: "fineprint" }, t.note),
          c("a", { href: "#request-ev-charging", className: "btn btn-arrow" }, t.cta))));
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
    "@media (max-width:900px){.ev-gallery{grid-template-columns:1fr}.ev-lease-body{grid-template-columns:1fr}.ev-lease{padding:26px 20px}.ev-lease-table th,.ev-lease-table td{padding:8px 4px;font-size:14px}}"
  ].join("\n");
  document.head.appendChild(css);
})();
