// bel-inv-auth — public endpoints of the investor area. Only imported investor addresses can get a link; the answer is
// the same for unknown addresses.
//   { action: "start", email }            e-mails a one-time link (24 h) to set a password (first access or forgotten)
//   { action: "check", code }             -> { ok, email } while the link is valid
//   { action: "set_password", code, password } -> { ok, email }; the page then signs in with the password
//   { action: "provider_link", code } (with the Microsoft/Google session as bearer) -> { ok, email }; e-mail must match the invitation
import { boleroProposal } from "../_shared/bolero.ts";
import { adminClient, audit, clientIp, cors, EMAIL, hello, json, mailConfigured, pickLang, sendAccessLink, sendMail, sha256, str, strong } from "../_shared/inv.ts";

// At least 12 characters, at least 3 of the 4 character types, no more than 2 identical characters in a row (Steve, 8 November 2026).

async function leaked(p: string): Promise<boolean> {
  try {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(p))), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const r = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { headers: { "Add-Padding": "true", "User-Agent": "Belinus" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return false;
    return (await r.text()).split("\n").some((l) => { const [s, c] = l.trim().split(":"); return s === h.slice(5) && Number(c) > 0; });
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const a = adminClient();
  const ip = clientIp(req);
  const allow = async (key: string, gap: number, perHour: number) => { const { data } = await a.rpc("bel_auth_mail_allow", { p_key: key, p_gap_seconds: gap, p_per_hour: perHour }); return data === true; };
  const linkOf = async (code: string) => {
    const { data } = await a.from("inv_links").select("code_hash, investor_id, expires_at, used_at").eq("code_hash", await sha256(code)).maybeSingle();
    if (!data || data.used_at || new Date(data.expires_at).getTime() < Date.now()) return null;
    return data;
  };

  // Bolero vote: public page behind the personal link of the campaign mail (no account). The vote can be changed until the campaign is closed.
  if (action === "vote_info" || action === "vote_cast") {
    const code = String(body.code || "").slice(0, 100);
    if (ip && !(await allow("inv-vote-ip:" + (await sha256(ip)), 0, 60))) return json({ error: "too-many" }, 429);
    const { data: v } = code ? await a.from("inv_votes").select("investor_id, campaign_id, vote, voted_at").eq("token_hash", await sha256(code)).maybeSingle() : { data: null };
    if (!v) return json({ error: "not-found" }, 404);
    const [{ data: inv }, { data: c }] = await Promise.all([
      a.from("inv_investors").select("first_name, invested, email").eq("id", v.investor_id).single(),
      a.from("inv_campaigns").select("status, vote_deadline").eq("id", v.campaign_id).single(),
    ]);
    // Closed by hand, or automatically once the voting deadline has passed.
    const closed = c?.status === "closed" || (!!c?.vote_deadline && new Date(c.vote_deadline).getTime() < Date.now());
    if (action === "vote_cast") {
      const vote = String(body.vote || "");
      if (!["yes", "no"].includes(vote)) return json({ error: "bad-input" }, 400);
      if (closed) return json({ error: "closed" }, 400);
      const now = new Date().toISOString();
      await a.from("inv_votes").update({ vote, voted_at: now, ip }).eq("investor_id", v.investor_id).eq("campaign_id", v.campaign_id);
      await audit(a, null, "bolero-vote", inv.email, { vote, previous: v.vote, ip });
      if (mailConfigured()) await sendMail(a, { to: inv.email, kind: "vote-confirm", lang: "nl", subject: "Bevestiging van uw stem – EVChargeking", text: `${hello(inv.first_name, "nl")}\n\nWij hebben uw stem goed ontvangen: ${vote === "yes" ? "JA, ik steun de continuïteit van het bedrijf en sta een uitstel van betaling met drie maanden toe" : "NEE, ik sta geen uitstel van betaling toe"}.\n\nUw stem wordt pas definitief wanneer minstens 75% van de uitgebrachte stemmen het uitstel steunt, en onder voorbehoud van de ondertekening van het addendum bij het contract. Tot de afsluiting van de stemming kunt u uw stem nog wijzigen via de link in onze eerdere e-mail.\n\nHartelijk dank.\n\nMet vriendelijke groeten,\n\nErwin Raets\nCEO, EVChargeking (Some BV)` });
      return json({ ok: true, vote, voted_at: now });
    }
    const { data: sch } = await a.from("inv_schedule").select("scenario, due, net_interest, principal").eq("investor_id", v.investor_id).gte("due", "2026-10-01").lte("due", "2027-12-31");
    return json({ ok: true, first_name: inv.first_name, invested: inv.invested, vote: v.vote, voted_at: v.voted_at, closed, deadline: c?.vote_deadline || null, proposal: boleroProposal(sch || []) });
  }

  if (action === "start") {
    const email = str(body.email, 200).toLowerCase();
    if (!EMAIL.test(email)) return json({ error: "bad-email" }, 400);
    if (!mailConfigured()) return json({ error: "mail-not-configured" }, 503);
    if (ip && !(await allow("inv-ip:" + (await sha256(ip)), 0, 30))) return json({ ok: true });
    if (!(await allow("inv-mail:" + (await sha256(email)), 60, 5))) return json({ ok: true });
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, status, lang").eq("email", email).maybeSingle();
    if (inv && inv.status !== "suspended") { await sendAccessLink(a, inv, body.lang); await audit(a, null, "link-sent", email, { ip }); }
    return json({ ok: true });
  }

  // Login page: a registered investor who has not set a password yet is told so (Steve, 8 November 2026).
  if (action === "account_status") {
    const email = str(body.email, 200).toLowerCase();
    if (!EMAIL.test(email)) return json({ ok: true, needs_password: false });
    if (ip && !(await allow("inv-status-ip:" + (await sha256(ip)), 0, 40))) return json({ ok: true, needs_password: false });
    const { data: inv } = await a.from("inv_investors").select("status").eq("email", email).maybeSingle();
    return json({ ok: true, needs_password: inv?.status === "invited" });
  }

  if (action === "check") {
    const l = await linkOf(String(body.code || "").slice(0, 100));
    if (!l) {
      // Tell an investor who already set a password to simply sign in; nothing else is revealed.
      const { data: old } = await a.from("inv_links").select("investor_id").eq("code_hash", await sha256(String(body.code || "").slice(0, 100))).maybeSingle();
      if (old) { const { data: i } = await a.from("inv_investors").select("status").eq("id", old.investor_id).maybeSingle(); if (i?.status === "active") return json({ ok: false, error: "already-active" }); }
      return json({ ok: false, error: "expired", renewable: !!old });
    }
    const { data: inv } = await a.from("inv_investors").select("email").eq("id", l.investor_id).single();
    return json({ ok: true, email: inv.email });
  }

  // Expired invitation link: one click sends a fresh link to the address on file (the address itself is never shown).
  if (action === "renew") {
    const code = String(body.code || "").slice(0, 100);
    if (!code) return json({ ok: true });
    if (!mailConfigured()) return json({ error: "mail-not-configured" }, 503);
    if (ip && !(await allow("inv-renew-ip:" + (await sha256(ip)), 0, 20))) return json({ ok: true });
    const { data: old } = await a.from("inv_links").select("investor_id").eq("code_hash", await sha256(code)).maybeSingle();
    if (!old) return json({ ok: true });
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, status, lang").eq("id", old.investor_id).maybeSingle();
    if (!inv || inv.status === "suspended") return json({ ok: true });
    if (!(await allow("inv-mail:" + (await sha256(inv.email)), 60, 5))) return json({ ok: true });
    await sendAccessLink(a, inv);
    await audit(a, null, "link-renewed", inv.email, { ip });
    return json({ ok: true });
  }

  if (action === "set_password") {
    const password = String(body.password || "");
    if (!strong(password)) return json({ error: "weak-password" }, 400);
    if (await leaked(password)) return json({ error: "leaked-password" }, 400);
    const l = await linkOf(String(body.code || "").slice(0, 100));
    if (!l) return json({ error: "expired" }, 400);
    const { data: claimed } = await a.from("inv_links").update({ used_at: new Date().toISOString() }).eq("code_hash", l.code_hash).is("used_at", null).select("code_hash").maybeSingle();
    if (!claimed) return json({ error: "expired" }, 400);
    const { data: inv } = await a.from("inv_investors").select("id, email, user_id, status, first_name, last_name, lang").eq("id", l.investor_id).single();
    if (inv.status === "suspended") return json({ error: "expired" }, 400);
    let uid: string | null = inv.user_id;
    if (!uid) { const { data } = await a.rpc("inv_auth_user_id", { p_email: inv.email }); uid = data || null; }
    if (uid) {
      const { error } = await a.auth.admin.updateUserById(uid, { password, email_confirm: true });
      if (error) { console.error("inv update user", error.message); return json({ error: "server-error" }, 500); }
    } else {
      const { data, error } = await a.auth.admin.createUser({ email: inv.email, password, email_confirm: true, user_metadata: { full_name: [inv.first_name, inv.last_name].filter(Boolean).join(" ") }, app_metadata: { app: "belinus-investor" } });
      if (error || !data?.user) { console.error("inv create user", error?.message); return json({ error: "server-error" }, 500); }
      uid = data.user.id;
    }
    await a.from("inv_investors").update({ user_id: uid, status: "active", activated_at: new Date().toISOString(), lang: inv.lang || pickLang(body.lang) }).eq("id", inv.id);
    { const { data: st } = await a.from("inv_settings").select("value").eq("key", "admin_emails").maybeSingle(); const role = st?.value?.[inv.email]; if (role) await a.from("inv_admins").upsert({ user_id: uid, role }); }
    await audit(a, { id: uid!, email: inv.email }, "password-set", inv.email, { ip });
    return json({ ok: true, email: inv.email });
  }
  // Sign-in with Microsoft or Google from the invitation link. The provider account must carry the invited address; the link is
  // used up here and the second factor is then handled as after a password set (see bel-inv mfa_link).
  if (action === "provider_link") {
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer /i, "");
    const { data: got } = jwt ? await a.auth.getUser(jwt) : { data: null };
    const pu = got?.user;
    if (!pu || !["azure", "google"].includes(String(pu.app_metadata?.provider || ""))) return json({ error: "provider-required" }, 400);
    const l = await linkOf(String(body.code || "").slice(0, 100));
    if (!l) return json({ error: "expired" }, 400);
    const { data: inv } = await a.from("inv_investors").select("id, email, user_id, status, first_name, last_name, lang").eq("id", l.investor_id).single();
    if (!inv || inv.status === "suspended") return json({ error: "expired" }, 400);
    if (String(pu.email || "").toLowerCase() !== String(inv.email).toLowerCase()) return json({ error: "email-mismatch" }, 400);
    if (inv.user_id && inv.user_id !== pu.id) return json({ error: "account-conflict" }, 400);
    const { data: other } = await a.rpc("inv_auth_user_id", { p_email: inv.email });
    if (other && other !== pu.id) return json({ error: "account-conflict" }, 400);
    const { data: claimed } = await a.from("inv_links").update({ used_at: new Date().toISOString() }).eq("code_hash", l.code_hash).is("used_at", null).select("code_hash").maybeSingle();
    if (!claimed) return json({ error: "expired" }, 400);
    const { error: mdErr } = await a.auth.admin.updateUserById(pu.id, { app_metadata: { ...(pu.app_metadata || {}), app: "belinus-investor" } });
    if (mdErr) { console.error("inv provider app_metadata", mdErr.message); return json({ error: "server-error" }, 500); }
    await a.from("inv_investors").update({ user_id: pu.id, status: "active", activated_at: new Date().toISOString(), lang: inv.lang || pickLang(body.lang) }).eq("id", inv.id);
    { const { data: st } = await a.from("inv_settings").select("value").eq("key", "admin_emails").maybeSingle(); const role = st?.value?.[inv.email]; if (role) await a.from("inv_admins").upsert({ user_id: pu.id, role }); }
    await audit(a, { id: pu.id, email: inv.email }, "provider-set", inv.email, { ip, provider: pu.app_metadata?.provider });
    return json({ ok: true, email: inv.email });
  }
  return json({ error: "bad-action" }, 400);
});
