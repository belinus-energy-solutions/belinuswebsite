// bel-view-as — super admin only: the recall page exactly as a customer will see it, from the case file. Read-only, creates nothing.
//   { action: "recall", as_partner } -> { notice } or { notice: null } when the customer is not in the recall
// Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
const pick = (o: any, l: string) => (o && typeof o === "object" ? (o[l] || o.nl || "") : String(o || ""));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("role, status").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended" || me.role !== "super") return json({ error: "forbidden" }, 403);
  const partner = Number(body.as_partner);
  if (body.action !== "recall" || !Number.isInteger(partner)) return json({ error: "bad-action" }, 400);
  const { data: k } = await a.from("bel_recall_cases").select("*, bel_recalls(*), bel_recall_notices(status, signed_at, signed_name, choice, appointment_at)").eq("odoo_partner_id", partner).maybeSingle();
  if (!k) return json({ ok: true, notice: null });
  const { data: cu } = await a.from("bel_customers").select("lang").eq("odoo_partner_id", partner).maybeSingle();
  const r = k.bel_recalls, l = String(cu?.lang || "nl").slice(0, 2), n = k.bel_recall_notices || {};
  return json({ ok: true, notice: { id: "preview", case_id: k.id, status: n.status || "opened", signed_at: n.signed_at || null, signed_name: n.signed_name || null, choice: n.choice || null, appointment_at: n.appointment_at || null, code: r.code, risk: r.risk,
    title: pick(r.title, l), summary: pick(r.summary, l), instructions: k.instructions || pick(r.instructions, l), offer: pick(r.offer, l), pdf: null,
    system: { kind: "battery", product: k.product, model: k.model, serial: null, installed_at: k.installed_at }, account_name: k.contact_name } });
});
