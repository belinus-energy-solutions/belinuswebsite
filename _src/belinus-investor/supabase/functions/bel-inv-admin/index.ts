// bel-inv-admin — superadmins of the investor area: Belinus (role belinus) and EVChargeking (role evc). This function only reads the EVChargeking investor tables (inv_*). Second factor required.
import { deleteMeeting, moveMeeting } from "../_shared/teams.ts";
import { bSchedule as bSched, cent, loanKind as kindFor } from "../_shared/finance.ts";
import { html as mailHtml, icsEvent as ics, hello, KIND_L, access, adminClient, applyChoice, audit, cors, currentUser, dateIn, json, mailConfigured, nlDate, pickLang, sendAccessLink, sendInvite, sendMail, settings, str, mailMessage, invitePreview, bookingPreview, inviteContent, APP_URL } from "../_shared/inv.ts";

const SETTINGS_BELINUS = ["deadline", "interest_only_date", "gift", "notify_email"];
const SETTINGS_ALL = ["booking", "video_url"];

async function invitedMap(a: any): Promise<Map<string, string>> {
  const { data } = await a.from("inv_mail_log").select("recipient, created_at").eq("kind", "invite").eq("status", "sent").order("created_at");
  return new Map((data || []).map((r: any) => [String(r.recipient).toLowerCase(), r.created_at]));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const a = adminClient();
  const u = await currentUser(a, req);
  if (!u) return json({ error: "unauthorized" }, 401);
  const acc = await access(a, u);
  if (!acc.role) return json({ error: "forbidden" }, 403);
  if (!acc.mfa) return json({ error: "mfa-required" }, 401);
  const id = String(body.id || "");

  if (action === "dashboard") {
    const [{ data: inv }, { data: ch }, { data: fu }, { data: tr }] = await Promise.all([
      a.from("inv_investors").select("id, email, first_name, last_name, company_name, phone, tranche, invested, status, is_test, is_demo, activated_at, last_login_at").order("last_name"),
      a.from("inv_choices").select("investor_id, choice, wish, reason, confirmed_at, addendum_status"),
      a.from("inv_followups").select("id, investor_id, kind, due_date, status, notes").neq("status", "cancelled"),
      a.from("inv_tranches").select("*").order("code"),
    ]);
    const byC = new Map((ch || []).map((c: any) => [c.investor_id, c]));
    const sent = await invitedMap(a);
    const { data: unread } = await a.from("inv_messages").select("investor_id").eq("direction", "in").is("read_at", null);
    const un = new Map<string, number>(); for (const r of unread || []) un.set(r.investor_id, (un.get(r.investor_id) || 0) + 1);
    return json({ ok: true, role: acc.role, unread: Object.fromEntries(un), investors: (inv || []).map((i: any) => ({ ...i, choice: byC.get(i.id) || null, invited_at: sent.get(i.email) || null })), followups: fu, tranches: tr, settings: await settings(a) });
  }
  if (action === "detail") {
    const [{ data: inv }, { data: sch }, { data: log }, { data: bk }] = await Promise.all([
      a.from("inv_investors").select("id, email, first_name, last_name, company_name, phone, tranche, invested, invested_on, status, is_test, activated_at, last_login_at, lang").eq("id", id).single(),
      a.from("inv_schedule").select("*").eq("investor_id", id).order("period"),
      a.from("inv_choice_log").select("*").eq("investor_id", id).order("created_at", { ascending: false }),
      a.from("inv_bookings").select("*").eq("investor_id", id).order("starts_at"),
    ]);
    return json({ ok: true, investor: inv, schedule: sch, log, bookings: bk });
  }
  // Full investor page: loan, choices, appointments with their notes (admins only), messages and the mails sent.
  if (action === "investor_page") {
    const [{ data: inv }, { data: sch }, { data: log }, { data: bk }, { data: notes }, { data: msgs }, { data: ch }, { data: tr }] = await Promise.all([
      a.from("inv_investors").select("id, email, first_name, last_name, company_name, phone, tranche, invested, invested_on, status, is_test, is_demo, activated_at, last_login_at, lang").eq("id", id).single(),
      a.from("inv_schedule").select("*").eq("investor_id", id).order("period"),
      a.from("inv_choice_log").select("*").eq("investor_id", id).order("created_at", { ascending: false }),
      a.from("inv_bookings").select("*, inv_events(title)").eq("investor_id", id).order("starts_at", { ascending: false }),
      a.from("inv_notes").select("*").eq("investor_id", id).order("created_at", { ascending: false }),
      a.from("inv_messages").select("*").eq("investor_id", id).order("created_at"),
      a.from("inv_choices").select("*").eq("investor_id", id).maybeSingle(),
      a.from("inv_tranches").select("*").order("code"),
    ]);
    if (!inv) return json({ error: "not-found" }, 404);
    const { data: mails } = await a.from("inv_mail_log").select("subject, kind, status, created_at").eq("recipient", inv.email).order("created_at", { ascending: false }).limit(50);
    await a.from("inv_messages").update({ read_at: new Date().toISOString() }).eq("investor_id", id).eq("direction", "in").is("read_at", null);
    return json({ ok: true, investor: inv, schedule: sch, log, bookings: bk, notes, messages: msgs, choice: ch, tranches: tr, mails });
  }
  if (action === "note_add") {
    const body0 = str(body.body, 8000), bid = body.booking_id ? String(body.booking_id) : null;
    if (!body0) return json({ error: "bad-input" }, 400);
    let invId = id;
    if (bid) { const { data: b } = await a.from("inv_bookings").select("investor_id").eq("id", bid).maybeSingle(); if (!b) return json({ error: "not-found" }, 404); invId = b.investor_id; }
    const { data, error } = await a.from("inv_notes").insert({ investor_id: invId, booking_id: bid, body: body0, author: u.id, author_email: u.email }).select("*").single();
    if (error) { console.error("inv note", error.message); return json({ error: "server-error" }, 500); }
    await audit(a, u, "note-add", invId, { booking: bid });
    return json({ ok: true, note: data });
  }
  if (action === "note_update" || action === "note_delete") {
    const { data: n } = await a.from("inv_notes").select("id, author").eq("id", id).maybeSingle();
    if (!n) return json({ error: "not-found" }, 404);
    if (n.author !== u.id && acc.role !== "belinus") return json({ error: "forbidden" }, 403);
    if (action === "note_delete") await a.from("inv_notes").delete().eq("id", id);
    else { const b0 = str(body.body, 8000); if (!b0) return json({ error: "bad-input" }, 400); await a.from("inv_notes").update({ body: b0, updated_at: new Date().toISOString() }).eq("id", id); }
    await audit(a, u, action.replace("_", "-"), id);
    return json({ ok: true });
  }
  if (action === "message_send") {
    const b0 = str(body.body, 8000);
    if (!b0) return json({ error: "bad-input" }, 400);
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, lang").eq("id", id).single();
    const { data: m0, error: e0 } = await a.from("inv_messages").insert({ investor_id: inv.id, direction: "out", body: b0, author: u.id, author_email: u.email, mail_status: "sending" }).select("id").single();
    if (e0) { console.error("inv message", e0.message); return json({ error: "server-error" }, 500); }
    const sent = await mailMessage(a, inv, b0, m0.id);
    const { data: m } = await a.from("inv_messages").update({ mail_status: sent ? "sent" : "failed" }).eq("id", m0.id).select("*").single();
    await audit(a, u, "message-sent", inv.email, { mail: sent });
    return json({ ok: true, message: m, mail: sent });
  }
  if (action === "record_choice") {
    const choice = String(body.choice || ""), note = str(body.note, 1000), reason = str(body.reason, 2000), wish = str(body.wish, 2000);
    if (!["A", "B", "C"].includes(choice) || !note) return json({ error: "bad-input" }, 400);
    if (choice === "C" && !reason) return json({ error: "reason-required" }, 400);
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, lang").eq("id", id).single();
    await applyChoice(a, inv, { choice, reason, wish, note, by_admin: u.id });
    await audit(a, u, "choice-by-admin", inv.email, { choice, note });
    return json({ ok: true });
  }
  // Personal invitation (the investor letter with a one-click activation button), to one investor: for tests, or again.
  if (action === "invite") {
    if (!mailConfigured()) return json({ error: "mail-not-configured" }, 503);
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, status, invested").eq("id", id).single();
    if (inv.status !== "invited") return json({ error: "already-active" }, 400);
    // Winwinner is in cc only on the very first invitation to this investor.
    const firstTime = !(await invitedMap(a)).has(inv.email);
    const ok = await sendInvite(a, inv, { cc: firstTime });
    await audit(a, u, "invite-sent", inv.email);
    return ok ? json({ ok: true }) : json({ error: "mail-failed" }, 503);
  }
  // Mass send, Belinus only: real investors (no test accounts) without a password and not yet invited, 20 per call; the
  // page calls again until nothing is left.
  // Preview of the invitation, exactly as rendered for the chosen (or first pending) investor; the button link is a dummy.
  if (action === "invite_preview") {
    let inv: any = null;
    if (id) ({ data: inv } = await a.from("inv_investors").select("email, first_name, invested").eq("id", id).maybeSingle());
    if (!inv) { const { data } = await a.from("inv_investors").select("email, first_name, invested").eq("is_test", false).eq("status", "invited").order("last_name").limit(1); inv = data?.[0] || { email: "voorbeeld@investeerder.be", first_name: "Jan", invested: 5000 }; }
    return json({ ok: true, ...(await invitePreview(a, inv)) });
  }
  // Test send of the personal invitation, to Erwin only, so he can check the content. The button link is a placeholder: no investor link is created.
  if (action === "test_invite") {
    const to = "erwin@evchargeking.com";
    const st = await settings(a);
    const deadline = st.deadline ? new Date(st.deadline) : new Date(Date.now() + 7 * 86400_000);
    const expires = new Date(Math.max(deadline.getTime(), Date.now() + 7 * 86400_000));
    const m = inviteContent({ email: to, first_name: null, invested: null }, `${APP_URL}/#/wachtwoord?code=VOORBEELD&uitnodiging=1`, deadline, expires);
    const sent = await sendMail(a, { to, kind: "invite-test", lang: "nl", noreply: true, subject: "TEST – graag validatie van deze tekst: " + m.subject, cta: m.cta, text: m.text });
    return sent ? json({ ok: true, to }) : json({ error: "mail-failed" }, 503);
  }
  // Preview of the confirmation mail an investor gets after booking an investor day, video call or call-back (kind: visit, video, callback).
  if (action === "booking_preview") {
    const kind = ["visit", "video", "callback"].includes(body.kind) ? body.kind : "visit";
    return json({ ok: true, ...(await bookingPreview(a, kind)) });
  }
  if (action === "bolero_import") {
    // Imports the Bolero (KBC) bondholder list. Records are created as "suspended": no login, no invitation, no mail.
    // Repayment schedule: the aflossingstabel (amortization-table.pdf, 19/09/2025) pro rata to each investment. Provisional until the contract is clarified.
    if (acc.role !== "belinus") return json({ error: "forbidden" }, 403);
    if (body.confirm !== "IMPORTEREN") return json({ error: "bad-input" }, 400);
    const list = Array.isArray(body.rows) ? body.rows : [];
    if (!list.length || list.length > 1000) return json({ error: "bad-input" }, 400);
    const TR = "bolero-0925", TOTAL = 500000;
    const ROWS: [string, number, number, number, number][] = [["2025-09-19",500000,0,0,0],["2025-10-19",500000,0,3350,2350],["2025-11-19",500000,0,3350,2350],["2025-12-19",500000,0,3350,2350],["2026-01-19",500000,0,3350,2350],["2026-02-19",500000,0,3350,2350],["2026-03-19",500000,0,3350,2350],["2026-04-19",500000,0,3350,2350],["2026-05-19",500000,0,3350,2350],["2026-06-19",500000,0,3350,2350],["2026-07-19",500000,0,3350,2350],["2026-08-19",500000,0,3350,2350],["2026-09-19",500000,0,3350,2350],["2026-10-19",489600,10400,3350,2350],["2026-11-19",479200,10400,3250,2300],["2026-12-19",468800,10400,3200,2250],["2027-01-19",458400,10400,3150,2200],["2027-02-19",448000,10400,3050,2150],["2027-03-19",437600,10400,3000,2100],["2027-04-19",427200,10400,2900,2050],["2027-05-19",416800,10400,2850,2000],["2027-06-19",406400,10400,2800,1950],["2027-07-19",396000,10400,2700,1900],["2027-08-19",385600,10400,2650,1850],["2027-09-19",375200,10400,2600,1800],["2027-10-19",364800,10400,2500,1750],["2027-11-19",354400,10400,2450,1700],["2027-12-19",344000,10400,2350,1650],["2028-01-19",333600,10400,2300,1600],["2028-02-19",323200,10400,2250,1550],["2028-03-19",312800,10400,2150,1500],["2028-04-19",302400,10400,2100,1450],["2028-05-19",292000,10400,2000,1400],["2028-06-19",281600,10400,1950,1350],["2028-07-19",271200,10400,1900,1300],["2028-08-19",260800,10400,1800,1250],["2028-09-19",250400,10400,1750,1200],["2028-10-19",240000,10400,1650,1150],["2028-11-19",229600,10400,1600,1100],["2028-12-19",219200,10400,1550,1050],["2029-01-19",208800,10400,1450,1050],["2029-02-19",198400,10400,1400,1000],["2029-03-19",188000,10400,1350,950],["2029-04-19",177600,10400,1250,900],["2029-05-19",167200,10400,1200,850],["2029-06-19",156800,10400,1100,800],["2029-07-19",146400,10400,1050,750],["2029-08-19",136000,10400,1000,700],["2029-09-19",125600,10400,900,650],["2029-10-19",115200,10400,850,600],["2029-11-19",104800,10400,750,550],["2029-12-19",94400,10400,700,500],["2030-01-19",84000,10400,650,450],["2030-02-19",73600,10400,550,400],["2030-03-19",63200,10400,500,350],["2030-04-19",52800,10400,400,300],["2030-05-19",42400,10400,350,250],["2030-06-19",32000,10400,300,200],["2030-07-19",21600,10400,200,150],["2030-08-19",11200,10400,150,100],["2030-09-19",0,11200,50,50]];
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const { error: trErr } = await a.from("inv_tranches").upsert({ code: TR, name: "Bolero Crowdfunding 19/09/2025 (KBC)", platform: "bolero", gross_rate: 0.0832, term_years: 5, structure: "Maandelijkse interest; aflossing vanaf 19/10/2026 volgens de aflossingstabel (voorlopig)", original_end: "2030-09-19" }, { onConflict: "code" });
    if (trErr) return json({ error: "tranche-failed" }, 500);
    const skipped: string[] = [];
    let imported = 0, pending: any[] = [];
    const flush = async () => { if (pending.length) { const { error } = await a.from("inv_schedule").insert(pending); if (error) skipped.push("schedule:" + error.message.slice(0, 80)); pending = []; } };
    for (const r of list) {
      const email = String(r.email || "").trim().toLowerCase();
      const invested = Number(r.invested);
      if (!email || !(invested > 0)) { skipped.push(email || "(leeg)"); continue; }
      const { data: exists } = await a.from("inv_investors").select("id").eq("email", email).maybeSingle();
      if (exists) { skipped.push(email + " (bestaat al)"); continue; }
      const { data: ins, error } = await a.from("inv_investors").insert({ email, first_name: str(r.first_name, 100) || null, last_name: str(r.last_name, 100) || null, tranche: TR, invested, invested_on: "2025-09-19", status: "suspended", lang: "nl", is_test: false, is_demo: false }).select("id").single();
      if (error || !ins) { skipped.push(email); continue; }
      const holders = Array.isArray(r.holders) ? r.holders : [];
      if (holders.length) await a.from("inv_coholders").insert(holders.map((h: any, i: number) => ({ investor_id: ins.id, role: i === 0 ? "holder" : "co-owner", last_name: str(h.last_name, 100) || null, first_name: str(h.first_name, 100) || null, bonds: Math.round(Number(h.bonds)) || null, invested: Number(h.invested) || null })));
      const share = invested / TOTAL;
      for (let i = 0; i < ROWS.length; i++) {
        const [due, outst, princ, gross, net] = ROWS[i];
        const g = r2(gross * share), n = r2(net * share);
        pending.push({ investor_id: ins.id, scenario: "original", period: i, due, gross_interest: g, withholding: r2(g - n), net_interest: n, principal: r2(princ * share), remaining: r2(outst * share), status: "planned" });
      }
      if (pending.length >= 1000) await flush();
      imported++;
    }
    await flush();
    return json({ ok: true, imported, skipped });
  }
  if (action === "groups") {
    const { data: gs } = await a.from("inv_groups").select("code, name, description").order("name");
    const { data: ms } = await a.from("inv_group_members").select("group_code");
    const n = new Map<string, number>();
    for (const m of ms || []) n.set(m.group_code, (n.get(m.group_code) || 0) + 1);
    return json({ ok: true, groups: (gs || []).map((g: any) => ({ ...g, members: n.get(g.code) || 0 })) });
  }
  // Investor groups: create a group, add or remove investors. The preconfigured groups (winwinner, bolero) are kept as they are.
  if (action === "group_detail") {
    const code = String(body.code || "");
    const { data: g } = await a.from("inv_groups").select("code, name, description").eq("code", code).maybeSingle();
    if (!g) return json({ error: "not-found" }, 404);
    const { data: ms } = await a.from("inv_group_members").select("investor_id").eq("group_code", code);
    const ids = (ms || []).map((m: any) => m.investor_id);
    const { data: inv } = ids.length ? await a.from("inv_investors").select("id, email, first_name, last_name, company_name, tranche, status, invested").in("id", ids).order("last_name") : { data: [] as any[] };
    return json({ ok: true, group: g, members: inv || [] });
  }
  if (action === "group_create") {
    const name = str(body.name, 80);
    const description = str(body.description, 300) || null;
    if (!name) return json({ error: "bad-input" }, 400);
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    if (!slug) return json({ error: "bad-input" }, 400);
    const { data: exists } = await a.from("inv_groups").select("code").eq("code", slug).maybeSingle();
    if (exists) return json({ error: "exists" }, 409);
    const { error } = await a.from("inv_groups").insert({ code: slug, name, description });
    if (error) { console.error("inv group", error.message); return json({ error: "server-error" }, 500); }
    await audit(a, u, "group", slug, { name, description });
    return json({ ok: true, code: slug });
  }
  if (action === "group_members_add" || action === "group_members_remove") {
    const code = String(body.code || "");
    const ids = (Array.isArray(body.investor_ids) ? body.investor_ids : []).map((x: any) => String(x)).filter(Boolean);
    const { data: g } = await a.from("inv_groups").select("code").eq("code", code).maybeSingle();
    if (!g || !ids.length || ids.length > 1000) return json({ error: "bad-input" }, 400);
    if (action === "group_members_add") {
      const { data: found } = await a.from("inv_investors").select("id").in("id", ids);
      const rows = (found || []).map((x: any) => ({ group_code: code, investor_id: x.id }));
      if (rows.length) { const { error } = await a.from("inv_group_members").upsert(rows, { onConflict: "group_code,investor_id", ignoreDuplicates: true }); if (error) { console.error("inv group add", error.message); return json({ error: "server-error" }, 500); } }
      await audit(a, u, "group", code, { added: rows.length });
      return json({ ok: true, changed: rows.length });
    }
    const { error } = await a.from("inv_group_members").delete().eq("group_code", code).in("investor_id", ids);
    if (error) { console.error("inv group remove", error.message); return json({ error: "server-error" }, 500); }
    await audit(a, u, "group", code, { removed: ids.length });
    return json({ ok: true, changed: ids.length });
  }
  if (action === "campaigns") {
    const { data: cs } = await a.from("inv_campaigns").select("*").order("created_at", { ascending: false });
    const { data: logs } = await a.from("inv_mail_log").select("campaign_id, status").not("campaign_id", "is", null);
    const { data: ev } = await a.from("inv_mail_events").select("campaign_id, recipient, event");
    const out = (cs || []).map((c: any) => {
      const l = (logs || []).filter((x: any) => x.campaign_id === c.id);
      const e = (ev || []).filter((x: any) => x.campaign_id === c.id);
      const uniq = (k: string) => new Set(e.filter((x: any) => x.event === k).map((x: any) => x.recipient)).size;
      return { ...c, sent: l.filter((x: any) => x.status === "sent").length, failed: l.filter((x: any) => x.status === "failed").length, opened: uniq("opened"), clicked: uniq("clicked"), events_loaded: e.length > 0 };
    });
    return json({ ok: true, role: acc.role, campaigns: out });
  }
  if (action === "campaign") {
    const { data: c } = await a.from("inv_campaigns").select("*").eq("id", body.id).single();
    if (!c) return json({ error: "not-found" }, 404);
    const { data: logs } = await a.from("inv_mail_log").select("recipient, status, created_at").eq("campaign_id", c.id);
    const { data: ev } = await a.from("inv_mail_events").select("recipient, event, url, at").eq("campaign_id", c.id).order("at");
    const per = new Map<string, any>();
    for (const l of logs || []) per.set(l.recipient, { recipient: l.recipient, status: l.status, sent_at: l.created_at, events: [] });
    for (const x of ev || []) { const r = per.get(x.recipient) || { recipient: x.recipient, status: "onbekend", sent_at: null, events: [] }; r.events.push(x); per.set(x.recipient, r); }
    const rows = [...per.values()].map((r: any) => {
      const has = (k: string) => r.events.some((e: any) => e.event === k);
      const delivered = has("delivered");
      // Refused by the recipient's server (permanent) or by Mailgun: no delivery, retry is pointless.
      const refused = r.events.find((e: any) => e.event === "rejected" || (e.event === "failed" && e.severity === "permanent"));
      // Temporary failure: Mailgun keeps retrying; only a problem if no delivery follows.
      const temp = r.events.find((e: any) => e.event === "failed" && e.severity !== "permanent");
      let delivery = "Nog geen bevestiging";
      if (delivered) delivery = "Afgeleverd";
      else if (refused) delivery = "Geweigerd" + (refused.detail ? ": " + refused.detail : "");
      else if (temp) delivery = "Tijdelijk mislukt, opnieuw geprobeerd" + (temp.detail ? ": " + temp.detail : "");
      else if (r.status === "failed") delivery = "Verzending mislukt";
      return { recipient: r.recipient, status: r.status, sent_at: r.sent_at, delivery, refused: !delivered && !!refused, temporary: !delivered && !refused && !!temp, complained: has("complained"), unsubscribed: has("unsubscribed"), delivered, opened: has("opened"), clicked: has("clicked"), links: r.events.filter((e: any) => e.event === "clicked").map((e: any) => e.url) };
    });
    const cnt = (f: (r: any) => boolean) => rows.filter(f).length;
    const stats = { sent: cnt((r) => r.status === "sent"), failed: cnt((r) => r.status === "failed"), delivered: cnt((r) => r.delivered), refused: cnt((r) => r.refused), temporary: cnt((r) => r.temporary), opened: cnt((r) => r.opened), not_opened: cnt((r) => r.status === "sent" && !r.opened), clicked: cnt((r) => r.clicked), complained: cnt((r) => r.complained), unsubscribed: cnt((r) => r.unsubscribed) };
    let tpl: { subject: string; html: string; text: string } = { subject: c.subject, text: c.body, html: mailHtml(c.body, undefined, "nl", false, "") };
    if (c.mail_kind === "invite") {
      const st = await settings(a);
      const deadline = st.deadline ? new Date(st.deadline) : new Date(Date.now() + 7 * 86400_000);
      const expires = new Date(Math.max(deadline.getTime(), Date.now() + 7 * 86400_000));
      const m = inviteContent({ email: "voorbeeld@voorbeeld.be", first_name: "Jan", invested: 1000 }, `${APP_URL}/#/wachtwoord?code=VOORBEELD&uitnodiging=1`, deadline, expires);
      tpl = { subject: m.subject, text: m.text, html: mailHtml(m.text, m.cta, "nl", true, "") };
    }
    return json({ ok: true, campaign: c, stats, recipients: rows, template: tpl });
  }
  if (action === "messages_all") {
    const { data: ms, error } = await a.from("inv_messages").select("id, investor_id, direction, body, created_at, read_at, mail_status, author_email, inv_investors(email, first_name, last_name, company_name)").order("created_at", { ascending: false }).limit(1000);
    if (error) return json({ error: "server-error" }, 500);
    return json({ ok: true, messages: ms || [] });
  }
  if (action === "message_read") {
    await a.from("inv_messages").update({ read_at: new Date().toISOString() }).eq("investor_id", id).eq("direction", "in").is("read_at", null);
    return json({ ok: true });
  }
  if (action === "automated_preview") {
    // Full rendered preview for the automated mails that have a live renderer; the others are shown as text only.
    const k = String(body.kind || "");
    if (k === "invite" || k === "invite-test") {
      const p = await invitePreview(a, { email: "voorbeeld@voorbeeld.be", first_name: "Jan", invested: 1000 });
      return json({ ok: true, subject: p.subject, from: p.from, html: p.html });
    }
    if (k === "booking") {
      const p = await bookingPreview(a, "visit");
      return json({ ok: true, subject: p.subject, from: p.from, html: p.html });
    }
    return json({ ok: false, reason: "not-available" });
  }
  if (action === "campaign_refresh") {
    // Pulls delivery, open and click events from Mailgun for this campaign (tag campaign:<id>).
    const { data: c } = await a.from("inv_campaigns").select("id").eq("id", body.id).single();
    if (!c) return json({ error: "not-found" }, 404);
    const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN");
    if (!key || !domain) return json({ error: "mail-not-configured" }, 503);
    const base = (Deno.env.get("MAILGUN_API_BASE") || "https://api.eu.mailgun.net").replace(/\/$/, "");
    const got: any[] = [];
    for (const event of ["delivered", "opened", "clicked", "failed", "rejected", "complained", "unsubscribed"]) {
      let next: string | null = `${base}/v3/${encodeURIComponent(domain)}/events?event=${event}&tags=${encodeURIComponent("campaign:" + c.id)}&limit=300`;
      let pages = 0;
      while (next && pages < 10) {
        const r: Response = await fetch(next, { headers: { Authorization: "Basic " + btoa("api:" + key) } });
        if (!r.ok) return json({ error: "mailgun-events-failed", status: r.status }, 502);
        const j: any = await r.json();
        for (const e of j.items || []) const ds = e["delivery-status"] || {};
        got.push({ campaign_id: c.id, message_id: e.message?.headers?.["message-id"] || null, recipient: e.recipient, event: e.event, url: e.url || null, at: new Date(e.timestamp * 1000).toISOString(), severity: e.severity || null, reason: e.reason || e.reject?.reason || null, detail: String(ds.description || ds.message || e.reject?.reason || "").slice(0, 300) || null });
        next = (j.items || []).length && j.paging?.next ? j.paging.next : null;
        pages++;
      }
    }
    await a.from("inv_mail_events").delete().eq("campaign_id", c.id);
    for (let i = 0; i < got.length; i += 500) await a.from("inv_mail_events").insert(got.slice(i, i + 500));
    return json({ ok: true, events: got.length });
  }
  if (action === "invite_pending" || action === "invite_batch") {
    // Recipients: members of the chosen group, and only Winwinner tranches (crowd-/winwin-). Bolero investors never receive these mails, even when they are in a group.
    const gcode = String(body.group || "winwinner");
    const { data: grp } = await a.from("inv_groups").select("code, name").eq("code", gcode).maybeSingle();
    if (!grp) return json({ error: "not-found" }, 404);
    const { data: mem } = await a.from("inv_group_members").select("investor_id").eq("group_code", gcode);
    const memIds = new Set((mem || []).map((m: any) => m.investor_id));
    const { data: inv0 } = await a.from("inv_investors").select("id, email, first_name, status, invested, tranche").eq("is_test", false).eq("status", "invited").or("tranche.like.winwin*,tranche.like.crowd*").order("last_name");
    const inv = (inv0 || []).filter((i: any) => memIds.has(i.id));
    const sent = await invitedMap(a);
    const todo = inv.filter((i: any) => !sent.has(i.email));
    if (action === "invite_pending") return json({ ok: true, pending: todo.length, invited: inv.length - todo.length });
    if (acc.role !== "belinus") return json({ error: "forbidden" }, 403);
    if (body.confirm !== "VERSTUREN") return json({ error: "bad-input" }, 400);
    if (!mailConfigured()) return json({ error: "mail-not-configured" }, 503);
    let ok = 0, failed = 0;
    // One campaign per batch; every mail of this batch is linked to it (tracking, status, detail page).
    let { data: camp } = await a.from("inv_campaigns").select("id").eq("mail_kind", "invite").eq("group_code", gcode).in("status", ["draft", "sending"]).order("created_at").limit(1).maybeSingle();
    if (!camp) ({ data: camp } = await a.from("inv_campaigns").insert({ name: `Uitnodiging ${grp.name} – eerste uitnodiging`, group_code: gcode, mail_kind: "invite", subject: "Uitnodiging voor het Investeerdersportaal EVChargeking", body: "Persoonlijke uitnodigingsmail met persoonlijke link.", status: "sending" }).select("id").single());
    if (camp?.id) await a.from("inv_campaigns").update({ status: "sending" }).eq("id", camp.id);
    for (const i of todo.slice(0, 20)) { if (await sendInvite(a, i, { cc: true, campaign: camp?.id })) ok++; else failed++; }
    if (camp?.id && todo.length - ok - failed <= 0) await a.from("inv_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", camp.id);
    await audit(a, u, "invite-batch", "investors", { ok, failed });
    return json({ ok: true, sent: ok, failed, left: Math.max(0, todo.length - ok - failed) });
  }
  if (action === "resend_invite") {
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, status, lang").eq("id", id).single();
    const sent = await sendAccessLink(a, inv);
    await audit(a, u, "invite-resent", inv.email);
    return sent ? json({ ok: true }) : json({ error: "mail-failed" }, 503);
  }
  if (action === "followup") {
    const patch: Record<string, unknown> = {};
    if (["open", "contacted", "published", "resolved"].includes(body.status)) patch.status = body.status;
    if (body.notes !== undefined) patch.notes = str(body.notes, 4000);
    if (/^\d{4}-\d\d-\d\d$/.test(body.due_date || "")) patch.due_date = body.due_date;
    await a.from("inv_followups").update(patch).eq("id", id);
    await audit(a, u, "followup", id, patch);
    return json({ ok: true });
  }
  if (action === "bookings") {
    const { data, error } = await a.from("inv_bookings").select("*, inv_investors(email, first_name, last_name, company_name, phone, tranche, invested, inv_choices(choice)), inv_events(title)").order("starts_at");
    if (error) { console.error("inv bookings", error.message); return json({ error: "server-error" }, 500); }
    const { data: notes } = await a.from("inv_notes").select("*").not("booking_id", "is", null).order("created_at");
    return json({ ok: true, bookings: data || [], notes: notes || [] });
  }
  if (action === "booking_update") {
    const status = String(body.status || "");
    if (!["cancelled", "held", "no_show", "confirmed"].includes(status)) return json({ error: "bad-input" }, 400);
    const { data: b } = await a.from("inv_bookings").update({ status, note: str(body.note, 1000) || null, ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}) }).eq("id", id).select("starts_at, kind, meet_id, inv_investors(email, lang)").single();
    if (status === "cancelled" && (b as any)?.meet_id) await deleteMeeting((b as any).meet_id).catch((err) => console.error("teams delete", err));
    if (status === "cancelled" && body.notify) { const L = pickLang((b as any).inv_investors.lang), W = dateIn(b!.starts_at, true, L), M = str(body.message, 1000), U = "https://investor.belinus.com/afspraak", T = { nl: ["Uw afspraak is geannuleerd – EVChargeking", `Uw afspraak van ${W} werd geannuleerd.\n\n${M}\n\nEen nieuwe afspraak maken kan via ${U}`], fr: ["Votre rendez-vous est annulé – EVChargeking", `Votre rendez-vous du ${W} a été annulé.\n\n${M}\n\nVous pouvez prendre un nouveau rendez-vous via ${U}`], en: ["Your appointment has been cancelled – EVChargeking", `Your appointment of ${W} has been cancelled.\n\n${M}\n\nYou can make a new appointment at ${U}`] }[L]; await sendMail(a, { to: (b as any).inv_investors.email, kind: "booking-cancel", lang: L, subject: T[0], text: T[1] }); }
    await audit(a, u, "booking-update", id, { status });
    return json({ ok: true });
  }
  if (action === "booking_move") {
    // Admin moves a video or call-back appointment to a new time and tells the investor by e-mail.
    const { data: cur } = await a.from("inv_bookings").select("id, kind, status, meet_id").eq("id", id).maybeSingle();
    if (!cur || cur.status !== "confirmed" || !["video", "callback"].includes(cur.kind)) return json({ error: "not-found" }, 404);
    const starts = new Date(String(body.starts_at || "")).toISOString();
    if (Number.isNaN(new Date(starts).getTime())) return json({ error: "bad-input" }, 400);
    const cfg = await settings(a), slot = Number((cfg.booking || {}).slot_minutes || 30);
    const ends = new Date(new Date(starts).getTime() + slot * 60000).toISOString();
    const { data: clash } = await a.from("inv_bookings").select("id").eq("status", "confirmed").eq("starts_at", starts).neq("id", id).limit(1);
    if (clash && clash.length) return json({ error: "slot-taken" }, 409);
    const { data: nb } = await a.from("inv_bookings").update({ starts_at: starts, ends_at: ends }).eq("id", id).select("*, inv_investors(email, first_name, last_name, lang)").single();
    if (cur.meet_id) await moveMeeting(cur.meet_id, starts, ends).catch((err) => console.error("teams move", err));
    const inv = (nb as any).inv_investors, L = pickLang(inv.lang), K = KIND_L[L][cur.kind], W = dateIn(starts, true, L), link = nb.meet_url || null;
    const det = `${K}: ${W}${link ? "\nLink: " + link : ""}`;
    const MV = { nl: [`Uw afspraak is verplaatst: ${K}`, `Uw afspraak is verplaatst naar ${W}.`, "Afspraak verplaatsen of annuleren kan in het portaal:", "Met vriendelijke groeten,"], fr: [`Votre rendez-vous a été déplacé : ${K}`, `Votre rendez-vous a été déplacé au ${W}.`, "Vous pouvez déplacer ou annuler le rendez-vous dans le portail :", "Cordialement,"], en: [`Your appointment has been moved: ${K}`, `Your appointment has been moved to ${W}.`, "You can move or cancel the appointment in the portal:", "Kind regards,"] }[L];
    if (body.notify !== false) await sendMail(a, { to: inv.email, kind: "booking-moved", lang: L, subject: MV[0], ics: ics({ id, title: `EVChargeking: ${K}`, start: starts, end: ends, url: link || undefined, desc: det, sequence: 1, method: "REQUEST" }), text: `${hello(inv.first_name, L)}\n\n${MV[1]}\n\n${det}\n\n${MV[2]} https://investor.belinus.com/afspraak\n\n${MV[3]}\nEVChargeking` });
    await audit(a, u, "booking-move", id, { starts });
    return json({ ok: true });
  }
  if (action === "availability") {
    const [{ data: w }, { data: bl }, { data: ev }, { data: sl }] = await Promise.all([a.from("inv_availability").select("*").order("weekday").order("start_time"), a.from("inv_blocked").select("*").order("day"), a.from("inv_events").select("*").order("starts_at"), a.from("inv_event_slots").select("*").order("start_time")]);
    const events = (ev || []).map((e: any) => ({ ...e, slots: (sl || []).filter((x: any) => x.event_id === e.id) }));
    return json({ ok: true, windows: w, blocked: bl, events, settings: await settings(a) });
  }
  if (action === "availability_save") {
    const rows = (Array.isArray(body.windows) ? body.windows : []).map((w: any) => ({ weekday: Number(w.weekday), start_time: str(w.start_time, 5), end_time: str(w.end_time, 5), kinds: (w.kinds || []).filter((k: string) => ["video", "callback"].includes(k)) }));
    if (rows.some((r: any) => !(r.weekday >= 1 && r.weekday <= 7) || !/^\d\d:\d\d$/.test(r.start_time) || !/^\d\d:\d\d$/.test(r.end_time) || r.end_time <= r.start_time || !r.kinds.length)) return json({ error: "bad-input" }, 400);
    await a.from("inv_availability").delete().gte("weekday", 0);
    if (rows.length) await a.from("inv_availability").insert(rows);
    await audit(a, u, "availability", "windows", { n: rows.length });
    return json({ ok: true });
  }
  // Financieel: planned payments per payment date (original schedule), or the live planning from the registered choices.
  // Option B is calculated here from the original schedule (rising repayment, see Steve's table); option A uses scenario 'A'.
  if (action === "financial") {
    const view = body.view === "registered" ? "registered" : "planned";
    const signedOnly = body.signed_only === true;
    const filt = ["all", "bolero", "winwinlening", "winwin_raise"].includes(body.filter) ? String(body.filter) : "all";
    const page = async (build: () => any) => {
      const out: any[] = [];
      for (let p = 0; ; p++) {
        const { data, error } = await build().range(p * 1000, p * 1000 + 999);
        if (error) throw new Error(error.message);
        out.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return out;
    };
    const [invs, tr, sch, chs] = await Promise.all([
      page(() => a.from("inv_investors").select("id, email, first_name, last_name, company_name, tranche, invested, is_test, is_demo").order("id")),
      a.from("inv_tranches").select("code, gross_rate, platform"),
      page(() => a.from("inv_schedule").select("investor_id, scenario, period, due, gross_interest, withholding, net_interest, principal, remaining, status").order("investor_id").order("period")),
      page(() => a.from("inv_choices").select("investor_id, choice, addendum_status").order("investor_id")),
    ]);
    const trMap = new Map((tr.data || []).map((t: any) => [t.code, t]));
    const chMap = new Map((chs || []).map((c: any) => [c.investor_id, c]));
    const schBy = new Map<string, { original: any[]; A: any[] }>();
    for (const r of sch || []) {
      if (!schBy.has(r.investor_id)) schBy.set(r.investor_id, { original: [], A: [] });
      const g = schBy.get(r.investor_id)!;
      if (r.scenario === "original") g.original.push(r); else if (r.scenario === "A") g.A.push(r);
    }
    const kindOf = kindFor;
    const name = (i: any) => i.company_name || [i.first_name, i.last_name].filter(Boolean).join(" ") || i.email;
    const STATUS: Record<string, string> = { paid: "paid", planned: "planned", deferred: "planned" };
    const lines: any[] = [];
    for (const inv of invs || []) {
      if (inv.is_test || inv.is_demo) continue;
      const t = trMap.get(inv.tranche);
      const kind = t ? kindOf(t.code) : "bolero";
      if (filt !== "all" && filt !== kind) continue;
      const g = schBy.get(inv.id) || { original: [], A: [] };
      const ch: any = chMap.get(inv.id);
      const signed = ch?.addendum_status === "signed";
      const applyNew = view === "registered" && ch && (ch.choice === "A" || ch.choice === "B") && (!signedOnly || signed);
      const origStatus = (r: any) => (applyNew && signed && r.status !== "paid" ? "cancelled" : STATUS[r.status] || "planned");
      for (const r of g.original) {
        lines.push({ due: r.due, period: r.period, investor: name(inv), email: inv.email, tranche: inv.tranche, kind, choice: ch?.choice || "—", source: "original", gross_interest: Number(r.gross_interest), withholding: Number(r.withholding), net_interest: Number(r.net_interest), principal: Number(r.principal), status: origStatus(r) });
      }
      if (applyNew) {
        const newRows = ch.choice === "A" ? g.A.map((r: any) => ({ period: r.period, due: r.due, gross_interest: Number(r.gross_interest), withholding: Number(r.withholding), net_interest: Number(r.net_interest), principal: Number(r.principal) })) : bSched(Number(inv.invested), g.original, Number(t?.gross_rate || 0), kind);
        for (const r of newRows) {
          lines.push({ due: r.due, period: r.period, investor: name(inv), email: inv.email, tranche: inv.tranche, kind, choice: ch.choice, source: "option " + ch.choice, gross_interest: r.gross_interest, withholding: r.withholding, net_interest: r.net_interest, principal: r.principal, status: signed ? "planned" : "pending" });
        }
      }
    }
    const byDate = new Map<string, any>();
    for (const l of lines) {
      if (!byDate.has(l.due)) byDate.set(l.due, { due: l.due, gross_interest: 0, withholding: 0, net_interest: 0, principal: 0, total: 0, investors: new Set(), status: { paid: 0, planned: 0, pending: 0, cancelled: 0 } });
      const d = byDate.get(l.due);
      const tot = cent(l.gross_interest + l.principal);
      if (l.status === "cancelled") { d.status.cancelled = cent(d.status.cancelled + tot); continue; }
      d.gross_interest = cent(d.gross_interest + l.gross_interest); d.withholding = cent(d.withholding + l.withholding); d.net_interest = cent(d.net_interest + l.net_interest); d.principal = cent(d.principal + l.principal);
      d.total = cent(d.total + tot);
      d.investors.add(l.email);
      d.status[l.status] = cent(d.status[l.status] + tot);
    }
    const dates = [...byDate.values()].sort((x, y) => (x.due < y.due ? -1 : 1)).map((d) => ({ ...d, investors: d.investors.size }));
    return json({ ok: true, view, signed_only: signedOnly, filter: filt, dates, lines: lines.sort((x, y) => (x.due < y.due ? -1 : x.due > y.due ? 1 : x.investor.localeCompare(y.investor))) });
  }
  if (action === "blocked") {
    const day = String(body.day || "");
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return json({ error: "bad-input" }, 400);
    if (body.remove) await a.from("inv_blocked").delete().eq("day", day); else await a.from("inv_blocked").upsert({ day, note: str(body.note, 200) || null });
    return json({ ok: true });
  }
  // Investor day: the length of one appointment, and each arrival time with its own number of places.
  if (action === "event_save") {
    const slots = (Array.isArray(body.slots) ? body.slots : []).map((x: any) => ({ start_time: str(x.start_time, 5), capacity: Math.max(0, Math.floor(Number(x.capacity) || 0)) }));
    const slotMin = Math.floor(Number(body.slot_minutes));
    const times = slots.map((x: any) => x.start_time);
    if (slots.some((x: any) => !/^\d\d:\d\d$/.test(x.start_time)) || new Set(times).size !== times.length || !(slotMin >= 10 && slotMin <= 120)) return json({ error: "bad-input" }, 400);
    const patch = { active: body.active !== false, slot_minutes: slotMin, capacity: slots.reduce((n: number, x: any) => n + x.capacity, 0), arrival_slots: times.sort() };
    await a.from("inv_events").update(patch).eq("id", id);
    await a.from("inv_event_slots").delete().eq("event_id", id);
    if (slots.length) { const { error } = await a.from("inv_event_slots").insert(slots.map((x: any) => ({ event_id: id, ...x }))); if (error) { console.error("inv slots", error.message); return json({ error: "server-error" }, 500); } }
    await audit(a, u, "event", id, { ...patch, slots });
    return json({ ok: true });
  }
  if (action === "settings_save") {
    const key = String(body.key || "");
    if (!SETTINGS_ALL.includes(key) && !SETTINGS_BELINUS.includes(key)) return json({ error: "forbidden" }, 403);
    if (key === "booking" && !(Number(body.value?.slot_minutes) >= 10 && Number(body.value?.slot_minutes) <= 30)) return json({ error: "bad-input" }, 400);
    await a.from("inv_settings").upsert({ key, value: body.value ?? null, updated_at: new Date().toISOString() });
    await audit(a, u, "setting", key, { value: body.value });
    return json({ ok: true });
  }
  return json({ error: "bad-action" }, 400);
});
