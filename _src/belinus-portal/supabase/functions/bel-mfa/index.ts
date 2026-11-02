// bel-mfa — two-factor sign-in for the Belinus Portal (ported from Clavoris clv-mfa).
// After the password, every sign-in needs a second factor: a 6-digit code e-mailed to the person, or the
// authenticator-app code once activated on the account page (Supabase MFA TOTP; the session becomes aal2).
//   { action: "status" }                 -> { verified, totp, email, first_password }
//   { action: "send", purpose? }         -> e-mails a code (10 min; 5 wrong tries; max 1 per 30 s, 6 per hour)
//   { action: "verify", code }           -> checks a sign-in code; completes the sign-in
//   { action: "totp_done" }              -> after an authenticator verification (aal2): completes the sign-in
//   { action: "remind", never? }         -> answer to the "activate the authenticator app" reminder
//   { action: "change_password", password, current_password?, code? }
// The first completed sign-in confirms the e-mail address: a "registered" account becomes "active".
// Deploy: --no-verify-jwt (each function checks its caller itself).
import { pwProblem } from "../_shared/password.ts";
import { adminClient, anonClient, audit, clientIp, cors, displayName, json, jwtClaims, jwtOf, mfaOk, pickLang, requireUser, sendMail, sha256, type Lang, type Profile } from "../_shared/bel.ts";

