// bel-inv — signed-in investor actions of the EVChargeking investor area.
// Second factor (as in Clavoris: a code by e-mail, or the authenticator app): mfa_status, mfa_send, mfa_verify, mfa_totp_done.
// After it: me, choose, slots, book, cancel, set_phone.
import { bSchedule, loanKind } from "../_shared/finance.ts";
import { createMeeting, deleteMeeting, moveMeeting } from "../_shared/teams.ts";
import { termsState, TERMS_VERSION, icsEvent as ics, access, adminClient, APP_URL, applyChoice, audit, bookingDetail, bookingMail, claims, clientIp, cors, currentUser, dateIn, hello, json, KIND_L, nlDate, pickLang, sendMail, settings, sha256, str, strong } from "../_shared/inv.ts";

const TOPICS = ["keuze", "terugbetaling", "andere"];
const KIND_NL: Record<string, string> = { visit: "Bezoek op een investeerdersdag", video: "Videogesprek", callback: "Terugbelverzoek" };
const CODE_TTL = 10 * 60_000, MAX_TRIES = 5, RESEND = 30_000, PER_HOUR = 6;

function offsetMin(d: Date): number {
  const v = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Brussels", timeZoneName: "longOffset" }).formatToParts(d).find((p) => p.type === "timeZoneName")!.value;
  const m = v.match(/([+-])(\d\d):(\d\d)/);
  return m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3]) : 0;
}
function toUtc(day: string, hm: string): Date { const g = new Date(`${day}T${hm.slice(0, 5)}:00Z`); return new Date(g.getTime() - offsetMin(g) * 60000); }
const localDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(d);

