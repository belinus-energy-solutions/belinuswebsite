// Information PDF for one investor: the three options (A, B, C) and a comparison of the current payment schedule
// with option A and option B. Dutch only. Uses pdf-lib (pure JavaScript, works in Supabase Edge Functions).
import { PDFDocument, StandardFonts, rgb, PDFFont } from "npm:pdf-lib@1.17.1";

export type PlanRow = { due: string; gross_interest: number; withholding: number; net_interest: number; principal: number; st?: string };
export type InfoPdfInput = {
  name: string;
  loan: string; // e.g. "Winwinlening" or "Crowdlening"
  invested: number;
  grossRate: number; // yearly rate as a fraction, e.g. 0.06
  withholdingRate: number; // e.g. 0.3
  date: string; // dd/mm/yyyy, date of sending
  appUrl: string;
  original: PlanRow[];
  optionA: PlanRow[];
  optionB: PlanRow[];
};

const money = (n: number) => new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const pct = (x: number) => new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 }).format(x * 100) + " %";
const dmy = (d: string) => { const [y, m, dd] = String(d).slice(0, 10).split("-"); return `${dd}/${m}/${y}`; };
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function buildInfoPdf(p: InfoPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 50;
  const INK = rgb(0.1, 0.12, 0.15), MUTED = rgb(0.42, 0.46, 0.5), LINE = rgb(0.85, 0.87, 0.9), SHADE = rgb(0.94, 0.95, 0.96), BAND = rgb(0.84, 0.89, 0.95);
  let page = doc.addPage([W, H]);
  let y = H - M;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const need = (h: number) => { if (y - h < M) newPage(); };
  const wrap = (s: string, f: PDFFont, size: number, width: number): string[] => {
    const out: string[] = [];
    for (const para of String(s).split("\n")) {
      let line = "";
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const t = line ? line + " " + w : w;
        if (line && f.widthOfTextAtSize(t, size) > width) { out.push(line); line = w; } else line = t;
      }
      out.push(line);
    }
    return out;
  };
  const text = (s: string, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; gapAfter?: number } = {}) => {
    const size = o.size ?? 10, f = o.f ?? font, width = W - 2 * M;
    for (const line of wrap(s, f, size, width)) {
      need(size * 1.45);
      page.drawText(line, { x: M, y: y - size, size, font: f, color: o.color ?? INK });
      y -= size * 1.45;
    }
    y -= o.gapAfter ?? 0;
  };
  const table = (cols: { h: string; w: number; right?: boolean }[], rows: string[][], o: { boldLast?: boolean; boldCols?: number[]; groups?: { label: string; span: number }[] } = {}) => {
    const rowH = 15, tw = cols.reduce((n, c) => n + c.w, 0);
    const header = () => {
      need(rowH * 2 + 4);
      if (o.groups) {
        let gx = M, col = 0;
        for (const g of o.groups) {
          const gw = cols.slice(col, col + g.span).reduce((n, c) => n + c.w, 0);
          if (g.label) {
            page.drawRectangle({ x: gx + 1, y: y - rowH, width: gw - 2, height: rowH, color: BAND });
            const lw = bold.widthOfTextAtSize(g.label, 8);
            page.drawText(g.label, { x: gx + (gw - lw) / 2, y: y - rowH + 4, size: 8, font: bold, color: INK });
          }
          gx += gw; col += g.span;
        }
        y -= rowH;
      }
      page.drawRectangle({ x: M, y: y - rowH, width: tw, height: rowH, color: SHADE });
      let x = M;
      for (const c of cols) {
        const tx = c.right ? x + c.w - 4 - bold.widthOfTextAtSize(c.h, 8) : x + 4;
        page.drawText(c.h, { x: tx, y: y - rowH + 4, size: 8, font: bold, color: INK });
        x += c.w;
      }
      y -= rowH;
    };
    const tableTop = y, startPage = page;
    header();
    rows.forEach((r, i) => {
      if (y - rowH < M) { newPage(); header(); }
      const last = !!o.boldLast && i === rows.length - 1;
      page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + tw, y: y - rowH }, thickness: 0.5, color: LINE });
      let x = M;
      cols.forEach((c, j) => {
        const s = r[j] ?? "", f = last || o.boldCols?.includes(j) ? bold : font;
        const tx = c.right ? x + c.w - 4 - f.widthOfTextAtSize(s, 8) : x + 4;
        page.drawText(s, { x: tx, y: y - rowH + 4, size: 8, font: f, color: INK });
        x += c.w;
      });
      y -= rowH;
    });
    // Thin dividers between the groups, from the heading down to the last row (only when the table stays on one page).
    if (o.groups && page === startPage) {
      let gx = M, col = 0;
      for (const g of o.groups.slice(0, -1)) {
        gx += cols.slice(col, col + g.span).reduce((n, c) => n + c.w, 0);
        col += g.span;
        page.drawLine({ start: { x: gx, y: tableTop }, end: { x: gx, y: y }, thickness: 0.5, color: MUTED });
      }
    }
    y -= 14;
  };
  const sumRows = (rows: PlanRow[]) => rows.reduce((t, r) => ({ gi: t.gi + Number(r.gross_interest), wh: t.wh + Number(r.withholding), ni: t.ni + Number(r.net_interest), pr: t.pr + Number(r.principal) }), { gi: 0, wh: 0, ni: 0, pr: 0 });
  const byYear = (rows: PlanRow[]) => {
    const m = new Map<number, { gi: number; pr: number }>();
    for (const r of rows) {
      const yr = Number(String(r.due).slice(0, 4));
      const o = m.get(yr) ?? { gi: 0, pr: 0 };
      o.gi += Number(r.gross_interest); o.pr += Number(r.principal);
      m.set(yr, o);
    }
    return m;
  };
  const sortByDue = (rows: PlanRow[]) => [...rows].sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  // lead: option A and B. The first unpaid payment is shown at its latest possible day, as in the portal.
  const withPaid = (rows: PlanRow[], lead = false) => {
    const firstOpen = rows.findIndex((r) => r.st !== "paid");
    return sortByDue(rows).map((r) => [dmy(r.due) + (r.st === "paid" ? " (betaald)" : lead && rows[firstOpen] === r ? " (ten laatste)" : ""), money(r.gross_interest), money(r.withholding), money(r.net_interest), money(r.principal), money(Number(r.gross_interest) + Number(r.principal))]);
  };

  // Page 1: the investor, the current schedule and the three options.
  text("EVChargeking · Investeerdersportaal", { size: 9, color: MUTED, gapAfter: 6 });
  text("Overzicht van uw opties", { size: 20, f: bold, gapAfter: 2 });
  text(`${p.name} · ${p.date}`, { color: MUTED, gapAfter: 14 });
  text("Uw investering", { size: 12, f: bold, gapAfter: 4 });
  text(`Lening: ${p.loan}. Ingelegd bedrag: € ${money(p.invested)}. Bruto rentevoet: ${pct(p.grossRate)} per jaar. Op de interesten wordt ${pct(p.withholdingRate)} roerende voorheffing ingehouden.`, { gapAfter: 12 });
  text("Uw huidige planning", { size: 12, f: bold, gapAfter: 4 });
  text("Dit is de betaalplanning zoals die nu geldt. Ze blijft geldig tot er een addendum is ondertekend. Die planning vindt u op de volgende pagina's, naast keuze A en keuze B.", { gapAfter: 12 });
  text("Uw drie opties", { size: 12, f: bold, gapAfter: 4 });
  text("Keuze A: verlenging van uw contract met één jaar", { f: bold, gapAfter: 2 });
  text("De looptijd van uw lening wordt met één jaar verlengd. De volgende betaling bevat enkel de interesten en gebeurt binnen de drie maanden. Vanaf 2027 loopt alles verder zoals gepland, maar één jaar langer. De rentevoet blijft dezelfde.", { gapAfter: 8 });
  text("Keuze B: de einddatum blijft, met een stijgend terugbetalingsplan", { f: bold, gapAfter: 2 });
  text("U gaat ermee akkoord dat binnen de drie maanden enkel de interesten worden betaald, geen kapitaal. Vanaf 2027 wordt uw kapitaal in stappen terugbetaald volgens het plan in de tabellen; de interesten worden betaald op het resterende kapitaal.", { gapAfter: 8 });
  text("Keuze C: u gaat niet akkoord", { f: bold, gapAfter: 2 });
  text("Uw bestaande overeenkomst blijft ongewijzigd van toepassing. We nemen binnen de vijf werkdagen contact met u op. In het portaal vermeldt u kort waarom u niet akkoord gaat.", { gapAfter: 12 });
  text("Hoe u kiest", { size: 12, f: bold, gapAfter: 4 });
  text(`U maakt uw keuze zelf in het investeerdersportaal: ${p.appUrl}. Keuze A en keuze B liggen vast zodra u ze bevestigt. Keuze C kunt u op elk moment wijzigen, ook later naar A of B.`, { gapAfter: 12 });
  text("Bedragen zijn in euro. Totaal = bruto rente + kapitaal, dus vóór de voorheffing. Dit overzicht is informatief en vervangt uw overeenkomst niet.", { size: 8, color: MUTED });

  // Page 2: yearly comparison.
  newPage();
  text("Vergelijking per jaar", { size: 14, f: bold, gapAfter: 4 });
  text("Bruto rente, kapitaal en totaal per jaar, naast elkaar: uw huidige planning, keuze A en keuze B.", { color: MUTED, gapAfter: 10 });
  const yH = byYear(p.original), yA = byYear(p.optionA), yB = byYear(p.optionB);
  const years = [...new Set([...yH.keys(), ...yA.keys(), ...yB.keys()])].sort((a, b) => a - b);
  const cell = (m: Map<number, { gi: number; pr: number }>, yr: number) => { const o = m.get(yr) ?? { gi: 0, pr: 0 }; return [money(round2(o.gi)), money(round2(o.pr)), money(round2(o.gi + o.pr))]; };
  const yRows = years.map((yr) => [String(yr), ...cell(yH, yr), ...cell(yA, yr), ...cell(yB, yr)]);
  const sH = sumRows(p.original), sA = sumRows(p.optionA), sB = sumRows(p.optionB);
  yRows.push(["Totaal", money(round2(sH.gi)), money(round2(sH.pr)), money(round2(sH.gi + sH.pr)), money(round2(sA.gi)), money(round2(sA.pr)), money(round2(sA.gi + sA.pr)), money(round2(sB.gi)), money(round2(sB.pr)), money(round2(sB.gi + sB.pr))]);
  const yc = [{ h: "Jaar", w: 45 }, ...Array.from({ length: 9 }, () => ({ h: "", w: 50, right: true }))];
  const labels = ["Rente", "Kapitaal", "Totaal"];
  yc.slice(1).forEach((c, i) => (c.h = labels[i % 3]));
  table(yc, yRows, { boldLast: true, boldCols: [3, 6, 9], groups: [{ label: "", span: 1 }, { label: "Huidige planning", span: 3 }, { label: "Keuze A", span: 3 }, { label: "Keuze B", span: 3 }] });
  text("Keuze A en B: de eerste betaling is op de uiterste datum, binnen drie maanden na de oorspronkelijke vervaldag. Betaalde betalingen staan vermeld als betaald.", { size: 8, color: MUTED });

  // Pages 3+: the payment dates of each schedule.
  const detail = (title: string, rows: PlanRow[], note?: string, lead = false) => {
    newPage();
    text(title, { size: 14, f: bold, gapAfter: 4 });
    if (note) text(note, { size: 8, color: MUTED, gapAfter: 8 });
    const cols = [{ h: "Datum", w: 110 }, { h: "Bruto rente", w: 80, right: true }, { h: "Voorheffing", w: 80, right: true }, { h: "Netto rente", w: 80, right: true }, { h: "Kapitaal", w: 80, right: true }, { h: "Totaal", w: 65, right: true }];
    const body = withPaid(rows, lead);
    const t = sumRows(rows);
    body.push(["Totaal", money(round2(t.gi)), money(round2(t.wh)), money(round2(t.ni)), money(round2(t.pr)), money(round2(t.gi + t.pr))]);
    table(cols, body, { boldLast: true });
  };
  detail("Huidige planning", p.original, "Zoals die nu geldt, tot er een addendum is ondertekend.");
  detail("Keuze A", p.optionA, "Bij keuze A is de eerste betaling binnen drie maanden, enkel interesten. Daarna wordt het kapitaal later terugbetaald, één jaar langer.", true);
  detail("Keuze B", p.optionB, "Bij keuze B is er in 2026 enkel interest. Vanaf 2027 wordt het kapitaal in stappen terugbetaald, zoals in de tabel.", true);

  return await doc.save();
}
