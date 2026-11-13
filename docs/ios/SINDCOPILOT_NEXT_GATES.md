# SindCopilot — iOS individual QA and commercial readiness

Status: **Fase 1 / unsigned build and simulator smoke confirmed; functional and commercial Apple readiness NOT confirmed**.

## Verified evidence

- [PR #32](https://github.com/HenriqueGuilhermeUx/sindcopilot/pull/32) — isolated branch `chore/ios-appstore-readiness-20261109`; no merge or release authorized.
- [GitHub Actions #42693008331](https://github.com/HenriqueGuilhermeUx/sindcopilot/actions/runs/42693008331) — macOS `simulator` job SUCCESS: install JS deps, ephemeral Capacitor iOS dependency, generate iOS project, Xcode unsigned build, simulator launch smoke and archive unsigned .app.
- `capacitor.config.ts`: `appId: com.sindcopilot.app`, `appName: SindCopilot`, `webDir: dist/client`. Verify package identity against Play Console and last distributed AAB before Apple account enrollment.
- `package.json` declares Capacitor 8, Supabase, tRPC, Camera, Filesystem, Share, Network; scripts `build:native` and `android:aab`. **Declared deps are not evidence of functional iOS support**; verify native permissions, server connectivity and privacy.

## Must-pass scenarios before Fase 2 (all unverified)

| Area | Required evidence | Status |
| --- | --- | --- |
| Commercial origin | Published Play package/AAB commit, company owner, final iOS ID | BLOCKED |
| App shell | Official icon/splash, on-device UI, screenshots and rotation/accessibility | UNTESTED |
| Authentication | Sign-up/login, recovery, logout, session persistence after restart; account deletion when required | UNTESTED |
| Condominium isolation | Different condos/users/roles cannot access each other's records, exports or attachments | UNTESTED |
| Financial import | CSV, XLSX, OFX and PDF sample imports with no real account data; error/retry/duplicate handling | UNTESTED |
| Finance reconciliation | Transaction classification, validation, balances, audit trail, original attachment access and PDF statement | UNTESTED |
| Native integrations | Camera/filesystem/share permissions, denied authorization, unavailable offline assets and share sheet | UNTESTED |
| Backend | HTTPS production-equivalent staging API, session expiry, error/no network and re-auth; no localhost URLs | UNTESTED |
| Apple privacy | App Privacy data inventory, privacy manifest, third-party SDK inventory, data retention/deletion | UNTESTED |
| Store policy | Digital monetization/IAP applicability, support links, Apple business identity, test credentials in secure channel | UNTESTED |

## Execution discipline

1. Use **synthetic** condominium and banking fixtures only; no originals, financial statements, password exports or user data in CI.
2. Test iPhone simulator and real-device capabilities separately; a simulator launch does not prove camera, document sharing or file import.
3. Keep Android app and production untouched. Any shared-client modification must be separately reviewed for regressions.
4. Ensure QA evidence (screenshots, logs, expected/actual outcome) and every user-visible feature are validated before enabling release signing.
5. No TestFlight, provisioning, upload or merges under this Phase 1 document.

Central: [Alternative Ventures iOS tracker](https://github.com/HenriqueGuilhermeUx/alternativeventures/issues/4).
