# Belinus customer portal — source

Not deployed to the CDN (the deploy workflow skips `_src/`).

- `app/` — portal pages (React 18 + supabase-js, compiled with esbuild). Build: `python3 app/build.py` → writes `/portal/` in this repo.
- `supabase/functions/` — edge functions `bel-auth`, `bel-mfa`, `bel-support`, `bel-portal`, `bel-assistant` for Supabase project
  **Belinus Portal** (`cbykdhbqfgjzodldavvy`, Frankfurt). Tables use the `bel_` prefix (row-level security on every table).
- Ported from Clavoris (accounts, two-factor sign-in, support desk).

Function secrets (set by Steve in Supabase › Edge Functions › Secrets): `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
(optional `MAILGUN_API_BASE`, default EU), `ANTHROPIC_API_KEY`, optional `BELINUS_APP_URL`, `BELINUS_SUPPORT_INBOX`,
`BELINUS_AI_MODEL`.
