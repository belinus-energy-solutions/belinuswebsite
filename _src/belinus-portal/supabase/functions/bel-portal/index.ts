// bel-portal — customer actions of the Belinus Portal that are not plain reads (reads go straight to the tables
// behind row-level security).
//   { action: "doc_url", id }                 -> 5-minute link to one of the person's own documents (bel-docs bucket)
//   { action: "recall_open", id }             -> the recall notice: texts, a 10-minute link to the notice PDF, the
//                                                system concerned; marks the notice "opened" (first time)
//   { action: "recall_sign", id, typed_name, choice, preferred_dates?, phone?, read_confirmed }
//        Typed-name acceptance (like the Clavoris NDA step): the typed name must match the account name; the SHA-256 of
//        the exact notice PDF, the time, IP and browser are recorded. A qualified signature (itsme via Clavoris) can
//        replace this once the Clavoris signing API is live (sign_method "qes").
// Deploy: --no-verify-jwt.
import { adminClient, APP_URL, audit, clientIp, cors, displayName, greeting, json, notifyDesk, pickLang, requireUser, sameName, sendMail, sha256, type Lang, type Profile } from "../_shared/bel.ts";

const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\x00-\x1f]/g, " ").trim().slice(0, n);
const pick = (o: any, L: Lang) => (o && typeof o === "object" ? (o[L] || o.nl || o.en || "") : String(o || ""));

