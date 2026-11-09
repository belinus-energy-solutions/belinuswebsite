// bel-clavoris — contracts between Belinus and its customers, signed with a qualified signature through the Clavoris signing
// API (Belinus is a company account in Clavoris; each signature uses keys of that account). One secret: CLAVORIS_API_KEY.
// Customer:  mine | sign { id, mobile } -> { url } | check { id } | file { id, which: original|signed }
// Super:     mine { as_partner } (view as) | prepare { partner_id, title, file_name, file_b64 } | cancel { id } | account
// Clavoris:  POST with X-Clavoris-Signature (webhook; the status is then read back from Clavoris, the body is not trusted).
// Keys are only used when the customer starts signing. Nothing here sends mail. Deploy: --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
const claims = (jwt: string): Record<string, any> => { try { const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(b + "===".slice((b.length + 3) % 4))); } catch { return {}; } };
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (d: Uint8Array | string) => hex(await crypto.subtle.digest("SHA-256", (typeof d === "string" ? new TextEncoder().encode(d) : d) as BufferSource));
const b64 = (bytes: Uint8Array) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000))); return btoa(s); };
const phoneOk = (p: unknown) => { let s = String(p || "").replace(/[\s.\-()\/]/g, ""); if (s.startsWith("00")) s = "+" + s.slice(2); else if (/^0\d{8,9}$/.test(s)) s = "+32" + s.slice(1); return /^\+\d{8,15}$/.test(s) ? s : ""; };

