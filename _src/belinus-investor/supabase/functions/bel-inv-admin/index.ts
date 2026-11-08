// bel-inv-admin — superadmins of the investor area: Belinus (role belinus) and EVChargeking (role evc). This function only reads the EVChargeking investor tables (inv_*). Second factor required.
import { access, adminClient, applyChoice, audit, cors, currentUser, dateIn, json, nlDate, pickLang, sendAccessLink, sendMail, settings, str } from "../_shared/inv.ts";

const SETTINGS_BELINUS = ["deadline", "interest_only_date", "gift", "notify_email"];
const SETTINGS_ALL = ["booking", "video_url"];

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
    return json({ ok: true, role: acc.role, investors: (inv || []).map((i: any) => ({ ...i, choice: byC.get(i.id) || null })), followups: fu, tranches: tr, settings: await settings(a) });
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
  if (action === "record_choice") {
    const choice = String(body.choice || ""), note = str(body.note, 1000), reason = str(body.reason, 2000), wish = str(body.wish, 2000);
    if (!["A", "B", "C"].includes(choice) || !note) return json({ error: "bad-input" }, 400);
    if (choice === "C" && !reason) return json({ error: "reason-required" }, 400);
    const { data: inv } = await a.from("inv_investors").select("id, email, first_name, lang").eq("id", id).single();
    await applyChoice(a, inv, { choice, reason, wish, note, by_admin: u.id });
    await audit(a, u, "choice-by-admin", inv.email, { choice, note });
    return json({ ok: true });
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
    return json({ ok: true, bookings: data || [] });
  }
  if (action === "booking_update") {
    const status = String(body.status || "");
    if (!["cancelled", "held", "no_show", "confirmed"].includes(status)) return json({ error: "bad-input" }, 400);
    const { data: b } = await a.from("inv_bookings").update({ status, note: str(body.note, 1000) || null, ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}) }).eq("id", id).select("starts_at, kind, inv_investors(email, lang)").single();
    if (status === "cancelled" && body.notify) { const L = pickLang((b as any).inv_investors.lang), W = dateIn(b!.starts_at, true, L), M = str(body.message, 1000), U = "https://investor.belinus.com/afspraak", T = { nl: ["Uw afspraak is geannuleerd – EVChargeking", `Uw afspraak van ${W} werd geannuleerd.\n\n${M}\n\nEen nieuwe afspraak maken kan via ${U}`], fr: ["Votre rendez-vous est annulé – EVChargeking", `Votre rendez-vous du ${W} a été annulé.\n\n${M}\n\nVous pouvez prendre un nouveau rendez-vous via ${U}`], en: ["Your appointment has been cancelled – EVChargeking", `Your appointment of ${W} has been cancelled.\n\n${M}\n\nYou can make a new appointment at ${U}`] }[L]; await sendMail(a, { to: (b as any).inv_investors.email, kind: "booking-cancel", lang: L, subject: T[0], text: T[1] }); }
    await audit(a, u, "booking-update", id, { status });
    return json({ ok: true });
  }
  if (action === "availability") {
    const [{ data: w }, { data: bl }, { data: ev }] = await Promise.all([a.from("inv_availability").select("*").order("weekday").order("start_time"), a.from("inv_blocked").select("*").order("day"), a.from("inv_events").select("*").order("starts_at")]);
    return json({ ok: true, windows: w, blocked: bl, events: ev, settings: await settings(a) });
  }
  if (action === "availability_save") {
    const rows = (Array.isArray(body.windows) ? body.windows : []).map((w: any) => ({ weekday: Number(w.weekday), start_time: str(w.start_time, 5), end_time: str(w.end_time, 5), kinds: (w.kinds || []).filter((k: string) => ["video", "callback"].includes(k)) }));
    if (rows.some((r: any) => !(r.weekday >= 1 && r.weekday <= 7) || !/^\d\d:\d\d$/.test(r.start_time) || !/^\d\d:\d\d$/.test(r.end_time) || r.end_time <= r.start_time || !r.kinds.length)) return json({ error: "bad-input" }, 400);
    await a.from("inv_availability").delete().gte("weekday", 0);
    if (rows.length) await a.from("inv_availability").insert(rows);
    await audit(a, u, "availability", "windows", { n: rows.length });
    return json({ ok: true });
  }
  if (action === "blocked") {
    const day = String(body.day || "");
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return json({ error: "bad-input" }, 400);
    if (body.remove) await a.from("inv_blocked").delete().eq("day", day); else await a.from("inv_blocked").upsert({ day, note: str(body.note, 200) || null });
    return json({ ok: true });
  }
  if (action === "event_save") {
    const patch = { capacity: Math.max(0, Math.floor(Number(body.capacity))), active: body.active !== false, arrival_slots: (body.arrival_slots || []).map((s: string) => str(s, 5)).filter((s: string) => /^\d\d:\d\d$/.test(s)) };
    await a.from("inv_events").update(patch).eq("id", id);
    await audit(a, u, "event", id, patch);
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
