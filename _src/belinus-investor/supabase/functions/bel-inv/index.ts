// bel-inv — signed-in investor actions of the EVChargeking investor area.
// Second factor (as in Clavoris: a code by e-mail, or the authenticator app): mfa_status, mfa_send, mfa_verify, mfa_totp_done.
// After it: me, choose, slots, book, cancel, set_phone.
import { access, adminClient, APP_URL, applyChoice, audit, claims, clientIp, cors, currentUser, json, nlDate, sendMail, settings, sha256, str } from "../_shared/inv.ts";

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
const icsT = (d: Date | string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z/, "Z");
function ics(b: { id: string; title: string; start: string; end: string; location?: string; desc: string }): string {
  const e = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Belinus//Investeerdersportaal//NL", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${b.id}@investor.belinus.com`, `DTSTAMP:${icsT(new Date())}`, `DTSTART:${icsT(b.start)}`, `DTEND:${icsT(b.end)}`, `SUMMARY:${e(b.title)}`, ...(b.location ? [`LOCATION:${e(b.location)}`] : []), `DESCRIPTION:${e(b.desc)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

async function freeSlots(a: any, kind: string, cfg: any): Promise<{ day: string; slots: string[] }[]> {
  const now = Date.now(), earliest = now + cfg.notice_hours * 3600_000, step = cfg.slot_minutes + cfg.buffer_minutes;
  const [{ data: av }, { data: bl }, { data: bk }] = await Promise.all([
    a.from("inv_availability").select("weekday, start_time, end_time, kinds"),
    a.from("inv_blocked").select("day"),
    a.from("inv_bookings").select("starts_at").in("kind", ["video", "callback"]).eq("status", "confirmed").gte("starts_at", new Date(now).toISOString()),
  ]);
  const blocked = new Set((bl || []).map((b: any) => b.day)), taken = new Set((bk || []).map((b: any) => new Date(b.starts_at).getTime()));
  const out: { day: string; slots: string[] }[] = [];
  for (let i = 0; i <= cfg.horizon_days; i++) {
    const day = localDay(new Date(now + i * 86400_000));
    if (blocked.has(day)) continue;
    const wd = new Date(day + "T12:00:00Z").getUTCDay() || 7, list: string[] = [];
    for (const w of (av || []).filter((x: any) => x.weekday === wd && x.kinds.includes(kind))) {
      const [sh, sm] = w.start_time.split(":").map(Number), [eh, em] = w.end_time.split(":").map(Number);
      for (let t = sh * 60 + sm; t + cfg.slot_minutes <= eh * 60 + em; t += step) {
        const u = toUtc(day, `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
        if (u.getTime() >= earliest && !taken.has(u.getTime())) list.push(u.toISOString());
      }
    }
    if (list.length) out.push({ day, slots: list.sort() });
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
  const { data: inv } = await a.from("inv_investors").select("*").eq("user_id", u.id).maybeSingle();
  const acc = await access(a, u);
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
    const sent = await sendMail(a, { to: u.email, kind: "login-code", subject: `Uw aanmeldcode: ${code}`, text: `Uw aanmeldcode voor het Investeerdersportaal EVChargeking is:\n\n${code}\n\nDe code is 10 minuten geldig en kan één keer gebruikt worden.\n\nHebt u zich niet net aangemeld? Deel deze code dan niet en wijzig uw wachtwoord.` });
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
  if (action === "mfa_totp_done") { if (c.aal !== "aal2") return json({ error: "mfa-required" }, 401); return await complete("totp"); }

  if (!acc.mfa) return json({ error: "mfa-required" }, 401);
  const s = await settings(a);
  const closed = Date.now() > new Date(s.deadline).getTime();

  if (action === "me") {
    if (!inv) return json({ ok: true, admin: acc.role, investor: null });
    const [{ data: tr }, { data: sch }, { data: ch }, { data: bk }, { data: ev }, { data: used }] = await Promise.all([
      a.from("inv_tranches").select("*").eq("code", inv.tranche).single(),
      a.from("inv_schedule").select("scenario, period, due, gross_interest, withholding, net_interest, principal, remaining, status, paid_at").eq("investor_id", inv.id).order("period"),
      a.from("inv_choices").select("choice, wish, reason, confirmed_at, addendum_status").eq("investor_id", inv.id).maybeSingle(),
      a.from("inv_bookings").select("id, kind, starts_at, ends_at, arrival, persons, phone, topic, status, event_id").eq("investor_id", inv.id).order("starts_at"),
      a.from("inv_events").select("id, title, starts_at, ends_at, address, capacity, arrival_slots, description").eq("active", true).gte("ends_at", new Date().toISOString()).order("starts_at"),
      a.from("inv_bookings").select("event_id, persons").eq("kind", "visit").eq("status", "confirmed"),
    ]);
    const events = (ev || []).map((e: any) => ({ ...e, free: e.capacity - (used || []).filter((x: any) => x.event_id === e.id).reduce((n: number, x: any) => n + x.persons, 0), capacity: undefined }));
    const gift = ch && ch.choice !== "C" && s.gift?.text ? s.gift : null;
    return json({ ok: true, admin: acc.role, investor: { first_name: inv.first_name, last_name: inv.last_name, company_name: inv.company_name, email: inv.email, phone: inv.phone, invested: inv.invested, invested_on: inv.invested_on }, tranche: tr, original: (sch || []).filter((r: any) => r.scenario === "original"), optionA: (sch || []).filter((r: any) => r.scenario === "A"), choice: ch, bookings: bk, events, deadline: s.deadline, closed, interest_only_date: s.interest_only_date, gift, booking: s.booking });
  }
  if (!inv) return json({ error: "not-investor" }, 403);

  if (action === "set_phone") { await a.from("inv_investors").update({ phone: str(body.phone, 40) || null }).eq("id", inv.id); return json({ ok: true }); }

  if (action === "choose") {
    const choice = String(body.choice || "");
    if (!["A", "B", "C"].includes(choice)) return json({ error: "bad-choice" }, 400);
    if (body.confirm !== true) return json({ error: "confirm-required" }, 400);
    if (closed) return json({ error: "closed" }, 400);
    const { data: cur } = await a.from("inv_choices").select("addendum_status").eq("investor_id", inv.id).maybeSingle();
    if (cur && cur.addendum_status !== "none") return json({ error: "closed" }, 400);
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
      const { data: e } = await a.from("inv_events").select("arrival_slots").eq("id", eventId).maybeSingle();
      arrival = str(body.arrival, 5);
      if (!e || (e.arrival_slots.length && !e.arrival_slots.includes(arrival))) return json({ error: "bad-input" }, 400);
    } else {
      starts = new Date(String(body.starts_at || "")).toISOString();
      const free = (await freeSlots(a, kind, s.booking)).flatMap((d) => d.slots);
      if (!free.includes(starts)) return json({ error: "slot-taken" }, 409);
      ends = new Date(new Date(starts).getTime() + s.booking.slot_minutes * 60000).toISOString();
    }
    const { data: id, error } = await a.rpc("inv_book", { p_investor: inv.id, p_kind: kind, p_event: eventId, p_arrival: arrival, p_starts: starts, p_ends: ends, p_persons: persons, p_phone: phone || null, p_topic: topic, p_message: message || null });
    if (error) { const m = /already-booked|event-full|slot-taken|no-event/.exec(error.message); if (m) return json({ error: m[0] }, 409); console.error("inv book", error.message); return json({ error: "server-error" }, 500); }
    const { data: b } = await a.from("inv_bookings").select("*, inv_events(title, address)").eq("id", id).single();
    if (phone && phone !== inv.phone) await a.from("inv_investors").update({ phone }).eq("id", inv.id);
    const when = nlDate(b.starts_at, true);
    const detail = kind === "visit" ? `${b.inv_events.title}\nAankomst: ${arrival || "10:00"}\nPersonen: ${persons}\nAdres: ${b.inv_events.address}\nMet koffie en iets lekkers.`
      : kind === "video" ? `Datum en uur: ${when}\n${s.video_url ? "Link naar het gesprek: " + s.video_url : "U ontvangt de link naar het gesprek vóór de afspraak per e-mail."}`
      : `Datum en uur: ${when}\nWij bellen u op ${phone}.`;
    await sendMail(a, { to: inv.email, kind: "booking", subject: `Bevestiging van uw afspraak: ${KIND_NL[kind]}`, ics: ics({ id, title: `EVChargeking: ${KIND_NL[kind]}`, start: b.starts_at, end: b.ends_at, location: kind === "visit" ? b.inv_events.address : undefined, desc: detail }), text: `Beste${inv.first_name ? " " + inv.first_name : ""},\n\nUw afspraak is bevestigd.\n\n${KIND_NL[kind]}\n${detail}\n\nAfspraak verplaatsen of annuleren kan in het portaal: ${APP_URL}/afspraak\n\nMet vriendelijke groeten,\nEVChargeking` });
    const name = inv.company_name || [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email;
    await sendMail(a, { to: inv.is_test ? "steve@belinus.com" : (s.notify_email || "erwin@evchargeking.com"), kind: "booking-notice", subject: `Nieuwe afspraak: ${name} (${KIND_NL[kind]})`, ics: ics({ id, title: `Investeerder ${name}: ${KIND_NL[kind]}`, start: b.starts_at, end: b.ends_at, location: kind === "visit" ? b.inv_events.address : undefined, desc: `${detail}\nOnderwerp: ${topic}\n${message}` }), text: `Nieuwe afspraak via het investeerdersportaal.\n\nInvesteerder: ${name} (${inv.email})\n${KIND_NL[kind]}\n${detail}\nOnderwerp: ${topic}${message ? "\nBericht: " + message : ""}` });
    await audit(a, u, "booking", inv.email, { id, kind });
    return json({ ok: true, id });
  }

  if (action === "cancel") {
    const { data: b } = await a.from("inv_bookings").select("id, kind, starts_at, status").eq("id", String(body.id || "")).eq("investor_id", inv.id).maybeSingle();
    if (!b || b.status !== "confirmed") return json({ error: "not-found" }, 404);
    if (new Date(b.starts_at).getTime() - Date.now() < s.booking.cancel_hours * 3600_000) return json({ error: "too-late" }, 400);
    await a.from("inv_bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", b.id);
    await sendMail(a, { to: inv.email, kind: "booking-cancel", subject: "Uw afspraak is geannuleerd – EVChargeking", text: `Uw afspraak (${KIND_NL[b.kind]}, ${nlDate(b.starts_at, true)}) is geannuleerd.\n\nEen nieuwe afspraak maken kan via ${APP_URL}/afspraak` });
    await sendMail(a, { to: inv.is_test ? "steve@belinus.com" : (s.notify_email || "erwin@evchargeking.com"), kind: "booking-notice", subject: `Afspraak geannuleerd: ${inv.email}`, text: `${inv.email} annuleerde: ${KIND_NL[b.kind]}, ${nlDate(b.starts_at, true)}.` });
    await audit(a, u, "booking-cancel", inv.email, { id: b.id });
    return json({ ok: true });
  }
  return json({ error: "bad-action" }, 400);
});
