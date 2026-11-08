// bel-inv-inbound — Mailgun inbound route for answers to portal messages. A message mail is sent with Reply-To
// bericht-<message id>@mg.belinus.com; Mailgun forwards the answer here (multipart form). The answer is added to that
// investor's thread only when (1) the Mailgun signature is valid (if MAILGUN_WEBHOOK_SIGNING_KEY is set), (2) the address
// names an existing outgoing message, and (3) the sender is that investor's e-mail address. Anything else is dropped.
import { adminClient, APP_URL, audit, sendMail, settings, str } from "../_shared/inv.ts";

const ok = () => new Response("ok", { status: 200 });
async function validSignature(ts: string, token: string, sig: string): Promise<boolean> {
  const key = Deno.env.get("MAILGUN_WEBHOOK_SIGNING_KEY");
  if (!key) return true;
  if (!ts || !token || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 15 * 60) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(ts + token))), (b) => b.toString(16).padStart(2, "0")).join("");
  return mac === sig.toLowerCase();
}
const addrOf = (s: string) => ((s.match(/<([^>]+)>/) || [])[1] || s).trim().toLowerCase();
// Fallback when Mailgun's stripped-text is empty: cut at the first quote header or quoted line.
function strip(t: string): string {
  const lines = t.replace(/\r/g, "").split("\n"), out: string[] = [];
  for (const l of lines) { if (/^>/.test(l) || /^(Op |Le |On ).{5,200}(schreef|a écrit|wrote)/i.test(l) || /^-{2,}\s*(Original|Oorspronkelijk|Message)/i.test(l) || /^(From|Van|De):\s/i.test(l)) break; out.push(l); }
  return out.join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  let f: FormData; try { f = await req.formData(); } catch { return ok(); }
  const g = (k: string) => String(f.get(k) ?? "");
  if (!(await validSignature(g("timestamp"), g("token"), g("signature")))) { console.error("inbound: bad signature"); return new Response("forbidden", { status: 406 }); }
  const rcpt = g("recipient").toLowerCase(), m = rcpt.match(/^bericht-([0-9a-f-]{36})@/);
  if (!m) return ok();
  const a = adminClient();
  const { data: orig } = await a.from("inv_messages").select("id, investor_id, direction").eq("id", m[1]).maybeSingle();
  if (!orig || orig.direction !== "out") return ok();
  const { data: inv } = await a.from("inv_investors").select("id, email, first_name, last_name, company_name, is_test").eq("id", orig.investor_id).single();
  const from = addrOf(g("sender") || g("from"));
  if (from !== inv.email.toLowerCase()) { console.error("inbound: sender mismatch"); await audit(a, null, "message-inbound-rejected", inv.email, { from }); return ok(); }
  const body = str(g("stripped-text") || strip(g("body-plain")), 8000);
  if (!body) return ok();
  const mid = g("Message-Id") || g("message-id") || null;
  const { error } = await a.from("inv_messages").insert({ investor_id: inv.id, direction: "in", body, author_email: inv.email, channel: "email", in_reply_to: orig.id, source_message_id: mid });
  if (error) { if (!/duplicate/i.test(error.message)) console.error("inbound insert", error.message); return ok(); }
  const s = await settings(a);
  const who = inv.company_name || [inv.first_name, inv.last_name].filter(Boolean).join(" ") || inv.email;
  await sendMail(a, { to: inv.is_test ? "steve@belinus.com" : (s.notify_email || "erwin@evchargeking.com"), kind: "message-in", lang: "nl", subject: `Nieuw bericht van ${who} (per e-mail)`, text: `${who} antwoordde per e-mail:\n\n${body}\n\nBekijk en antwoord: ${APP_URL}/#/investeerders/${inv.id}` });
  await audit(a, null, "message-inbound", inv.email);
  return ok();
});
