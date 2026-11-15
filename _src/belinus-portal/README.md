# Belinus customer portal — source

Not deployed to the CDN (the deploy workflow skips `_src/`).

- `app/` — portal pages (React 18 + supabase-js, compiled with esbuild). Build: `python3 app/build.py` → writes `/portal/` in this repo.
- `supabase/functions/` — edge functions `bel-auth`, `bel-mfa`, `bel-support`, `bel-portal`, `bel-assistant` for Supabase project
  **Belinus Portal** (`cbykdhbqfgjzodldavvy`, Frankfurt). Tables use the `bel_` prefix (row-level security on every table).
- Ported from Clavoris (accounts, two-factor sign-in, support desk).

Function secrets (set by Steve in Supabase › Edge Functions › Secrets): `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
(optional `MAILGUN_API_BASE`, default EU), `ANTHROPIC_API_KEY`, optional `BELINUS_APP_URL`, `BELINUS_SUPPORT_INBOX`,
`BELINUS_AI_MODEL`.

Contract signing: `bel-clavoris` starts qualified signatures through the Clavoris signing API; Belinus is a company account in Clavoris and each signature uses its keys. One more secret: `CLAVORIS_API_KEY` (Clavoris › Account › API access). Contracts are in `bel_contracts`, the PDFs in the private bucket `bel-docs` under `contracts/`. Nothing is mailed to the customer.

Vibe HaaS interest: `bel-haas` (deployed with `--no-verify-jwt`). Public action `submit` is called from belinus.com
(`vibe.js`, HaaS block on `#ev-charging` and `#vibe`) and stores the request in `bel_haas_interest` (RLS on, no policies:
service role only); Belinus gets a notification at `BELINUS_HAAS_INBOX` (fallback `BELINUS_SUPPORT_INBOX`, then
service@belinus.com). Super admins see the requests under "HaaS interest" (`#/haas`) with status and notes.
Belgium (country BE) = offer open; other countries = waiting list.
