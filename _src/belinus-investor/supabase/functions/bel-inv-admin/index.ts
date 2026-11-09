// bel-inv-admin — superadmins of the investor area: Belinus (role belinus) and EVChargeking (role evc). This function only reads the EVChargeking investor tables (inv_*). Second factor required.
import { deleteMeeting, moveMeeting } from "../_shared/teams.ts";
import { bSchedule as bSched, cent, loanKind as kindFor } from "../_shared/finance.ts";
import { icsEvent as ics, hello, KIND_L, access, adminClient, applyChoice, audit, cors, currentUser, dateIn, json, mailConfigured, nlDate, pickLang, sendAccessLink, sendInvite, sendMail, settings, str, mailMessage, invitePreview } from "../_shared/inv.ts";

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
    const ok = await sendInvite(a, inv);
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
  if (action === "invite_pending" || action === "invite_batch") {
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, status, invested").eq("is_test", false).eq("status", "invited").order("last_name");
    const sent = await invitedMap(a);
    const todo = (inv || []).filter((i: any) => !sent.has(i.email));
    if (action === "invite_pending") return json({ ok: true, pending: todo.length, invited: (inv || []).length - todo.length });
    if (acc.role !== "belinus") return json({ error: "forbidden" }, 403);
    if (body.confirm !== "VERSTUREN") return json({ error: "bad-input" }, 400);
    if (!mailConfigured()) return json({ error: "mail-not-configured" }, 503);
    let ok = 0, failed = 0;
    for (const i of todo.slice(0, 20)) { if (await sendInvite(a, i)) ok++; else failed++; }
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
