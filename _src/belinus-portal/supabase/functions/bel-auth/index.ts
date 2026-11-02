// bel-auth — public account endpoints of the Belinus Portal (ported from Clavoris clv-auth-mail and clv-signup).
//   { action: "signup", email, password, first_name, last_name, lang, accept_terms, website }
//        Opens an account at once (status "registered"); the person then signs in, and the e-mailed code of the
//        second sign-in step confirms the address (status "active"). An address that already has an account gets a
//        mail telling them to sign in; the answer is the same either way, so the endpoint does not reveal who has
//        an account. "website" is a trap field left empty by people. Limits: 5 per IP and 3 per address per hour.
//   { action: "recovery", email }  -> e-mails a password-reset link valid 15 minutes, once (always { ok: true })
//   { action: "redeem", code }     -> exchanges that link's code for a session (reset page), or { ok:false, error:"expired" }
// Deploy: --no-verify-jwt.
import { pwProblem } from "../_shared/password.ts";
import { adminClient, anonClient, APP_URL, audit, clientIp, cors, greeting, json, later, mailConfigured, pickLang, randomCode, sendMail, sha256, type Lang } from "../_shared/bel.ts";

export const TERMS_VERSION = "2026-11-02";
const RESET_MINUTES = 15;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

const T: Record<Lang, Record<string, string>> = {
  nl: {
    welcomeS: "Welkom bij het Belinus-klantenportaal", welcomeT: "{greet}\n\nUw account voor het Belinus-klantenportaal is aangemaakt. Meld u aan met uw e-mailadres en wachtwoord; u ontvangt dan een code per e-mail die uw adres bevestigt.\n\nAanmelden:\n{link}",
    existsS: "Belinus: u hebt al een account", existsT: "{greet}\n\nIemand vroeg om met dit e-mailadres een account te openen op het Belinus-klantenportaal. U hebt al een account: meld u aan met uw eigen wachtwoord (uw wachtwoord is niet gewijzigd). Wachtwoord vergeten? Kies dan \"Wachtwoord vergeten\" op de aanmeldpagina.\n\nAanmelden:\n{link}\n\nHebt u dit niet gevraagd? Negeer dan deze e-mail.",
    resetS: "Belinus: stel een nieuw wachtwoord in", resetT: "{greet}\n\nU vroeg om een nieuw wachtwoord voor het Belinus-klantenportaal. De link is {min} minuten geldig en kan één keer gebruikt worden.\n\n{link}\n\nHebt u dit niet gevraagd? Negeer dan deze e-mail; uw wachtwoord blijft ongewijzigd.",
    signin: "Aanmelden", reset: "Nieuw wachtwoord instellen",
  },
  fr: {
    welcomeS: "Bienvenue sur le portail client Belinus", welcomeT: "{greet}\n\nVotre compte sur le portail client Belinus a été créé. Connectez-vous avec votre adresse e-mail et votre mot de passe ; vous recevrez un code par e-mail qui confirme votre adresse.\n\nSe connecter :\n{link}",
    existsS: "Belinus : vous avez déjà un compte", existsT: "{greet}\n\nQuelqu'un a demandé d'ouvrir un compte sur le portail client Belinus avec cette adresse e-mail. Vous avez déjà un compte : connectez-vous avec votre propre mot de passe (il n'a pas changé). Mot de passe oublié ? Choisissez « Mot de passe oublié » sur la page de connexion.\n\nSe connecter :\n{link}\n\nVous n'avez rien demandé ? Ignorez cet e-mail.",
    resetS: "Belinus : définissez un nouveau mot de passe", resetT: "{greet}\n\nVous avez demandé un nouveau mot de passe pour le portail client Belinus. Le lien est valable {min} minutes et ne peut être utilisé qu'une fois.\n\n{link}\n\nVous n'avez rien demandé ? Ignorez cet e-mail ; votre mot de passe reste inchangé.",
    signin: "Se connecter", reset: "Définir un nouveau mot de passe",
  },
  en: {
    welcomeS: "Welcome to the Belinus customer portal", welcomeT: "{greet}\n\nYour account for the Belinus customer portal has been created. Sign in with your e-mail address and password; you will then receive a code by e-mail that confirms your address.\n\nSign in:\n{link}",
    existsS: "Belinus: you already have an account", existsT: "{greet}\n\nSomeone asked to open an account on the Belinus customer portal with this e-mail address. You already have an account: sign in with your own password (it has not changed). Forgotten it? Choose \"Forgot password\" on the sign-in page.\n\nSign in:\n{link}\n\nDid you not ask for this? Then ignore this e-mail.",
    resetS: "Belinus: set a new password", resetT: "{greet}\n\nYou asked for a new password for the Belinus customer portal. The link is valid for {min} minutes and can be used once.\n\n{link}\n\nDid you not ask for this? Then ignore this e-mail; your password stays unchanged.",
    signin: "Sign in", reset: "Set a new password",
  },
};
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const admin = adminClient();
  const ip = clientIp(req);
  const allow = async (key: string, gap: number, perHour: number) => {
    const { data, error } = await admin.rpc("bel_auth_mail_allow", { p_key: key, p_gap_seconds: gap, p_per_hour: perHour });
    if (error) { console.error("bel-auth throttle:", error.message); return false; }
    return data === true;
  };

  if (action === "redeem") {
    const code = String(body.code || "").slice(0, 100);
    if (!code) return json({ ok: false, error: "expired" });
    const { data: row } = await admin.from("bel_reset_links").update({ used_at: new Date().toISOString() })
      .eq("code_hash", await sha256(code)).is("used_at", null).gt("expires_at", new Date().toISOString()).select("token_hash").maybeSingle();
    if (!row) return json({ ok: false, error: "expired" });
    const { data, error } = await anonClient().auth.verifyOtp({ type: "recovery", token_hash: row.token_hash });
    if (error || !data?.session) { console.error("bel-auth redeem:", error?.message || "no session"); return json({ ok: false, error: "expired" }); }
    return json({ ok: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  }

  if (action === "signup") {
    if (str(body.website, 200)) return json({ ok: true });
    const email = str(body.email, 200).toLowerCase();
    const L = pickLang(body.lang);
    if (!EMAIL.test(email)) return json({ error: "bad-email" }, 400);
    if (body.accept_terms !== true) return json({ error: "terms-required" }, 400);
    const first_name = str(body.first_name, 80), last_name = str(body.last_name, 80);
    if (!first_name || !last_name) return json({ error: "name-required" }, 400);
    const password = String(body.password || "");
    { const pp = await pwProblem(password); if (pp) return json({ error: pp === "leaked" ? "leaked-password" : "weak-password" }, 400); }
    if (!mailConfigured()) return json({ error: "mail-not-configured" }, 503);
    if (ip && !(await allow("signup-ip:" + (await sha256(ip)), 0, 5))) return json({ error: "too-many" }, 429);
    if (!(await allow("signup-email:" + (await sha256(email)), 30, 3))) return json({ ok: true });
    const { data: existing } = await admin.from("bel_profiles").select("id, salutation, first_name, last_name, full_name, lang").ilike("email", email).maybeSingle();
    const link = `${APP_URL}/#/login?email=${encodeURIComponent(email)}`;
    if (existing) {
      const LL = pickLang(existing.lang);
      await later(sendMail(email, T[LL].existsS, fill(T[LL].existsT, { greet: greeting(existing, LL), link }), LL, { url: link, label: T[LL].signin }, "signup-exists"));
      return json({ ok: true });
    }
    const full_name = `${first_name} ${last_name}`;
    const { data: u, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name }, app_metadata: { app: "belinus-portal" } });
    if (cErr || !u?.user) {
      if (cErr && /registered|exists|already/i.test(cErr.message)) return json({ ok: true });
      console.error("bel-auth createUser:", cErr?.message); return json({ error: "signup-failed" }, 500);
    }
    const { error: pErr } = await admin.from("bel_profiles").insert({ id: u.user.id, email, first_name, last_name, full_name, lang: L, status: "registered", terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() });
    if (pErr) { await admin.auth.admin.deleteUser(u.user.id).catch(() => {}); console.error("bel-auth profile:", pErr.message); return json({ error: "signup-failed" }, 500); }
    await audit(admin, { id: u.user.id, email }, "signup", email, { ip, terms: TERMS_VERSION, ua: (req.headers.get("user-agent") || "").slice(0, 300) });
    await later(sendMail(email, T[L].welcomeS, fill(T[L].welcomeT, { greet: greeting({ first_name }, L), link }), L, { url: link, label: T[L].signin }, "welcome"));
    return json({ ok: true });
  }

  if (action === "recovery") {
    const email = str(body.email, 200).toLowerCase();
    if (!EMAIL.test(email)) return json({ ok: true });
    if (!mailConfigured()) return json({ ok: false, error: "mail-not-configured" }, 503);
    if (ip && !(await allow("ip:" + (await sha256(ip)), 0, 20))) return json({ ok: true });
    if (!(await allow("email:" + (await sha256(email)), 60, 5))) return json({ ok: true });
    await later(sendRecovery(admin, email));
    return json({ ok: true });
  }

  return json({ error: "bad-action" }, 400);
});

async function sendRecovery(admin: ReturnType<typeof adminClient>, email: string): Promise<void> {
  const { data: p } = await admin.from("bel_profiles").select("id, salutation, first_name, last_name, full_name, status, lang").ilike("email", email).maybeSingle();
  if (!p || p.status === "suspended") return;
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: APP_URL + "/#/reset" } });
  if (error || !link?.properties?.hashed_token) { console.error("bel-auth generateLink:", error?.message || "no token"); return; }
  const code = randomCode();
  await admin.from("bel_reset_links").delete().eq("user_id", p.id);
  const { error: sErr } = await admin.from("bel_reset_links").insert({ code_hash: await sha256(code), user_id: p.id, token_hash: link.properties.hashed_token, expires_at: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString() });
  if (sErr) { console.error("bel-auth store:", sErr.message); return; }
  const L = pickLang(p.lang);
  const url = `${APP_URL}/#/reset?code=${encodeURIComponent(code)}`;
  await sendMail(email, T[L].resetS, fill(T[L].resetT, { greet: greeting(p, L), link: url, min: String(RESET_MINUTES) }), L, { url, label: T[L].reset }, "recovery");
}
