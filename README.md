# belinuswebsite (belinus.com)

Static website for Belinus, hosted on Bunny.net (Storage Zone `belinuswebsite` / 1692834,
Pull Zone 6223909 / `belinuswebsite.b-cdn.net`, hostnames belinus.com + www.belinus.com).

**Every push to `main` deploys automatically** via `.github/workflows/deploy.yml` (uploads all files to the
Bunny storage zone and purges the CDN cache). Commits containing `[skip deploy]` are not deployed.

Files deleted from the repo are not auto-deleted from the storage zone.

## Go-live status

- [x] Repo + deploy workflow
- [x] Bunny storage zone + pull zone + hostnames
- [ ] Org secret `BUNNY_API_KEY` (org Settings → Secrets and variables → Actions, visibility \"Public repositories\")
- [ ] Production site files pushed to `main`
- [ ] DNS cutover: belinus.com zone 832388 — swap `@` and `www` to Pull Zone records (done by Claude on request)
- [ ] Let's Encrypt certificates for belinus.com + www.belinus.com (only possible after DNS cutover)
- [ ] ForceSSL on

Based on the `vanbeirs-ventures/bunny-site-template` pattern.
