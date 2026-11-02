// bel-support — support requests of the Belinus Portal (ported from Clavoris clv-support, reduced).
// The customer:
//   { action: "list" }                                        -> own requests, newest activity first
//   { action: "get", id }                                     -> request + messages (internal notes excluded) + attachment links
//   { action: "upload_url", name, size, type }                -> signed upload URL (PNG, JPEG, PDF, TXT, MP4; 10 MB)
//   { action: "create", subject, category, body, system_id?, safety?, attachments?, context? }
//        safety = true (smell, smoke, heat, swelling, alarm): priority urgent, the desk is mailed at once and the
//        answer tells the person what to do now.
//   { action: "reply", id, body, attachments? } | { action: "close", id } | { action: "reopen", id }
// Belinus staff (role staff / super):
//   { action: "admin_list", queue? }  queue: open | mine | unassigned | answered | safety | closed | all
//   { action: "get", id }             -> with internal notes, SLA and history
//   { action: "reply", id, body, internal?, close? }
//   { action: "set", id, status?, priority?, category?, level? }
//   { action: "assign", id, to: "me" | uuid | null }
// Service levels: business minutes per tier and priority (bel_support_sla), due times kept on the request.
// Deploy: --no-verify-jwt.
import { adminClient, APP_URL, audit, cors, displayName, greeting, isStaff, json, notifyDesk, pickLang, requireUser, sendMail, type Lang, type Profile } from "../_shared/bel.ts";
import { addBusiness, businessBetween } from "../_shared/support-sla.ts";

const BUCKET = "bel-support";
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "text/plain": "txt", "video/mp4": "mp4" };
const CATS = ["battery", "inverter", "solar", "ev_charger", "ems", "installation", "warranty", "recall", "billing", "account", "other"];
const PRIOS = ["low", "normal", "high", "urgent"];
const STATUSES = ["open", "on_hold", "answered", "closed"];
const PAUSED = new Set(["on_hold", "answered", "closed"]);
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const str = (v: unknown, n: number) => { const t = String(v ?? "").replace(/\r\n/g, "\n").trim(); return t ? t.slice(0, n) : ""; };
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const num = (n: number) => `#${n}`;
const custStatus = (s: string) => (s === "on_hold" ? "open" : s);

