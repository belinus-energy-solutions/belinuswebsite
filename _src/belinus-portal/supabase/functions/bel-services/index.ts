// bel-services — the signed-in customer's subscribed services. Every user has at least Themis.
// Themis: EUR 10 a month excl. 21% VAT, 12 months minimum, then cancellable monthly. Existing customers on the cut-off date
// (an order or invoice in Odoo Belinus Energy BV, or a recall notice) get it free of charge as a promotion.
//   { action: "list" } -> { services: [...] }
// Secret: ODOO_API_KEY. Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const CUT_OFF = "2026-11-08", ODOO = (Deno.env.get("ODOO_URL") || "https://van-beirs-consult-bv1.odoo.com").replace(/\/$/, ""), DB = Deno.env.get("ODOO_DB") || "van-beirs-consult-bv1", UID = Number(Deno.env.get("ODOO_UID") || 2), COMPANY = Number(Deno.env.get("ODOO_COMPANY_ID") || 3), KEY = Deno.env.get("ODOO_API_KEY") || "";
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
async function rpc(model: string, method: string, args: unknown[], kw: Record<string, unknown> = {}): Promise<any> {
  const r = await (await fetch(`${ODOO}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(15000), body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: { service: "object", method: "execute_kw", args: [DB, UID, KEY, model, method, args, { ...kw, context: { allowed_company_ids: [COMPANY] } }] } }) })).json();
  if (r.error) throw new Error(r.error?.data?.message || r.error?.message);
  return r.result;
}
async function existingCustomer(email: string): Promise<boolean> {
  const rows = await rpc("res.partner", "search_read", [[["email", "=ilike", email], "|", ["company_id", "=", COMPANY], ["company_id", "=", false]]], { fields: ["email", "commercial_partner_id"], limit: 50 });
  const cids = [...new Set(rows.filter((p: any) => String(p.email || "").trim().toLowerCase() === email).map((p: any) => p.commercial_partner_id[0]))];
  if (!cids.length) return false;
  const [o, i] = await Promise.all([
    rpc("sale.order", "search_count", [[["company_id", "=", COMPANY], ["partner_id", "child_of", cids], ["state", "=", "sale"], ["date_order", "<=", CUT_OFF + " 23:59:59"]]]),
    rpc("account.move", "search_count", [[["company_id", "=", COMPANY], ["commercial_partner_id", "in", cids], ["move_type", "=", "out_invoice"], ["state", "=", "posted"], ["invoice_date", "<=", CUT_OFF]]]),
  ]);
  return o > 0 || i > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user?.email) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("id, role, status, created_at").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);

  const { count: recall } = await a.from("bel_recall_notices").select("id", { count: "exact", head: true }).eq("owner_id", me.id);
  const internal = me.role === "staff" || me.role === "super";
  let { data: sub } = await a.from("bel_subscriptions").select("*").eq("owner_id", me.id).eq("service", "themis").maybeSingle();
  if (!sub) {
    let promo: boolean | null = internal || (recall || 0) > 0 ? true : null;
    if (promo === null && KEY) { try { promo = await existingCustomer(user.email.toLowerCase()); } catch (e) { console.error("bel-services odoo", (e as Error).message); } }
    if (promo === null) return json({ ok: true, services: [{ service: "themis", status: "active", price_excl: null, vat_rate: 21, promo: false, pending: true }] });
    const { data: made } = await a.from("bel_subscriptions").upsert({ owner_id: me.id, service: "themis", promo, price_excl: promo ? 0 : 10 }, { onConflict: "owner_id,service" }).select("*").single();
    sub = made;
  } else if (!sub.promo && (recall || 0) > 0) {
    const { data: up } = await a.from("bel_subscriptions").update({ promo: true, price_excl: 0 }).eq("id", sub.id).select("*").single();
    sub = up;
  }
  return json({ ok: true, services: [sub] });
});
