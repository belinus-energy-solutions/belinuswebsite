// bel-recall-letter — the recall letter of one case file as sent to the customer on 2 November 2026, from the PDF service.
//   { notice_id } for the customer who owns the notice, or { case_id } for the super admin -> application/pdf
// Secret: ODOO_API_KEY (signs the request to the PDF service). Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const KEY = Deno.env.get("ODOO_API_KEY") || "", PDF_SERVICE = (Deno.env.get("PDF_SERVICE_URL") || "https://mc-o3dciawlm0.bunny.run").replace(/\/$/, "");
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
async function sign(action: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000), enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`belinus-docs|${action}|${ts}`)));
  return `${ts}.${[...mac].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
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
  if (!user) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("id, role, status").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);
  let path: string | null = null;
  if (isUuid(body.case_id) && me.role === "super") {
    const { data: k } = await a.from("bel_recall_cases").select("letter_path").eq("id", body.case_id).maybeSingle();
    path = k?.letter_path || null;
  } else if (isUuid(body.notice_id)) {
    const { data: n } = await a.from("bel_recall_notices").select("id, owner_id").eq("id", body.notice_id).maybeSingle();
    if (n && n.owner_id === me.id) { const { data: k } = await a.from("bel_recall_cases").select("letter_path").eq("notice_id", n.id).maybeSingle(); path = k?.letter_path || null; }
  }
  if (!path) return json({ error: "not-found" }, 404);
  try {
    const r = await fetch(`${PDF_SERVICE}/api/belinus-docs/letter`, { method: "POST", headers: { "content-type": "application/json", "x-belinus-sig": await sign(`letter:${path}`) }, body: JSON.stringify({ path }), signal: AbortSignal.timeout(45000) });
    if (!r.ok) { console.error("recall letter", r.status); return json({ error: "pdf-unavailable" }, 502); }
    return new Response(await r.arrayBuffer(), { headers: { ...cors, "content-type": "application/pdf" } });
  } catch (e) { console.error("recall letter", (e as Error).message); return json({ error: "pdf-unavailable" }, 502); }
});
