// bel-customers — customers imported from Odoo Belinus Energy BV, the recall dossiers, portal invitations and the customer's recall page.
// Public:      activate { code } -> a fresh password-setting code for an invited customer
// Customer:    recall_open { id } | recall_sign { id, typed_name, choice: lfp|sodium, preferred_dates?, phone?, read_confirmed }
// Super admin: list { sync? } | invite { partner_id } | case_update { id, disconnect_status, disconnected_at?, disconnect_note? }
// Nothing reaches a customer except through "invite", which only the super admin triggers. Secret: ODOO_API_KEY. Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const ODOO = (Deno.env.get("ODOO_URL") || "https://van-beirs-consult-bv1.odoo.com").replace(/\/$/, ""), DB = Deno.env.get("ODOO_DB") || "van-beirs-consult-bv1", UID = Number(Deno.env.get("ODOO_UID") || 2), COMPANY = Number(Deno.env.get("ODOO_COMPANY_ID") || 3), KEY = Deno.env.get("ODOO_API_KEY") || "";
const APP = (Deno.env.get("BELINUS_APP_URL") || "https://portal.belinus.com").replace(/\/$/, "");
const INVITE_DAYS = 14, SYNC_MINUTES = 10;
type L = "nl" | "fr" | "en";
const lang = (x: unknown): L => { const s = String(x || "").slice(0, 2).toLowerCase(); return s === "fr" || s === "en" ? s : "nl"; };
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\x00-\x1f]/g, " ").trim().slice(0, n);
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pick = (o: any, l: L) => (o && typeof o === "object" ? (o[l] || o.nl || o.en || "") : String(o || ""));
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
async function sha256(s: string): Promise<string> { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join(""); }
function randomCode(n = 32): string { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function rpc(model: string, method: string, args: unknown[], kw: Record<string, unknown> = {}): Promise<any> {
  const r = await (await fetch(`${ODOO}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: { service: "object", method: "execute_kw", args: [DB, UID, KEY, model, method, args, { ...kw, context: { allowed_company_ids: [COMPANY] } }] } }) })).json();
  if (r.error) throw new Error(r.error?.data?.message || r.error?.message);
  return r.result;
}
const a = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function mail(admin: any, to: string, subject: string, text: string, kind: string, l: L, cta?: { url: string; label: string }): Promise<boolean> {
  const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN");
  if (!key || !domain) return false;
  const paras = text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px;font:15px/1.6 Arial,sans-serif;color:#222830">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const button = cta ? `<p style="margin:8px 0 16px"><a href="${esc(cta.url)}" style="display:inline-block;background:#2EB9EA;color:#fff;font:700 15px Arial,sans-serif;text-decoration:none;padding:12px 22px;border-radius:8px">${esc(cta.label)}</a></p>` : "";
  const html = `<div style="background:#F5F6F7;padding:28px 12px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:3px solid #2EB9EA"><p style="margin:0 0 22px;font:700 20px Arial,sans-serif;color:#0A0C0F">belinus</p>${paras}${button}<p style="margin:22px 0 0;font:12px/1.5 Arial,sans-serif;color:#7A828C">belinus energy B.V. · Frankrijklei 5, 2000 Antwerpen · BTW BE 1020 081 989</p></div></div>`;
  const f = new FormData();
  f.set("from", `Belinus <${Deno.env.get("BELINUS_MAIL_FROM") || "noreply@belinus.com"}>`); f.set("to", to); f.set("subject", subject); f.set("text", cta ? `${text}\n\n${cta.url}` : text); f.set("html", html);
  f.set("h:Reply-To", "service@belinus.com"); f.set("o:tracking", "no"); f.set("v:kind", kind);
  try {
    const r = await fetch(`${(Deno.env.get("MAILGUN_API_BASE") || "https://api.eu.mailgun.net").replace(/\/$/, "")}/v3/${encodeURIComponent(domain)}/messages`, { method: "POST", headers: { Authorization: "Basic " + btoa("api:" + key) }, body: f });
    if (!r.ok) { console.error("customers mail", r.status); return false; }
    const j = await r.json().catch(() => ({}));
    await admin.from("bel_mail_log").insert({ message_id: String(j?.id || crypto.randomUUID()).replace(/^<|>$/g, ""), recipient: to.toLowerCase(), subject, kind, lang: l }).then(() => {}, () => {});
    return true;
  } catch (e) { console.error("customers mail", (e as Error).message); return false; }
}

const INVITE: Record<L, { s: string; rs: string; t: string; rt: string; cta: string }> = {
  nl: { s: "Belinus: activeer uw toegang tot het klantenportaal", rs: "Belinus: activeer uw toegang tot het klantenportaal – terugroeping Energywall", cta: "Toegang activeren",
    t: "Beste {name},\n\nU hebt een persoonlijke toegang tot het Belinus-klantenportaal. Daar vindt u uw producten, bestellingen, facturen en documenten en kunt u terecht voor ondersteuning.\n\nKlik op de knop om uw toegang te activeren en een wachtwoord te kiezen. De link is {days} dagen geldig.",
    rt: "Beste {name},\n\nZoals aangekondigd in ons terugroepingsbericht van 2 november 2026 kunt u nu terecht in het Belinus-klantenportaal. Daar maakt u uw keuze voor de nieuwe batterij en volgt u uw dossier, de planning van de vervanging en uw vergoeding op.\n\nKlik op de knop om uw toegang te activeren en een wachtwoord te kiezen. De link is {days} dagen geldig.\n\nHebt u de batterij nog niet uitgeschakeld? Doe dat dan vandaag nog volgens de instructies in het terugroepingsbericht." },
  fr: { s: "Belinus : activez votre accès au portail client", rs: "Belinus : activez votre accès au portail client – rappel Energywall", cta: "Activer l'accès",
    t: "Bonjour {name},\n\nVous disposez d'un accès personnel au portail client Belinus : vos produits, commandes, factures et documents, ainsi que l'assistance.\n\nCliquez sur le bouton pour activer votre accès et choisir un mot de passe. Le lien est valable {days} jours.",
    rt: "Bonjour {name},\n\nComme annoncé dans notre avis de rappel du 2 novembre 2026, vous avez désormais accès au portail client Belinus pour faire votre choix et suivre votre dossier.\n\nCliquez sur le bouton pour activer votre accès et choisir un mot de passe. Le lien est valable {days} jours." },
  en: { s: "Belinus: activate your customer portal access", rs: "Belinus: activate your customer portal access – Energywall recall", cta: "Activate access",
    t: "Dear {name},\n\nYou have personal access to the Belinus customer portal: your products, orders, invoices, documents and support.\n\nClick the button to activate your access and choose a password. The link is valid for {days} days.",
    rt: "Dear {name},\n\nAs announced in our recall notice of 2 November 2026, you can now use the Belinus customer portal to make your choice and follow your case.\n\nClick the button to activate your access and choose a password. The link is valid for {days} days." },
};
const SIGNED: Record<L, { s: string; t: string }> = {
  nl: { s: "Belinus terugroeping {code}: uw keuze", t: "Beste {name},\n\nU bevestigde op {when} dat u de terugroepingsmelding {code} gelezen hebt.\n\nUw keuze: {choice}\n\nBelinus neemt contact met u op om de vervanging in te plannen." },
  fr: { s: "Rappel Belinus {code} : votre choix", t: "Bonjour {name},\n\nVous avez confirmé le {when} avoir lu l'avis de rappel {code}.\n\nVotre choix : {choice}\n\nBelinus vous contacte pour planifier le remplacement." },
  en: { s: "Belinus recall {code}: your choice", t: "Dear {name},\n\nOn {when} you confirmed that you have read recall notice {code}.\n\nYour choice: {choice}\n\nBelinus will contact you to plan the replacement." },
};
const CHOICE: Record<L, Record<string, string>> = {
  nl: { lfp: "Keuze A – nieuwe lithium-ijzerfosfaatbatterij", sodium: "Keuze B – nieuwe Belinus natrium-ionbatterij" },
  fr: { lfp: "Choix A – nouvelle batterie lithium-fer-phosphate", sodium: "Choix B – nouvelle batterie Belinus sodium-ion" },
  en: { lfp: "Choice A – new lithium iron phosphate battery", sodium: "Choice B – new Belinus sodium-ion battery" },
};
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

async function sync(admin: any) {
  const rows = await rpc("res.partner", "search_read", [[["customer_rank", ">", 0], "|", ["company_id", "=", COMPANY], ["company_id", "=", false]]], { fields: ["name", "email", "phone", "street", "street2", "zip", "city", "country_id", "vat", "is_company", "lang", "sale_order_count", "total_invoiced"], limit: 5000 });
  const { data: cases } = await admin.from("bel_recall_cases").select("odoo_partner_id, portal_email");
  const portal = new Map((cases || []).map((c: any) => [c.odoo_partner_id, c.portal_email]));
  const now = new Date().toISOString();
  const up = rows.filter((p: any) => !/^demo klant/i.test(p.name || "") && String(p.email || "").trim().toLowerCase() !== "steve@belinus.com").map((p: any) => ({
    odoo_partner_id: p.id, name: p.name, email: portal.get(p.id) || (String(p.email || "").trim().toLowerCase() || null), phone: p.phone || null,
    street: [p.street, p.street2].filter(Boolean).join(" ") || null, postal_code: p.zip || null, city: p.city || null, country: p.country_id ? p.country_id[1] : null, vat: p.vat || null, lang: p.lang || null,
    is_company: !!p.is_company, orders: p.sale_order_count || 0, invoiced: p.total_invoiced || 0, synced_at: now }));
  const { error } = await admin.from("bel_customers").upsert(up, { onConflict: "odoo_partner_id" });
  if (error) throw new Error(error.message);
  await admin.rpc("bel_link_all");
  return up.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const admin = a();

  if (action === "activate") {
    const code = str(body.code, 100);
    if (!code) return json({ error: "invite-invalid" }, 400);
    const { data: inv } = await admin.from("bel_invites").select("user_id, expires_at").eq("code_hash", await sha256(code)).maybeSingle();
    if (!inv || new Date(inv.expires_at).getTime() < Date.now()) return json({ error: "invite-invalid" }, 400);
    const { data: p } = await admin.from("bel_profiles").select("id, email, status, last_login_at").eq("id", inv.user_id).maybeSingle();
    if (!p || p.status === "suspended" || p.last_login_at) return json({ error: "invite-used" }, 400);
    const { data: link, error } = await admin.auth.admin.generateLink({ type: "recovery", email: p.email, options: { redirectTo: APP + "/#/reset" } });
    if (error || !link?.properties?.hashed_token) { console.error("activate link", error?.message); return json({ error: "generic" }, 500); }
    const reset = randomCode();
    await admin.from("bel_reset_links").delete().eq("user_id", p.id);
    const { error: e2 } = await admin.from("bel_reset_links").insert({ code_hash: await sha256(reset), user_id: p.id, token_hash: link.properties.hashed_token, expires_at: new Date(Date.now() + 30 * 60000).toISOString() });
    if (e2) { console.error("activate store", e2.message); return json({ error: "generic" }, 500); }
    return json({ ok: true, code: reset });
  }

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await admin.auth.getUser(jwt);
  const user = ud?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await admin.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await admin.from("bel_profiles").select("id, email, role, status, full_name, first_name, last_name, mobile, lang").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);
  const audit = (ev: string, target: string, detail: Record<string, unknown> = {}) => admin.from("bel_audit").insert({ actor: me.id, actor_email: me.email, event_type: ev, target, detail }).then(() => {}, () => {});
  const nameOf = (p: any) => String(p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "").trim();

  async function notice(id: unknown) {
    if (!isUuid(id)) return null;
    const { data: n } = await admin.from("bel_recall_notices").select("*, bel_recalls(*)").eq("id", id).maybeSingle();
    if (!n || n.owner_id !== me!.id || n.bel_recalls?.status === "draft") return null;
    return n as any;
  }

  if (action === "recall_open") {
    const n = await notice(body.id);
    if (!n) return json({ error: "not-found" }, 404);
    const r = n.bel_recalls, l = lang(me.lang);
    const [{ data: y }, { data: kase }] = await Promise.all([
      n.system_id ? admin.from("bel_systems").select("kind, product, model, serial, installed_at").eq("id", n.system_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from("bel_recall_cases").select("instructions").eq("notice_id", n.id).maybeSingle()]);
    if (n.status === "sent") await admin.from("bel_recall_notices").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", n.id);
    return json({ ok: true, notice: { id: n.id, status: n.status === "sent" ? "opened" : n.status, signed_at: n.signed_at, signed_name: n.signed_name, choice: n.choice, appointment_at: n.appointment_at, code: r.code, risk: r.risk,
      title: pick(r.title, l), summary: pick(r.summary, l), instructions: kase?.instructions || pick(r.instructions, l), offer: pick(r.offer, l), pdf: null, system: y, account_name: nameOf(me) || me.email } });
  }

  if (action === "recall_sign") {
    const n = await notice(body.id);
    if (!n) return json({ error: "not-found" }, 404);
    if (n.signed_at) return json({ error: "already-signed" }, 409);
    if (body.read_confirmed !== true) return json({ error: "read-required" }, 400);
    const choice = ["lfp", "sodium"].includes(body.choice) ? body.choice : null;
    if (!choice) return json({ error: "choice-required" }, 400);
    const typed = str(body.typed_name, 160), accountName = nameOf(me);
    if (!accountName) return json({ error: "profile-name-required" }, 400);
    if (norm(typed) !== norm(accountName)) return json({ error: "name-mismatch" }, 400);
    const dates = Array.isArray(body.preferred_dates) ? body.preferred_dates.map((d: unknown) => str(d, 40)).filter(Boolean).slice(0, 5) : [];
    const now = new Date().toISOString(), ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const { error } = await admin.from("bel_recall_notices").update({ status: "signed", signed_at: now, sign_method: "typed", signed_name: typed, signed_ip: ip, choice, preferred_dates: dates.length ? dates : null }).eq("id", n.id).is("signed_at", null);
    if (error) { console.error("recall sign", error.message); return json({ error: "sign-failed" }, 500); }
    const phone = str(body.phone, 40);
    if (phone && !me.mobile) await admin.from("bel_profiles").update({ mobile: phone }).eq("id", me.id);
    await audit("recall-signed", n.bel_recalls.code, { notice: n.id, choice, dates, ip, ua: str(req.headers.get("user-agent"), 300) });
    const l = lang(me.lang), when = new Date(now).toLocaleString(l === "en" ? "en-GB" : `${l}-BE`, { timeZone: "Europe/Brussels", dateStyle: "long", timeStyle: "short" });
    const v = { name: accountName, when, code: n.bel_recalls.code, choice: CHOICE[l][choice] };
    await mail(admin, me.email, fill(SIGNED[l].s, v), fill(SIGNED[l].t, v), "recall", l, { url: `${APP}/#/recall/${n.id}`, label: "Portal" });
    await mail(admin, "service@belinus.com", `Terugroeping ${v.code}: keuze van ${accountName}`, `${accountName} (${me.email}${phone || me.mobile ? ", " + (phone || me.mobile) : ""}) bevestigde de terugroeping ${v.code}.\n\nKeuze: ${CHOICE.nl[choice]}\nVoorkeursdata: ${dates.join(", ") || "—"}`, "recall-desk", "nl");
    return json({ ok: true, signed_at: now });
  }

  if (me.role !== "super") return json({ error: "forbidden" }, 403);

  if (action === "list") {
    let synced: number | null = null, syncError: string | null = null;
    const { data: last } = await admin.from("bel_customers").select("synced_at").not("synced_at", "is", null).order("synced_at", { ascending: false }).limit(1).maybeSingle();
    if (body.sync === true || !last || Date.now() - new Date(last.synced_at).getTime() > SYNC_MINUTES * 60000) {
      try { synced = await sync(admin); } catch (e) { syncError = (e as Error).message; console.error("customers sync", syncError); }
    }
    const [{ data: customers }, { data: cases }, { data: notices }] = await Promise.all([
      admin.from("bel_customers").select("*, bel_profiles(last_login_at, status)").order("name").limit(5000),
      admin.from("bel_recall_cases").select("*").order("installed_at"),
      admin.from("bel_recall_notices").select("id, status, choice, signed_at")]);
    return json({ ok: true, synced, sync_error: syncError, customers: customers || [], cases: cases || [], notices: notices || [] });
  }

  if (action === "case_update") {
    if (!isUuid(body.id) || !["pending", "confirmed"].includes(body.disconnect_status)) return json({ error: "bad-request" }, 400);
    const when = /^\d{4}-\d{2}-\d{2}$/.test(String(body.disconnected_at || "")) ? body.disconnected_at : body.disconnect_status === "confirmed" ? new Date().toISOString().slice(0, 10) : null;
    const patch: Record<string, unknown> = { disconnect_status: body.disconnect_status, disconnected_at: body.disconnect_status === "confirmed" ? when : null };
    if (body.disconnect_note !== undefined) patch.disconnect_note = str(body.disconnect_note, 1000);
    const { error } = await admin.from("bel_recall_cases").update(patch).eq("id", body.id);
    if (error) return json({ error: "save-failed" }, 500);
    await audit("recall-case-updated", body.id, patch);
    return json({ ok: true });
  }

  if (action === "invite") {
    const { data: cu } = await admin.from("bel_customers").select("*").eq("odoo_partner_id", Number(body.partner_id)).maybeSingle();
    if (!cu) return json({ error: "not-found" }, 404);
    if (!cu.email) return json({ error: "no-email" }, 400);
    const email = cu.email.toLowerCase();
    const { data: kase } = await admin.from("bel_recall_cases").select("contact_name").eq("odoo_partner_id", cu.odoo_partner_id).maybeSingle();
    let { data: prof } = await admin.from("bel_profiles").select("id, last_login_at").ilike("email", email).maybeSingle();
    if (!prof) {
      const { data: u, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: kase?.contact_name || cu.name }, app_metadata: { app: "belinus-portal" } });
      if (error || !u?.user) { console.error("invite createUser", error?.message); return json({ error: "invite-failed" }, 500); }
      await admin.rpc("bel_profile_for_user", { p_user: u.user.id, p_first: "", p_last: "", p_company: "", p_phone: cu.phone || "", p_lang: lang(cu.lang) });
      prof = { id: u.user.id, last_login_at: null };
    } else { await admin.rpc("bel_link_customer", { p_profile: prof.id }); }
    const l = lang(cu.lang), T = INVITE[l], name = kase?.contact_name || cu.name, v = { name, days: String(INVITE_DAYS) };
    let cta = { url: `${APP}/#/login`, label: T.cta };
    if (!prof.last_login_at) {
      const code = randomCode();
      await admin.from("bel_invites").delete().eq("odoo_partner_id", cu.odoo_partner_id);
      await admin.from("bel_invites").insert({ code_hash: await sha256(code), odoo_partner_id: cu.odoo_partner_id, user_id: prof.id, expires_at: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString() });
      cta = { url: `${APP}/#/activate?code=${encodeURIComponent(code)}`, label: T.cta };
    }
    const sent = await mail(admin, email, kase ? T.rs : T.s, fill(kase ? T.rt : T.t, v), kase ? "invite-recall" : "invite", l, cta);
    if (!sent) return json({ error: "mail-failed" }, 502);
    await admin.from("bel_customers").update({ invited_at: new Date().toISOString() }).eq("odoo_partner_id", cu.odoo_partner_id);
    await audit("customer-invited", email, { partner: cu.odoo_partner_id, recall: !!kase });
    return json({ ok: true });
  }

  return json({ error: "bad-action" }, 400);
});
