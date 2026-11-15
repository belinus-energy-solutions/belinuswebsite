// bel-haas — Vibe HaaS (Hardware-as-a-Service) rent contract: expressions of interest from belinus.com.
// Public (no sign-in):  submit { ...form }            → stored in bel_haas_interest, Belinus notified by e-mail
// Super admin:          list | update { id, status?, admin_note? }
// Belgium (country BE) = offer open; every other country = waiting list to open the offer there.
// Deploy: --no-verify-jwt (the function checks the caller itself).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
const int = (v: unknown, max = 999) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0; };
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
const STATUSES = ["new", "contacted", "qualified", "won", "lost", "waitlist"];
const COUNTRIES = ["BE", "NL", "LU", "FR", "DE", "CH", "AT", "IT", "ES", "PT", "UK", "IE", "DK", "SE", "NO", "FI", "PL", "CZ", "INT", "OTHER"];

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|bel-haas"));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ---------- public: expression of interest ----------
  if (action === "submit") {
    if (clean(body._hp, 200)) return json({ ok: true });                       // honeypot: pretend success
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
    const ipHash = await sha(ip);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await a.from("bel_haas_interest").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if ((count || 0) >= 6) return json({ error: "too-many" }, 429);

    const country = clean(body.country, 8).toUpperCase();
    const r = {
      country: COUNTRIES.includes(country) ? country : "OTHER",
      lang: ["en", "nl", "fr", "de", "it", "es"].includes(String(body.lang)) ? String(body.lang) : "en",
      company: clean(body.company, 160), vat: clean(body.vat, 40) || null,
      contact_name: clean(body.contact_name, 120), job_title: clean(body.job_title, 120) || null,
      email: clean(body.email, 200).toLowerCase(), phone: clean(body.phone, 40) || null,
      street: clean(body.street, 160) || null, zip: clean(body.zip, 16) || null, city: clean(body.city, 100) || null,
      qty_wall: int(body.qty_wall), qty_single: int(body.qty_single), qty_double: int(body.qty_double),
      term_months: [36, 48, 60].includes(Number(body.term_months)) ? Number(body.term_months) : null,
      use_case: clean(body.use_case, 80) || null, start_wish: clean(body.start_wish, 80) || null,
      message: clean(body.message, 3000) || null, consent: body.consent === true,
      source_url: clean(body.source_url, 300) || null, user_agent: clean(req.headers.get("user-agent"), 300) || null, ip_hash: ipHash,
    };
    const available = r.country === "BE";
    if (!r.company || !r.contact_name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email) || !r.consent) return json({ error: "invalid" }, 400);
    if (available && (!r.vat || !r.phone || !r.city)) return json({ error: "invalid" }, 400);
    if (r.qty_wall + r.qty_single + r.qty_double < 1) return json({ error: "invalid" }, 400);

    const { data: row, error } = await a.from("bel_haas_interest").insert({ ...r, available, status: available ? "new" : "waitlist" }).select("id, number").single();
    if (error) { console.error("haas insert", error.message); return json({ error: "server-error" }, 500); }

    // notify Belinus (best effort — the request is in the admin portal either way)
    const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN");
    const to = Deno.env.get("BELINUS_HAAS_INBOX") || Deno.env.get("BELINUS_SUPPORT_INBOX") || "service@belinus.com";
    if (key && domain) {
      const lines = [
        `${available ? "HaaS interest (Belgium)" : "HaaS waiting list · " + r.country} · #${row.number}`, "",
        `Company: ${r.company}${r.vat ? " · " + r.vat : ""}`, `Contact: ${r.contact_name}${r.job_title ? " (" + r.job_title + ")" : ""}`,
        `E-mail: ${r.email}`, `Phone: ${r.phone || "—"}`, `Address: ${[r.street, [r.zip, r.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}`,
        `Vibe Wall: ${r.qty_wall} · Vibe Pole single: ${r.qty_single} · Vibe Pole double: ${r.qty_double}`,
        `Term: ${r.term_months ? r.term_months + " months" : "—"} · Use: ${r.use_case || "—"} · Start: ${r.start_wish || "—"}`, "", r.message || "",
        "", `https://portal.belinus.com/#/haas/${row.id}`,
      ].join("\n");
      const f = new FormData();
      f.set("from", `Belinus website <${Deno.env.get("BELINUS_MAIL_FROM") || "noreply@belinus.com"}>`); f.set("to", to);
      f.set("subject", `${available ? "HaaS" : "HaaS waiting list " + r.country} #${row.number} — ${r.company}`); f.set("text", lines);
      f.set("html", `<pre style="font:14px/1.5 Arial,sans-serif;white-space:pre-wrap">${esc(lines)}</pre>`);
      f.set("h:Reply-To", r.email); f.set("o:tracking", "no"); f.set("v:kind", "haas-interest");
      try { const m = await fetch(`${(Deno.env.get("MAILGUN_API_BASE") || "https://api.eu.mailgun.net").replace(/\/$/, "")}/v3/${encodeURIComponent(domain)}/messages`, { method: "POST", headers: { Authorization: "Basic " + btoa("api:" + key) }, body: f }); if (!m.ok) console.error("haas mail", m.status); } catch (e) { console.error("haas mail", (e as Error).message); }
    }
    return json({ ok: true, number: row.number, available });
  }

  // ---------- super admin ----------
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("id, email, role, status").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended" || me.role !== "super") return json({ error: "forbidden" }, 403);

  if (action === "list") {
    const { data, error } = await a.from("bel_haas_interest").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) return json({ error: "server-error" }, 500);
    return json({ ok: true, rows: data });
  }
  if (action === "update") {
    if (!isUuid(body.id)) return json({ error: "invalid" }, 400);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), handled_by: me.email };
    if (body.status !== undefined) { if (!STATUSES.includes(String(body.status))) return json({ error: "invalid" }, 400); patch.status = String(body.status); }
    if (body.admin_note !== undefined) patch.admin_note = clean(body.admin_note, 4000) || null;
    const { data, error } = await a.from("bel_haas_interest").update(patch).eq("id", body.id).select("*").single();
    if (error) return json({ error: "server-error" }, 500);
    await a.from("bel_audit").insert({ actor: me.id, actor_email: me.email, event_type: "haas_update", target: body.id, detail: patch }).then(() => {}, () => {});
    return json({ ok: true, row: data });
  }
  return json({ error: "unknown-action" }, 400);
});