const API = (Deno.env.get("CLAVORIS_API_URL") || "https://gihetiiuqawfhlwixncn.supabase.co/functions/v1/clv-api").replace(/\/$/, "");
const APP = (Deno.env.get("BELINUS_APP_URL") || "https://portal.belinus.com").replace(/\/$/, "");
const KEY = () => Deno.env.get("CLAVORIS_API_KEY") || "";
const BUCKET = "bel-docs", MAX_B64 = 19_000_000;
const clv = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(API + path, { method, headers: { authorization: "Bearer " + KEY(), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { res, data: res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => ({})) : null } as { res: Response; data: any };
};
const view = (c: any) => ({ id: c.id, title: c.title, status: c.status, created_at: c.created_at, signed_at: c.signed_at, signer_name: c.signer_name, name_check: c.name_check });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const store = a.storage.from(BUCKET);

  // Read the outcome from Clavoris and file the signed contract. Safe to repeat.
  async function sync(c: any): Promise<any> {
    if (!c.clavoris_id || c.status !== "signing") return c;
    const { res, data } = await clv("GET", `/v1/signatures/${c.clavoris_id}`);
    if (!res.ok || !data?.signature) return c;
    const s = data.signature, now = new Date().toISOString();
    if (s.status === "cancelled" || s.status === "failed") {
      const { data: u } = await a.from("bel_contracts").update({ status: "ready", clavoris_id: null, updated_at: now }).eq("id", c.id).eq("status", "signing").select("*").maybeSingle();
      return u || c;
    }
    if (s.status !== "completed") return c;
    const pdf = await clv("GET", `/v1/signatures/${c.clavoris_id}/documents/signed`);
    if (!pdf.res.ok) { await pdf.res.body?.cancel().catch(() => {}); return c; }
    const bytes = new Uint8Array(await pdf.res.arrayBuffer()), base = `contracts/${c.id}`;
    const put = await store.upload(`${base}/signed.pdf`, bytes, { contentType: "application/pdf", upsert: true });
    if (put.error) { console.error("signed store", put.error.message); return c; }
    let audit: string | null = null;
    const at = await clv("GET", `/v1/signatures/${c.clavoris_id}/documents/audit`);
    if (at.res.ok) { const up = await store.upload(`${base}/audit-trail.pdf`, new Uint8Array(await at.res.arrayBuffer()), { contentType: "application/pdf", upsert: true }); if (!up.error) audit = `${base}/audit-trail.pdf`; } else await at.res.body?.cancel().catch(() => {});
    const p = s.signers?.[0] || {};
    const { data: u } = await a.from("bel_contracts").update({ status: "signed", signed_path: `${base}/signed.pdf`, sha256_signed: await sha256(bytes), audit_path: audit, signed_at: p.signed_at || s.completed_at || now, signer_name: p.verified_name || p.name || null, signer_method: p.method || null, name_check: p.name_check || null, updated_at: now }).eq("id", c.id).eq("status", "signing").select("*").maybeSingle();
    return u || c;
  }

  // ---- webhook from Clavoris ----
  const sigHeader = req.headers.get("x-clavoris-signature");
  if (sigHeader) {
    if (!KEY()) return json({ error: "not-configured" }, 503);
    const raw = await req.text(), t = sigHeader.match(/t=(\d+)/)?.[1] || "", v1 = sigHeader.match(/v1=([0-9a-f]{64})/)?.[1] || "";
    if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return json({ error: "unauthorized" }, 401);
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(await sha256(KEY())), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const given = Uint8Array.from(v1.match(/../g)!.map((x) => parseInt(x, 16)));
    if (!(await crypto.subtle.verify("HMAC", k, given, new TextEncoder().encode(`${t}.${raw}`)))) return json({ error: "unauthorized" }, 401);
    const id = (() => { try { return String(JSON.parse(raw)?.signature?.id || ""); } catch { return ""; } })();
    if (!isUuid(id)) return json({ ok: true, ignored: true });
    const { data: c } = await a.from("bel_contracts").select("*").eq("clavoris_id", id).maybeSingle();
    if (c) await sync(c);
    return json({ ok: true });
  }

  // ---- signed-in portal users ----
  const body = await req.json().catch(() => ({}));
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: ud } = await a.auth.getUser(jwt);
  const user = ud?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const cl = claims(jwt);
  const { data: ok } = await a.rpc("bel_mfa_ok_for", { p_user: user.id, p_session: cl.session_id || null, p_aal: cl.aal || null, p_amr: cl.amr || [] });
  if (ok !== true) return json({ error: "mfa-required" }, 401);
  const { data: me } = await a.from("bel_profiles").select("id, email, full_name, first_name, last_name, mobile, lang, role, status").eq("id", user.id).maybeSingle();
  if (!me || me.status === "suspended") return json({ error: "forbidden" }, 403);
  const isSuper = me.role === "super", action = String(body.action || "");
  const { data: links } = await a.from("bel_customers").select("odoo_partner_id").eq("profile_id", me.id);
  const partners: number[] = (links || []).map((x: any) => Number(x.odoo_partner_id));
  const load = async (id: unknown) => { if (!isUuid(id)) return null; const { data: c } = await a.from("bel_contracts").select("*").eq("id", id).maybeSingle(); return c; };
  const mine = (c: any) => partners.includes(Number(c.odoo_partner_id));

  if (action === "mine") {
    const viewAs = Number(body.as_partner);
    if (body.as_partner != null && (!isSuper || !Number.isInteger(viewAs))) return json({ error: "forbidden" }, 403);
    const ids = body.as_partner != null ? [viewAs] : partners;
    if (!ids.length) return json({ ok: true, contracts: [], mobile: me.mobile || "" });
    const { data } = await a.from("bel_contracts").select("*").in("odoo_partner_id", ids).neq("status", "cancelled").order("created_at", { ascending: false });
    return json({ ok: true, contracts: (data || []).map(view), mobile: me.mobile || "" });
  }

  if (action === "sign") {
    if (!KEY()) return json({ error: "signing-unavailable" }, 503);
    const c = await load(body.id);
    if (!c || !mine(c)) return json({ error: "not-found" }, 404);
    if (c.status === "signed") return json({ error: "already-signed" }, 409);
    if (c.status === "cancelled") return json({ error: "not-found" }, 404);
    const phone = phoneOk(body.mobile || me.mobile);
    if (!phone) return json({ error: "mobile-required" }, 400);
    if (!me.mobile) await a.from("bel_profiles").update({ mobile: phone }).eq("id", me.id);
    const name = me.full_name || [me.first_name, me.last_name].filter(Boolean).join(" ");
    if (!name) return json({ error: "profile-name-required" }, 400);
    if (c.status === "signing" && c.clavoris_id) {
      const l = await clv("POST", `/v1/signatures/${c.clavoris_id}/link`);
      if (l.res.ok && l.data?.signing_url) return json({ ok: true, url: l.data.signing_url });
      const again = await sync(c);
      if (again.status === "signed") return json({ error: "already-signed" }, 409);
      if (again.status === "signing") return json({ error: "signing-unavailable" }, 503);
    }
    const dl = await store.download(c.original_path);
    if (dl.error) return json({ error: "document-unavailable" }, 500);
    const r = await clv("POST", "/v1/signatures", {
      reference: `belinus-contract-${c.id}-${(c.updated_at || "").replace(/\D/g, "")}`, title: c.title, file_name: c.file_name, lang: ["nl", "fr", "en"].includes(me.lang) ? me.lang : "nl",
      document_base64: b64(new Uint8Array(await dl.data.arrayBuffer())), signers: [{ name, email: me.email, phone }],
      return_url: `${APP}/#/contracts/${c.id}?signed=1`, webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/bel-clavoris`, metadata: { belinus_contract: c.id, partner: c.odoo_partner_id },
    });
    if (!r.res.ok || !r.data?.signing_url) { console.error("clavoris start", r.res.status, r.data?.error); return json({ error: r.data?.error === "signer-phone-invalid" ? "mobile-required" : "signing-unavailable", clavoris: r.data?.error || null }, r.res.status === 400 ? 400 : 503); }
    await a.from("bel_contracts").update({ status: "signing", clavoris_id: r.data.signature.id, updated_at: new Date().toISOString() }).eq("id", c.id);
    return json({ ok: true, url: r.data.signing_url });
  }

  if (action === "check") {
    const c = await load(body.id);
    if (!c || !(mine(c) || isSuper)) return json({ error: "not-found" }, 404);
    return json({ ok: true, contract: view(await sync(c)) });
  }

  if (action === "file") {
    const c = await load(body.id);
    if (!c || !(mine(c) || isSuper)) return json({ error: "not-found" }, 404);
    const path = body.which === "signed" ? c.signed_path : c.original_path;
    if (!path) return json({ error: "document-unavailable" }, 404);
    const { data } = await store.createSignedUrl(path, 120, { download: body.which === "signed" ? `${c.title} - ondertekend.pdf` : c.file_name });
    return data?.signedUrl ? json({ ok: true, url: data.signedUrl }) : json({ error: "document-unavailable" }, 500);
  }

  if (!isSuper) return json({ error: "forbidden" }, 403);

  if (action === "account") {
    if (!KEY()) return json({ ok: true, connected: false });
    const { res, data } = await clv("GET", "/v1/account");
    return json({ ok: true, connected: res.ok, error: res.ok ? null : data?.error || "unavailable", account: res.ok ? data : null });
  }

  if (action === "prepare") {
    const partner = Number(body.partner_id), title = String(body.title || "").trim().slice(0, 200), raw = String(body.file_b64 || "").replace(/^data:[^,]*,/, "");
    if (!Number.isInteger(partner) || !title || !raw) return json({ error: "bad-request" }, 400);
    if (raw.length > MAX_B64) return json({ error: "file-too-large" }, 413);
    const { data: cust } = await a.from("bel_customers").select("odoo_partner_id").eq("odoo_partner_id", partner).maybeSingle();
    if (!cust) return json({ error: "not-found" }, 404);
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(raw), (x) => x.charCodeAt(0)); } catch { return json({ error: "not-pdf" }, 400); }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return json({ error: "not-pdf" }, 400);
    const id = crypto.randomUUID(), path = `contracts/${id}/original.pdf`;
    const up = await store.upload(path, bytes, { contentType: "application/pdf" });
    if (up.error) { console.error("contract store", up.error.message); return json({ error: "save-failed" }, 500); }
    const { error } = await a.from("bel_contracts").insert({ id, odoo_partner_id: partner, title, file_name: String(body.file_name || "contract.pdf").slice(0, 160), original_path: path, sha256_original: await sha256(bytes), created_by: me.id });
    if (error) return json({ error: "save-failed" }, 500);
    return json({ ok: true, id });
  }

  if (action === "cancel") {
    const c = await load(body.id);
    if (!c) return json({ error: "not-found" }, 404);
    if (c.status === "signed") return json({ error: "already-signed" }, 409);
    if (c.clavoris_id && c.status === "signing") { const x = await clv("POST", `/v1/signatures/${c.clavoris_id}/cancel`); if (!x.res.ok) return json({ error: "signing-unavailable" }, 503); }
    await a.from("bel_contracts").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", c.id);
    return json({ ok: true });
  }
  return json({ error: "bad-action" }, 400);
});
