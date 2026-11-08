// bel-hub — messages between Belinus and customers, the recall notice text, and the super admin screens.
// Everyone:    recall_info | messages | messages_read | message_reply { body }
// Super admin: dashboard | customers | customer { id } | message_send { id, body } | broadcast { audience: all|recall, body }
//              recall_assign { id, system_id? } | recall_remove { notice_id }
// Messages appear in the portal and are announced by e-mail. Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const APP = "https://portal.belinus.com";
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, n);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
type L = "nl" | "fr" | "en";
const lang = (l: unknown): L => (l === "fr" || l === "en" ? l : "nl");
const COPY: Record<L, { s: string; hi: string; t: string; cta: string; rs: string; rt: string; rcta: string }> = {
  nl: { s: "Belinus: nieuw bericht in uw klantenportaal", hi: "Beste", t: "U hebt een nieuw bericht van Belinus:", cta: "Bekijk en antwoord", rs: "Belinus: belangrijke terugroepactie voor uw batterij", rt: "Uw installatie valt onder een terugroepactie. Lees de melding en bevestig ze in uw klantenportaal.", rcta: "Bekijk de melding" },
  fr: { s: "Belinus : nouveau message dans votre portail client", hi: "Bonjour", t: "Vous avez un nouveau message de Belinus :", cta: "Voir et répondre", rs: "Belinus : rappel important concernant votre batterie", rt: "Votre installation est concernée par un rappel. Lisez l’avis et confirmez-le dans votre portail client.", rcta: "Voir l’avis" },
  en: { s: "Belinus: new message in your customer portal", hi: "Dear", t: "You have a new message from Belinus:", cta: "View and reply", rs: "Belinus: important recall for your battery", rt: "Your installation is covered by a recall. Please read the notice and confirm it in your customer portal.", rcta: "View the notice" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("id, email, role, status, full_name, first_name, last_name").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);
  const audit = (ev: string, target: string, detail: Record<string, unknown> = {}) => a.from("bel_audit").insert({ actor: me.id, actor_email: me.email, event_type: ev, target, detail }).then(() => {}, () => {});
  const nameOf = (p: any) => p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;

  async function mail(to: string, subject: string, text: string, kind: string, l: L, url: string, label: string): Promise<boolean> {
    const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN");
    if (!key || !domain) return false;
    const paras = text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px;font:15px/1.6 Arial,sans-serif;color:#222830">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    const html = `<div style="background:#F5F6F7;padding:28px 12px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:3px solid #2EB9EA"><p style="margin:0 0 22px;font:700 20px Arial,sans-serif;color:#0A0C0F">belinus</p>${paras}<a href="${esc(url)}" style="display:inline-block;background:#2EB9EA;color:#0A0C0F;border-radius:999px;padding:12px 28px;font:700 15px Arial,sans-serif;text-decoration:none">${esc(label)}</a></div></div>`;
    const f = new FormData();
    f.set("from", `Belinus <${Deno.env.get("BELINUS_MAIL_FROM") || "noreply@belinus.com"}>`); f.set("to", to); f.set("subject", subject); f.set("text", `${text}\n\n${url}`); f.set("html", html);
    f.set("h:Reply-To", "support@belinus.com"); f.set("o:tracking", "no"); f.set("v:kind", kind);
    try {
      const r = await fetch(`${(Deno.env.get("MAILGUN_API_BASE") || "https://api.eu.mailgun.net").replace(/\/$/, "")}/v3/${encodeURIComponent(domain)}/messages`, { method: "POST", headers: { Authorization: "Basic " + btoa("api:" + key) }, body: f });
      if (!r.ok) { console.error("hub mail", r.status); return false; }
      const j = await r.json().catch(() => ({}));
      await a.from("bel_mail_log").insert({ message_id: String(j?.id || crypto.randomUUID()).replace(/^<|>$/g, ""), recipient: to.toLowerCase(), subject, kind, lang: l }).then(() => {}, () => {});
      return true;
    } catch (e) { console.error("hub mail", (e as Error).message); return false; }
  }
  async function sendTo(p: any, text: string, broadcast: string | null) {
    const { data: m } = await a.from("bel_messages").insert({ owner_id: p.id, direction: "out", body: text, author: me!.id, author_email: me!.email, mail_status: "sending", broadcast_id: broadcast }).select("*").single();
    const l = lang(p.lang), C = COPY[l];
    const sent = await mail(p.email, C.s, `${C.hi} ${nameOf(p)},\n\n${C.t}\n\n${text}`, "message", l, `${APP}/#/messages`, C.cta);
    const { data: done } = await a.from("bel_messages").update({ mail_status: sent ? "sent" : "failed" }).eq("id", m.id).select("*").single();
    return done;
  }

  if (action === "recall_info") {
    const { data } = await a.from("bel_recalls").select("code, title, summary, instructions").eq("status", "active");
    return json({ ok: true, recalls: data || [] });
  }
  if (action === "messages") {
    const { data } = await a.from("bel_messages").select("id, direction, body, created_at, read_at").eq("owner_id", me.id).order("created_at");
    return json({ ok: true, messages: data || [] });
  }
  if (action === "messages_read") { await a.from("bel_messages").update({ read_at: new Date().toISOString() }).eq("owner_id", me.id).eq("direction", "out").is("read_at", null); return json({ ok: true }); }
  if (action === "message_reply") {
    const text = clean(body.body, 4000);
    if (!text) return json({ error: "message-required" }, 400);
    const { data: m } = await a.from("bel_messages").insert({ owner_id: me.id, direction: "in", body: text, author: me.id, author_email: me.email }).select("id, direction, body, created_at, read_at").single();
    await mail(Deno.env.get("BELINUS_SUPPORT_INBOX") || "support@belinus.com", `Nieuw bericht van ${nameOf(me)}`, `${nameOf(me)} (${me.email}) antwoordde in het klantenportaal:\n\n${text}`, "message-in", "nl", `${APP}/#/customers/${me.id}`, "Bekijk en antwoord");
    return json({ ok: true, message: m });
  }

  // ---- super admin ----
  if (me.role !== "super") return json({ error: "forbidden" }, 403);
  const COLS = "id, email, full_name, first_name, last_name, company_name, city, mobile, lang, role, status, last_login_at, created_at";

  async function customers() {
    const [{ data: ps }, { data: sites }, { data: sys }, { data: tk }, { data: nt }, { data: un }] = await Promise.all([
      a.from("bel_profiles").select(COLS).order("created_at", { ascending: false }).limit(5000),
      a.from("bel_sites").select("id, owner_id"), a.from("bel_systems").select("id, site_id"),
      a.from("bel_support_tickets").select("user_id, status").neq("status", "closed"),
      a.from("bel_recall_notices").select("id, owner_id, status"),
      a.from("bel_messages").select("owner_id").eq("direction", "in").is("read_at", null),
    ]);
    const owner = new Map((sites || []).map((s: any) => [s.id, s.owner_id]));
    const count = (rows: any[], key: (r: any) => unknown) => { const m = new Map<unknown, number>(); for (const r of rows) m.set(key(r), (m.get(key(r)) || 0) + 1); return m; };
    const sc = count(sys || [], (y) => owner.get(y.site_id)), tc = count(tk || [], (t) => t.user_id), uc = count(un || [], (m) => m.owner_id);
    const rank = ["sent", "opened", "appointment", "signed", "replaced", "closed"];
    const rec = new Map<string, string>();
    for (const n of nt || []) { const cur = rec.get(n.owner_id); if (!cur || rank.indexOf(n.status) < rank.indexOf(cur)) rec.set(n.owner_id, n.status); }
    return (ps || []).map((p: any) => ({ ...p, name: nameOf(p), systems: sc.get(p.id) || 0, open_tickets: tc.get(p.id) || 0, unread: uc.get(p.id) || 0, recall: rec.get(p.id) || null }));
  }

  if (action === "customers") return json({ ok: true, customers: await customers() });

  if (action === "dashboard") {
    const now = Date.now(), iso = (d: number) => new Date(now - d * 86400000).toISOString();
    const [list, { data: tk }, { data: nt }] = await Promise.all([customers(),
      a.from("bel_support_tickets").select("status, safety, assigned_to, response_due, created_at").is("merged_into", null),
      a.from("bel_recall_notices").select("status")]);
    const cust = list.filter((p: any) => !["staff", "super"].includes(p.role));
    const open = (tk || []).filter((t: any) => t.status === "open" || t.status === "on_hold");
    const by = (s: string[]) => (nt || []).filter((n: any) => s.includes(n.status)).length;
    return json({ ok: true,
      customers: { total: cust.length, new7: cust.filter((p: any) => p.created_at > iso(7)).length, active30: cust.filter((p: any) => p.last_login_at && p.last_login_at > iso(30)).length, unread: list.reduce((s: number, p: any) => s + p.unread, 0) },
      tickets: { open: open.length, safety: open.filter((t: any) => t.safety).length, overdue: open.filter((t: any) => t.response_due && new Date(t.response_due).getTime() < now).length, unassigned: open.filter((t: any) => !t.assigned_to).length, new7: (tk || []).filter((t: any) => t.created_at > iso(7)).length },
      recall: { total: (nt || []).length, waiting: by(["sent"]), opened: by(["opened"]), signed: by(["signed", "appointment"]), done: by(["replaced", "closed"]) },
      latest: cust.slice(0, 6).map((p: any) => ({ id: p.id, name: p.name, email: p.email, created_at: p.created_at, recall: p.recall })) });
  }

  const target = async (id: unknown) => { if (!isUuid(id)) return null; const { data } = await a.from("bel_profiles").select(COLS).eq("id", id as string).maybeSingle(); return data; };

  if (action === "customer") {
    const p = await target(body.id);
    if (!p) return json({ error: "not-found" }, 404);
    await a.from("bel_messages").update({ read_at: new Date().toISOString() }).eq("owner_id", p.id).eq("direction", "in").is("read_at", null);
    const { data: sites } = await a.from("bel_sites").select("id, street, postal_code, city").eq("owner_id", p.id);
    const sid = (sites || []).map((s: any) => s.id);
    const [{ data: systems }, { data: tickets }, { data: notices }, { data: messages }, { data: recalls }] = await Promise.all([
      sid.length ? a.from("bel_systems").select("id, kind, product, model, serial, status").in("site_id", sid) : Promise.resolve({ data: [] }),
      a.from("bel_support_tickets").select("id, number, subject, status, safety, last_message_at").eq("user_id", p.id).order("last_message_at", { ascending: false }).limit(50),
      a.from("bel_recall_notices").select("id, status, opened_at, signed_at, signed_name, choice, created_at, system_id, bel_recalls(code, title)").eq("owner_id", p.id).order("created_at"),
      a.from("bel_messages").select("id, direction, body, created_at, read_at, author_email, mail_status").eq("owner_id", p.id).order("created_at"),
      a.from("bel_recalls").select("id, code, title").eq("status", "active"),
    ]);
    return json({ ok: true, customer: { ...p, name: nameOf(p) }, sites, systems, tickets, notices, messages, recalls });
  }
  if (action === "message_send") {
    const p = await target(body.id), text = clean(body.body, 4000);
    if (!p) return json({ error: "not-found" }, 404);
    if (!text) return json({ error: "message-required" }, 400);
    const m = await sendTo(p, text, null);
    await audit("customer-message-sent", p.email, { mail: m?.mail_status });
    return json({ ok: true, message: m });
  }
  if (action === "broadcast") {
    const text = clean(body.body, 4000), audience = body.audience === "recall" ? "recall" : "all";
    if (!text) return json({ error: "message-required" }, 400);
    const list = (await customers()).filter((p: any) => p.status !== "suspended" && !["staff", "super"].includes(p.role) && (audience === "all" || p.recall));
    const id = crypto.randomUUID();
    let sent = 0, failed = 0;
    for (const p of list) { const m = await sendTo(p, text, id); if (m?.mail_status === "sent") sent++; else failed++; }
    await audit("customer-broadcast", audience, { id, sent, failed });
    return json({ ok: true, sent, failed });
  }
  if (action === "recall_assign") {
    const p = await target(body.id);
    if (!p) return json({ error: "not-found" }, 404);
    const { data: r } = await a.from("bel_recalls").select("id, code").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!r) return json({ error: "not-found" }, 404);
    const system = isUuid(body.system_id) ? body.system_id : null;
    const { data: dup } = await a.from("bel_recall_notices").select("id").eq("recall_id", r.id).eq("owner_id", p.id).limit(1).maybeSingle();
    if (dup) return json({ error: "already-assigned" }, 409);
    const { data: n, error } = await a.from("bel_recall_notices").insert({ recall_id: r.id, owner_id: p.id, system_id: system, status: "sent" }).select("id").single();
    if (error) { console.error("recall assign", error.message); return json({ error: "save-failed" }, 500); }
    const l = lang(p.lang), C = COPY[l];
    const mailed = await mail(p.email, C.rs, `${C.hi} ${nameOf(p)},\n\n${C.rt}`, "recall", l, `${APP}/#/recall/${n.id}`, C.rcta);
    await audit("recall-assigned", p.email, { code: r.code, notice: n.id, mail: mailed });
    return json({ ok: true, mailed });
  }
  if (action === "recall_remove") {
    if (!isUuid(body.notice_id)) return json({ error: "not-found" }, 404);
    const { data: gone } = await a.from("bel_recall_notices").delete().eq("id", body.notice_id).in("status", ["sent", "opened"]).select("id, owner_id").maybeSingle();
    if (!gone) return json({ error: "not-found" }, 404);
    await audit("recall-removed", gone.owner_id, { notice: gone.id });
    return json({ ok: true });
  }
  return json({ error: "bad-action" }, 400);
});
