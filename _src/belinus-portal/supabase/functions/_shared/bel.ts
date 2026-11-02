// Shared helpers for the Belinus Portal edge functions (bel-*). Ported from Clavoris (_shared/clv.ts) and reduced:
// one identity per person, roles customer / partner / staff / super, second factor on every sign-in, mail through
// Mailgun (EU region) from noreply@belinus.com.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Error answers never carry internal text: an `error` passes only as a short code; anything else becomes
// "server-error" with a reference that is written to the function log.
const ERROR_CODE = /^[a-z0-9][a-z0-9_.:-]{0,80}( [0-9]{3})?$/i;
export function safeErrorBody(o: unknown): unknown {
  if (!o || typeof o !== "object" || Array.isArray(o) || !("error" in (o as Record<string, unknown>))) return o;
  const b = { ...(o as Record<string, unknown>) };
  if (typeof b.error !== "string" || !ERROR_CODE.test(b.error)) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error("bel error withheld", ref, String(b.error).slice(0, 1000));
    b.error = "server-error"; b.ref = ref;
  }
  if (typeof b.detail === "string" && !ERROR_CODE.test(b.detail)) delete b.detail;
  return b;
}
export const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(safeErrorBody(o)), { status, headers: { ...cors, "content-type": "application/json" } });

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}
export function anonClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const APP_URL = (Deno.env.get("BELINUS_APP_URL") || "https://portal.belinus.com").replace(/\/$/, "");
export const LANGS = ["nl", "fr", "en", "de", "it", "es"] as const;
export type Lang = "nl" | "fr" | "en";
export function pickLang(l: unknown): Lang { const s = String(l || "").slice(0, 2).toLowerCase(); return s === "fr" ? "fr" : s === "en" || s === "de" || s === "it" || s === "es" ? "en" : "nl"; }

