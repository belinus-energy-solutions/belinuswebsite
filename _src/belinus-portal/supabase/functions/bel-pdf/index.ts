// bel-pdf — customer download of an order, invoice or credit note in the Belinus template. The PDF service (Bunny container) renders them once
// and stores them on Nextcloud; this function checks ownership and asks the service for the stored file, signing the request with ODOO_API_KEY.
// Only documents that belong to the signed-in customer in Odoo, and only the template version: Odoo's own layout never reaches customers.
//   { kind: "order" | "invoice", id } -> application/pdf, or 404 { error: "pdf-unavailable" }
// Secret: ODOO_API_KEY. Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const ODOO = (Deno.env.get("ODOO_URL") || "https://van-beirs-consult-bv1.odoo.com").replace(/\/$/, ""), DB = Deno.env.get("ODOO_DB") || "van-beirs-consult-bv1", UID = Number(Deno.env.get("ODOO_UID") || 2), COMPANY = Number(Deno.env.get("ODOO_COMPANY_ID") || 3), KEY = Deno.env.get("ODOO_API_KEY") || "";
const PDF_SERVICE = (Deno.env.get("PDF_SERVICE_URL") || "https://mc-o3dciawlm0.bunny.run").replace(/\/$/, "");
async function sign(action: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000), enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`belinus-docs|${action}|${ts}`)));
  return `${ts}.${[...mac].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
async function rpc(model: string, method: string, args: unknown[], kw: Record<string, unknown> = {}): Promise<any> {
  const r = await (await fetch(`${ODOO}/jsonrpc`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(15000), body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: { service: "object", method: "execute_kw", args: [DB, UID, KEY, model, method, args, { ...kw, context: { allowed_company_ids: [COMPANY] } }] } }) })).json();
  if (r.error) throw new Error(r.error?.data?.message || r.error?.message);
  return r.result;
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
  const { data: me } = await a.from("bel_profiles").select("status, role").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);
  const id = Number(body.id), kind = String(body.kind), email = user.email.toLowerCase();
  if (!Number.isInteger(id) || !["order", "invoice"].includes(kind)) return json({ error: "not-found" }, 404);
  if (!KEY) return json({ error: "odoo-unavailable" }, 503);
  try {
    const rows = await rpc("res.partner", "search_read", [[["email", "=ilike", email], "|", ["company_id", "=", COMPANY], ["company_id", "=", false]]], { fields: ["email", "commercial_partner_id"], limit: 50 });
    const asPartner = me.role === "super" && Number(body.as_partner) > 0 ? Number(body.as_partner) : 0; // read-only "view as customer"
    const cids = asPartner ? [asPartner] : [...new Set(rows.filter((p: any) => String(p.email || "").trim().toLowerCase() === email).map((p: any) => p.commercial_partner_id[0]))];
    if (!cids.length) return json({ error: "not-found" }, 404);
    const n = kind === "invoice"
      ? await rpc("account.move", "search_count", [[["id", "=", id], ["company_id", "=", COMPANY], ["commercial_partner_id", "in", cids], ["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"]]])
      : await rpc("sale.order", "search_count", [[["id", "=", id], ["company_id", "=", COMPANY], ["partner_id", "child_of", cids], ["state", "in", ["sent", "sale", "cancel"]]]]);
    if (!n) return json({ error: "not-found" }, 404);
    const pdf = await fetch(`${PDF_SERVICE}/api/belinus-docs/pdf`, { method: "POST", headers: { "content-type": "application/json", "x-belinus-sig": await sign(`${kind}:${id}`) }, body: JSON.stringify({ kind, id }), signal: AbortSignal.timeout(60000) });
    if (!pdf.ok) { console.error("bel-pdf service", kind, id, pdf.status); return json({ error: "pdf-unavailable" }, pdf.status === 404 ? 404 : 502); }
    return new Response(await pdf.arrayBuffer(), { headers: { ...cors, "content-type": "application/pdf" } });
  } catch (e) { console.error("bel-pdf", kind, id, (e as Error).message); return json({ error: "odoo-unavailable" }, 502); }
});
