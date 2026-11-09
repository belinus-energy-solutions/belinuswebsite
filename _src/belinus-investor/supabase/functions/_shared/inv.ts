// Shared helpers for the EVChargeking investor area (bel-inv, bel-inv-auth, bel-inv-admin).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const CODE = /^[a-z0-9][a-z0-9_.:-]{0,80}$/i;
export function json(o: any, status = 200): Response {
  if (o && typeof o.error === "string" && !CODE.test(o.error)) { console.error("inv error withheld", o.error.slice(0, 500)); o = { error: "server-error" }; }
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
}
export const adminClient = (): SupabaseClient => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
export const APP_URL = (Deno.env.get("INV_APP_URL") || "https://investor.belinus.com").replace(/\/$/, "");
export const str = (v: unknown, n: number) => String(v ?? "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ").trim().slice(0, n);
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const clientIp = (r: Request) => (r.headers.get("x-forwarded-for") || "").split(",")[0].trim();
export async function sha256(s: string): Promise<string> { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join(""); }
export function randomCode(n = 32): string { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export async function audit(a: SupabaseClient, actor: { id: string; email: string } | null, event_type: string, target: string, detail: Record<string, unknown> = {}) {
  // IP addresses are kept only as a one-way hash in the security log (privacy policy, section 2).
  if (typeof detail.ip === "string" && detail.ip) detail = { ...detail, ip: "sha256:" + (await sha256(detail.ip)).slice(0, 32) };
  await a.from("bel_audit").insert({ actor: actor?.id ?? null, actor_email: actor?.email ?? null, event_type: "inv-" + event_type, target, detail }).then(() => {}, () => {});
}
export async function settings(a: SupabaseClient): Promise<Record<string, any>> { const { data } = await a.from("inv_settings").select("key, value"); return Object.fromEntries((data || []).map((r: any) => [r.key, r.value])); }
export function nlDate(d: string | Date, withTime = false): string {
  return new Intl.DateTimeFormat("nl-BE", { timeZone: "Europe/Brussels", weekday: withTime ? "long" : undefined, day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(d));
}
export function addWorkingDays(n: number): string { const d = new Date(); while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n--; } return d.toISOString().slice(0, 10); }

// ---- languages: every investor mail in NL, FR or EN (inv_investors.lang) ----
export type Lang = "nl" | "fr" | "en";
export const pickLang = (l: unknown): Lang => (l === "fr" || l === "en" ? l : "nl");
const LOC: Record<Lang, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };
export function dateIn(d: string | Date, withTime: boolean, l: Lang): string {
  return new Intl.DateTimeFormat(LOC[l], { timeZone: "Europe/Brussels", weekday: withTime ? "long" : undefined, day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(d));
}
export const hello = (first: string | null | undefined, l: Lang) => (l === "fr" ? `Bonjour${first ? " " + first : ""},` : l === "en" ? (first ? `Dear ${first},` : "Hello,") : `Beste${first ? " " + first : ""},`);
export const KIND_L: Record<Lang, Record<string, string>> = {
  nl: { visit: "Bezoek op een investeerdersdag", video: "Videogesprek", callback: "Terugbelverzoek" },
  fr: { visit: "Visite lors d'une journée des investisseurs", video: "Appel vidéo", callback: "Demande de rappel" },
  en: { visit: "Visit on an investor day", video: "Video call", callback: "Call-back request" },
};
const EVENT_L: Record<string, [string, string]> = {
  "Investeerdersdag zaterdag 28 november 2026": ["Journée des investisseurs, samedi 28 novembre 2026", "Investor day, Saturday 28 November 2026"],
  "Investeerdersdag zaterdag 5 december 2026": ["Journée des investisseurs, samedi 5 décembre 2026", "Investor day, Saturday 5 December 2026"],
};
export const eventTitle = (t: string, l: Lang) => (l === "nl" || !EVENT_L[t] ? t : EVENT_L[t][l === "fr" ? 0 : 1]);
const MC: Record<Lang, { btn: string; foot: (u: string) => string; sig: string }> = {
  nl: { btn: "Werkt de knop niet? Kopieer dit adres in uw browser:", foot: (u) => `EVChargeking (Some BV), Hooilaar 40, 2230 Herselt · a belinus group company<br>Vragen? Antwoord op deze e-mail of maak een afspraak via ${u}/afspraak`, sig: "EVChargeking (Some BV), a belinus group company" },
  fr: { btn: "Le bouton ne fonctionne pas ? Copiez cette adresse dans votre navigateur :", foot: (u) => `EVChargeking (Some BV), Hooilaar 40, 2230 Herselt · a belinus group company<br>Des questions ? Répondez à cet e-mail ou prenez rendez-vous via ${u}/afspraak`, sig: "EVChargeking (Some BV), a belinus group company" },
  en: { btn: "Button not working? Copy this address into your browser:", foot: (u) => `EVChargeking (Some BV), Hooilaar 40, 2230 Herselt · a belinus group company<br>Questions? Reply to this e-mail or make an appointment at ${u}/afspraak`, sig: "EVChargeking (Some BV), a belinus group company" },
};

// ---- callers ----
export async function currentUser(a: SupabaseClient, req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await a.auth.getUser(jwt);
  return data?.user ? { id: data.user.id, email: String(data.user.email || "").toLowerCase(), jwt } : null;
}
export function claims(jwt: string): Record<string, any> { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } }
export async function access(a: SupabaseClient, u: { id: string; jwt: string }): Promise<{ role: string | null; mfa: boolean }> {
  const { data } = await a.from("inv_admins").select("role").eq("user_id", u.id).maybeSingle();
  const c = claims(u.jwt);
  const { data: ok, error } = await a.rpc("bel_mfa_ok_for", { p_user: u.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (error) console.error("mfa check", error.message);
  return { role: data?.role || null, mfa: ok === true };
}

// ---- mail: Mailgun EU, else Brevo; both with an optional calendar attachment ----
export function mailConfigured(): boolean { return !!(Deno.env.get("MAILGUN_API_KEY") && Deno.env.get("MAILGUN_DOMAIN")) || !!Deno.env.get("BREVO_API_KEY"); }
const NOREPLY = Deno.env.get("INV_MAIL_NOREPLY") || "noreply@belinus.com";
const FROM_ADDR = Deno.env.get("INV_MAIL_FROM") || "investors@belinus.com", FROM_NAME = "EVChargeking via Belinus", REPLY = Deno.env.get("INV_MAIL_REPLY_TO") || "info@evchargeking.com";
const FONT = "'Arial Nova','Helvetica Neue',Helvetica,Arial,sans-serif";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const NOREPLY_FOOT = (u: string) => `EVChargeking (Some BV), Hooilaar 40, 2230 Herselt · a belinus group company<br>Dit is een automatische e-mail. Antwoorden op dit adres worden niet gelezen. Vragen? Meld u aan op ${u} en maak een afspraak.`;
export function html(text: string, cta: { url: string; label: string } | undefined, L: Lang, noreply = false, foot = ""): string {
  const parts = text.replace(/\r/g, "").split(/\n{2,}/).map((p) => {
    if (cta && p.trim() === cta.url) return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 20px"><tr><td bgcolor="#2EB9EA" style="background:#2EB9EA;border-radius:999px;padding:12px 28px"><a href="${esc(cta.url)}" style="font-family:${FONT};font-size:15px;font-weight:700;color:#0A0C0F;text-decoration:none">${esc(cta.label)}</a></td></tr></table><p style="margin:0 0 18px;font-family:${FONT};font-size:12px;color:#7A828C">${esc(MC[L].btn)}<br>${esc(cta.url)}</p>`;
    if (p.startsWith("## ")) return `<p style="margin:26px 0 10px;font-family:${FONT};font-size:13px;letter-spacing:.06em;font-weight:700;color:#0A0C0F">${esc(p.slice(3).trim())}</p>`;
    if (/^\d{6}$/.test(p.trim())) return `<p style="margin:6px 0 24px;font-family:${FONT};font-size:40px;line-height:1.2;font-weight:700;letter-spacing:8px;color:#0A0C0F">${esc(p.trim())}</p>`;
    return `<p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:#222830">${esc(p).replace(/\n/g, "<br>")}</p>`;
  });
  return `<!doctype html><html lang="${L}"><head><meta charset="utf-8"></head><body style="margin:0;background:#F5F6F7"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden">`
    + `<tr><td style="padding:22px 36px;border-bottom:3px solid #2EB9EA"><table role="presentation" width="100%"><tr><td align="left"><img src="https://belinus.com/investor/assets/logo-evchargeking.png" height="30" alt="EVChargeking" style="height:30px;border:0"></td><td align="right"><img src="https://belinus.com/investor/assets/logo-belinus.png" height="24" alt="belinus" style="height:24px;border:0"></td></tr></table></td></tr>`
    + `<tr><td style="padding:30px 36px 14px">${parts.join("")}</td></tr>`
    + `<tr><td bgcolor="#F5F6F7" style="padding:18px 36px;font-family:${FONT};font-size:12px;line-height:1.6;color:#7A828C">${foot || (noreply ? NOREPLY_FOOT(APP_URL) : MC[L].foot(APP_URL))}</td></tr></table></td></tr></table></body></html>`;
}
export async function sendMail(a: SupabaseClient, m: { to: string; subject: string; text: string; cta?: { url: string; label: string }; kind: string; ics?: string; lang?: Lang; noreply?: boolean; from?: string; replyTo?: string; foot?: string; cc?: string }): Promise<boolean> {
  const L = pickLang(m.lang);
  const log = (provider: string, status: string) => a.from("inv_mail_log").insert({ recipient: m.to, subject: m.subject, kind: m.kind, provider, status }).then(() => {}, () => {});
  const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN"), brevo = Deno.env.get("BREVO_API_KEY");
  const body = m.text.replace(/^## /gm, "") + "\n\n--\n" + MC[L].sig + (m.noreply ? "\nDit is een automatische e-mail. Antwoorden op dit adres worden niet gelezen." : "");
  try {
    if (key && domain) {
      const f = new FormData();
      f.set("from", `${FROM_NAME} <${FROM_ADDR}>`); f.set("to", m.to); f.set("subject", m.subject); f.set("text", body); f.set("html", html(m.text, m.cta, L, !!m.noreply, m.foot || ""));
      if (m.noreply) f.set("from", `${FROM_NAME} <${NOREPLY}>`); else { if (m.from) f.set("from", `${FROM_NAME} <${m.from}>`); f.set("h:Reply-To", m.replyTo || REPLY); } f.set("o:tracking", "no"); f.set("v:kind", m.kind); if (m.cc) f.set("cc", m.cc);
      if (m.ics) f.append("attachment", new File([m.ics], "afspraak.ics", { type: "text/calendar" }));
      const r = await fetch(`${(Deno.env.get("MAILGUN_API_BASE") || "https://api.eu.mailgun.net").replace(/\/$/, "")}/v3/${encodeURIComponent(domain)}/messages`, { method: "POST", headers: { Authorization: "Basic " + btoa("api:" + key) }, body: f });
      if (!r.ok) throw new Error("mailgun " + r.status + " " + (await r.text()).slice(0, 200));
      await log("mailgun", "sent"); return true;
    }
    if (brevo) {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": brevo, "content-type": "application/json" }, body: JSON.stringify({ sender: { name: FROM_NAME, email: m.noreply ? NOREPLY : (m.from || FROM_ADDR) }, to: [{ email: m.to }], ...(m.cc ? { cc: [{ email: m.cc }] } : {}), ...(m.noreply ? {} : { replyTo: { email: m.replyTo || REPLY } }), subject: m.subject, textContent: body, htmlContent: html(m.text, m.cta, L, !!m.noreply, m.foot || ""), tags: [m.kind], ...(m.ics ? { attachment: [{ name: "afspraak.ics", content: btoa(unescape(encodeURIComponent(m.ics))) }] } : {}) }) });
      if (!r.ok) throw new Error("brevo " + r.status + " " + (await r.text()).slice(0, 200));
      await log("brevo", "sent"); return true;
    }
    await log("none", "no-provider"); return false;
  } catch (e) { console.error("inv mail", m.kind, (e as Error).message); await log(key ? "mailgun" : "brevo", "failed"); return false; }
}

const ACCESS: Record<Lang, { first: string; again: string; label: string; body: (u: string) => string; thanks: string }> = {
  nl: { first: "Stel uw wachtwoord in voor het Investeerdersportaal EVChargeking", again: "Nieuw wachtwoord voor het Investeerdersportaal EVChargeking", label: "Wachtwoord instellen", body: (u) => `Met onderstaande knop stelt u uw wachtwoord in voor het Investeerdersportaal EVChargeking. De link is 24 uur geldig en kan één keer gebruikt worden.\n\n${u}\n\nHebt u dit niet gevraagd? Dan kunt u deze e-mail negeren.`, thanks: "Met vriendelijke groeten,\nEVChargeking en Belinus" },
  fr: { first: "Définissez votre mot de passe pour le Portail investisseurs EVChargeking", again: "Nouveau mot de passe pour le Portail investisseurs EVChargeking", label: "Définir le mot de passe", body: (u) => `Le bouton ci-dessous vous permet de définir votre mot de passe pour le Portail investisseurs EVChargeking. Le lien est valable 24 heures et ne peut être utilisé qu'une seule fois.\n\n${u}\n\nVous n'avez rien demandé ? Vous pouvez ignorer cet e-mail.`, thanks: "Cordialement,\nEVChargeking et Belinus" },
  en: { first: "Set your password for the EVChargeking Investor portal", again: "New password for the EVChargeking Investor portal", label: "Set password", body: (u) => `Use the button below to set your password for the EVChargeking Investor portal. The link is valid for 24 hours and can be used once.\n\n${u}\n\nDid you not request this? Then you can ignore this e-mail.`, thanks: "Kind regards,\nEVChargeking and Belinus" },
};
export async function sendAccessLink(a: SupabaseClient, inv: { id: string; email: string; first_name?: string | null; status: string; lang?: string | null }, lang?: unknown): Promise<boolean> {
  const code = randomCode();
  await a.from("inv_links").delete().eq("investor_id", inv.id);
  await a.from("inv_links").insert({ code_hash: await sha256(code), investor_id: inv.id, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString() });
  const url = `${APP_URL}/#/wachtwoord?code=${encodeURIComponent(code)}`;
  const L = pickLang(inv.lang || lang), T = ACCESS[L];
  return await sendMail(a, { to: inv.email, kind: "access-link", lang: L, subject: inv.status === "invited" ? T.first : T.again, cta: { url, label: T.label }, text: `${hello(inv.first_name, L)}\n\n${T.body(url)}\n\n${T.thanks}` });
}

// ---- choice (investor or admin on behalf) ----
export const CHOICE_TEXT: Record<string, string> = {
  A: "A – Ik ga akkoord met de verlenging. Binnen de drie maanden ontvang ik enkel de interesten, geen kapitaal.",
  B: "B – Ik ga akkoord dat binnen de drie maanden enkel de interesten worden betaald, geen kapitaal. Ik kies het stijgend terugbetalingsplan: vanaf 2027 wordt mijn kapitaal in stappen terugbetaald volgens de planning in het portaal, en de interesten worden betaald op het resterende kapitaal.",
  C: "C – Ik ga niet akkoord.",
};
const CHOICE_L: Record<Lang, Record<string, string>> = {
  nl: CHOICE_TEXT,
  fr: { A: "A – J'accepte la prolongation. Dans les trois mois, je reçois uniquement les intérêts, sans capital.", B: "B – J'accepte que seuls les intérêts, sans capital, soient payés dans les trois mois. Je choisis le plan de remboursement croissant : à partir de 2027, mon capital est remboursé par étapes selon le calendrier du portail, et les intérêts sont payés sur le capital restant.", C: "C – Je ne suis pas d'accord." },
  en: { A: "A – I agree to the extension. Within three months I receive interest only, no principal.", B: "B – I agree that only interest, no principal, is paid within three months. I choose the rising repayment plan: from 2027 my capital is repaid in steps according to the schedule in the portal, and interest is paid on the remaining capital.", C: "C – I do not agree." },
};
const CONFIRM_L: Record<Lang, { subject: string; got: string; next: Record<string, string>; change: string; thanks: string }> = {
  nl: { subject: "Bevestiging van uw keuze – EVChargeking", got: "We hebben uw keuze goed ontvangen:", next: { A: "Zodra alle investeerders hun keuze hebben bevestigd, ontvangt u een e-mail van Winwinner om het addendum bij uw contract te ondertekenen, met daarin uw keuze.", B: "De planning van het stijgend terugbetalingsplan staat in het portaal. Daarna ontvangt u een e-mail van Winwinner om het addendum te ondertekenen.", C: "We nemen binnen de 5 werkdagen contact met u op. Uw bestaande overeenkomst blijft ongewijzigd van toepassing." }, thank: "Hartelijk dank voor uw vertrouwen en uw steun aan EVChargeking.", change: "U ontvangt binnenkort een e-mail van info@winwinner.be om uw contract aan te passen.", thanks: "Met vriendelijke groeten," },
  fr: { subject: "Confirmation de votre choix – EVChargeking", got: "Nous avons bien reçu votre choix :", next: { A: "Dès que tous les investisseurs auront confirmé leur choix, vous recevrez un e-mail de Winwinner pour signer l'avenant à votre contrat, qui reprend votre choix.", B: "Le calendrier du plan de remboursement croissant figure dans le portail. Vous recevrez ensuite un e-mail de Winwinner pour signer l'avenant.", C: "Nous vous contacterons dans les 5 jours ouvrables. Votre contrat existant reste d'application sans modification." }, thank: "Merci beaucoup pour votre confiance et votre soutien envers EVChargeking.", change: "Vous recevrez bientôt un e-mail de info@winwinner.be pour modifier votre contrat.", thanks: "Cordialement," },
  en: { subject: "Confirmation of your choice – EVChargeking", got: "We have received your choice:", next: { A: "As soon as all investors have confirmed their choice, you will receive an e-mail from Winwinner to sign the addendum to your contract, which records your choice.", B: "The schedule of the rising repayment plan is in the portal. You will then receive an e-mail from Winwinner to sign the addendum.", C: "We will contact you within 5 working days. Your existing agreement continues to apply unchanged." }, thank: "Thank you for your trust and support in EVChargeking.", change: "You will soon receive an e-mail from info@winwinner.be to amend your contract.", thanks: "Kind regards," },
};
export async function applyChoice(a: SupabaseClient, inv: any, c: { choice: string; wish?: string; reason?: string; by_admin?: string; note?: string; ip?: string }) {
  const { error } = await a.from("inv_choices").upsert({ investor_id: inv.id, choice: c.choice, wish: c.choice === "B" ? c.wish || null : null, reason: c.choice === "C" ? c.reason || null : null, confirmed_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await a.from("inv_choice_log").insert({ investor_id: inv.id, choice: c.choice, wish: c.wish || null, reason: c.reason || null, by_admin: c.by_admin || null, note: c.note || null, ip: c.ip || null });
  for (const kind of ["B", "C"]) {
    if (kind === c.choice) await a.from("inv_followups").upsert({ investor_id: inv.id, kind, status: "open", due_date: addWorkingDays(kind === "B" ? 10 : 5) }, { onConflict: "investor_id,kind" });
    else await a.from("inv_followups").update({ status: "cancelled" }).eq("investor_id", inv.id).eq("kind", kind);
  }
  const L = pickLang(inv.lang), T = CONFIRM_L[L];
  await sendMail(a, { to: inv.email, kind: "choice", lang: L, subject: T.subject, text: `${hello(inv.first_name, L)}\n\n${T.got}\n\n${CHOICE_L[L][c.choice]}\n\n${T.next[c.choice]}\n\n${T.thank}\n\n${T.change}\n\n${T.thanks}\nErwin Raets, EVChargeking\nSteve Van Beirs, Belinus` });
}

export function strong(p: string): boolean {
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  return p.length >= 12 && p.length <= 128 && types >= 3 && !/(.)\1\1/su.test(p);
}

// ---- personal invitation (Steve, 8 November 2026): the investor already has an account under this e-mail address; one
// button sets the password and signs in. No-reply: questions go through the portal. The link stays valid until the
// deadline (at least 7 days), is not used up by opening it, and the first sign-in after it needs no extra code.
const eur0 = (n: number) => new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export async function sendInvite(a: SupabaseClient, inv: { id: string; email: string; first_name?: string | null; status: string; invested?: number | string | null }): Promise<boolean> {
  const st = await settings(a);
  const deadline = st.deadline ? new Date(st.deadline) : new Date(Date.now() + 7 * 86400_000);
  const expires = new Date(Math.max(deadline.getTime(), Date.now() + 7 * 86400_000));
  const code = randomCode();
  await a.from("inv_links").delete().eq("investor_id", inv.id);
  await a.from("inv_links").insert({ code_hash: await sha256(code), investor_id: inv.id, expires_at: expires.toISOString() });
  const url = `${APP_URL}/#/wachtwoord?code=${encodeURIComponent(code)}&uitnodiging=1`;
  const m = inviteContent(inv, url, deadline, expires);
  return await sendMail(a, { to: inv.email, kind: "invite", lang: "nl", noreply: true, cc: "info@winwinner.be", subject: m.subject, cta: m.cta, text: m.text });
}
// The invitation exactly as it is sent; also used for the preview in Beheer (with a dummy link).
export function inviteContent(inv: { email: string; first_name?: string | null; invested?: number | string | null }, url: string, deadline: Date, expires: Date): { subject: string; text: string; cta: { url: string; label: string } } {
  const D = nlDate(deadline);
  const text = `${hello(inv.first_name, "nl")}

U investeerde in 2024 via Winwinner in EVChargeking (Some BV). Bedankt daarvoor. We hebben belangrijk nieuws en vragen uw steun.

## WAT VERANDERT ER?

EVChargeking wordt deel van de Belinus-groep. Deze transactie wordt nu afgerond en duurt nog ongeveer drie maanden. Vanaf 2027:
• worden onze laadpalen verkocht als Belinus-product;
• krijgen we toegang tot een Europees netwerk van verkoopkanalen;
• lanceren we een leasemodel voor laadpalen voor bedrijven in België.

## WAAROM VRAGEN WE DIT NU?

We willen open zijn: EVChargeking heeft op korte termijn nood aan liquiditeit, voor drie zaken:
1. De lancering in 2027 van een nieuw laadstation voor bedrijven, aangeboden in lease.
2. De verdere ontwikkeling van de ETAPpro, zodat die conform blijft met de nieuwe Europese productregels (o.a. ISO 15118, vanaf januari 2027).
3. De uitbreiding van ons technisch team, om de productie te beheersen, in het bijzonder de aankoop van elektronische componenten en onze "made in EU"-strategie.

De integratie in de Belinus-groep moet de continuïteit van het bedrijf waarborgen. Daarom is uw snelle antwoord belangrijk.

## ONS VOORSTEL

• De looptijd van uw lening wordt met één jaar verlengd.
• De volgende betaling bevat enkel de interesten, geen kapitaal, en gebeurt binnen de drie maanden.
• Vanaf 2027 loopt alles verder zoals gepland, maar één jaar langer.
De rentevoet blijft dezelfde. U ontvangt dus één jaar extra interest.

## UW KEUZE

A – Ik ga akkoord met de verlenging. Binnen de drie maanden ontvang ik enkel de interesten, geen kapitaal.
B – Ik ga akkoord dat binnen de drie maanden enkel de interesten worden betaald, geen kapitaal. Ik kies het stijgend terugbetalingsplan: vanaf 2027 wordt mijn kapitaal in stappen terugbetaald volgens de planning in het portaal, en de interesten worden betaald op het resterende kapitaal.
C – Ik ga niet akkoord. Vermeld kort waarom; we nemen binnen de 5 werkdagen contact met u op. Uw bestaande overeenkomst blijft dan ongewijzigd van toepassing.

## UW ACCOUNT STAAT KLAAR – UW KEUZE UITERLIJK OP ${D.toUpperCase()}

U hebt al een account in ons investeerdersportaal. Uw gebruikersnaam is het e-mailadres waarop u deze e-mail ontving: ${inv.email}

Klik op de knop hieronder, kies een wachtwoord en u komt meteen bij uw investering${inv.invested ? ` (${eur0(Number(inv.invested))})` : ""}, uw betaalschema en uw keuze.

${url}

Deze knop is persoonlijk en werkt tot en met ${nlDate(expires)}. Stuur deze e-mail niet door.

Daarna meldt u zich aan op ${APP_URL} met uw e-mailadres en wachtwoord. Voor uw veiligheid vragen we vanaf de volgende keer bij elke aanmelding ook een code van 6 cijfers, die u per e-mail ontvangt.

U ontvangt een e-mail ter bevestiging van uw keuze. Zodra alle investeerders hun keuze hebben bevestigd, ontvangt u een e-mail van Winwinner om het addendum bij uw contract te ondertekenen, met daarin uw keuze.

## VRAGEN? MAAK EEN AFSPRAAK IN HET PORTAAL

Kom langs op een van onze investeerdersdagen, bij EVChargeking, Hooilaar 40, 2230 Herselt, telkens van 10 tot 12 uur, met koffie en iets lekkers:
• zaterdag 28 november 2026
• zaterdag 5 december 2026

U kiest zelf hoe we elkaar spreken: een bezoek op een investeerdersdag (met maximaal twee personen), een videogesprek of een terugbelverzoek. Na het aanmelden kiest u uw dag en uur onder "Maak een afspraak". U krijgt meteen een bevestiging met een uitnodiging voor uw agenda.

Werkt de knop niet meer? Ga naar ${APP_URL}, klik op "Wachtwoord vergeten" en vul uw e-mailadres in. U krijgt dan meteen een nieuwe link.

## BELINUS IN 2027

Belinus lanceert volgend jaar een residentiële natrium-ionbatterij, made in Belgium: lithiumvrij, veilig en met 15 jaar garantie. Ze maakt deel uit van een totaalpakket met een slim zonnepaneel (in partnerschap met LONGi), een hybride SiC-omvormer, energieopslag, de ETAPpro-laadpaal van EVChargeking en een AI-energiebeheersysteem. Bekijk het aanbod: https://www.belinus.com/b2c/index.html

Hartelijk dank voor uw vertrouwen.

Met vriendelijke groeten,

Erwin Raets
Zaakvoerder, EVChargeking (Some BV)

Steve Van Beirs
CEO, Belinus`;
  return { subject: `EVChargeking wordt deel van de Belinus-groep – uw keuze uiterlijk op ${D}`, cta: { url, label: "Activeer uw account en maak uw keuze" }, text };
}
export async function invitePreview(a: SupabaseClient, inv: { email: string; first_name?: string | null; invested?: number | string | null }): Promise<{ subject: string; html: string; from: string; to: string }> {
  const st = await settings(a);
  const deadline = st.deadline ? new Date(st.deadline) : new Date(Date.now() + 7 * 86400_000);
  const expires = new Date(Math.max(deadline.getTime(), Date.now() + 7 * 86400_000));
  const m = inviteContent(inv, `${APP_URL}/#/wachtwoord?code=VOORBEELD&uitnodiging=1`, deadline, expires);
  return { subject: m.subject, html: html(m.text, m.cta, "nl", true), from: `${FROM_NAME} <${NOREPLY}>`, to: inv.email };
}

// ---- messages (Steve, 8 November 2026): admins write to an investor. The mail comes from investor@belinus.com and can be
// answered: each message has its own reply address on the Mailgun domain (bericht-<message id>@mg.belinus.com), and the
// answer lands in the investor's thread (bel-inv-inbound). The investor can also answer in the portal.
export const MSG_FROM = Deno.env.get("INV_MSG_FROM") || "investor@belinus.com";
export const replyAddress = (messageId: string) => `bericht-${messageId}@${Deno.env.get("INV_REPLY_DOMAIN") || Deno.env.get("MAILGUN_DOMAIN") || "mg.belinus.com"}`;
export async function mailMessage(a: SupabaseClient, inv: { email: string; first_name?: string | null; lang?: string | null }, body: string, messageId: string): Promise<boolean> {
  const L = pickLang(inv.lang);
  const T = {
    nl: ["Nieuw bericht van EVChargeking", "U hebt een nieuw bericht in het investeerdersportaal:", "U kunt gewoon op deze e-mail antwoorden, of antwoorden in het portaal.", "Bekijk in het portaal", "U kunt op deze e-mail antwoorden. Uw antwoord komt bij uw berichten in het portaal."],
    fr: ["Nouveau message d'EVChargeking", "Vous avez un nouveau message dans le portail investisseurs :", "Vous pouvez simplement répondre à cet e-mail, ou répondre dans le portail.", "Voir dans le portail", "Vous pouvez répondre à cet e-mail. Votre réponse sera ajoutée à vos messages dans le portail."],
    en: ["New message from EVChargeking", "You have a new message in the investor portal:", "You can simply reply to this e-mail, or reply in the portal.", "View in the portal", "You can reply to this e-mail. Your answer is added to your messages in the portal."],
  }[L];
  const url = `${APP_URL}/#/berichten`;
  return await sendMail(a, { to: inv.email, kind: "message", lang: L, from: MSG_FROM, replyTo: replyAddress(messageId), foot: `EVChargeking (Some BV), Hooilaar 40, 2230 Herselt · a belinus group company<br>${T[4]}`, subject: T[0], cta: { url, label: T[3] }, text: `${hello(inv.first_name, L)}\n\n${T[1]}\n\n${body}\n\n${T[2]}\n\n${url}` });
}

// Calendar invitation (.ics). Same UID per appointment; a moved appointment is sent with METHOD:REQUEST and a higher SEQUENCE so calendars update it.
const icsT = (d: Date | string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
export function icsEvent(b: { id: string; title: string; start: string; end: string; location?: string; url?: string; desc: string; sequence?: number; method?: "PUBLISH" | "REQUEST" }): string {
  const e = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Belinus//Investeerdersportaal//NL", `METHOD:${b.method || "PUBLISH"}`, "BEGIN:VEVENT", `UID:${b.id}@investor.belinus.com`, `DTSTAMP:${icsT(new Date())}`, ...(b.sequence ? [`SEQUENCE:${b.sequence}`] : []), `DTSTART:${icsT(b.start)}`, `DTEND:${icsT(b.end)}`, `SUMMARY:${e(b.title)}`, ...(b.location ? [`LOCATION:${e(b.location)}`] : []), ...(b.url ? [`URL:${b.url}`] : []), `DESCRIPTION:${e(b.desc)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

// ---- booking confirmation (investor day, video call or call-back). bel-inv sends it; bookingPreview shows it in Beheer. ----
export type BookingB = { starts_at: string; meet_url?: string | null; inv_events?: { title: string; address: string } | null };
export function bookingDetail(kind: string, b: BookingB, arrival: string | null, persons: number, phone: string | null, s: Record<string, any>, l: Lang): string {
  const when = dateIn(b.starts_at, true, l);
  const W = { nl: { arr: "Aankomst", per: "Personen", adr: "Adres", sweet: "Met koffie en iets lekkers.", dt: "Datum en uur", link: "Link naar het gesprek", later: "U ontvangt de link naar het gesprek vóór de afspraak per e-mail.", call: "Wij bellen u op" }, fr: { arr: "Arrivée", per: "Personnes", adr: "Adresse", sweet: "Avec café et douceurs.", dt: "Date et heure", link: "Lien vers l'entretien", later: "Vous recevrez le lien vers l'entretien par e-mail avant le rendez-vous.", call: "Nous vous appellerons au" }, en: { arr: "Arrival", per: "People", adr: "Address", sweet: "With coffee and something sweet.", dt: "Date and time", link: "Link to the call", later: "You will receive the link to the call by e-mail before the appointment.", call: "We will call you on" } }[l];
  return kind === "visit" ? `${eventTitle(b.inv_events!.title, l)}\n${W.arr}: ${arrival || "10:00"}\n${W.per}: ${persons}\n${W.adr}: ${b.inv_events!.address}\n${W.sweet}`
    : kind === "video" ? `${W.dt}: ${when}\n${(b.meet_url || s.video_url) ? W.link + ": " + (b.meet_url || s.video_url) : W.later}`
    : `${W.dt}: ${when}\n${W.call} ${phone}.`;
}
export function bookingMail(kind: string, b: BookingB, arrival: string | null, persons: number, phone: string | null, s: Record<string, any>, first: string | null | undefined, L: Lang): { subject: string; text: string } {
  const K = KIND_L[L][kind];
  const BT = { nl: [`Bevestiging van uw afspraak: ${K}`, "Uw afspraak is bevestigd.", "Afspraak verplaatsen of annuleren kan in het portaal:", "Met vriendelijke groeten,"], fr: [`Confirmation de votre rendez-vous : ${K}`, "Votre rendez-vous est confirmé.", "Vous pouvez déplacer ou annuler le rendez-vous dans le portail :", "Cordialement,"], en: [`Confirmation of your appointment: ${K}`, "Your appointment is confirmed.", "You can move or cancel the appointment in the portal:", "Kind regards,"] }[L];
  return { subject: BT[0], text: `${hello(first, L)}\n\n${BT[1]}\n\n${K}\n${bookingDetail(kind, b, arrival, persons, phone, s, L)}\n\n${BT[2]} ${APP_URL}/afspraak\n\n${BT[3]}\nEVChargeking` };
}
// Preview in Beheer: a visit on the first active investor day, first arrival time, one person, sent from the investor-mail address.
export async function bookingPreview(a: SupabaseClient, kind: string): Promise<{ subject: string; html: string; from: string; to: string; replyTo: string; attachment: string }> {
  const s = await settings(a);
  const { data: ev } = await a.from("inv_events").select("id, title, address, starts_at").eq("active", true).order("starts_at").limit(1).maybeSingle();
  const { data: sl } = ev ? await a.from("inv_event_slots").select("start_time").eq("event_id", ev.id).order("start_time").limit(1).maybeSingle() : { data: null };
  const b: BookingB = { starts_at: ev?.starts_at || new Date().toISOString(), inv_events: { title: ev?.title || "Investeerdersdag", address: ev?.address || "EVChargeking, Hooilaar 40, 2230 Herselt" } };
  const m = bookingMail(kind, b, sl?.start_time || "10:00", 1, null, s, "Jan", "nl");
  return { subject: m.subject, html: html(m.text, undefined, "nl", false, ""), from: `${FROM_NAME} <${FROM_ADDR}>`, to: "jan@voorbeeld.be", replyTo: REPLY, attachment: "afspraak.ics" };
}
