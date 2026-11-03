"""Belinus product catalogue: current + discontinued products.

Single source for:
  - /legacy.js (website: discontinued product pages + "Discontinued items" links, B2B and B2C, 6 languages)
  - the archive datasheets (b2c/datasheets/archive/*.pdf), rendered by build.py
  - the customer portal product library and "register my system" picker (embedded at portal build time)
Specs of discontinued products are taken from the original Belinus / Solis datasheets (SharePoint, 2022-2025).
"""

L6 = ["en", "nl", "fr", "de", "es", "it"]

def t(en, nl, fr, de, es, it):
    return {"en": en, "nl": nl, "fr": fr, "de": de, "es": es, "it": it}

# spec labels (keys) -> 6 languages
K = {
    "power": t("Power", "Vermogen", "Puissance", "Leistung", "Potencia", "Potenza"),
    "eff": t("Efficiency", "Rendement", "Rendement", "Wirkungsgrad", "Eficiencia", "Efficienza"),
    "tech": t("Cell technology", "Celtechnologie", "Technologie de cellule", "Zelltechnologie", "Tecnología de célula", "Tecnologia delle celle"),
    "cells": t("Cells", "Cellen", "Cellules", "Zellen", "Células", "Celle"),
    "dim": t("Dimensions", "Afmetingen", "Dimensions", "Abmessungen", "Dimensiones", "Dimensioni"),
    "weight": t("Weight", "Gewicht", "Poids", "Gewicht", "Peso", "Peso"),
    "bifi": t("Bifaciality", "Bifacialiteit", "Bifacialité", "Bifazialität", "Bifacialidad", "Bifaccialità"),
    "glass": t("Glass", "Glas", "Verre", "Glas", "Vidrio", "Vetro"),
    "fire": t("Fire class", "Brandklasse", "Classe feu", "Brandklasse", "Clase de fuego", "Classe di reazione al fuoco"),
    "load": t("Snow / wind load", "Sneeuw- / windbelasting", "Charge neige / vent", "Schnee- / Windlast", "Carga de nieve / viento", "Carico neve / vento"),
    "voc": t("Open-circuit voltage", "Openklemspanning", "Tension à vide", "Leerlaufspannung", "Tensión en circuito abierto", "Tensione a vuoto"),
    "isc": t("Short-circuit current", "Kortsluitstroom", "Courant de court-circuit", "Kurzschlussstrom", "Corriente de cortocircuito", "Corrente di cortocircuito"),
    "tcp": t("Temp. coefficient Pmax", "Temperatuurcoëff. Pmax", "Coeff. de température Pmax", "Temperaturkoeff. Pmax", "Coef. de temperatura Pmax", "Coeff. di temperatura Pmax"),
    "ref": t("Model reference", "Modelreferentie", "Référence du modèle", "Modellreferenz", "Referencia del modelo", "Riferimento modello"),
    "sold": t("Sold", "Verkocht", "Vendu", "Verkauft", "Vendido", "Venduto"),
    "rated": t("Rated output", "Nominaal vermogen", "Puissance nominale", "Nennleistung", "Potencia nominal", "Potenza nominale"),
    "phase": t("Grid connection", "Netaansluiting", "Raccordement", "Netzanschluss", "Conexión a red", "Allacciamento"),
    "batt": t("Battery voltage", "Batterijspanning", "Tension batterie", "Batteriespannung", "Tensión de batería", "Tensione batteria"),
    "mppt": t("MPP trackers", "MPP-trackers", "Trackers MPP", "MPP-Tracker", "Seguidores MPP", "Inseguitori MPP"),
    "maxeff": t("Max. efficiency", "Max. rendement", "Rendement max.", "Max. Wirkungsgrad", "Eficiencia máx.", "Efficienza max."),
    "backup": t("Backup switchover", "Omschakeltijd back-up", "Basculement secours", "Umschaltzeit Notstrom", "Conmutación a respaldo", "Commutazione backup"),
    "ip": t("Protection rating", "Beschermingsgraad", "Indice de protection", "Schutzart", "Grado de protección", "Grado di protezione"),
}