// One agenda: every video call and call-back is handled by Erwin, so a taken moment is taken for both kinds and an investor day blocks its hours.
async function freeSlots(a: any, kind: string, cfg: any): Promise<{ day: string; slots: string[]; busy: string[] }[]> {
  const now = Date.now(), earliest = now + cfg.notice_hours * 3600_000, step = cfg.slot_minutes + cfg.buffer_minutes;
  const [{ data: av }, { data: bl }, { data: bk }, { data: evs }] = await Promise.all([
    a.from("inv_availability").select("weekday, start_time, end_time, kinds"),
    a.from("inv_blocked").select("day"),
    a.from("inv_bookings").select("starts_at").in("kind", ["video", "callback"]).eq("status", "confirmed").gte("starts_at", new Date(now).toISOString()),
    a.from("inv_events").select("starts_at, ends_at").eq("active", true),
  ]);
  const blocked = new Set((bl || []).map((b: any) => b.day)), taken = new Set((bk || []).map((b: any) => new Date(b.starts_at).getTime()));
  const inEvent = (u: Date) => (evs || []).some((e: any) => u.getTime() < new Date(e.ends_at).getTime() && u.getTime() + cfg.slot_minutes * 60000 > new Date(e.starts_at).getTime());
  const out: { day: string; slots: string[]; busy: string[] }[] = [];
  for (let i = 0; i <= cfg.horizon_days; i++) {
    const day = localDay(new Date(now + i * 86400_000));
    if (blocked.has(day)) continue;
    const wd = new Date(day + "T12:00:00Z").getUTCDay() || 7, list: string[] = [], busy: string[] = [];
    for (const w of (av || []).filter((x: any) => x.weekday === wd && x.kinds.includes(kind))) {
      const [sh, sm] = w.start_time.split(":").map(Number), [eh, em] = w.end_time.split(":").map(Number);
      for (let t = sh * 60 + sm; t + cfg.slot_minutes <= eh * 60 + em; t += step) {
        const u = toUtc(day, `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
        if (u.getTime() < earliest) continue;
        (taken.has(u.getTime()) || inEvent(u) ? busy : list).push(u.toISOString());
      }
    }
    if (list.length || busy.length) out.push({ day, slots: list.sort(), busy: busy.sort() });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const a = adminClient();
  const u = await currentUser(a, req);
  if (!u) return json({ error: "unauthorized" }, 401);
  const { data: self } = await a.from("inv_investors").select("*").eq("user_id", u.id).maybeSingle();
  let inv: any = self;
  const acc0 = await access(a, u);
  // The demo investor signs in with a password only (Steve, 8 November 2026). No other account is exempt.
  const acc = self?.is_demo ? { ...acc0, mfa: true } : acc0;
  if ((!inv && !acc.role) || inv?.status === "suspended") return json({ error: "forbidden" }, 403);
  const c = claims(u.jwt), sessionId = c.session_id as string;
  const ip = clientIp(req);
  const complete = async (method: string) => {
    await a.from("bel_mfa_sessions").upsert({ session_id: sessionId, user_id: u.id, method, verified_at: new Date().toISOString() });
    if (inv) await a.from("inv_investors").update({ last_login_at: new Date().toISOString() }).eq("id", inv.id);
    await audit(a, u, "login", u.email, { method, ip });
    return json({ ok: true, verified: true });
  };

  if (action === "mfa_status") {
    const { data: f } = await a.auth.admin.mfa.listFactors({ userId: u.id });
    const totp = (f?.factors || []).some((x: any) => x.status === "verified");
    const [n, d] = u.email.split("@");
    return json({ ok: true, verified: acc.mfa, totp, email: n.slice(0, 2) + "•••@" + d });
  }
  if (action === "mfa_send") {
    const { data: recent } = await a.from("bel_mfa_codes").select("created_at").eq("user_id", u.id).gte("created_at", new Date(Date.now() - 3600_000).toISOString()).order("created_at", { ascending: false });
    if (recent?.length && Date.now() - new Date(recent[0].created_at).getTime() < RESEND) return json({ error: "wait" }, 429);
    if ((recent?.length || 0) >= PER_HOUR) return json({ error: "too-many" }, 429);
    const n = new Uint32Array(1); crypto.getRandomValues(n);
    const code = String(n[0] % 1000000).padStart(6, "0");
    const { error } = await a.from("bel_mfa_codes").insert({ user_id: u.id, session_id: sessionId, purpose: "login", code_hash: await sha256(`${u.id}:${sessionId}:login:${code}`), expires_at: new Date(Date.now() + CODE_TTL).toISOString() });
    if (error) { console.error("inv code", error.message); return json({ error: "server-error" }, 500); }
    const L = pickLang(inv?.lang);
    const MFA = { nl: [`Uw aanmeldcode: ${code}`, `Uw aanmeldcode voor het Investeerdersportaal EVChargeking is:\n\n${code}\n\nDe code is 10 minuten geldig en kan één keer gebruikt worden.\n\nHebt u zich niet net aangemeld? Deel deze code dan niet en wijzig uw wachtwoord.`], fr: [`Votre code de connexion : ${code}`, `Votre code de connexion au Portail investisseurs EVChargeking est :\n\n${code}\n\nCe code est valable 10 minutes et ne peut être utilisé qu'une seule fois.\n\nVous ne venez pas de vous connecter ? Ne partagez pas ce code et modifiez votre mot de passe.`], en: [`Your sign-in code: ${code}`, `Your sign-in code for the EVChargeking Investor portal is:\n\n${code}\n\nThe code is valid for 10 minutes and can be used once.\n\nDid you not just sign in? Do not share this code and change your password.`] }[L];
    const sent = await sendMail(a, { to: u.email, kind: "login-code", lang: L, subject: MFA[0], text: MFA[1] });
    return sent ? json({ ok: true }) : json({ error: "mail-failed" }, 503);
  }
  if (action === "mfa_verify") {
    const code = String(body.code || "").replace(/\D/g, "");
    if (code.length !== 6) return json({ error: "bad-code" }, 400);
    const { data: rows } = await a.from("bel_mfa_codes").select("id, code_hash, expires_at").eq("user_id", u.id).eq("session_id", sessionId).eq("purpose", "login").is("used_at", null).order("created_at", { ascending: false }).limit(3);
    const live = (rows || []).filter((r: any) => new Date(r.expires_at).getTime() >= Date.now());
    if (!live.length) return json({ error: "expired" }, 400);
    const { data: used } = await a.rpc("bel_mfa_attempt", { p_id: live[0].id, p_max: MAX_TRIES });
    if (used == null) return json({ error: "too-many-attempts" }, 400);
    const h = await sha256(`${u.id}:${sessionId}:login:${code}`);
    if (!live.some((r: any) => r.code_hash === h)) return json({ error: "wrong-code" }, 400);
    await a.from("bel_mfa_codes").update({ used_at: new Date().toISOString() }).eq("user_id", u.id).eq("session_id", sessionId).is("used_at", null);
    return await complete("email");
  }
  // Right after setting the password through the personal e-mail link, the link itself is the second factor: it proves the
  // same mailbox the 6-digit code would. One use, within 15 minutes of the password being set, only for this investor's own
  // link and only for accounts without an authenticator app (Steve, 8 November 2026).
  if (action === "mfa_link") {
    const code = String(body.code || "").slice(0, 100);
    if (!code || !inv) return json({ error: "expired" }, 400);
    const { data: l } = await a.from("inv_links").select("code_hash, investor_id, used_at").eq("code_hash", await sha256(code)).maybeSingle();
    if (!l || l.investor_id !== inv.id || !l.used_at || Date.now() - new Date(l.used_at).getTime() > 15 * 60_000) return json({ error: "expired" }, 400);
    const { data: f } = await a.auth.admin.mfa.listFactors({ userId: u.id });
    if ((f?.factors || []).some((x: any) => x.status === "verified")) return json({ error: "expired" }, 400);
    const { data: gone } = await a.from("inv_links").delete().eq("code_hash", l.code_hash).select("code_hash");
    if (!gone?.length) return json({ error: "expired" }, 400);
    return await complete("invite-link");
  }
  if (action === "mfa_totp_done") { if (c.aal !== "aal2") return json({ error: "mfa-required" }, 401); return await complete("totp"); }

  if (!acc.mfa) return json({ error: "mfa-required" }, 401);
  // Admins can view the portal as an investor. A real investor is read-only; the demo investor is fully usable and its mail goes to the admin.
  let asMode = "", demoEmail = "";
  if (body.as) {
    if (!acc.role) return json({ error: "forbidden" }, 403);
    const { data: target } = await a.from("inv_investors").select("*").eq("id", String(body.as)).maybeSingle();
    if (!target) return json({ error: "not-found" }, 404);
    asMode = target.is_demo ? "demo" : "view";
    demoEmail = target.email;
    inv = target.is_demo ? { ...target, email: u.email } : target;
    if (action === "me") await audit(a, u, "view-as", target.email, { mode: asMode, ip });
  }
  const notifyTo = (st: any) => asMode === "demo" ? u.email : inv.is_test ? "steve@belinus.com" : (st.notify_email || "erwin@evchargeking.com");
  const s = await settings(a);
  const closed = Date.now() > new Date(s.deadline).getTime();

  // Terms of use: accepted (with the e-mail consent) before anything else on the platform. Admins viewing an account are not held up.
  const terms = termsState(inv);
  if (action === "terms_accept") {
    if (!inv || asMode) return json({ error: "forbidden" }, 403);
    if (body.version !== TERMS_VERSION || body.email_consent !== true) return json({ error: "bad-input" }, 400);
    await a.from("inv_investors").update({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), terms_email_consent: true }).eq("id", inv.id);
    await audit(a, u, "terms-accepted", inv.email, { version: TERMS_VERSION, ip });
    return json({ ok: true });
  }
  if (inv && !asMode && !acc.role && action !== "me" && terms.pending) return json({ error: "terms-required" }, 403);

  if (action === "me") {
    if (!inv) return json({ ok: true, admin: acc.role, investor: null });
    if (terms.pending && !asMode && !acc.role) return json({ ok: true, admin: acc.role, as: null, terms, messages: [], investor: { lang: inv.lang, first_name: inv.first_name, last_name: inv.last_name, company_name: inv.company_name, email: inv.email } });
    const [{ data: tr }, { data: sch }, { data: ch }, { data: bk }, { data: ev }, { data: used }, { data: slotRows }] = await Promise.all([
      a.from("inv_tranches").select("*").eq("code", inv.tranche).single(),
      a.from("inv_schedule").select("scenario, period, due, gross_interest, withholding, net_interest, principal, remaining, status, paid_at").eq("investor_id", inv.id).order("period"),
      a.from("inv_choices").select("choice, wish, reason, confirmed_at, addendum_status").eq("investor_id", inv.id).maybeSingle(),
      a.from("inv_bookings").select("id, kind, starts_at, ends_at, arrival, persons, phone, topic, status, event_id, meet_url").eq("investor_id", inv.id).order("starts_at"),
      a.from("inv_events").select("id, title, starts_at, ends_at, address, capacity, arrival_slots, description, slot_minutes").eq("active", true).gte("ends_at", new Date().toISOString()).order("starts_at"),
      a.from("inv_bookings").select("event_id, arrival, persons").eq("kind", "visit").eq("status", "confirmed"),
      a.from("inv_event_slots").select("event_id, start_time, capacity"),
    ]);
    const { data: msgs } = await a.from("inv_messages").select("id, direction, body, created_at, read_at, channel").eq("investor_id", inv.id).order("created_at");
    // Each arrival time has its own capacity; the investor sees the places still free per time.
    const events = (ev || []).map((e: any) => {
      const slots = (slotRows || []).filter((x: any) => x.event_id === e.id).sort((p: any, q: any) => String(p.start_time).localeCompare(String(q.start_time))).map((x: any) => {
        const booked = (used || []).filter((y: any) => y.event_id === e.id && y.arrival === x.start_time).reduce((n: number, y: any) => n + y.persons, 0);
        return { time: x.start_time, capacity: x.capacity, free: Math.max(0, x.capacity - booked) };
      });
      return { ...e, slots, arrival_slots: slots.map((x: any) => x.time), free: slots.reduce((n: number, x: any) => n + x.free, 0), capacity: undefined };
    });
    // The welcome gift is not shown to investors yet (to be sent out later).
    const gift = null;
    // Option B: the paid rows of the original schedule, then the rising repayment plan (see _shared/finance.ts).
    const origRows = (sch || []).filter((r: any) => r.scenario === "original");
    const optionB = [...origRows.filter((r: any) => String(r.due).slice(0, 4) < "2026"), ...bSchedule(Number(inv.invested), origRows, Number(tr?.gross_rate || 0), loanKind(inv.tranche), Number(inv.withholding_rate ?? 0.3))];
    return json({ ok: true, terms, messages: msgs || [], admin: acc.role, as: asMode ? { mode: asMode, id: inv.id, admin_email: u.email } : null, investor: { lang: inv.lang, first_name: inv.first_name, last_name: inv.last_name, company_name: inv.company_name, email: inv.email, phone: inv.phone, invested: inv.invested, invested_on: inv.invested_on }, tranche: tr, original: (sch || []).filter((r: any) => r.scenario === "original"), optionA: (sch || []).filter((r: any) => r.scenario === "A"), optionB, choice: ch, bookings: bk, events, deadline: s.deadline, closed, interest_only_date: s.interest_only_date, gift, booking: s.booking });
  }
  if (!inv) return json({ error: "not-investor" }, 403);
  if (asMode === "view" && action !== "slots") return json({ error: "view-only" }, 403);
  if (action === "demo_reset") {
    if (asMode !== "demo") return json({ error: "forbidden" }, 403);
    for (const t of ["inv_bookings", "inv_followups", "inv_choice_log", "inv_choices", "inv_links"]) await a.from(t).delete().eq("investor_id", inv.id);
    await a.from("inv_investors").update({ phone: null, lang: "nl" }).eq("id", inv.id);
    await audit(a, u, "demo-reset", demoEmail);
    return json({ ok: true });
  }
  if (action === "demo_password") {
    if (asMode !== "demo") return json({ error: "forbidden" }, 403);
    const password = String(body.password || "");
    if (!strong(password)) return json({ error: "weak-password" }, 400);
    let uid: string | null = inv.user_id;
    if (!uid) { const { data } = await a.rpc("inv_auth_user_id", { p_email: demoEmail }); uid = data || null; }
    if (uid) {
      const { error } = await a.auth.admin.updateUserById(uid, { password, email_confirm: true });
      if (error) { console.error("inv demo user", error.message); return json({ error: "server-error" }, 500); }
    } else {
      const { data, error } = await a.auth.admin.createUser({ email: demoEmail, password, email_confirm: true, app_metadata: { app: "belinus-investor" } });
      if (error || !data?.user) { console.error("inv demo user", error?.message); return json({ error: "server-error" }, 500); }
      uid = data.user.id;
    }
    await a.from("inv_investors").update({ user_id: uid, status: "active", activated_at: new Date().toISOString() }).eq("id", inv.id);
    await audit(a, u, "demo-password", demoEmail);
    return json({ ok: true });
  }

  if (action === "set_lang") { if (!["nl", "fr", "en"].includes(body.lang)) return json({ error: "bad-input" }, 400); await a.from("inv_investors").update({ lang: body.lang }).eq("id", inv.id); return json({ ok: true }); }
  // Messages: the investor answers only here, in the portal. The admin who wrote last (or the EVChargeking address) gets a short notice.
  if (action === "messages_read") { await a.from("inv_messages").update({ read_at: new Date().toISOString() }).eq("investor_id", inv.id).eq("direction", "out").is("read_at", null); return json({ ok: true }); }
  if (action === "message_reply") {
    const b0 = str(body.body, 8000);
    if (!b0) return json({ error: "bad-input" }, 400);
    const { data: m } = await a.from("inv_messages").insert({ investor_id: inv.id, direction: "in", body: b0, author: asMode === "demo" ? null : u.id, author_email: inv.email }).select("id, direction, body, created_at, read_at, channel").single();
    const who = inv.company_name || [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email;
    await sendMail(a, { to: notifyTo(s), kind: "message-in", lang: "nl", subject: `Nieuw bericht van ${who}`, text: `${who} antwoordde in het investeerdersportaal:\n\n${b0}\n\nBekijk en antwoord: ${APP_URL}/#/investeerders/${inv.id}` });
    await audit(a, u, "message-reply", inv.email);
    return json({ ok: true, message: m });
  }
  if (action === "set_phone") { await a.from("inv_investors").update({ phone: str(body.phone, 40) || null }).eq("id", inv.id); return json({ ok: true }); }

  if (action === "choose") {
    const choice = String(body.choice || "");
    if (!["A", "B", "C"].includes(choice)) return json({ error: "bad-choice" }, 400);
    if (body.confirm !== true) return json({ error: "confirm-required" }, 400);
    const { data: cur } = await a.from("inv_choices").select("choice, addendum_status").eq("investor_id", inv.id).maybeSingle();
    // A or B is final (addendum). Choice C has no addendum and can still be changed, also after the deadline.
    if (cur && (cur.choice === "A" || cur.choice === "B")) return json({ error: "already-chosen" }, 400);
    const reason = str(body.reason, 2000), wish = str(body.wish, 2000);
    if (choice === "C" && !reason) return json({ error: "reason-required" }, 400);
    await applyChoice(a, inv, { choice, reason, wish, ip });
    await audit(a, u, "choice", inv.email, { choice });
    return json({ ok: true });
  }

  if (action === "slots") {
    const kind = String(body.kind || "");
    if (!["video", "callback"].includes(kind)) return json({ error: "bad-kind" }, 400);
    return json({ ok: true, days: await freeSlots(a, kind, s.booking) });
  }

  if (action === "book") {
    const kind = String(body.kind || ""), topic = TOPICS.includes(body.topic) ? body.topic : "andere", phone = str(body.phone, 40), message = str(body.message, 1000);
    if (!KIND_NL[kind]) return json({ error: "bad-kind" }, 400);
    if (kind === "callback" && !phone) return json({ error: "phone-required" }, 400);
    let starts: string | null = null, ends: string | null = null, eventId: string | null = null, arrival: string | null = null, persons = 1;
    if (kind === "visit") {
      eventId = String(body.event_id || "");
      persons = Math.floor(Number(body.persons || 1));
      if (!/^[0-9a-f-]{36}$/.test(eventId) || persons < 1 || persons > s.booking.max_persons) return json({ error: "bad-input" }, 400);
      const { data: e } = await a.from("inv_events").select("starts_at, slot_minutes").eq("id", eventId).maybeSingle();
      arrival = str(body.arrival, 5);
      const { data: sl } = await a.from("inv_event_slots").select("start_time").eq("event_id", eventId).eq("start_time", arrival).maybeSingle();
      if (!e || !sl) return json({ error: "bad-input" }, 400);
      // The appointment runs from its arrival time for the length of one slot on the day of the investor day.
      starts = toUtc(localDay(new Date(e.starts_at)), arrival).toISOString();
      ends = new Date(new Date(starts).getTime() + Number(e.slot_minutes || 30) * 60000).toISOString();
    } else {
      starts = new Date(String(body.starts_at || "")).toISOString();
      const free = (await freeSlots(a, kind, s.booking)).flatMap((d) => d.slots);
      if (!free.includes(starts)) return json({ error: "slot-taken" }, 409);
      ends = new Date(new Date(starts).getTime() + s.booking.slot_minutes * 60000).toISOString();
    }
    const { data: id, error } = await a.rpc("inv_book", { p_investor: inv.id, p_kind: kind, p_event: eventId, p_arrival: arrival, p_starts: starts, p_ends: ends, p_persons: persons, p_phone: phone || null, p_topic: topic, p_message: message || null });
    if (error) { const m = /already-booked|slot-full|slot-taken|no-slot|no-event/.exec(error.message); if (m) return json({ error: m[0] }, 409); console.error("inv book", error.message); return json({ error: "server-error" }, 500); }
    const { data: b } = await a.from("inv_bookings").select("*, inv_events(title, address)").eq("id", id).single();
    if (kind === "video") {
      // One Teams meeting per video appointment. If Teams is unavailable the booking still goes ahead with the manual link.
      try {
        const m = await createMeeting(`EVChargeking: videogesprek – ${[inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email}`, b.starts_at, b.ends_at);
        if (m) { b.meet_url = m.joinUrl; await a.from("inv_bookings").update({ meet_url: m.joinUrl, meet_id: m.id }).eq("id", id); console.log("teams created", id); }
        else console.log("teams skipped: secrets not visible to the function", id);
      } catch (err) { console.error("teams create failed", id, String((err as any)?.message || err)); }
    }
    if (phone && phone !== inv.phone) await a.from("inv_investors").update({ phone }).eq("id", inv.id);
    const detailIn = (l: Lang) => bookingDetail(kind, b, arrival, persons, phone || null, s, l);
    const detail = detailIn("nl");
    const L = pickLang(inv.lang), K = KIND_L[L][kind];
    const bm = bookingMail(kind, b, arrival, persons, phone || null, s, inv.first_name, L);
    await sendMail(a, { to: inv.email, kind: "booking", lang: L, subject: bm.subject, ics: ics({ id, title: `EVChargeking: ${K}`, start: b.starts_at, end: b.ends_at, location: kind === "visit" ? b.inv_events.address : undefined, url: b.meet_url || undefined, desc: detailIn(L) }), text: bm.text });
    const name = inv.company_name || [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email;
    await sendMail(a, { to: notifyTo(s), kind: "booking-notice", subject: `Nieuwe afspraak: ${name} (${KIND_NL[kind]})`, ics: ics({ id, title: `Investeerder ${name}: ${KIND_NL[kind]}`, start: b.starts_at, end: b.ends_at, url: b.meet_url || undefined, location: kind === "visit" ? b.inv_events.address : undefined, desc: `${detail}\nOnderwerp: ${topic}\n${message}` }), text: `Nieuwe afspraak via het investeerdersportaal.\n\nInvesteerder: ${name} (${inv.email})\n${KIND_NL[kind]}\n${detail}\nOnderwerp: ${topic}${message ? "\nBericht: " + message : ""}` });
    await audit(a, u, "booking", inv.email, { id, kind });
    return json({ ok: true, id });
  }

  if (action === "move") {
    const { data: b } = await a.from("inv_bookings").select("id, kind, starts_at, status, meet_id").eq("id", String(body.id || "")).eq("investor_id", inv.id).maybeSingle();
    if (!b || b.status !== "confirmed" || !["video", "callback"].includes(b.kind)) return json({ error: "not-found" }, 404);
    if (new Date(b.starts_at).getTime() - Date.now() < s.booking.cancel_hours * 3600_000) return json({ error: "too-late" }, 400);
    const starts = new Date(String(body.starts_at || "")).toISOString();
    const free = (await freeSlots(a, b.kind, s.booking)).flatMap((d: any) => d.slots);
    if (!free.includes(starts)) return json({ error: "slot-taken" }, 409);
    const ends = new Date(new Date(starts).getTime() + s.booking.slot_minutes * 60000).toISOString();
    const { data: nb } = await a.from("inv_bookings").update({ starts_at: starts, ends_at: ends }).eq("id", b.id).select("*").single();
    if (b.meet_id) await moveMeeting(b.meet_id, starts, ends).catch((err) => console.error("teams move", err));
    const L = pickLang(inv.lang), K = KIND_L[L][b.kind], W = dateIn(starts, true, L), link = nb?.meet_url || (b.kind === "video" ? s.video_url : null);
    const MV = { nl: [`Uw afspraak is verplaatst: ${K}`, `Uw afspraak is verplaatst naar ${W}.`, "Afspraak verplaatsen of annuleren kan in het portaal:", "Met vriendelijke groeten,"], fr: [`Votre rendez-vous a été déplacé : ${K}`, `Votre rendez-vous a été déplacé au ${W}.`, "Vous pouvez déplacer ou annuler le rendez-vous dans le portail :", "Cordialement,"], en: [`Your appointment has been moved: ${K}`, `Your appointment has been moved to ${W}.`, "You can move or cancel the appointment in the portal:", "Kind regards,"] }[L];
    const det = `${K}: ${W}${link ? "\n" + (L === "fr" ? "Lien" : L === "en" ? "Link" : "Link") + ": " + link : ""}`;
    await sendMail(a, { to: inv.email, kind: "booking-moved", lang: L, subject: MV[0], ics: ics({ id: b.id, title: `EVChargeking: ${K}`, start: starts, end: ends, url: nb?.meet_url || undefined, desc: det, sequence: 1, method: "REQUEST" }), text: `${hello(inv.first_name, L)}\n\n${MV[1]}\n\n${det}\n\n${MV[2]} ${APP_URL}/afspraak\n\n${MV[3]}\nEVChargeking` });
    const name = inv.company_name || [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email;
    await sendMail(a, { to: notifyTo(s), kind: "booking-notice", subject: `Afspraak verplaatst: ${name} (${KIND_NL[b.kind]})`, ics: ics({ id: b.id, title: `Investeerder ${name}: ${KIND_NL[b.kind]}`, start: starts, end: ends, url: nb?.meet_url || undefined, desc: det, sequence: 1, method: "REQUEST" }), text: `${name} (${inv.email}) heeft de afspraak verplaatst.\n\n${KIND_NL[b.kind]}: ${nlDate(starts, true)}` });
    await audit(a, u, "booking-move", inv.email, { id: b.id, starts });
    return json({ ok: true });
  }

  if (action === "cancel") {
    const { data: b } = await a.from("inv_bookings").select("id, kind, starts_at, status, meet_id").eq("id", String(body.id || "")).eq("investor_id", inv.id).maybeSingle();
    if (!b || b.status !== "confirmed") return json({ error: "not-found" }, 404);
    if (new Date(b.starts_at).getTime() - Date.now() < s.booking.cancel_hours * 3600_000) return json({ error: "too-late" }, 400);
    await a.from("inv_bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", b.id);
    if (b.meet_id) await deleteMeeting(b.meet_id).catch((err) => console.error("teams delete", err));
    const CL = pickLang(inv.lang), CK = KIND_L[CL][b.kind], CW = dateIn(b.starts_at, true, CL), CT = { nl: ["Uw afspraak is geannuleerd – EVChargeking", `Uw afspraak (${CK}, ${CW}) is geannuleerd.\n\nEen nieuwe afspraak maken kan via ${APP_URL}/afspraak`], fr: ["Votre rendez-vous est annulé – EVChargeking", `Votre rendez-vous (${CK}, ${CW}) est annulé.\n\nVous pouvez prendre un nouveau rendez-vous via ${APP_URL}/afspraak`], en: ["Your appointment has been cancelled – EVChargeking", `Your appointment (${CK}, ${CW}) has been cancelled.\n\nYou can make a new appointment at ${APP_URL}/afspraak`] }[CL];
    await sendMail(a, { to: inv.email, kind: "booking-cancel", lang: CL, subject: CT[0], text: CT[1] });
    await sendMail(a, { to: notifyTo(s), kind: "booking-notice", subject: `Afspraak geannuleerd: ${inv.email}`, text: `${inv.email} annuleerde: ${KIND_NL[b.kind]}, ${nlDate(b.starts_at, true)}.` });
    await audit(a, u, "booking-cancel", inv.email, { id: b.id });
    return json({ ok: true });
  }
  return json({ error: "bad-action" }, 400);
});
