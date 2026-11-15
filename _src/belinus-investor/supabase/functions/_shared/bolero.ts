// Bolero deferral proposal for one investor: the payments of 19 October, 19 November and 19 December 2026 are spread
// progressively over the 12 monthly payments of 2027 (month k carries k/78 of the deferred amount), on top of the
// payments already planned. Amounts are what the investor receives: net interest plus capital.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

export type BoleroRow = { due: string; planned: number; extra: number; total: number };
export type BoleroProposal = { deferred_net_interest: number; deferred_principal: number; deferred_total: number; rows: BoleroRow[]; planned_total: number; total: number };
const r2 = (n: number) => Math.round(n * 100) / 100;
const DEFERRED = ["2026-10-19", "2026-11-19", "2026-12-19"];

export function boleroProposal(schedule: any[]): BoleroProposal {
  const orig = (schedule || []).filter((r) => (r.scenario || "original") === "original");
  const def = orig.filter((r) => DEFERRED.includes(String(r.due).slice(0, 10)));
  const dInt = r2(def.reduce((s, r) => s + Number(r.net_interest || 0), 0)), dCap = r2(def.reduce((s, r) => s + Number(r.principal || 0), 0));
  const dTot = r2(dInt + dCap);
  const y27 = orig.filter((r) => String(r.due).slice(0, 4) === "2027").sort((x, y) => String(x.due).localeCompare(String(y.due)));
  const W = y27.length * (y27.length + 1) / 2;
  let given = 0;
  const rows = y27.map((r, k) => {
    const planned = r2(Number(r.net_interest || 0) + Number(r.principal || 0));
    const extra = k === y27.length - 1 ? r2(dTot - given) : r2(dTot * (k + 1) / W);
    given = r2(given + extra);
    return { due: String(r.due).slice(0, 10), planned, extra, total: r2(planned + extra) };
  });
  const plannedTotal = r2(rows.reduce((s, r) => s + r.planned, 0));
  return { deferred_net_interest: dInt, deferred_principal: dCap, deferred_total: dTot, rows, planned_total: plannedTotal, total: r2(plannedTotal + dTot) };
}

const eur = (n: number) => "EUR " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const nl = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

// One-page PDF with the personal proposal. Dutch only.
export async function buildBoleroPdf(p: { name: string; invested: number; date: string; deadline?: string | null; proposal: BoleroProposal }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const INK = rgb(0.11, 0.14, 0.19), GREY = rgb(0.38, 0.42, 0.48), BAND = rgb(0.84, 0.89, 0.95), LINE = rgb(0.82, 0.85, 0.89);
  const L = 56, R = 539;
  let y = 790;
  const text = (s: string, o: { size?: number; bold?: boolean; color?: any; x?: number } = {}) => page.drawText(s, { x: o.x ?? L, y, size: o.size ?? 10.5, font: o.bold ? fb : f, color: o.color ?? INK });
  const para = (s: string, size = 10.5, gap = 15) => {
    let line = "";
    for (const w of s.split(" ")) { const t = line ? line + " " + w : w; if (f.widthOfTextAtSize(t, size) > R - L) { text(line, { size }); y -= gap; line = w; } else line = t; }
    if (line) { text(line, { size }); y -= gap; }
    y -= 6;
  };
  const right = (s: string, x: number, bold = false, size = 10) => page.drawText(s, { x: x - (bold ? fb : f).widthOfTextAtSize(s, size), y, size, font: bold ? fb : f, color: INK });
  text("EVChargeking (Some BV)", { size: 10, color: GREY }); y -= 26;
  text("Voorstel: uitstel van betaling met drie maanden", { size: 17, bold: true }); y -= 20;
  text("Obligatielening Bolero Crowdfunding (KBC) van 19 september 2025", { size: 11, color: GREY }); y -= 28;
  text(`Investeerder: ${p.name}`, { bold: true }); y -= 15;
  text(`Geïnvesteerd bedrag: ${eur(p.invested)}    Datum: ${p.date}`); y -= 24;
  para("De betalingen van 19 oktober, 19 november en 19 december 2026 worden niet op de voorziene datum uitgevoerd. Wij stellen voor om deze bedragen progressief te spreiden over de twaalf maandelijkse betalingen van 2027, bovenop de betalingen die dan al voorzien zijn. Het bijkomende deel begint klein en stijgt elke maand.");
  text("Uitgestelde bedragen (wat u ontvangt, na roerende voorheffing)", { bold: true }); y -= 16;
  text(`Netto-interest: ${eur(p.proposal.deferred_net_interest)}    Kapitaal: ${eur(p.proposal.deferred_principal)}    Totaal: ${eur(p.proposal.deferred_total)}`); y -= 26;
  const cols = [L + 6, 300, 420, R - 6];
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 20, color: BAND });
  text("Datum", { bold: true, size: 10, x: cols[0] }); right("Voorziene betaling", cols[1], true); right("Bijkomend deel", cols[2], true); right("Nieuwe betaling", cols[3], true); y -= 20;
  for (const r of p.proposal.rows) {
    text(nl(r.due), { size: 10, x: cols[0] }); right(eur(r.planned), cols[1]); right(eur(r.extra), cols[2]); right(eur(r.total), cols[3], true);
    page.drawLine({ start: { x: L, y: y - 5 }, end: { x: R, y: y - 5 }, thickness: 0.5, color: LINE }); y -= 17;
  }
  y -= 2;
  text("Totaal 2027", { bold: true, size: 10, x: cols[0] }); right(eur(p.proposal.planned_total), cols[1], true); right(eur(p.proposal.deferred_total), cols[2], true); right(eur(p.proposal.total), cols[3], true); y -= 28;
  para("De bedragen zijn netto-interest plus kapitaal. Alle andere voorwaarden van de lening blijven ongewijzigd, ook de einddatum van 19 september 2030.", 9.5, 13);
  para("Uw keuze wordt pas bevestigd wanneer minstens 75% van de uitgebrachte stemmen (gewogen naar geïnvesteerd bedrag) het uitstel steunt, en onder voorbehoud van de definitieve uitvoering door de ondertekening van een addendum bij het contract.", 9.5, 13);
  para(`Stemmen kan${p.deadline ? " tot en met " + p.deadline : ""} met de knop in onze e-mail, of door op de e-mail te antwoorden met JA of NEE. Vragen: Erwin Raets, CEO, +32 475 44 36 69, info@evchargeking.com.`, 9.5, 13);
  return await doc.save();
}
