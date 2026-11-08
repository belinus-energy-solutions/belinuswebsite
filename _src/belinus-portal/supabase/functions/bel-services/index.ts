// bel-services — the signed-in customer's subscribed services. Every user has at least Themis.
// Themis: EUR 10 a month excl. 21% VAT, 12 months minimum, then cancellable monthly. Existing customers on the cut-off date
// (an order or invoice in Odoo Belinus Energy BV, or a recall notice) get it free of charge as a promotion.
//   { action: "list" } -> { services: [...] }
//   { action: "products" } -> goods bought from Belinus Energy BV, from the confirmed Odoo orders
//   { action: "documents" } -> order and invoice PDFs and the files attached to those records in Odoo
//   { action: "attachment", id } -> one of those files
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
async function customerIds(email: string): Promise<number[]> {
  const rows = await rpc("res.partner", "search_read", [[["email", "=ilike", email], "|", ["company_id", "=", COMPANY], ["company_id", "=", false]]], { fields: ["email", "commercial_partner_id"], limit: 50 });
  return [...new Set<number>(rows.filter((p: any) => String(p.email || "").trim().toLowerCase() === email).map((p: any) => p.commercial_partner_id[0]))];
}
async function records(cids: number[]) {
  const [orders, moves] = await Promise.all([
    rpc("sale.order", "search_read", [[["company_id", "=", COMPANY], ["partner_id", "child_of", cids], ["state", "in", ["sent", "sale", "cancel"]]]], { fields: ["name", "date_order", "state", "invoice_ids"], order: "date_order desc", limit: 200 }),
    rpc("account.move", "search_read", [[["company_id", "=", COMPANY], ["commercial_partner_id", "in", cids], ["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"]]], { fields: ["name", "invoice_date", "move_type"], order: "invoice_date desc", limit: 300 }),
  ]);
  return { orders: orders.filter((o: any) => o.state !== "cancel" || o.invoice_ids.length || !/^QT/i.test(o.name)), moves };
}
const attachmentDomain = (o: number[], m: number[]) => ["|", "&", ["res_model", "=", "sale.order"], ["res_id", "in", o], "&", ["res_model", "=", "account.move"], ["res_id", "in", m]];
async function existingCustomer(email: string): Promise<boolean> {
  const cids = await customerIds(email);
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
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "list");
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

  const asPartner = me.role === "super" && Number.isInteger(Number(body.as_partner)) && Number(body.as_partner) > 0 ? Number(body.as_partner) : 0; // read-only "view as customer"
  if (action !== "list") {
    if (!KEY) return json({ error: "odoo-unavailable" }, 503);
    try {
      const cids = asPartner ? [asPartner] : await customerIds(user.email.toLowerCase());
      if (action === "products") {
        if (!cids.length) return json({ ok: true, products: [] });
        const orders = await rpc("sale.order", "search_read", [[["company_id", "=", COMPANY], ["partner_id", "child_of", cids], ["state", "=", "sale"]]], { fields: ["name", "date_order"], order: "date_order desc", limit: 200 });
        if (!orders.length) return json({ ok: true, products: [] });
        const lines = await rpc("sale.order.line", "search_read", [[["order_id", "in", orders.map((o: any) => o.id)], ["display_type", "=", false], ["product_id.type", "in", ["consu", "product", "combo"]]]], { fields: ["order_id", "product_id", "product_uom_qty"], limit: 1000 });
        const by = new Map(orders.map((o: any) => [o.id, o]));
        return json({ ok: true, products: lines.map((l: any) => { const o: any = by.get(l.order_id[0]); return { id: l.id, product: String(l.product_id[1]).replace(/^\[[^\]]*\]\s*/, ""), quantity: l.product_uom_qty, order: o.name, ordered_at: String(o.date_order).slice(0, 10) }; }) });
      }
      if (!cids.length) return json(action === "documents" ? { ok: true, orders: [], invoices: [], files: [] } : { error: "not-found" }, action === "documents" ? 200 : 404);
      const { orders, moves } = await records(cids);
      const o = orders.map((x: any) => x.id), m = moves.map((x: any) => x.id);
      if (action === "documents") {
        const files = o.length + m.length ? await rpc("ir.attachment", "search_read", [attachmentDomain(o, m)], { fields: ["name", "create_date", "res_model", "res_id", "mimetype"], order: "create_date desc", limit: 300 }) : [];
        const ref = (f: any) => ((f.res_model === "sale.order" ? orders : moves).find((x: any) => x.id === f.res_id) || {}).name || "";
        return json({ ok: true, orders: orders.map((x: any) => ({ id: x.id, number: x.name, date: String(x.date_order).slice(0, 10), state: x.state })), invoices: moves.map((x: any) => ({ id: x.id, number: x.name, date: x.invoice_date, credit: x.move_type === "out_refund" })), files: files.map((f: any) => ({ id: f.id, name: f.name, date: String(f.create_date).slice(0, 10), ref: ref(f) })) });
      }
      if (action === "attachment") {
        const id = Number(body.id);
        if (!Number.isInteger(id) || !(o.length + m.length)) return json({ error: "not-found" }, 404);
        const rows = await rpc("ir.attachment", "search_read", [[["id", "=", id], ...attachmentDomain(o, m)]], { fields: ["datas", "mimetype"], limit: 1 });
        if (!rows.length || !rows[0].datas) return json({ error: "not-found" }, 404);
        return new Response(Uint8Array.from(atob(rows[0].datas), (ch) => ch.charCodeAt(0)), { headers: { ...cors, "content-type": rows[0].mimetype || "application/octet-stream" } });
      }
      return json({ error: "bad-action" }, 400);
    } catch (e) { console.error("bel-services", action, (e as Error).message); return json({ error: "odoo-unavailable" }, 502); }
  }

  if (asPartner) {
    const { count: kase } = await a.from("bel_recall_cases").select("id", { count: "exact", head: true }).eq("odoo_partner_id", asPartner);
    let free = (kase || 0) > 0;
    if (!free && KEY) { try { free = (await rpc("sale.order", "search_count", [[["company_id", "=", COMPANY], ["partner_id", "child_of", [asPartner]], ["state", "=", "sale"]]])) > 0; } catch (_) { /* shown as paid */ } }
    return json({ ok: true, services: [{ service: "themis", status: "active", price_excl: free ? 0 : 10, vat_rate: 21, promo: free }] });
  }
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