V = {  # translated values
    "dual": t("glass-glass, 2.0 + 2.0 mm", "glas-glas, 2,0 + 2,0 mm", "verre-verre, 2,0 + 2,0 mm", "Glas-Glas, 2,0 + 2,0 mm", "vidrio-vidrio, 2,0 + 2,0 mm", "vetro-vetro, 2,0 + 2,0 mm"),
    "1p": t("single-phase", "eenfasig", "monophasé", "einphasig", "monofásico", "monofase"),
    "3p": t("three-phase", "driefasig", "triphasé", "dreiphasig", "trifásico", "trifase"),
    "lv": t("low voltage", "laagspanning", "basse tension", "Niederspannung", "baja tensión", "bassa tensione"),
    "until2025": t("until 2025", "tot 2025", "jusqu’en 2025", "bis 2025", "hasta 2025", "fino al 2025"),
    "hv": t("high voltage", "hoogspanning", "haute tension", "Hochspannung", "alta tensión", "alta tensione"),
}

def dec(x, lang):  # decimal comma for all but en
    return x if lang == "en" else x.replace(".", ",")

def panel(id, name, years, techname, pw, eff, dim, kg, cells, bifi, fire, load, voc, isc, tcp, ref, warranty, desc):
    return {"id": id, "cat": "solar", "kind": "solar", "name": name, "years": years, "status": "discontinued",
            "desc": desc, "warranty": warranty, "sheet": f"b2c/datasheets/archive/belinus-{id}-en.pdf",
            "specs": [["sold", years], ["tech", techname], ["power", pw], ["eff", eff], ["dim", dim], ["weight", kg],
                      ["cells", cells], ["bifi", bifi], ["glass", "@dual"], ["fire", fire], ["load", load],
                      ["voc", voc], ["isc", isc], ["tcp", tcp], ["ref", ref]]}

W35 = {"years": [35, 35, 35]}

