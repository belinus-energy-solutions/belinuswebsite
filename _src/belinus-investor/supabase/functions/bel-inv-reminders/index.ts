// bel-inv-reminders — e-mail reminder 15 minutes before each video or call-back appointment.
// Called every 5 minutes by a scheduled job (see supabase/migrations/20261109_inv_reminders.sql). Each booking is reminded once
// (inv_bookings.reminder_sent_at); the window is 10–20 minutes ahead, so a 5-minute run never misses one.
import { adminClient, APP_URL, applyChoice, audit, cors, dateIn, hello, json, KIND_L, pickLang, sendMail, settings } from "../_shared/inv.ts";

const KIND_NL: Record<string, string> = { video: "Videogesprek", callback: "Terugbelverzoek" };
const SUBJ = { nl: "Herinnering: uw afspraak begint over 15 minuten – EVChargeking", fr: "Rappel : votre rendez-vous commence dans 15 minutes – EVChargeking", en: "Reminder: your appointment starts in 15 minutes – EVChargeking" } as const;
const LEAD = { nl: "Uw afspraak begint over 15 minuten.", fr: "Votre rendez-vous commence dans 15 minutes.", en: "Your appointment starts in 15 minutes." } as const;
const CLOSE = { nl: "Met vriendelijke groeten,", fr: "Cordialement,", en: "Kind regards," } as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const a = adminClient(), now = Date.now();
  const { data: due, error } = await a.from("inv_bookings")
    .select("id, kind, starts_at, meet_url, inv_investors(email, first_name, last_name, company_name, lang, is_test)")
    .eq("status", "confirmed").in("kind", ["video", "callback"]).is("reminder_sent_at", null)
    .gte("starts_at", new Date(now + 10 * 60000).toISOString()).lte("starts_at", new Date(now + 20 * 60000).toISOString());
  if (error) { console.error("reminders query", error.message); return json({ error: "server-error" }, 500); }
  const s = await settings(a);
  let sent = 0;
  for (const b of (due || []) as any[]) {
    const inv = b.inv_investors, L = pickLang(inv.lang), K = KIND_L[L][b.kind], W = dateIn(b.starts_at, true, L);
    const link = b.meet_url || (b.kind === "video" ? s.video_url : null);
    const name = inv.company_name || [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email;
    // Investor
    await sendMail(a, { to: inv.email, kind: "booking-reminder", lang: L, subject: SUBJ[L], text: `${hello(inv.first_name, L)}\n\n${LEAD[L]}\n\n${K}: ${W}${link ? "\n" + (L === "nl" ? "Link" : "Link") + ": " + link : ""}\n\n${CLOSE[L]}\nEVChargeking` });
    // Contact at EVChargeking (Erwin), or Steve for test accounts
    const contact = inv.is_test ? "steve@belinus.com" : (s.notify_email || "erwin@evchargeking.com");
    await sendMail(a, { to: contact, kind: "booking-reminder", subject: `Over 15 minuten: ${name} (${KIND_NL[b.kind]})`, text: `Afspraak over 15 minuten.\n\nInvesteerder: ${name} (${inv.email})\n${KIND_NL[b.kind]}: ${W}${link ? "\nLink: " + link : ""}\n\nPortaal: ${APP_URL}/#/investeerders/${b.id}` });
    await a.from("inv_bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
    sent++;
  }
  // Automatic choice: a sent campaign with auto_choice registers that choice, once, for every recipient who still has no choice
  // when auto_choice_at has passed. The campaign is marked done first, so a second run can never register twice.
  let auto = 0;
  const { data: camps } = await a.from("inv_campaigns").select("id, name, auto_choice").not("auto_choice", "is", null).is("auto_choice_done_at", null).eq("status", "sent").lte("auto_choice_at", new Date().toISOString());
  for (const c of (camps || []) as any[]) {
    const { data: claimed } = await a.from("inv_campaigns").update({ auto_choice_done_at: new Date().toISOString() }).eq("id", c.id).is("auto_choice_done_at", null).select("id");
    if (!claimed?.length) continue;
    const { data: logs } = await a.from("inv_mail_log").select("recipient").eq("campaign_id", c.id).eq("status", "sent").limit(5000);
    const emails = [...new Set((logs || []).map((l: any) => String(l.recipient).toLowerCase()))];
    for (const email of emails) {
      const { data: inv } = await a.from("inv_investors").select("id, email, first_name, lang, tranche, is_test, is_demo").ilike("email", email.replace(/[%_\\]/g, "\\$&")).maybeSingle();
      if (!inv || inv.is_test || inv.is_demo) continue;
      const { data: ch } = await a.from("inv_choices").select("choice").eq("investor_id", inv.id).maybeSingle();
      if (ch) continue;
      try { await applyChoice(a, inv, { choice: c.auto_choice, auto: true, note: `Automatisch geregistreerd: geen antwoord op campagne "${c.name}"` }); auto++; }
      catch (e) { console.error("auto choice", inv.email, (e as Error).message); }
    }
    await audit(a, null, "auto-choice", c.id, { choice: c.auto_choice, registered: auto });
  }
  return json({ ok: true, sent, auto });
});
