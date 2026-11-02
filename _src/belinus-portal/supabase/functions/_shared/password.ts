// Password rules for every password a Belinus user chooses (sign-up, reset, change). Passwords are set through the
// Supabase admin API, which does not apply the project's password settings, so the same rules are checked here
// (Steve, 29 October 2026): at least 12 characters, a lowercase and an uppercase letter, a digit and a symbol, and not a
// password known from data leaks (HaveIBeenPwned, Supabase's "Prevent use of leaked passwords"). The page shows the
// same rules as the user types (app/pw-rules.js).
export const PW_MIN = 12, PW_MAX = 128;
// The symbols Supabase Auth counts.
const SYMBOL = /[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,.\/`~]/;

export function pwRules(p: string) {
  return { length: p.length >= PW_MIN && p.length <= PW_MAX, lower: /[a-z]/.test(p), upper: /[A-Z]/.test(p), digit: /[0-9]/.test(p), symbol: SYMBOL.test(p) };
}
export function pwStrong(p: string): boolean { return Object.values(pwRules(p)).every(Boolean); }

// Pwned Passwords range API (k-anonymity: only the first 5 characters of the SHA-1 leave Belinus). true = found in a
// leak; null = the service could not be reached (the password is then not refused for that reason).
export async function pwLeaked(p: string): Promise<boolean | null> {
  try {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(p))), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const r = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { headers: { "Add-Padding": "true", "User-Agent": "Belinus" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const rest = h.slice(5);
    for (const line of (await r.text()).split("\n")) {
      const [suffix, count] = line.trim().split(":");
      if (suffix === rest && Number(count) > 0) return true;
    }
    return false;
  } catch { return null; }
}

// null when the password may be used; otherwise "weak" (a rule is not met) or "leaked".
export async function pwProblem(p: string): Promise<"weak" | "leaked" | null> {
  if (!pwStrong(p)) return "weak";
  return (await pwLeaked(p)) === true ? "leaked" : null;
}