const CODE_TTL_MS = 10 * 60 * 1000, MAX_ATTEMPTS = 5, MAX_FAILED_PER_HOUR = 15, RESEND_MS = 30 * 1000, MAX_PER_HOUR = 6;
const REMIND_LOGINS = 10, REMIND_DAYS = 30, SNOOZE_DAYS = 182, TOTP_FRESH_S = 5 * 60, RECOVERY_FRESH_S = 60 * 60;
type Purpose = "login" | "password";
const MAIL: Record<Purpose, Record<Lang, { s: string; t: string }>> = {
  login: {
    nl: { s: "Uw Belinus-aanmeldcode: {code}", t: "Beste {name},\n\nUw aanmeldcode voor het Belinus-klantenportaal is:\n\n{code}\n\nDe code is 10 minuten geldig en kan één keer gebruikt worden.\n\nHebt u zich niet net aangemeld? Dan kent iemand uw wachtwoord: deel deze code niet, wijzig uw wachtwoord en verwittig support@belinus.com." },
    fr: { s: "Votre code de connexion Belinus : {code}", t: "Bonjour {name},\n\nVotre code de connexion au portail client Belinus est :\n\n{code}\n\nLe code est valable 10 minutes et ne peut être utilisé qu'une seule fois.\n\nVous ne venez pas de vous connecter ? Quelqu'un connaît alors votre mot de passe : ne communiquez pas ce code, changez votre mot de passe et prévenez support@belinus.com." },
    en: { s: "Your Belinus sign-in code: {code}", t: "Dear {name},\n\nYour sign-in code for the Belinus customer portal is:\n\n{code}\n\nThe code is valid for 10 minutes and can be used once.\n\nDid you not just sign in? Then someone knows your password: do not share this code, change your password and inform support@belinus.com." },
  },
  password: {
    nl: { s: "Uw Belinus-code om uw wachtwoord te wijzigen: {code}", t: "Beste {name},\n\nU vroeg om uw wachtwoord te wijzigen. Uw bevestigingscode is:\n\n{code}\n\nDe code is 10 minuten geldig.\n\nHebt u dit niet gevraagd? Deel deze code niet en verwittig support@belinus.com." },
    fr: { s: "Votre code Belinus pour changer votre mot de passe : {code}", t: "Bonjour {name},\n\nVous avez demandé à changer votre mot de passe. Votre code de confirmation est :\n\n{code}\n\nLe code est valable 10 minutes.\n\nVous n'êtes pas à l'origine de cette demande ? Ne communiquez pas ce code et prévenez support@belinus.com." },
    en: { s: "Your Belinus code to change your password: {code}", t: "Dear {name},\n\nYou asked to change your password. Your confirmation code is:\n\n{code}\n\nThe code is valid for 10 minutes.\n\nDid you not ask for this? Do not share this code and inform support@belinus.com." },
  },
};
function sixDigits(): string { const a = new Uint32Array(1); let n: number; do { crypto.getRandomValues(a); n = a[0]; } while (n >= 4294000000); return String(n % 1000000).padStart(6, "0"); }
function mask(email: string): string { const [u, d] = String(email || "").split("@"); if (!d) return email; return (u.length <= 2 ? u[0] + "•" : u.slice(0, 2) + "•".repeat(Math.min(6, u.length - 2))) + "@" + d; }
function amrAt(claims: Record<string, any>, methods: string[]): number {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  return amr.filter((e: any) => methods.includes(e?.method)).reduce((m: number, e: any) => Math.max(m, Number(e?.timestamp) || 0), 0);
}
async function passwordWorks(email: string, password: string): Promise<boolean> {
  const c = anonClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data?.session) return false;
  await c.auth.signOut({ scope: "local" }).catch(() => {});
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const admin = adminClient();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "status");
  const meR = await requireUser(admin, req, { mfa: action === "remind" || action === "change_password" });
  if (meR instanceof Response) return meR;
  const me: Profile = meR;
  const jwt = jwtOf(req);
  const claims = jwtClaims(jwt);
  const sessionId = String(claims.session_id || "");
  if (!sessionId) return json({ error: "no-session" }, 400);
  const nowS = Math.floor(Date.now() / 1000);
  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: me.id });
  const totp = !!(factors?.factors || []).find((f: any) => f.factor_type === "totp" && f.status === "verified");

  async function firstPassword(): Promise<boolean> {
    if (nowS - amrAt(claims, ["recovery", "otp", "magiclink", "invite"]) > RECOVERY_FRESH_S) return false;
    return me.status === "registered" && !me.last_login_at;
  }

  async function complete(method: string) {
    await audit(admin, me, "login", me.email, { method, ip: clientIp(req), ua: (req.headers.get("user-agent") || "").slice(0, 300) });
    await admin.from("bel_mfa_sessions").upsert({ session_id: sessionId, user_id: me.id, method, verified_at: new Date().toISOString() }).then(() => {}, () => {});
    const { data: p } = await admin.from("bel_profiles").select("mfa_logins_since_reminder, mfa_reminded_at, mfa_snooze_until, status").eq("id", me.id).maybeSingle();
    const now = Date.now();
    const patch: Record<string, unknown> = { last_login_at: new Date().toISOString() };
    if (p?.status === "registered") patch.status = "active"; // the e-mailed code / link proved the address
    let remind = false;
    if (!totp && p && !(p.mfa_snooze_until && new Date(p.mfa_snooze_until).getTime() > now)) {
      const logins = (p.mfa_logins_since_reminder || 0) + 1;
      const since = p.mfa_reminded_at ? now - new Date(p.mfa_reminded_at).getTime() : Infinity;
      remind = !p.mfa_reminded_at || logins >= REMIND_LOGINS || since >= REMIND_DAYS * 86400000;
      if (remind) { patch.mfa_reminded_at = new Date().toISOString(); patch.mfa_logins_since_reminder = 0; }
      else patch.mfa_logins_since_reminder = logins;
    }
    await admin.from("bel_profiles").update(patch).eq("id", me.id);
    return json({ ok: true, verified: true, remind });
  }

  async function checkCode(purpose: Purpose, raw: unknown): Promise<Response | null> {
    const code = String(raw || "").replace(/\D/g, "");
    if (code.length !== 6) return json({ error: "bad-code" }, 400);
    const { data: rows } = await admin.from("bel_mfa_codes").select("id, code_hash, expires_at").eq("user_id", me.id).eq("session_id", sessionId).eq("purpose", purpose).is("used_at", null).order("created_at", { ascending: false }).limit(10);
    if (!rows || !rows.length) return json({ error: "no-code" }, 400);
    const live = rows.filter((r: any) => new Date(r.expires_at).getTime() >= Date.now()).slice(0, 3);
    if (!live.length) return json({ error: "expired" }, 400);
    const { count: failedHour } = await admin.from("bel_audit").select("id", { count: "exact", head: true }).eq("actor", me.id).eq("event_type", "mfa-failed").gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((failedHour || 0) >= MAX_FAILED_PER_HOUR) return json({ error: "too-many-attempts" }, 429);
    const { data: used, error: attErr } = await admin.rpc("bel_mfa_attempt", { p_id: live[0].id, p_max: MAX_ATTEMPTS });
    if (attErr) { console.error("bel-mfa attempt", attErr.message); return json({ error: "mfa-unavailable" }, 503); }
    if (used == null) return json({ error: "too-many-attempts" }, 400);
    const h = await sha256(`${me.id}:${sessionId}:${purpose}:${code}`);
    if (!live.some((r: any) => r.code_hash === h)) {
      await audit(admin, me, "mfa-failed", me.email, { purpose });
      return json({ error: "wrong-code", attempts_left: Math.max(0, MAX_ATTEMPTS - Number(used)) }, 400);
    }
    await admin.from("bel_mfa_codes").update({ used_at: new Date().toISOString() }).eq("user_id", me.id).eq("session_id", sessionId).eq("purpose", purpose).is("used_at", null);
    return null;
  }

  if (action === "status") {
    const verified = await mfaOk(admin, jwt, me.id);
    if (verified) {
      const { data: known } = await admin.from("bel_mfa_sessions").select("session_id").eq("session_id", sessionId).maybeSingle();
      if (!known) return await complete("link");
    }
    return json({ ok: true, verified, totp, email: mask(me.email), first_password: await firstPassword() });
  }

  if (action === "send") {
    const purpose: Purpose = body.purpose === "password" ? "password" : "login";
    const { data: recent } = await admin.from("bel_mfa_codes").select("created_at").eq("user_id", me.id).gte("created_at", new Date(Date.now() - 3600000).toISOString()).order("created_at", { ascending: false });
    if (recent && recent.length && Date.now() - new Date(recent[0].created_at).getTime() < RESEND_MS) return json({ error: "wait", retry_in: Math.ceil((RESEND_MS - (Date.now() - new Date(recent[0].created_at).getTime())) / 1000) }, 429);
    if (recent && recent.length >= MAX_PER_HOUR) return json({ error: "too-many" }, 429);
    const code = sixDigits();
    const { error } = await admin.from("bel_mfa_codes").insert({ user_id: me.id, session_id: sessionId, purpose, code_hash: await sha256(`${me.id}:${sessionId}:${purpose}:${code}`), expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString() });
    if (error) { console.error("bel-mfa store code", error.message); return json({ error: "code-not-stored" }, 500); }
    const L = pickLang(me.lang);
    const m = MAIL[purpose][L];
    const fill = (s: string) => s.replace(/\{code\}/g, code).replace(/\{name\}/g, displayName(me, L));
    let mailed = false;
    try { mailed = await sendMail(me.email, fill(m.s), fill(m.t), L, undefined, "mfa"); } catch (e) { console.error("mfa mail:", (e as Error).message); }
    if (!mailed) return json({ error: "mail-failed" }, 502);
    return json({ ok: true, sent_to: mask(me.email), expires_in: CODE_TTL_MS / 1000 });
  }

  if (action === "verify") {
    const bad = await checkCode("login", body.code);
    if (bad) return bad;
    return await complete("email");
  }

  if (action === "totp_done") {
    if (claims.aal !== "aal2") return json({ error: "mfa-required" }, 401);
    return await complete("totp");
  }

  if (action === "remind") {
    if (body.never === true) await admin.from("bel_profiles").update({ mfa_snooze_until: new Date(Date.now() + SNOOZE_DAYS * 86400000).toISOString() }).eq("id", me.id);
    return json({ ok: true });
  }

  if (action === "change_password") {
    const password = String(body.password || "");
    { const pp = await pwProblem(password); if (pp) return json({ error: pp === "leaked" ? "leaked-password" : "weak-password" }, 400); }
    const first = await firstPassword();
    const recovery = nowS - amrAt(claims, ["recovery", "otp", "magiclink", "invite"]) <= RECOVERY_FRESH_S;
    if (!first) {
      const freshTotp = nowS - amrAt(claims, ["totp"]) <= TOTP_FRESH_S;
      if (!freshTotp && !recovery) {
        if (!body.code) return json({ error: "code-required" }, 400);
        const bad = await checkCode("password", body.code);
        if (bad) return bad;
      }
      if (!recovery && !(await passwordWorks(me.email, String(body.current_password || "")))) return json({ error: "wrong-password" }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(me.id, { password });
    if (error) {
      console.error("bel-mfa change password", error.message);
      const c = String((error as { code?: string }).code || "");
      return json({ error: /^[a-z_]{3,40}$/.test(c) ? c.replace(/_/g, "-") : "password-change-failed" }, 400);
    }
    await audit(admin, me, "password-changed", me.email, { first, recovery, ip: clientIp(req) });
    const c = anonClient();
    const { data: s } = await c.auth.signInWithPassword({ email: me.email, password }).catch(() => ({ data: null as any }));
    const sess = s?.session;
    if (!sess) return json({ ok: true });
    const sid = jwtClaims(sess.access_token).session_id;
    if (sid) await admin.from("bel_mfa_sessions").upsert({ session_id: sid, user_id: me.id, method: "password-set", verified_at: new Date().toISOString() });
    const patch: Record<string, unknown> = { last_login_at: new Date().toISOString() };
    if (me.status === "registered") patch.status = "active";
    await admin.from("bel_profiles").update(patch).eq("id", me.id);
    return json({ ok: true, session: { access_token: sess.access_token, refresh_token: sess.refresh_token } });
  }

  return json({ error: "bad-action" }, 400);
});