PANELS = [
    panel("hyperion-410", "Hyperion 410", "2022 – 2023", "mono-PERC", "400 – 410 Wp", "20.5 – 21.0 %", "1722 × 1134 × 30 mm", "23 kg",
          "108 half-cut, 182 mm", "70 %", "A (UL 790)", "5400 / 2400 Pa", "37.1 – 37.5 V", "13.8 – 13.9 A", "−0.31 %/°C", "BE-M7-UB-GG-xxx", W35,
          t("Full-black glass-glass panel with mono-PERC cells, the first Belinus 54-cell format.",
            "Volledig zwart glas-glaspaneel met mono-PERC-cellen, het eerste Belinus 54-cellenformaat.",
            "Panneau verre-verre entièrement noir à cellules mono-PERC, le premier format 54 cellules de Belinus.",
            "Komplett schwarzes Glas-Glas-Modul mit Mono-PERC-Zellen, das erste 54-Zellen-Format von Belinus.",
            "Panel vidrio-vidrio totalmente negro con células mono-PERC, el primer formato de 54 células de Belinus.",
            "Pannello vetro-vetro total black con celle mono-PERC, il primo formato a 54 celle di Belinus.")),
    panel("helios-440", "Helios 440", "2023 – 2024", "TOPCon", "425 – 440 Wp", "21.8 – 22.5 %", "1722 × 1134 × 30 mm", "23 kg",
          "108 half-cut, 182 mm", "80 %", "A (UL 790)", "5400 / 2400 Pa", "38.3 – 38.9 V", "14.1 – 14.4 A", "−0.29 %/°C", "BE-Helios-UB-GG-xxx", W35,
          t("Bifacial TOPCon glass-glass panel, full black. Not to be confused with the current Helios range.",
            "Bifaciaal TOPCon glas-glaspaneel, volledig zwart. Niet te verwarren met het huidige Helios-gamma.",
            "Panneau verre-verre TOPCon bifacial, entièrement noir. À ne pas confondre avec la gamme Helios actuelle.",
            "Bifaziales TOPCon-Glas-Glas-Modul, komplett schwarz. Nicht zu verwechseln mit der aktuellen Helios-Serie.",
            "Panel vidrio-vidrio TOPCon bifacial, totalmente negro. No confundir con la gama Helios actual.",
            "Pannello vetro-vetro TOPCon bifacciale, total black. Da non confondere con l’attuale gamma Helios.")),
    panel("nova-54-hjt", "Nova 54 HJT", "2023 – 2024", "heterojunction (HJT)", "430 – 450 Wp", "22.0 – 23.0 %", "1722 × 1134 × 30 mm", "25 kg",
          "108 half-cut, 182 mm", "90 %", "C (UL 790)", "5400 / 2400 Pa", "41.4 – 42.4 V", "13.0 – 13.2 A", "−0.24 %/°C", "BE-Nova-HJT-UB-GG-xxx", W35,
          t("Heterojunction panel with a high bifacial factor and a low temperature coefficient.",
            "Heterojunctionpaneel met een hoge bifaciale factor en een lage temperatuurcoëfficiënt.",
            "Panneau à hétérojonction avec un facteur bifacial élevé et un faible coefficient de température.",
            "Heterojunction-Modul mit hohem Bifazialfaktor und niedrigem Temperaturkoeffizienten.",
            "Panel de heterounión con un alto factor bifacial y un bajo coeficiente de temperatura.",
            "Pannello a eterogiunzione con elevato fattore bifacciale e basso coefficiente di temperatura.")),
    panel("nova-60-hjt", "Nova 60 HJT", "2023", "heterojunction (HJT)", "390 – 400 Wp", "21.4 – 22.0 %", "1755 × 1038 × 30 mm", "23.5 kg",
          "120 half-cut, 166 mm", "90 %", "A (UL 790)", "5400 / 2400 Pa", "44.8 – 45.2 V", "10.9 – 11.0 A", "−0.24 %/°C", "M8-HJT-UB-GG-xxx", W35,
          t("60-cell heterojunction panel in the compact 1755 × 1038 mm format.",
            "60-cellen heterojunctionpaneel in het compacte formaat 1755 × 1038 mm.",
            "Panneau à hétérojonction de 60 cellules au format compact 1755 × 1038 mm.",
            "60-Zellen-Heterojunction-Modul im kompakten Format 1755 × 1038 mm.",
            "Panel de heterounión de 60 células en el formato compacto de 1755 × 1038 mm.",
            "Pannello a eterogiunzione da 60 celle nel formato compatto 1755 × 1038 mm.")),
    panel("nox-60-ibc", "NOX 60 IBC", "2023", "back contact (IBC)", "390 – 400 Wp", "21.7 – 22.3 %", "1727 × 1039 × 30 mm", "23.5 kg",
          "120 half-cut, 166 mm", "80 %", "A (UL 790)", "5400 / 2400 Pa", "41.9 – 42.1 V", "11.8 – 12.0 A", "−0.28 %/°C", "M8-IBC-GG-xxx", W35,
          t("Interdigitated back-contact panel: no silver lines on the front, full black.",
            "Back-contactpaneel (IBC): geen zilveren lijnen aan de voorkant, volledig zwart.",
            "Panneau back-contact (IBC) : aucune ligne argentée en face avant, entièrement noir.",
            "Back-Contact-Modul (IBC): keine Silberlinien auf der Vorderseite, komplett schwarz.",
            "Panel back-contact (IBC): sin líneas plateadas en la cara frontal, totalmente negro.",
            "Pannello back-contact (IBC): nessuna linea argentata sul fronte, total black.")),
    panel("nox-66-ibc", "NOX 66 IBC", "2023", "back contact (IBC)", "430 – 440 Wp", "21.8 – 22.3 %", "1895 × 1039 × 30 mm", "26 kg",
          "132 half-cut, 166 mm", "80 %", "A (UL 790)", "5400 / 2400 Pa", "46.1 – 46.3 V", "11.9 – 12.1 A", "−0.29 %/°C", "M8-IBC-GG-xxx (66)", W35,
          t("The larger 132-cell back-contact panel, full black.",
            "Het grotere back-contactpaneel met 132 cellen, volledig zwart.",
            "Le grand panneau back-contact de 132 cellules, entièrement noir.",
            "Das größere Back-Contact-Modul mit 132 Zellen, komplett schwarz.",
            "El panel back-contact más grande, de 132 células, totalmente negro.",
            "Il pannello back-contact più grande, da 132 celle, total black.")),
    panel("nova-topcon-450", "Nova TOPCon 450", "2025", "TOPCon 4.0", "450 – 455 Wp", "22.5 – 22.8 %", "1762 × 1134 × 30 mm", "24.5 kg",
          "96 (6 × 16)", "bifacial", "A", "6000 / 4000 Pa", "36.6 – 36.8 V", "15.6 – 15.7 A", "−0.29 %/°C", "NOVA-Topcon-GG-450", None,
          t("Bifacial TOPCon 4.0 glass-glass panel, full black, sold in 2025.",
            "Bifaciaal TOPCon 4.0 glas-glaspaneel, volledig zwart, verkocht in 2025.",
            "Panneau verre-verre TOPCon 4.0 bifacial, entièrement noir, vendu en 2025.",
            "Bifaziales TOPCon-4.0-Glas-Glas-Modul, komplett schwarz, verkauft 2025.",
            "Panel vidrio-vidrio TOPCon 4.0 bifacial, totalmente negro, vendido en 2025.",
            "Pannello vetro-vetro TOPCon 4.0 bifacciale, total black, venduto nel 2025.")),
]