const SIGNED: Record<Lang, { s: string; t: string }> = {
  nl: { s: "Belinus terugroeping {code}: uw bevestiging", t: "{greet}\n\nU bevestigde op {when} dat u de terugroepingsmelding {code} \"{title}\" gelezen hebt.\n\nUw keuze: {choice}\n\nBelinus neemt contact met u op om de afspraak vast te leggen. Tot dan: volg de veiligheidsinstructies in de melding.\n\nDe melding en uw bevestiging staan in het portaal:\n{link}" },
  fr: { s: "Rappel Belinus {code} : votre confirmation", t: "{greet}\n\nVous avez confirmé le {when} avoir lu l'avis de rappel {code} « {title} ».\n\nVotre choix : {choice}\n\nBelinus vous contacte pour fixer le rendez-vous. D'ici là, suivez les consignes de sécurité de l'avis.\n\nL'avis et votre confirmation sont dans le portail :\n{link}" },
  en: { s: "Belinus recall {code}: your confirmation", t: "{greet}\n\nOn {when} you confirmed that you have read recall notice {code} \"{title}\".\n\nYour choice: {choice}\n\nBelinus will contact you to fix the appointment. Until then, follow the safety instructions in the notice.\n\nThe notice and your confirmation are in the portal:\n{link}" },
};
const CHOICE: Record<Lang, Record<string, string>> = {
  nl: { replace: "kosteloze vervanging van het systeem", return: "terugname en terugbetaling", other: "andere oplossing bespreken" },
  fr: { replace: "remplacement gratuit du système", return: "reprise et remboursement", other: "discuter d'une autre solution" },
  en: { replace: "free replacement of the system", return: "take-back and refund", other: "discuss another solution" },
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
  const docs = admin.storage.from("bel-docs");

  if (action === "doc_url") {
    if (!isUuid(body.id)) return json({ error: "not-found" }, 404);
    const { data: d } = await admin.from("bel_documents").select("id, owner_id, title, storage_path, visible").eq("id", body.id).maybeSingle();
    if (!d || (d.owner_id !== me.id && me.role !== "staff" && me.role !== "super") || (!d.visible && d.owner_id === me.id)) return json({ error: "not-found" }, 404);
    const name = (d.title || "document").replace(/[\\/:*?"<>|]+/g, " ").slice(0, 100) + (d.storage_path.toLowerCase().endsWith(".pdf") ? ".pdf" : "");
    const { data } = await docs.createSignedUrl(d.storage_path, 300, { download: body.download === true ? name : undefined });
    if (!data?.signedUrl) return json({ error: "storage-failed" }, 502);
    await audit(admin, me, "document-opened", d.id, {});
    return json({ ok: true, url: data.signedUrl });
  }

  async function notice(id: unknown) {
    if (!isUuid(id)) return null;
    const { data: n } = await admin.from("bel_recall_notices").select("*, bel_recalls(*)").eq("id", id).maybeSingle();
    if (!n || n.owner_id !== me.id || n.bel_recalls?.status === "draft") return null;
    return n as any;
  }

  if (action === "recall_open") {
    const n = await notice(body.id);
    if (!n) return json({ error: "not-found" }, 404);
    const r = n.bel_recalls, L = pickLang(me.lang);
    let pdf: string | null = null;
    if (r.document_path) { const { data } = await docs.createSignedUrl(r.document_path, 600); pdf = data?.signedUrl || null; }
    let system = null;
    if (n.system_id) { const { data: y } = await admin.from("bel_systems").select("kind, product, model, serial, installed_at").eq("id", n.system_id).maybeSingle(); system = y; }
    if (n.status === "sent") await admin.from("bel_recall_notices").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", n.id);
    return json({ ok: true, notice: { id: n.id, status: n.status === "sent" ? "opened" : n.status, signed_at: n.signed_at, signed_name: n.signed_name, choice: n.choice, appointment_at: n.appointment_at,
      code: r.code, risk: r.risk, title: pick(r.title, L), summary: pick(r.summary, L), instructions: pick(r.instructions, L), pdf, system, account_name: displayName(me, L) } });
  }

  if (action === "recall_sign") {
    const n = await notice(body.id);
    if (!n) return json({ error: "not-found" }, 404);
    if (n.signed_at) return json({ error: "already-signed" }, 409);
    if (body.read_confirmed !== true) return json({ error: "read-required" }, 400);
    const choice = ["replace", "return", "other"].includes(body.choice) ? body.choice : null;
    if (!choice) return json({ error: "choice-required" }, 400);
    const typed = str(body.typed_name, 160);
    const accountName = String(me.full_name || [me.first_name, me.last_name].filter(Boolean).join(" ")).trim();
    if (!accountName) return json({ error: "profile-name-required" }, 400);
    if (!sameName(typed, accountName)) return json({ error: "name-mismatch" }, 400);
    const r = n.bel_recalls;
    let docHash: string | null = null;
    if (r.document_path) {
      const { data: f } = await docs.download(r.document_path);
      if (!f) return json({ error: "notice-unavailable" }, 502);
      docHash = await sha256(new Uint8Array(await f.arrayBuffer()));
    }
    const dates = Array.isArray(body.preferred_dates) ? body.preferred_dates.map((d: unknown) => str(d, 40)).filter(Boolean).slice(0, 5) : [];
    const now = new Date().toISOString(), ip = clientIp(req);
    const { error } = await admin.from("bel_recall_notices").update({ status: "signed", signed_at: now, sign_method: "typed", signed_name: typed, signed_ip: ip, signed_document_sha256: docHash, choice, preferred_dates: dates.length ? dates : null }).eq("id", n.id).is("signed_at", null);
    if (error) { console.error("recall sign", error.message); return json({ error: "sign-failed" }, 500); }
    const phone = str(body.phone, 40);
    if (phone && !me.mobile) await admin.from("bel_profiles").update({ mobile: phone }).eq("id", me.id);
    await audit(admin, me, "recall-signed", r.code, { notice: n.id, choice, dates, doc_sha256: docHash, ip, ua: str(req.headers.get("user-agent"), 300) });
    const L = pickLang(me.lang);
    const when = new Date(now).toLocaleString(L === "en" ? "en-GB" : `${L}-BE`, { timeZone: "Europe/Brussels", dateStyle: "long", timeStyle: "short" });
    const v = { greet: greeting(me, L), when, code: r.code, title: pick(r.title, L), choice: CHOICE[L][choice], link: `${APP_URL}/#/recall/${n.id}` };
    await sendMail(me.email, SIGNED[L].s.replace("{code}", r.code), SIGNED[L].t.replace(/\{(\w+)\}/g, (_, k) => (v as any)[k] ?? ""), L, undefined, "recall").catch(() => false);
    await notifyDesk(`Terugroeping ${r.code}: bevestigd door ${displayName(me, "nl")}`, `${displayName(me, "nl")} (${me.email}${phone || me.mobile ? ", " + (phone || me.mobile) : ""}) bevestigde de terugroeping ${r.code}.\n\nKeuze: ${CHOICE.nl[choice]}\nVoorkeursdata: ${dates.join(", ") || "—"}\n\nPlan de afspraak in.`);
    return json({ ok: true, signed_at: now });
  }

  return json({ error: "bad-action" }, 400);
});