// ---- caller and second factor ----
export function jwtOf(req: Request): string { return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""); }
export function jwtClaims(jwt: string): Record<string, any> {
  try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b + "===".slice((b.length + 3) % 4)), (c) => c.charCodeAt(0)))); } catch { return {}; }
}
export async function mfaOk(admin: SupabaseClient, jwt: string, userId: string): Promise<boolean> {
  const c = jwtClaims(jwt);
  const { data, error } = await admin.rpc("bel_mfa_ok_for", { p_user: userId, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (error) { console.error("mfa check:", error.message); return false; }
  return data === true;
}
export type Profile = { id: string; email: string; full_name: string | null; first_name: string | null; last_name: string | null; salutation: string | null; role: "customer" | "partner" | "staff" | "super"; status: string; lang: string; mobile: string | null; customer_type: string; company_name: string | null; last_login_at: string | null };
const PROFILE_COLS = "id, email, full_name, first_name, last_name, salutation, role, status, lang, mobile, customer_type, company_name, last_login_at";
export async function requireUser(admin: SupabaseClient, req: Request, opts: { mfa?: boolean } = {}): Promise<Profile | Response> {
  const jwt = jwtOf(req);
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data } = await admin.auth.getUser(jwt);
  const user = data?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const { data: p } = await admin.from("bel_profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle();
  if (!p || p.status === "suspended") return json({ error: "forbidden" }, 403);
  if (opts.mfa !== false && !(await mfaOk(admin, jwt, user.id))) return json({ error: "mfa-required" }, 401);
  return p as Profile;
}
export function isStaff(p: { role: string }): boolean { return p.role === "staff" || p.role === "super"; }
export function displayName(p: { full_name?: string | null; first_name?: string | null; last_name?: string | null }, L: Lang): string {
  const n = String(p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "").trim();
  return n || (L === "fr" ? "client" : L === "en" ? "customer" : "klant");
}
export function sameName(a: string, b: string): boolean {
  const n = (s: string) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  return n(a) !== "" && n(a) === n(b);
}
export function sameSecret(a: string, b: string): boolean { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
export function clientIp(req: Request): string { return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || ""; }
export async function sha256(s: string | Uint8Array): Promise<string> {
  const d = typeof s === "string" ? new TextEncoder().encode(s) : s;
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", d as BufferSource))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function randomCode(n = 32): string {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function audit(admin: SupabaseClient, actor: { id: string; email: string } | null, event_type: string, target: string, detail: Record<string, unknown> = {}) {
  await admin.from("bel_audit").insert({ actor: actor?.id ?? null, actor_email: actor?.email ?? null, event_type, target, detail }).then(() => {}, () => {});
}
export function later(p: Promise<unknown>): Promise<void> {
  const safe = p.then(() => {}, (e) => console.error("background:", (e as Error)?.message || String(e)));
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) { rt.waitUntil(safe); return Promise.resolve(); }
  return safe;
}

// ---- mail: Mailgun EU HTTP API ----
// Secrets: MAILGUN_API_KEY, MAILGUN_DOMAIN (the sending domain verified in Mailgun, e.g. mg.belinus.com or
// belinus.com); optional MAILGUN_API_BASE (default https://api.eu.mailgun.net), BELINUS_MAIL_FROM
// (default noreply@belinus.com), BELINUS_MAIL_REPLY_TO (default support@belinus.com).
export const MAIL_FROM = Deno.env.get("BELINUS_MAIL_FROM") || "noreply@belinus.com";
export const MAIL_REPLY_TO = Deno.env.get("BELINUS_MAIL_REPLY_TO") || "support@belinus.com";
export function mailConfigured(): boolean { return !!Deno.env.get("MAILGUN_API_KEY") && !!Deno.env.get("MAILGUN_DOMAIN"); }

const FOOT: Record<Lang, { help: string; notif: string; privacy: string }> = {
  nl: { help: "Op dit adres wordt niet geantwoord. Hulp nodig? Open een supportaanvraag in het portaal of schrijf naar support@belinus.com.", notif: "E-mailmeldingen beheren", privacy: "Privacybeleid" },
  fr: { help: "Cette adresse ne reçoit pas de réponses. Besoin d'aide ? Ouvrez une demande de support dans le portail ou écrivez à support@belinus.com.", notif: "Gérer les notifications par e-mail", privacy: "Politique de confidentialité" },
  en: { help: "This address does not receive replies. Need help? Open a support request in the portal or write to support@belinus.com.", notif: "Manage e-mail notifications", privacy: "Privacy policy" },
};
const FALLBACK: Record<Lang, string> = { nl: "Werkt de knop niet? Kopieer dan dit adres in uw browser:", fr: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :", en: "If the button does not work, copy this address into your browser:" };
export function mailFooter(L: Lang): string {
  const f = FOOT[L];
  return `____________________\n\nBelinus Energy BV · Antwerpen\n${f.help}\n${f.notif}: ${APP_URL}/#/account\n${f.privacy}: https://belinus.com/#/privacy`;
}
export type Cta = { url: string; label: string };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "'Arial Nova','Helvetica Neue',Helvetica,Arial,sans-serif";
export function textToHtml(text: string, L: Lang, cta?: Cta): string {
  const blocks: string[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push(`<p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:#222830">${para.join("<br>")}</p>`); para = []; } };
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const t = line.trim();
    if (cta && t === cta.url) {
      flush();
      blocks.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 14px"><tr><td align="center" bgcolor="#2EB9EA" style="background:#2EB9EA;border-radius:999px;padding:12px 28px">`
        + `<a href="${esc(cta.url)}" target="_blank" style="display:inline-block;font-family:${FONT};font-size:15px;font-weight:700;color:#0A0C0F;text-decoration:none">${esc(cta.label)}</a></td></tr></table>`
        + `<p style="margin:16px 0 22px;font-family:${FONT};font-size:12px;line-height:1.6;color:#7A828C">${esc(FALLBACK[L])}<br><a href="${esc(cta.url)}" style="color:#1B8FBE;word-break:break-all">${esc(cta.url)}</a></p>`);
      continue;
    }
    if (!t) { flush(); continue; }
    if (/^\d{6}$/.test(t)) {
      flush();
      blocks.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px"><tr><td align="center" bgcolor="#F5F6F7" style="background:#F5F6F7;border:1px solid #E7EAEE;border-top:3px solid #2EB9EA;border-radius:8px;padding:16px 28px">`
        + `<span style="font-family:Menlo,Consolas,'Courier New',monospace;font-size:36px;line-height:42px;font-weight:700;letter-spacing:10px;color:#0A0C0F">${t}</span></td></tr></table>`);
      continue;
    }
    para.push(esc(line).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#1B8FBE">${u}</a>`));
  }
  flush();
  const f = FOOT[L];
  return `<!doctype html><html lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`
    + `<body style="margin:0;padding:0;background:#F5F6F7"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F6F7"><tr><td align="center" style="padding:32px 14px">`
    + `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden">`
    + `<tr><td bgcolor="#0A0C0F" style="background:#0A0C0F;padding:26px 40px"><img src="https://belinus.com/assets/logo-belinus-white.png" height="26" alt="belinus" style="display:block;height:26px;width:auto;border:0"></td></tr>`
    + `<tr><td style="height:3px;line-height:3px;background:#2EB9EA">&nbsp;</td></tr>`
    + `<tr><td style="padding:34px 40px 18px">${blocks.join("")}</td></tr>`
    + `<tr><td bgcolor="#F5F6F7" style="background:#F5F6F7;padding:22px 40px 26px;border-top:1px solid #E7EAEE">`
    + `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;color:#222830"><b>Belinus Energy BV</b> · Antwerpen</p>`
    + `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:#7A828C">${esc(f.help)}</p>`
    + `<p style="margin:0;font-family:${FONT};font-size:12px;color:#7A828C"><a href="${APP_URL}/#/account" style="color:#7A828C">${esc(f.notif)}</a> · <a href="https://belinus.com/#/privacy" style="color:#7A828C">${esc(f.privacy)}</a></p>`
    + `</td></tr></table></td></tr></table></body></html>`;
}
const GREET: Record<string, Record<Lang, string>> = {
  mr: { nl: "Geachte heer {last},", fr: "Cher Monsieur {last},", en: "Dear Mr {last}," },
  mrs: { nl: "Geachte mevrouw {last},", fr: "Chère Madame {last},", en: "Dear Mrs {last}," },
};
export function greeting(p: { salutation?: string | null; last_name?: string | null; full_name?: string | null; first_name?: string | null }, L: Lang): string {
  const g = p.salutation && String(p.last_name || "").trim() ? GREET[p.salutation]?.[L] : "";
  if (g) return g.replace("{last}", String(p.last_name).trim());
  const n = String(p.first_name || p.full_name || "").trim();
  return L === "fr" ? (n ? `Bonjour ${n},` : "Bonjour,") : L === "en" ? (n ? `Dear ${n},` : "Hello,") : (n ? `Beste ${n},` : "Hallo,");
}