def inverter(id, name, years, rated, phase, batt, mppt, maxeff, backup, ip, dim, kg, ref, desc):
    return {"id": id, "cat": "inverter", "kind": "inverter", "name": name, "years": years, "status": "discontinued",
            "desc": desc, "warranty": {"maker": "Solis"}, "sheet": f"b2c/datasheets/archive/belinus-{id}-en.pdf",
            "specs": [["sold", years], ["rated", rated], ["phase", phase], ["batt", batt], ["mppt", mppt], ["maxeff", maxeff],
                      ["backup", backup], ["ip", ip], ["dim", dim], ["weight", kg], ["ref", ref]]}

INVERTERS = [
    inverter("solis-s5-eh1p", "Solis hybrid 1-phase (S5-EH1P)", "@until2025", "3 – 6 kW", "@1p", "42 – 58 V (@lv)", "2", "97.1 %", "< 20 ms", "IP65",
             "333 × 505 × 249 mm", "17 kg", "S5-EH1P(3-6)K-L",
             t("Single-phase low-voltage hybrid inverter used in Belinus home installations, with backup output.",
               "Eenfasige hybride laagspanningsomvormer uit Belinus-thuisinstallaties, met back-upuitgang.",
               "Onduleur hybride monophasé basse tension des installations résidentielles Belinus, avec sortie de secours.",
               "Einphasiger Niederspannungs-Hybridwechselrichter aus Belinus-Heiminstallationen, mit Notstromausgang.",
               "Inversor híbrido monofásico de baja tensión de las instalaciones domésticas de Belinus, con salida de respaldo.",
               "Inverter ibrido monofase a bassa tensione delle installazioni domestiche Belinus, con uscita di backup.")),
    inverter("solis-rhi-3p", "Solis hybrid 3-phase HV (RHI-3P)", "@until2025", "5 – 10 kW", "@3p", "160 – 600 V (@hv)", "2", "98.4 %", "< 40 ms", "IP65",
             "535 × 455 × 181 mm", "25.1 kg", "RHI-3P(5-10)K-HVES-5G",
             t("Three-phase high-voltage hybrid inverter for Belinus installations with a high-voltage battery.",
               "Driefasige hybride hoogspanningsomvormer voor Belinus-installaties met een hoogspanningsbatterij.",
               "Onduleur hybride triphasé haute tension pour les installations Belinus avec batterie haute tension.",
               "Dreiphasiger Hochspannungs-Hybridwechselrichter für Belinus-Installationen mit Hochvoltbatterie.",
               "Inversor híbrido trifásico de alta tensión para instalaciones Belinus con batería de alta tensión.",
               "Inverter ibrido trifase ad alta tensione per installazioni Belinus con batteria ad alta tensione.")),
    inverter("solis-s6-eh3p", "Solis hybrid 3-phase LV (S6-EH3P)", "@until2025", "8 – 15 kW", "@3p", "40 – 60 V (@lv)", "2", "97.6 %", "< 10 ms", "IP66",
             "430 × 660 × 305 mm", "42 kg", "S6-EH3P(8-15)K02-NV-YD-L",
             t("Three-phase low-voltage hybrid inverter with generator input and dual backup ports.",
               "Driefasige hybride laagspanningsomvormer met generatoringang en twee back-uppoorten.",
               "Onduleur hybride triphasé basse tension avec entrée groupe électrogène et deux ports de secours.",
               "Dreiphasiger Niederspannungs-Hybridwechselrichter mit Generatoreingang und zwei Notstromausgängen.",
               "Inversor híbrido trifásico de baja tensión con entrada de generador y dos puertos de respaldo.",
               "Inverter ibrido trifase a bassa tensione con ingresso generatore e due porte di backup.")),
]

