// Option B (rising repayment, agreed 9 November 2026): interest only in 2026, then the principal outstanding at the
// start of 2026 is repaid in steps. Crowd loans (Crowdlening) end on their original end date with 20/30/50 over 2027-2029;
// Winwinlening loans end one year later with 10/20/30/40 over 2027-2030. Same amounts as the agreed table.
export const B_SHARES: Record<string, Record<number, number>> = {
  winwin_raise: { 2027: 0.2, 2028: 0.3, 2029: 0.5 },
  winwinlening: { 2027: 0.1, 2028: 0.2, 2029: 0.3, 2030: 0.4 },
};
// Tranche code -> loan type: crowd-* = Winwin raise (Crowdlening), winwin-* = Winwinlening.
export const loanKind = (code: string): string => (code.startsWith("crowd") ? "winwin_raise" : code.startsWith("winwin") ? "winwinlening" : "bolero");
export const cent = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;
const yearOf = (d: string): number => Number(String(d).slice(0, 4));
// orig: the original schedule rows of one investor (period, due, remaining, ...), ordered by period.
// Withholding tax (roerende voorheffing) rate per investor (inv_investors.withholding_rate): 30% for individuals, 0% for companies (as in the 2026 payment overview).
export function bSchedule(invested: number, orig: any[], rate: number, kind: string, whRate = 0.3): any[] {
  const pre = orig.filter((r) => yearOf(r.due) < 2026);
  let bal = pre.length ? Number(pre[pre.length - 1].remaining) : invested;
  const base = bal;
  const steps = B_SHARES[kind] || {};
  const last = Math.max(...Object.keys(steps).map(Number));
  const rows: any[] = [];
  for (const r of orig.filter((x) => yearOf(x.due) >= 2026)) {
    const y = yearOf(r.due);
    const interest = cent(bal * rate);
    let prin = 0;
    if (y > 2026 && steps[y] !== undefined) prin = y === last ? bal : Math.min(bal, cent(base * steps[y]));
    const wh = cent(interest * whRate);
    bal = cent(bal - prin);
    rows.push({ period: r.period, due: r.due, gross_interest: interest, withholding: wh, net_interest: cent(interest - wh), principal: cent(prin), remaining: bal, status: "planned" });
  }
  return rows;
}
