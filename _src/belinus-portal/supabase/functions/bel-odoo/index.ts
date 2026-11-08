// bel-odoo — live, read-only view of a customer's Odoo data (company Belinus Energy BV).
// The signed-in customer is matched on their confirmed e-mail address: only that contact's commercial entity is read.
//   { action: "orders" }                 -> orders, status, lines, deliveries, invoices and credit notes, repayment
//   { action: "invoices" }               -> invoices, credit notes, payments
//   { action: "summary" }                (super admin) -> totals for the dashboard
// Secret: ODOO_API_KEY. Optional: ODOO_URL, ODOO_DB, ODOO_UID, ODOO_COMPANY_ID. Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const ODOO = (Deno.env.get("ODOO_URL") || "https://van-beirs-consult-bv1.odoo.com").replace(/\/$/, "");
const DB = Deno.env.get("ODOO_DB") || "van-beirs-consult-bv1", UID = Number(Deno.env.get("ODOO_UID") || 2), COMPANY = Number(Deno.env.get("ODOO_COMPANY_ID") || 3), KEY = Deno.env.get("ODOO_API_KEY") || "";
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };

async function rpc(model: string, method: string, args: unknown[], kw: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(`${ODOO}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: { service: "object", method: "execute_kw", args: [DB, UID, KEY, model, method, args, { ...kw, context: { allowed_company_ids: [COMPANY] } }] } }) });
  const j = await res.json();
  if (j.error) throw new Error(`${model}.${method}: ${j.error?.data?.message || j.error?.message}`);
  return j.result;
}
const read = (model: string, domain: unknown[], fields: string[], order = "id desc", limit = 200) => rpc(model, "search_read", [domain], { fields, order, limit });
const day = (d: unknown) => (d ? String(d).slice(0, 10) : null);
const id0 = (v: any) => (Array.isArray(v) ? v[0] : v || null);
// Status corrections that Odoo does not show yet: invoices paid per the bank but not yet matched, recall orders installed but never validated in stock.
let OV = new Map<string, { status: string; on_date: string | null }>();

async function customerIds(email: string): Promise<number[]> {
  const rows = await read("res.partner", [["email", "=ilike", email], "|", ["company_id", "=", COMPANY], ["company_id", "=", false]], ["email", "commercial_partner_id"], "id", 50);
  return [...new Set<number>(rows.filter((p: any) => String(p.email || "").trim().toLowerCase() === email).map((p: any) => id0(p.commercial_partner_id)))];
}
const moveDomain = (cids: number[]) => [["company_id", "=", COMPANY], ["commercial_partner_id", "in", cids], ["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"]];
const orderDomain = (cids: number[]) => [["company_id", "=", COMPANY], ["partner_id", "child_of", cids], ["state", "in", ["sent", "sale", "cancel"]]];

function mapMove(m: any) {
  const credit = m.move_type === "out_refund", sign = credit ? -1 : 1, today = new Date().toISOString().slice(0, 10);
  const paidLike = ["paid", "in_payment"].includes(m.payment_state);
  const bankPaid = OV.get("invoice:" + m.name)?.status === "paid";
  const status = bankPaid ? "paid" : m.payment_state === "reversed" ? "cancelled"
    : credit ? (paidLike ? "repaid" : m.payment_state === "partial" ? "repay_partial" : "repay_pending")
    : paidLike ? "paid" : m.payment_state === "partial" ? "partly_paid" : m.invoice_date_due && m.invoice_date_due < today ? "overdue" : "open";
  return { id: m.id, odoo_id: m.id, number: m.name, kind: credit ? "credit" : "invoice", issued_at: day(m.invoice_date), due_at: day(m.invoice_date_due), total_incl: sign * m.amount_total, amount_paid: bankPaid ? sign * m.amount_total : sign * (m.amount_total - m.amount_residual), residual: bankPaid ? 0 : m.amount_residual, status,
    structured_ref: m.payment_reference || null, origin: m.invoice_origin || null, reversed: id0(m.reversed_entry_id) };
}
const MOVE_FIELDS = ["name", "move_type", "invoice_date", "invoice_date_due", "amount_total", "amount_residual", "payment_state", "payment_reference", "invoice_origin", "reversed_entry_id"];

async function orders(cids: number[]) {
  const all = (await read("sale.order", orderDomain(cids), ["name", "date_order", "state", "delivery_status", "commitment_date", "expected_date", "amount_total", "picking_ids", "invoice_ids"], "date_order desc", 100))
    // A cancelled quotation (QT...) was never an order, unless it was already invoiced.
    .filter((o: any) => (o.state !== "cancel" || o.invoice_ids.length || !/^QT/i.test(o.name)) && OV.get("order:" + o.name)?.status !== "hidden");
  if (!all.length) return [];
  const ids = all.map((o: any) => o.id), pids = all.flatMap((o: any) => o.picking_ids);
  const [lines, moves] = await Promise.all([
    read("sale.order.line", [["order_id", "in", ids], ["display_type", "=", false]], ["order_id", "name", "product_uom_qty", "sequence"], "sequence", 1000),
    read("account.move", moveDomain(cids), MOVE_FIELDS, "invoice_date desc", 500),
  ]);
  let picks: any[] = [];
  if (pids.length) {
    const base = [["id", "in", pids], ["picking_type_code", "=", "outgoing"]], f = ["state", "scheduled_date", "date_done"];
    try { picks = await read("stock.picking", base, [...f, "carrier_tracking_ref", "carrier_tracking_url", "carrier_id"], "id", 300); }
    catch { picks = await read("stock.picking", base, f, "id", 300).catch(() => []); }
  }
  const mapped = moves.map(mapMove);
  return all.map((o: any) => {
    const own = new Set<number>(o.invoice_ids);
    const docs = mapped.filter((m: any) => own.has(m.id) || String(m.origin || "").split(/[,\s]+/).includes(o.name));
    const mine = new Set(docs.map((m: any) => m.id));
    for (const m of mapped) if (m.reversed && mine.has(m.reversed) && !mine.has(m.id)) docs.push(m);
    const credits = docs.filter((m: any) => m.kind === "credit" && m.status !== "cancelled");
    const repayment = !credits.length ? null : credits.every((c: any) => c.status === "repaid") ? "repaid" : credits.some((c: any) => c.status === "repaid" || c.status === "repay_partial") ? "repay_partial" : "repay_pending";
    const forced = OV.get("order:" + o.name);
    const status = forced ? forced.status : o.state === "cancel" ? "cancelled" : o.state === "sent" ? "quote" : o.delivery_status === "full" ? "delivered" : o.delivery_status === "partial" ? "partly_delivered" : "confirmed";
    return { id: o.id, odoo_id: o.id, number: o.name, ordered_at: day(o.date_order), status, total_incl: o.amount_total, expected_delivery: day(o.commitment_date || o.expected_date), installation_date: forced?.on_date || null, repayment,
      docs: docs.map(({ origin, reversed, ...d }: any) => d),
      bel_order_lines: lines.filter((l: any) => id0(l.order_id) === o.id).map((l: any, i: number) => { const [p, ...d] = String(l.name || "").split("\n"); return { id: l.id, position: i, product: p, description: d.join(" ").slice(0, 200) || null, quantity: l.product_uom_qty }; }),
      bel_deliveries: forced ? [] : picks.filter((p: any) => o.picking_ids.includes(p.id) && p.state !== "cancel").map((p: any) => ({ id: p.id, status: p.state === "done" ? "delivered" : "planned", carrier: id0(p.carrier_id) ? p.carrier_id[1] : null, tracking_number: p.carrier_tracking_ref || null, tracking_url: p.carrier_tracking_url || null, planned_at: p.scheduled_date, delivered_at: p.date_done || null })) };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user?.email) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);
  if (!KEY) return json({ error: "odoo-unavailable" }, 503);
  const { data: ov } = await a.from("bel_odoo_overrides").select("kind, number, status, on_date");
  OV = new Map((ov || []).map((x: any) => [`${x.kind}:${x.number}`, { status: x.status, on_date: x.on_date }]));
  const action = String(body.action || "");
  try {
    if (action === "summary") {
      if (me.role !== "super") return json({ error: "forbidden" }, 403);
      const base = [["company_id", "=", COMPANY], ["state", "=", "posted"]];
      const [inv, cr, ord] = await Promise.all([
        read("account.move", [...base, ["move_type", "=", "out_invoice"], ["payment_state", "in", ["not_paid", "partial"]]], ["amount_residual"], "id", 2000),
        read("account.move", [...base, ["move_type", "=", "out_refund"], ["payment_state", "in", ["not_paid", "partial"]]], ["name", "partner_id", "invoice_date", "amount_total", "amount_residual"], "invoice_date desc", 2000),
        rpc("sale.order", "search_count", [[["company_id", "=", COMPANY], ["state", "=", "sale"], ["delivery_status", "in", ["pending", "started", "partial"]]]]),
      ]);
      const sum = (r: any[]) => r.reduce((s, x) => s + x.amount_residual, 0);
      return json({ ok: true, open_invoices: inv.length, open_amount: sum(inv), repay_count: cr.length, repay_amount: sum(cr), orders_to_deliver: ord,
        repayments: cr.map((x: any) => ({ number: x.name, customer: x.partner_id ? x.partner_id[1] : "", date: x.invoice_date, total: x.amount_total, outstanding: x.amount_residual })) });
    }
    const asPartner = me.role === "super" && Number.isInteger(Number(body.as_partner)) && Number(body.as_partner) > 0 ? Number(body.as_partner) : 0; // read-only "view as customer"
    const cids = asPartner ? [asPartner] : await customerIds(user.email.toLowerCase());
    if (action === "orders") return json({ ok: true, orders: cids.length ? await orders(cids) : [] });
    if (action === "invoices") {
      if (!cids.length) return json({ ok: true, invoices: [], payments: [] });
      const [moves, pays] = await Promise.all([
        read("account.move", moveDomain(cids), MOVE_FIELDS, "invoice_date desc", 300),
        read("account.payment", [["company_id", "=", COMPANY], ["partner_id", "child_of", cids], ["partner_type", "=", "customer"], ["state", "in", ["in_process", "paid"]]], ["date", "amount", "name", "memo", "payment_type"], "date desc", 300).catch(() => []),
      ]);
      return json({ ok: true, invoices: moves.map(mapMove).map(({ origin, reversed, ...m }: any) => m), payments: pays.map((p: any) => ({ id: p.id, paid_at: p.date, amount: p.payment_type === "outbound" ? -p.amount : p.amount, reference: p.memo || p.name })) });
    }
    return json({ error: "bad-action" }, 400);
  } catch (e) { console.error("bel-odoo", action, (e as Error).message); return json({ error: "odoo-unavailable" }, 502); }
});
