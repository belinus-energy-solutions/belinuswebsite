// bel-switch — one identity, two portals: move a signed-in person between the support portal and the investor portal
// without signing in again.
//   { action: "targets" }        (signed in, second factor done) -> { support, investor }
//   { action: "create", to }     (signed in, second factor done) -> { url } one-time link, 60 seconds
//   { action: "redeem", code }   (from the target portal's own address) -> { session } or { ok:false, error:"expired" }
// The new session counts as having passed the second factor, because the session it came from did.
// Deploy: --no-verify-jwt (the function checks its caller itself).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const ORIGIN: Record<string, string> = { support: "https://portal.belinus.com", investor: "https://investor.belinus.com" };
const TTL_MS = 60_000;
const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const randomCode = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };

async function canUse(a: SupabaseClient, uid: string) {
  const [{ data: p }, { data: inv }, { data: adm }] = await Promise.all([
    a.from("bel_profiles").select("status").eq("id", uid).maybeSingle(),
    a.from("inv_investors").select("status").eq("user_id", uid).maybeSingle(),
    a.from("inv_admins").select("role").eq("user_id", uid).maybeSingle(),
  ]);
  return { support: !!p && p.status !== "suspended", investor: !!adm || (!!inv && inv.status === "active") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const audit = (id: string, email: string, ev: string, target: string) => a.from("bel_audit").insert({ actor: id, actor_email: email, event_type: ev, target, detail: {} }).then(() => {}, () => {});

  if (action === "redeem") {
    const target = Object.keys(ORIGIN).find((k) => ORIGIN[k] === req.headers.get("origin"));
    const code = String(body.code || "").slice(0, 100);
    if (!target || !code) return json({ ok: false, error: "expired" });
    const { data: row } = await a.from("bel_handoff").update({ used_at: new Date().toISOString() }).eq("code_hash", await sha256(code)).eq("target", target).is("used_at", null).gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle();
    if (!row) return json({ ok: false, error: "expired" });
    if (!(await canUse(a, row.user_id))[target as "support" | "investor"]) return json({ ok: false, error: "expired" });
    const { data: u } = await a.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) return json({ ok: false, error: "expired" });
    const { data: link, error: lErr } = await a.auth.admin.generateLink({ type: "magiclink", email });
    if (lErr || !link?.properties?.hashed_token) { console.error("bel-switch link:", lErr?.message); return json({ ok: false, error: "expired" }); }
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    if (error || !data?.session) { console.error("bel-switch verify:", error?.message || "no session"); return json({ ok: false, error: "expired" }); }
    const sid = claims(data.session.access_token).session_id;
    const { error: mErr } = await a.from("bel_mfa_sessions").upsert({ session_id: sid, user_id: row.user_id, method: "switch" });
    if (mErr) { console.error("bel-switch mfa:", mErr.message); return json({ ok: false, error: "expired" }); }
    await audit(row.user_id, email, "portal-switch", target);
    return json({ ok: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  }

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const c = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: c.session_id || null, p_aal: c.aal || null, p_amr: c.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const can = await canUse(a, user.id);

  if (action === "targets") return json({ ok: true, ...can });

  if (action === "create") {
    const to = String(body.to || "");
    if (to !== "support" && to !== "investor") return json({ error: "bad-target" }, 400);
    if (!can[to]) return json({ error: "forbidden" }, 403);
    await a.from("bel_handoff").delete().eq("user_id", user.id);
    const code = randomCode();
    const { error } = await a.from("bel_handoff").insert({ code_hash: await sha256(code), user_id: user.id, target: to, expires_at: new Date(Date.now() + TTL_MS).toISOString() });
    if (error) { console.error("bel-switch create:", error.message); return json({ error: "generic" }, 500); }
    return json({ ok: true, url: `${ORIGIN[to]}/#/switch?code=${encodeURIComponent(code)}` });
  }
  return json({ error: "bad-action" }, 400);
});
