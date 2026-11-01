# belinuswebsite (belinus.com)

Static website for Belinus, hosted on Bunny.net (Storage Zone `belinuswebsite` / 1692834,
Pull Zone 6223909 / `belinuswebsite.b-cdn.net`, hostnames belinus.com + www.belinus.com).

**Every push to `main` deploys automatically** via `.github/workflows/deploy.yml` (uploads all files to the
Bunny storage zone and purges the CDN cache). Commits containing `[skip deploy]` are not deployed.

Files deleted from the repo are not auto-deleted from the storage zone.

## Go-live status

- [x] Repo + deploy workflow
- [x] Bunny storage zone + pull zone + hostnames
- [x] Org secret `BUNNY_API_KEY` (added 27.07.2026, visibility "Public repositories")
- [x] Production site files pushed to `main` (1 Nov 2026): B2B `index.html` (EN), `nl.html`, `fr.html`; B2C `b2c/index.html` (NL), `b2c/fr.html`, `b2c/en.html`
- [ ] DNS cutover: belinus.com zone 832388 — swap `@` and `www` to Pull Zone records (done by Claude on request)
- [ ] Let's Encrypt certificates for belinus.com + www.belinus.com (only possible after DNS cutover)
- [ ] ForceSSL on

Based on the `vanbeirs-ventures/bunny-site-template` pattern.

## Site structure

- Single-page apps with hash routes (`#products`, `#contact`, …); React 18 UMD from cdnjs, JSX precompiled.
- `consent.js` — cookie banner + remembered region/language (shared by B2B and B2C).
- `b2c/datasheets/` — product data sheets (EN; legacy Energywall LV/HV in NL).
- Forms (contact, partner, service, B2C quote, referral) post directly to the imap-mcp mail container
  (`https://mc-vze57riyau.bunny.run/webforms/belinus/forms`), which mails service@belinus.com from
  service@belinus.com (Reply-To = visitor). If it is unreachable the visitor gets a prepared e-mail instead.
- The pages are built from the design sources (not in this repo); do not edit the HTML here by hand.
- Older pages kept: `*/algemene-voorwaarden*`, `*/terms-and-conditions*`, `*/conditions-generales*`, `*/agb*`.