DISCONTINUED = PANELS + INVERTERS

# current products, for the portal library + register picker (documents: existing website datasheets)
DS = "b2c/datasheets/en/"
CURRENT = [
    {"id": "gaia", "kind": "solar", "name": "Gaia", "sheet": DS + "belinus-gaia-en.pdf"},
    {"id": "gaia-smart", "kind": "solar", "name": "Gaia Smart", "sheet": DS + "belinus-gaia-smart-en.pdf"},
    {"id": "theia", "kind": "solar", "name": "Theia"},
    {"id": "helios", "kind": "solar", "name": "Helios"},
    {"id": "helios-light", "kind": "solar", "name": "Helios Light"},
    {"id": "helios-xl", "kind": "solar", "name": "Helios XL"},
    {"id": "hyperion", "kind": "solar", "name": "Hyperion"},
    {"id": "hyperion-72", "kind": "solar", "name": "Hyperion 72"},
    {"id": "powerbox-s1-5", "kind": "inverter", "name": "Powerbox S1-5", "sheet": DS + "belinus-powerbox-s1-5-en.pdf"},
    {"id": "powerbox-s3-10", "kind": "inverter", "name": "Powerbox S3-10", "sheet": DS + "belinus-powerbox-s3-10-en.pdf"},
    {"id": "energywall-h1", "kind": "battery", "name": "Energywall H1", "sheet": DS + "belinus-energywall-h1-en.pdf"},
    {"id": "etappro", "kind": "ev_charger", "name": "ETAPPro", "sheet": DS + "belinus-etappro-en.pdf"},
    {"id": "themis", "kind": "ems", "name": "Themis", "sheet": DS + "belinus-themis-en.pdf"},
]
# registrable but without public documents (earlier batteries)
OTHER = [
    {"id": "energywall-lv", "kind": "battery", "name": "Energywall LV"},
    {"id": "energywall-hv", "kind": "battery", "name": "Energywall HV"},
    {"id": "energywall-g1", "kind": "battery", "name": "Energywall G1"},
]