export async function sendMail(to: string, subject: string, text: string, lang: Lang | string = "nl", cta?: Cta, kind = "other"): Promise<boolean> {
  const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN");
  if (!key || !domain || !to) return false;
  const L = pickLang(lang);
  const body = text + "\n\n" + mailFooter(L);
  const form = new FormData();
  form.set("from", `Belinus <${MAIL_FROM}>`);
  form.set("to", to.trim());
  form.set("subject", subject);
  form.set("text", body);
  form.set("html", textToHtml(text, L, cta));
  form.set("h:Reply-To", MAIL_REPLY_TO);
  form.set("h:List-Unsubscribe", `<mailto:${MAIL_REPLY_TO}?subject=unsubscribe>, <${APP_URL}/#/account>`);
  form.set("o:tracking", "no");
  form.set("o:tracking-clicks", "no");
  form.set("o:tracking-opens", "no");
  form.set("v:kind", kind);
  const base = (Deno.env.get("MAILGUN_API_BASE") || "https://api.eu.mailgun.net").replace(/\/$/, "");
  const masked = subject.replace(/\b\d{6}\b/g, "******");
  const res = await fetch(`${base}/v3/${encodeURIComponent(domain)}/messages`, { method: "POST", headers: { Authorization: "Basic " + btoa("api:" + key) }, body: form });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { console.error("mail failed [mailgun]", res.status, to, "|", masked, "|", String(j?.message || "").slice(0, 200)); throw new Error("mailgun " + res.status); }
  const id = String(j?.id || "").replace(/^<|>$/g, "") || crypto.randomUUID();
  console.log("mail sent [mailgun]", to, "|", masked, "|", id);
  await adminClient().from("bel_mail_log").insert({ message_id: id, recipient: to.trim().toLowerCase(), subject: masked, kind, lang: L }).then(() => {}, () => {});
  return true;
}

// Mail to the Belinus support desk (new requests, safety reports). Secret BELINUS_SUPPORT_INBOX (default support@belinus.com).
export async function notifyDesk(subject: string, text: string): Promise<void> {
  const to = Deno.env.get("BELINUS_SUPPORT_INBOX") || "support@belinus.com";
  try { await sendMail(to, subject, text, "nl", undefined, "desk"); } catch (e) { console.error("desk mail:", (e as Error).message); }
}