const MAIL: Record<string, Record<Lang, { s: string; t: string }>> = {
  receipt: {
    nl: { s: "Belinus support {n}: we ontvingen uw vraag", t: "{greet}\n\nWe ontvingen uw supportvraag {n} \"{subject}\". Belinus antwoordt op werkdagen; u krijgt een e-mail zodra we antwoorden.\n\nU volgt de vraag op in het portaal:\n{link}" },
    fr: { s: "Support Belinus {n} : nous avons reçu votre demande", t: "{greet}\n\nNous avons reçu votre demande de support {n} « {subject} ». Belinus répond les jours ouvrables ; vous recevrez un e-mail dès notre réponse.\n\nSuivez la demande dans le portail :\n{link}" },
    en: { s: "Belinus support {n}: we received your request", t: "{greet}\n\nWe received your support request {n} \"{subject}\". Belinus answers on working days; you will receive an e-mail when we reply.\n\nFollow the request in the portal:\n{link}" },
  },
  safety: {
    nl: { s: "Belinus support {n}: veiligheidsmelding ontvangen", t: "{greet}\n\nWe ontvingen uw veiligheidsmelding {n} \"{subject}\" en behandelen ze met voorrang.\n\nWat u nu doet:\n- Ruikt u brand, ziet u rook of vuur: verlaat het huis en bel 112.\n- Anders: schakel de batterij uit met de schakelaar op de batterij en zet de groep van de omvormer in de zekeringkast af, als dat veilig kan.\n- Raak een opgezwollen, hete of beschadigde batterij niet aan.\n\nWe nemen zo snel mogelijk contact met u op. Volg de melding in het portaal:\n{link}" },
    fr: { s: "Support Belinus {n} : signalement de sécurité reçu", t: "{greet}\n\nNous avons reçu votre signalement de sécurité {n} « {subject} » et le traitons en priorité.\n\nCe que vous faites maintenant :\n- Odeur de brûlé, fumée ou feu : quittez la maison et appelez le 112.\n- Sinon : éteignez la batterie avec son interrupteur et coupez le circuit de l'onduleur au tableau électrique, si vous pouvez le faire sans danger.\n- Ne touchez pas une batterie gonflée, chaude ou endommagée.\n\nNous vous contactons au plus vite. Suivez le signalement dans le portail :\n{link}" },
    en: { s: "Belinus support {n}: safety report received", t: "{greet}\n\nWe received your safety report {n} \"{subject}\" and are handling it with priority.\n\nWhat to do now:\n- If you smell burning or see smoke or fire: leave the house and call 112.\n- Otherwise: switch the battery off with its switch and turn off the inverter's circuit in the fuse box, if you can do so safely.\n- Do not touch a swollen, hot or damaged battery.\n\nWe will contact you as soon as possible. Follow the report in the portal:\n{link}" },
  },
  answered: {
    nl: { s: "Belinus support {n}: nieuw antwoord", t: "{greet}\n\nBelinus beantwoordde uw vraag {n} \"{subject}\":\n\n{body}\n\nAntwoorden of de vraag afsluiten doet u in het portaal:\n{link}" },
    fr: { s: "Support Belinus {n} : nouvelle réponse", t: "{greet}\n\nBelinus a répondu à votre demande {n} « {subject} » :\n\n{body}\n\nRépondez ou clôturez la demande dans le portail :\n{link}" },
    en: { s: "Belinus support {n}: new answer", t: "{greet}\n\nBelinus answered your request {n} \"{subject}\":\n\n{body}\n\nReply or close the request in the portal:\n{link}" },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const admin = adminClient();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const meR = await requireUser(admin, req);
  if (meR instanceof Response) return meR;
  const me: Profile = meR;
  const staff = isStaff(me);
  const store = admin.storage.from(BUCKET);
  const link = (id: string) => `${APP_URL}/#/support/${id}`;

  const policyCache = new Map<string, { response_min: number; resolution_min: number }>();
  async function policy(tier: string, prio: string) {
    const k = `${tier}/${prio}`;
    if (policyCache.has(k)) return policyCache.get(k)!;
    const { data } = await admin.from("bel_support_sla").select("tier, response_min, resolution_min").eq("priority", prio).in("tier", [tier, "default"]);
    const row = (data || []).find((r: any) => r.tier === tier) || (data || []).find((r: any) => r.tier === "default") || { response_min: 540, resolution_min: 2700 };
    policyCache.set(k, row);
    return row;
  }
  const resolutionDue = async (t: any, prio = t.priority, paused = t.sla_paused_min || 0) => addBusiness(new Date(t.created_at), (await policy(t.tier, prio)).resolution_min + paused).toISOString();
  const responseDue = async (t: any, since: Date, prio = t.priority) => addBusiness(since, (await policy(t.tier, prio)).response_min).toISOString();
  async function statusPatch(t: any, to: string, customerWaits: boolean): Promise<Record<string, unknown>> {
    const now = new Date(), upd: Record<string, unknown> = { status: to, updated_at: now.toISOString() };
    upd.closed_at = to === "closed" ? (t.closed_at && t.status === "closed" ? t.closed_at : now.toISOString()) : null;
    const wasPaused = PAUSED.has(t.status) && !!t.sla_paused_at, nowPaused = PAUSED.has(to);
    if (!wasPaused && nowPaused) upd.sla_paused_at = now.toISOString();
    if (wasPaused && !nowPaused) {
      const paused = (t.sla_paused_min || 0) + businessBetween(new Date(t.sla_paused_at), now);
      upd.sla_paused_min = paused; upd.sla_paused_at = null;
      if (!t.resolution_breached_at) { upd.resolution_due = await resolutionDue(t, t.priority, paused); upd.resolution_warned = false; }
    }
    if (to === "open" && (customerWaits || !t.response_due)) { upd.response_since = now.toISOString(); upd.response_due = await responseDue(t, now); upd.response_warned = false; upd.response_breached_at = null; }
    if (to === "closed") { upd.response_due = null; upd.response_since = null; }
    return upd;
  }
  const event = (ticketId: string, kind: string, detail: Record<string, unknown> = {}) => admin.from("bel_support_events").insert({ ticket_id: ticketId, actor_id: me.id, kind, detail }).then(() => {}, () => {});
  async function loadTicket(id: string) {
    if (!isUuid(id)) return null;
    const { data: t } = await admin.from("bel_support_tickets").select("*").eq("id", id).maybeSingle();
    if (!t) return null;
    return staff || t.user_id === me.id ? t : null;
  }
  function attachments(raw: unknown): unknown[] {
    if (!Array.isArray(raw)) return [];
    const own = staff ? /^(staff|u)\/[0-9a-f-]{36}\// : new RegExp(`^u/${me.id}/`);
    return raw.slice(0, 5).filter((a: any) => a && typeof a.path === "string" && own.test(a.path) && !a.path.includes(".."))
      .map((a: any) => ({ path: a.path, name: str(a.name, 120) || "file", size: Number(a.size) || 0, type: TYPES[a.type] ? a.type : "application/octet-stream" }));
  }
  async function withLinks(msgs: any[]) {
    return await Promise.all(msgs.map(async (m) => ({ ...m, attachments: await Promise.all((m.attachments || []).map(async (a: any) => {
      const { data } = await store.createSignedUrl(a.path, 300, { download: a.name });
      return { name: a.name, size: a.size, type: a.type, url: data?.signedUrl || null };
    })) })));
  }

  if (action === "upload_url") {
    const type = String(body.type || ""), size = Number(body.size || 0);
    if (!TYPES[type]) return json({ error: "file-type" }, 400);
    if (!(size > 0 && size <= 10 * 1024 * 1024)) return json({ error: "file-size" }, 400);
    const path = `${staff ? "staff" : "u"}/${me.id}/${crypto.randomUUID()}.${TYPES[type]}`;
    const { data: u, error } = await store.createSignedUploadUrl(path);
    if (error || !u) return json({ error: "storage-failed" }, 502);
    return json({ ok: true, path: u.path, token: u.token, bucket: BUCKET });
  }

  if (action === "list") {
    const { data } = await admin.from("bel_support_tickets").select("id, number, subject, category, status, safety, system_id, created_at, last_message_at").eq("user_id", me.id).is("merged_into", null).order("last_message_at", { ascending: false }).limit(200);
    return json({ ok: true, tickets: (data || []).map((t: any) => ({ ...t, status: custStatus(t.status) })) });
  }

  if (action === "get") {
    const t = await loadTicket(String(body.id || ""));
    if (!t) return json({ error: "not-found" }, 404);
    let q = admin.from("bel_support_messages").select("id, author_id, staff, internal, body, attachments, created_at").eq("ticket_id", t.id).order("created_at");
    if (!staff) q = q.eq("internal", false);
    const { data: msgs } = await q;
    const ids = [...new Set([...(msgs || []).map((m: any) => m.author_id), t.assigned_to].filter(isUuid))];
    const { data: people } = ids.length ? await admin.from("bel_profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const nm = (id: string | null) => { const p = (people || []).find((x: any) => x.id === id); return p ? (p.full_name || p.email) : ""; };
    const out = (await withLinks(msgs || [])).map((m: any) => ({ id: m.id, staff: m.staff, internal: m.internal, body: m.body, created_at: m.created_at, attachments: m.attachments, author: m.staff && !staff ? "Belinus" : nm(m.author_id), mine: m.author_id === me.id }));
    let system = null;
    if (t.system_id) { const { data: y } = await admin.from("bel_systems").select("id, kind, product, model, serial").eq("id", t.system_id).maybeSingle(); system = y; }
    const base = { id: t.id, number: t.number, subject: t.subject, category: t.category, safety: t.safety, status: staff ? t.status : custStatus(t.status), created_at: t.created_at, last_message_at: t.last_message_at, system };
    if (!staff) return json({ ok: true, ticket: base, messages: out });
    const { data: c } = await admin.from("bel_profiles").select("full_name, email, mobile, lang, city").eq("id", t.user_id).maybeSingle();
    const { data: evs } = await admin.from("bel_support_events").select("kind, detail, created_at").eq("ticket_id", t.id).order("created_at");
    return json({ ok: true, messages: out, customer: c, history: evs || [], ticket: { ...base, priority: t.priority, level: t.level, assigned_to: t.assigned_to, assignee: nm(t.assigned_to), context: t.context,
      sla: { response_due: t.response_due, first_response_at: t.first_response_at, resolution_due: t.resolution_due, response_breached_at: t.response_breached_at, resolution_breached_at: t.resolution_breached_at } } });
  }

  if (action === "create") {
    const subject = str(body.subject, 160), text = str(body.body, 8000);
    const category = CATS.includes(body.category) ? body.category : "other";
    const safety = body.safety === true;
    if (!subject) return json({ error: "subject-required" }, 400);
    if (text.length < 5) return json({ error: "body-required" }, 400);
    const { count } = await admin.from("bel_support_tickets").select("id", { count: "exact", head: true }).eq("user_id", me.id).gte("created_at", new Date(Date.now() - 86400_000).toISOString());
    if ((count || 0) >= 10) return json({ error: "too-many" }, 429);
    let systemId: string | null = null, siteId: string | null = null;
    if (isUuid(body.system_id)) {
      const { data: y } = await admin.from("bel_systems").select("id, site_id, bel_sites!inner(owner_id)").eq("id", body.system_id).maybeSingle();
      if (!y || (!staff && (y as any).bel_sites?.owner_id !== me.id)) return json({ error: "system-not-found" }, 404);
      systemId = y.id; siteId = y.site_id;
    }
    const ctx = body.context && typeof body.context === "object" ? body.context : {};
    const context = { page: str(ctx.page, 300), agent: str(req.headers.get("user-agent"), 300), screen: str(ctx.screen, 20) };
    const L = pickLang(me.lang);
    const tier = me.customer_type === "company" ? "business" : "default";
    const priority = safety ? "urgent" : "normal";
    const now = new Date(), seed = { created_at: now.toISOString(), tier, priority, sla_paused_min: 0 };
    const { data: t, error } = await admin.from("bel_support_tickets").insert({ user_id: me.id, site_id: siteId, system_id: systemId, subject, category, safety, priority, lang: L, context, tier, created_at: seed.created_at,
      response_since: seed.created_at, response_due: await responseDue(seed, now, priority), resolution_due: await resolutionDue(seed, priority) }).select("*").single();
    if (error || !t) { console.error("bel-support create", error?.message); return json({ error: "create-failed" }, 500); }
    await admin.from("bel_support_messages").insert({ ticket_id: t.id, author_id: me.id, staff: false, body: text, attachments: attachments(body.attachments) });
    await event(t.id, "created", { safety });
    await audit(admin, me, "support-ticket-created", num(t.number), { id: t.id, category, safety });
    const key = safety ? "safety" : "receipt";
    const v = { n: num(t.number), subject, greet: greeting(me, L), link: link(t.id) };
    await sendMail(me.email, fill(MAIL[key][L].s, v), fill(MAIL[key][L].t, v), L, undefined, "support").catch(() => false);
    await notifyDesk(`${safety ? "VEILIGHEID — " : ""}Support ${num(t.number)} [${category}]: ${subject}`,
      `Nieuwe supportvraag ${num(t.number)} van ${displayName(me, "nl")} (${me.email}${me.mobile ? ", " + me.mobile : ""}).\n\nCategorie: ${category}${safety ? "\nVEILIGHEIDSMELDING: prioriteit dringend" : ""}\nAntwoord tegen: ${t.response_due}\n\n${text}\n\n${APP_URL}/#/desk/${t.id}`);
    return json({ ok: true, id: t.id, number: t.number });
  }

  if (action === "reply") {
    const t = await loadTicket(String(body.id || ""));
    if (!t) return json({ error: "not-found" }, 404);
    if (t.merged_into) return json({ error: "merged" }, 409);
    const text = str(body.body, 8000);
    if (!text) return json({ error: "body-required" }, 400);
    const internal = staff && body.internal === true;
    const asStaff = staff && t.user_id !== me.id;
    await admin.from("bel_support_messages").insert({ ticket_id: t.id, author_id: me.id, staff: asStaff, internal, body: text, attachments: attachments(body.attachments) });
    const now = new Date().toISOString();
    if (internal) { await admin.from("bel_support_tickets").update({ updated_at: now }).eq("id", t.id); return json({ ok: true }); }
    if (asStaff) {
      const to = body.close === true ? "closed" : "answered";
      const upd: Record<string, unknown> = { ...(await statusPatch(t, to, false)), last_message_at: now, response_due: null, response_since: null, response_warned: false, first_response_at: t.first_response_at || now };
      if (!t.assigned_to) upd.assigned_to = me.id;
      await admin.from("bel_support_tickets").update(upd).eq("id", t.id);
      await event(t.id, to === "closed" ? "answered_closed" : "answered");
      const { data: c } = await admin.from("bel_profiles").select("email, lang, salutation, first_name, last_name, full_name").eq("id", t.user_id).maybeSingle();
      if (c?.email) { const L = pickLang(c.lang); const v = { n: num(t.number), subject: t.subject, greet: greeting(c, L), body: text, link: link(t.id) }; await sendMail(c.email, fill(MAIL.answered[L].s, v), fill(MAIL.answered[L].t, v), L, undefined, "support").catch(() => false); }
      await audit(admin, me, "support-ticket-answered", num(t.number), { id: t.id });
    } else {
      const upd = { ...(await statusPatch(t, "open", true)), last_message_at: now };
      await admin.from("bel_support_tickets").update(upd).eq("id", t.id);
      await event(t.id, "customer_message", { from: t.status });
      await notifyDesk(`Support ${num(t.number)}: de klant antwoordde — ${t.subject}`, `${displayName(me, "nl")} (${me.email}) antwoordde op ${num(t.number)}:\n\n${text}\n\n${APP_URL}/#/desk/${t.id}`);
    }
    return json({ ok: true });
  }

  if (action === "close" || action === "reopen") {
    const t = await loadTicket(String(body.id || ""));
    if (!t) return json({ error: "not-found" }, 404);
    await admin.from("bel_support_tickets").update(await statusPatch(t, action === "close" ? "closed" : "open", action === "reopen")).eq("id", t.id);
    await event(t.id, action === "close" ? "closed" : "reopened");
    return json({ ok: true });
  }

  // ---- Belinus staff ----
  if (!staff) return json({ error: "forbidden" }, 403);

  if (action === "admin_list") {
    const queue = String(body.queue || "open");
    let q = admin.from("bel_support_tickets").select("id, number, user_id, subject, category, safety, status, priority, level, assigned_to, response_due, resolution_due, response_breached_at, created_at, last_message_at").is("merged_into", null).limit(500);
    if (queue === "open") q = q.in("status", ["open", "on_hold"]);
    else if (queue === "mine") q = q.eq("assigned_to", me.id).neq("status", "closed");
    else if (queue === "unassigned") q = q.is("assigned_to", null).neq("status", "closed");
    else if (queue === "answered") q = q.eq("status", "answered");
    else if (queue === "safety") q = q.eq("safety", true).neq("status", "closed");
    else if (queue === "closed") q = q.eq("status", "closed");
    const { data } = await q.order("last_message_at", { ascending: false });
    const ids = [...new Set((data || []).flatMap((t: any) => [t.user_id, t.assigned_to]).filter(isUuid))];
    const { data: people } = ids.length ? await admin.from("bel_profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const nm = (id: string | null) => { const p = (people || []).find((x: any) => x.id === id); return p ? (p.full_name || p.email) : ""; };
    return json({ ok: true, tickets: (data || []).map((t: any) => ({ ...t, customer: nm(t.user_id), assignee: nm(t.assigned_to) })) });
  }

  if (action === "set") {
    const t = await loadTicket(String(body.id || ""));
    if (!t) return json({ error: "not-found" }, 404);
    let upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (STATUSES.includes(body.status) && body.status !== t.status) upd = { ...upd, ...(await statusPatch(t, body.status, false)) };
    if (PRIOS.includes(body.priority) && body.priority !== t.priority) {
      upd.priority = body.priority;
      if (!t.resolution_breached_at) upd.resolution_due = await resolutionDue(t, body.priority);
      if (t.response_since && !t.response_breached_at) upd.response_due = await responseDue(t, new Date(t.response_since), body.priority);
    }
    if (CATS.includes(body.category)) upd.category = body.category;
    if ([1, 2, 3].includes(Number(body.level))) { upd.level = Number(body.level); if (Number(body.level) > t.level) upd.escalated_at = new Date().toISOString(); }
    await admin.from("bel_support_tickets").update(upd).eq("id", t.id);
    await event(t.id, "updated", { status: body.status, priority: body.priority, category: body.category, level: body.level });
    return json({ ok: true });
  }

  if (action === "assign") {
    const t = await loadTicket(String(body.id || ""));
    if (!t) return json({ error: "not-found" }, 404);
    const to = body.to === "me" ? me.id : isUuid(body.to) ? body.to : null;
    if (to && to !== me.id) { const { data: p } = await admin.from("bel_profiles").select("role").eq("id", to).maybeSingle(); if (!p || !isStaff(p)) return json({ error: "not-staff" }, 400); }
    await admin.from("bel_support_tickets").update({ assigned_to: to, updated_at: new Date().toISOString() }).eq("id", t.id);
    await event(t.id, "assigned", { to });
    return json({ ok: true });
  }

  return json({ error: "bad-action" }, 400);
});
