// Bolero proposal for one investor: no payments (capital and interest) for six months after the last executed payment
// (19 October 2026), every remaining payment moves six months later (end date 19 March 2031 instead of 19 September 2030),
// and the interest not paid during the pause is compensated by a higher interest on every payment after the pause.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export const BOLERO_LAST_PAID = "2026-10-19";
export const BOLERO_PAUSE_MONTHS = 6;
export type BoleroRow = { due_old: string; due: string; principal: number; gross_interest: number; withholding: number; net_interest: number; old_net_interest: number; receive: number };
export type BoleroPlan = {
  outstanding: number; lost_gross: number; lost_net: number; factor: number;
  resume: string; end_old: string; end_new: string; rows: BoleroRow[];
  old: { principal: number; gross_interest: number; net_interest: number; receive: number };
  neu: { principal: number; gross_interest: number; withholding: number; net_interest: number; receive: number };
};
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const addMonths = (due: string, n: number) => { const x = new Date(String(due).slice(0, 10) + "T12:00:00Z"); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };

export function boleroPlan(schedule: any[]): BoleroPlan | null {
  const rest = (schedule || []).filter((r) => (r.scenario || "original") === "original" && String(r.due).slice(0, 10) > BOLERO_LAST_PAID)
    .sort((x, y) => String(x.due).localeCompare(String(y.due)));
  if (!rest.length) return null;
  const num = (v: any) => Number(v || 0);
  const sumGross = r2(rest.reduce((s, r) => s + num(r.gross_interest), 0));
  // Interest of one month on the capital that is outstanding today, times the six months without payment.
  const lost = r2(BOLERO_PAUSE_MONTHS * num(rest[0].gross_interest));
  const factor = sumGross > 0 ? 1 + lost / sumGross : 1;
  let given = 0;
  const rows: BoleroRow[] = rest.map((r, k) => {
    const g0 = num(r.gross_interest), wh = g0 > 0 ? num(r.withholding) / g0 : 0.3;
    const gross = k === rest.length - 1 ? r2(sumGross + lost - given) : r2(g0 * factor);
    given = r2(given + gross);
    const withholding = r2(gross * wh), net = r2(gross - withholding);
    return { due_old: String(r.due).slice(0, 10), due: addMonths(r.due, BOLERO_PAUSE_MONTHS), principal: num(r.principal), gross_interest: gross, withholding, net_interest: net, old_net_interest: num(r.net_interest), receive: r2(net + num(r.principal)) };
  });
  const tot = (f: (r: BoleroRow) => number) => r2(rows.reduce((s, r) => s + f(r), 0));
  const oldNet = r2(rest.reduce((s, r) => s + num(r.net_interest), 0)), cap = tot((r) => r.principal);
  return {
    outstanding: cap, lost_gross: lost, lost_net: r2(tot((r) => r.net_interest) - oldNet), factor,
    resume: rows[0].due, end_old: rows[rows.length - 1].due_old, end_new: rows[rows.length - 1].due, rows,
    old: { principal: cap, gross_interest: sumGross, net_interest: oldNet, receive: r2(oldNet + cap) },
    neu: { principal: cap, gross_interest: tot((r) => r.gross_interest), withholding: tot((r) => r.withholding), net_interest: tot((r) => r.net_interest), receive: tot((r) => r.receive) },
  };
}

const eur = (n: number) => "EUR " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const nl = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

