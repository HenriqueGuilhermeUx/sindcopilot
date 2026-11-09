# SindCopilot — iOS preparation

Existing Capacitor app: `com.sindcopilot.app`; Capacitor major: 8; native web build: `npm run build:native` → `dist/client`.

## Mac build workflow (not executed)
1. Install Node >=20, Xcode, CocoaPods if requested, and sign in to Apple Developer.
2. `npm ci`
3. `npm install --save-exact @capacitor/ios@8.4.2` (commit resulting package and lockfile only after dependency review).
4. `npm run mobile:assets && npm run build:native`
5. `npx cap add ios` if the platform folder is absent; otherwise `npx cap sync ios`.
6. Open `npx cap open ios`, set team/signing, test real iPhone and upload archive through Xcode or validated CI.

## Pre-submission checks
- Confirm the App Store Bundle ID has not been registered elsewhere.
- Test login, onboarding, financial reports, multi-condominium flows, documents and PDFs, push/notifications and file permissions.
- Verify native safe areas, keyboard, privacy policy, account deletion, in-app payment requirements and reviewer demo account.
- Use actual iPhone/iPad screenshots and accurate privacy labels.
- Do not add certificates/Apple credentials to Git or change Android pipeline.
- Apple organization membership transfer is unresolved: no submission has been made.

## Automated local preparation

After installing the matching `@capacitor/ios` package and checking its lockfile, run `node scripts/prepare-ios.mjs` from the repository root on macOS with Xcode installed. The script refuses non-macOS execution and missing iOS dependencies; it builds the correct web assets then creates/synchronizes the local Capacitor iOS project. It does **not** sign, archive, run device tests or submit anything to Apple.
