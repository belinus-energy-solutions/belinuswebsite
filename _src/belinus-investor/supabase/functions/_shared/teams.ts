// Microsoft Teams meetings for video appointments of the EVChargeking investor area.
// Each booking gets its own Teams meeting via Microsoft Graph (onlineMeetings). No calendar event is created,
// so no calendar is populated; the invitation (.ics) is sent by our own mail flow.
// Secrets (set by the owner in Supabase, never in code): MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_ORGANIZER_ID
// (the object id of the licensed Microsoft 365 user who organises the meetings).
// If the secrets are missing, every function returns null and the booking falls back to the manual link in Instellingen.

let token: { value: string; exp: number } | null = null;

export function teamsConfigured(): boolean {
  return !!(Deno.env.get("MS_TENANT_ID") && Deno.env.get("MS_CLIENT_ID") && Deno.env.get("MS_CLIENT_SECRET") && Deno.env.get("MS_ORGANIZER_ID"));
}

async function accessToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const tenant = Deno.env.get("MS_TENANT_ID")!;
  const body = new URLSearchParams({
    client_id: Deno.env.get("MS_CLIENT_ID")!,
    client_secret: Deno.env.get("MS_CLIENT_SECRET")!,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error(`teams token ${r.status}`);
  const j = await r.json();
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

const base = () => `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(Deno.env.get("MS_ORGANIZER_ID")!)}/onlineMeetings`;

export type Meeting = { id: string; joinUrl: string };

// Creates a Teams meeting for one appointment. Returns null when Teams is not configured.
export async function createMeeting(subject: string, start: string, end: string): Promise<Meeting | null> {
  if (!teamsConfigured()) return null;
  const r = await fetch(base(), {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ subject, startDateTime: new Date(start).toISOString(), endDateTime: new Date(end).toISOString() }),
  });
  if (!r.ok) throw new Error(`teams create ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return { id: j.id, joinUrl: j.joinWebUrl };
}

// Moves an existing meeting to a new time (used when an appointment is rescheduled).
export async function moveMeeting(id: string, start: string, end: string): Promise<void> {
  if (!teamsConfigured()) return;
  const r = await fetch(`${base()}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ startDateTime: new Date(start).toISOString(), endDateTime: new Date(end).toISOString() }),
  });
  if (!r.ok && r.status !== 404) throw new Error(`teams move ${r.status}`);
}

// Removes the meeting when an appointment is cancelled. A missing meeting is not an error.
export async function deleteMeeting(id: string): Promise<void> {
  if (!teamsConfigured()) return;
  const r = await fetch(`${base()}/${encodeURIComponent(id)}`, { method: "DELETE", headers: { authorization: `Bearer ${await accessToken()}` } });
  if (!r.ok && r.status !== 404) throw new Error(`teams delete ${r.status}`);
}