// Two-page PDF with the personal proposal. Dutch only.
export async function buildBoleroPdf(p: { name: string; invested: number; date: string; deadline?: string | null; plan: BoleroPlan }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const INK = rgb(0.11, 0.14, 0.19), GREY = rgb(0.38, 0.42, 0.48), BAND = rgb(0.84, 0.89, 0.95), LINE = rgb(0.82, 0.85, 0.89);
  const L = 56, R = 539;
  let page = doc.addPage([595.28, 841.89]), y = 790;
  const text = (s: string, o: { size?: number; bold?: boolean; color?: any; x?: number } = {}) => page.drawText(s, { x: o.x ?? L, y, size: o.size ?? 10.5, font: o.bold ? fb : f, color: o.color ?? INK });
  const para = (s: string, size = 10.5, gap = 15) => {
    let line = "";
    for (const w of s.split(" ")) { const t = line ? line + " " + w : w; if (f.widthOfTextAtSize(t, size) > R - L) { text(line, { size }); y -= gap; line = w; } else line = t; }
    if (line) { text(line, { size }); y -= gap; }
    y -= 6;
  };
  const right = (s: string, x: number, bold = false, size = 9.5) => page.drawText(s, { x: x - (bold ? fb : f).widthOfTextAtSize(s, size), y, size, font: bold ? fb : f, color: INK });
  const pl = p.plan;
  text("EVChargeking (Some BV)", { size: 10, color: GREY }); y -= 26;
  text("Voorstel: nieuwe betalingsvoorwaarden", { size: 17, bold: true }); y -= 20;
  text("Obligatielening Bolero Crowdfunding (KBC) van 19 september 2025", { size: 11, color: GREY }); y -= 28;
  text(`Investeerder: ${p.name}`, { bold: true }); y -= 15;
  text(`Ingetekend bedrag: ${eur(p.invested)}    Uitstaand kapitaal: ${eur(pl.outstanding)}    Datum: ${p.date}`); y -= 24;
  para(`Alle betalingen tot en met 19 oktober 2026 zijn uitgevoerd. Wij stellen de volgende nieuwe betalingsvoorwaarden voor:`);
  para(`1. Zes maanden zonder betaling. Van 19 november 2026 tot en met 19 april 2027 worden geen kapitaal en geen interest betaald.`);
  para(`2. Alle resterende betalingen schuiven zes maanden op. De eerste betaling gebeurt op ${nl(pl.resume)}. De einddatum van de lening wordt ${nl(pl.end_new)} in plaats van ${nl(pl.end_old)}.`);
  para(`3. Compensatie van de interest. De interest die u in deze zes maanden niet ontvangt (${eur(pl.lost_gross)} bruto), wordt volledig gecompenseerd door een hogere interest op elke betaling vanaf ${nl(pl.resume)}. De interestvoet stijgt daardoor van 8,04% naar ongeveer 10,05% per jaar. Het kapitaal van elke betaling blijft ongewijzigd.`);
  y -= 4;
  text("Samenvatting voor uw investering (resterende looptijd)", { bold: true }); y -= 18;
  const c3 = [L + 6, 330, 440, R - 6];
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 20, color: BAND });
  text("", { x: c3[0] }); right("Huidige voorwaarden", c3[1], true, 10); right("Voorstel", c3[2], true, 10); right("Verschil", c3[3], true, 10); y -= 20;
  const srow = (label: string, a: number, b: number, bold = false) => { text(label, { size: 10, x: c3[0], bold }); right(eur(a), c3[1], bold, 10); right(eur(b), c3[2], bold, 10); right(eur(r2(b - a)), c3[3], bold, 10); page.drawLine({ start: { x: L, y: y - 5 }, end: { x: R, y: y - 5 }, thickness: 0.5, color: LINE }); y -= 18; };
  srow("Kapitaal", pl.old.principal, pl.neu.principal);
  srow("Bruto-interest", pl.old.gross_interest, pl.neu.gross_interest);
  srow("Netto-interest (na roerende voorheffing)", pl.old.net_interest, pl.neu.net_interest);
  srow("U ontvangt in totaal", pl.old.receive, pl.neu.receive, true);
  y -= 10;
  para("Het besluit is aangenomen wanneer obligatiehouders die samen minstens drie vierde van het uitstaande bedrag van de obligaties vertegenwoordigen, ermee instemmen. Wie niet stemt, telt niet mee als instemming. Elke stem weegt naar het uitstaande bedrag van de obligaties op 20 november 2026. Na een aangenomen besluit volgt een online document (addendum) dat digitaal ondertekend wordt.", 9.5, 13);
  para(`Stemmen kan${p.deadline ? " tot en met " + p.deadline : ""} met de knop in onze e-mail, of door op de e-mail te antwoorden met JA of NEE. Vragen: Erwin Raets, CEO, +32 475 44 36 69, info@evchargeking.com.`, 9.5, 13);
  para("De volledige nieuwe betaalplanning staat op de volgende pagina.", 9.5, 13);
  // page 2: the full new schedule
  page = doc.addPage([595.28, 841.89]); y = 800;
  text("Nieuwe betaalplanning", { size: 14, bold: true }); y -= 14;
  text(`${p.name} · bedragen na roerende voorheffing`, { size: 9.5, color: GREY }); y -= 20;
  const c = [L + 6, 190, 290, 380, 460, R - 6];
  page.drawRectangle({ x: L, y: y - 5, width: R - L, height: 17, color: BAND });
  text("Oorspr. datum", { bold: true, size: 9, x: c[0] }); page.drawText("Nieuwe datum", { x: 132, y, size: 9, font: fb, color: INK }); right("Kapitaal", c[2], true, 9); right("Netto-interest", c[3], true, 9); right("(was)", c[4], true, 9); right("U ontvangt", c[5], true, 9); y -= 16;
  for (const r of pl.rows) {
    text(nl(r.due_old), { size: 9, x: c[0], color: GREY }); page.drawText(nl(r.due), { x: 132, y, size: 9, font: f, color: INK });
    right(eur(r.principal), c[2], false, 9); right(eur(r.net_interest), c[3], false, 9); right(eur(r.old_net_interest), c[4], false, 9); right(eur(r.receive), c[5], true, 9);
    page.drawLine({ start: { x: L, y: y - 4 }, end: { x: R, y: y - 4 }, thickness: 0.4, color: LINE }); y -= 14.2;
  }
  y -= 3;
  text("Totaal", { bold: true, size: 9, x: c[0] }); right(eur(pl.neu.principal), c[2], true, 9); right(eur(pl.neu.net_interest), c[3], true, 9); right(eur(pl.old.net_interest), c[4], true, 9); right(eur(pl.neu.receive), c[5], true, 9);
  return await doc.save();
}
