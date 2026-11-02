// supabase/functions/_shared/support-sla.ts
// Business-time arithmetic for the support service levels: Monday to Friday, 9:00-18:00 Europe/Brussels, Belgian
// public holidays excluded (New Year, Easter Monday, 1 May, Ascension, Whit Monday, 21 July, 15 August, 1 and
// 11 November, Christmas). A business day is 540 minutes.
export const SLA_TZ = "Europe/Brussels";
export const DAY_START = 9, DAY_END = 18;

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: SLA_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
function parts(d: Date) {
  const o: Record<string, number> = {};
  for (const p of fmt.formatToParts(d)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}
// Offset of Brussels from UTC at this instant, in milliseconds.
function offset(d: Date): number {
  const p = parts(d);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
}
// The UTC instant of a Brussels wall-clock time.
function localToUtc(y: number, m: number, d: number, h: number): number {
  const guess = Date.UTC(y, m - 1, d, h);
  const first = guess - offset(new Date(guess));
  return guess - offset(new Date(first));
}
function easter(y: number): Date {   // anonymous Gregorian algorithm
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const holidayCache = new Map<number, Set<string>>();
function holidays(y: number): Set<string> {
  let s = holidayCache.get(y);
  if (s) return s;
  const key = (d: Date) => d.toISOString().slice(0, 10), plus = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
  const e = easter(y);
  s = new Set([`${y}-01-01`, key(plus(e, 1)), `${y}-05-01`, key(plus(e, 39)), key(plus(e, 50)), `${y}-07-21`, `${y}-08-15`, `${y}-11-01`, `${y}-11-11`, `${y}-12-25`]);
  holidayCache.set(y, s);
  return s;
}
function isBusinessDay(y: number, m: number, d: number): boolean {
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return !holidays(y).has(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}
// Walk Brussels calendar days from `from`, calling fn(windowStart, windowEnd) for each business window (ms, UTC).
function walk(from: Date, fn: (ws: number, we: number) => boolean) {
  const p = parts(from);
  let y = p.year, m = p.month, d = p.day;
  for (let i = 0; i < 800; i++) {
    if (isBusinessDay(y, m, d) && fn(localToUtc(y, m, d, DAY_START), localToUtc(y, m, d, DAY_END))) return;
    const n = new Date(Date.UTC(y, m - 1, d + 1));
    y = n.getUTCFullYear(); m = n.getUTCMonth() + 1; d = n.getUTCDate();
  }
}
// The instant `minutes` business minutes after `from`.
export function addBusiness(from: Date, minutes: number): Date {
  let left = Math.max(0, minutes) * 60_000, out = from.getTime();
  const start = from.getTime();
  walk(from, (ws, we) => {
    const s = Math.max(ws, start);
    if (s >= we) return false;
    if (left <= we - s) { out = s + left; return true; }
    left -= we - s;
    return false;
  });
  return new Date(out);
}
// Business minutes between two instants (0 when b <= a).
export function businessBetween(a: Date, b: Date): number {
  if (b <= a) return 0;
  let total = 0;
  const A = a.getTime(), B = b.getTime();
  walk(a, (ws, we) => {
    if (ws >= B) return true;
    const s = Math.max(ws, A), e = Math.min(we, B);
    if (e > s) total += e - s;
    return we >= B;
  });
  return Math.round(total / 60_000);
}
