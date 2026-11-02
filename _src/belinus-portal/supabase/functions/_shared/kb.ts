// Product and service knowledge for the portal assistant, taken from the published belinus.com pages
// (home site BE/NL, November 2026). Update this file when the website changes. Values are typical values from the
// (preliminary) data sheets; the quote and data sheet are binding.
export const KNOWLEDGE = `
COMPANY
- Belinus Energy BV, Antwerp, Belgium. Sells solar panels, hybrid inverters, home batteries, EV chargers and energy management for homes (Belgium, Netherlands) and storage for business and grid. One point of contact for warranty claims: Belinus.
- Support: the Support section of this portal (requests are answered on working days, Mon–Fri 9:00–18:00, Belgian holidays excluded); e-mail support@belinus.com.
- Testing partners: imec (solar panels), VITO (energy storage), KU Leuven (cells).

SOLAR PANELS — Gaia (back-contact, glass-glass)
- Power 490–505 Wp, efficiency up to 24.7 %, 108 back-contact (BC) N-type cells, 1800 × 1134 × 30 mm, 23.5 kg, temperature coefficient Pmax −0.24 %/°C, glass 2.0 + 1.6 mm, IEC 61215 · IEC 61730, fire class A report.
- Warranty: 35 years product, 35 years performance, 35 years service. After 30 years 88.85 % of nominal power is guaranteed by the cell manufacturer.
- Safety vs standard TOPCon: all contacts at the back and current limited per cell, so hot spots under shade stay much cooler (hot spots are a known cause of damage and roof fires); glass on both sides.
- Shade: a Gaia panel loses roughly in proportion to the shaded area, instead of a whole third of the panel when a bypass diode switches off a cell string.
- Gaia Smart: same panel with an integrated optimiser and per-panel monitoring; launch planned for 2027.

HYBRID INVERTER — Powerbox S1-5 and S3-10
- S1-5: 5 kW single-phase. S3-10: 10 kW three-phase. Max efficiency 98.2 %. 2 battery ports. Silicon-carbide (SiC) power electronics: lower losses, less heat, quieter, longer life.
- Warranty 10 / 10 / 10 years.
- Belgian grid rules: a 10 kW inverter needs a three-phase connection; on single-phase the installation is limited (the savings calculator caps single-phase at about 6.5 kWp of panels).

HOME BATTERY — Energywall H1 (sodium-ion)
- 10.5 kWh usable per cabinet, nominal 46.8 V, round-trip efficiency > 95 %, 100 % depth of discharge, up to 5 cabinets, IP65, 500 × 150 × 1800 mm, about 160 kg per cabinet made of modules under 25 kg.
- Modules under 25 kg (industry modules are often 40–50 kg), so one technician can install it without lifting gear; easy to extend later.
- Sodium-ion: no lithium, cobalt or nickel; the cathode releases no oxygen when overheated, so far lower thermal-runaway risk than lithium; can be transported and stored safely at 0 % charge; works well in the cold; 15,000 cycles; module warranty 20 years · 15,000 cycles.
- Versus LFP: costs about €1,000–1,600 more at purchase for 10 kWh; with 100 % usable capacity, high efficiency and daily (even twice-daily) use on dynamic prices it earns about €100–200 per year more; the extra cost is recovered around year 8–10, before a typical LFP battery needs replacing (year 10–12). Belinus estimate.
- Lithium batteries can go into thermal runaway after overcharging, internal short circuit, damage or overheating; LFP is safer than NMC but not risk-free.

EV CHARGER — ETAPPro
- Up to 22 kW, 32 A, Type 2, IP67. Works with Themis via Modbus or API: charging on solar surplus, dynamic tariffs, load balancing across charge points, charging cards from different providers. Warranty 10 / 10 / 10 years.
- Belgium: an employer can reimburse home charging of a company car at the CREG rate (Q4 2026: Flanders 32.25, Brussels 36.88, Wallonia 37.79 c€/kWh).

ENERGY MANAGEMENT — Themis (edge AI)
- Runs in the home, not in the cloud: forecasts solar yield, consumption and dynamic prices and decides every quarter hour when the battery charges or discharges and when the car charges. Keeps working without internet; data stays in the home. Roll-out planned for 2027.

ELECTRICITY PRICES (reference, they change)
- Belgium: CREG dashboard (typical household 3,500 kWh/year, about €118 per month in September 2026). Netherlands: CBS figures (energy tax and rebate apply).

RECALLS
- When Belinus recalls a product, affected customers find the notice in the Recall section of the portal: read it, confirm it and choose replacement, take-back or another solution; Belinus then plans the appointment. Follow the safety instructions in the notice until the system is replaced.
`;
