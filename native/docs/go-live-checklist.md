# Spontany native — go-live checklist

Moving from the mock to a real, installable app. Ordered so each step unblocks the next.
Boxes marked **[you]** need your accounts/devices; **[code]** I can do.

---

## Phase 0 — Decisions (do first)
- [ ] **Shared backend?** Confirm the native app uses the existing `C:\Projects\Spontany` API + DB (recommended — native & PWA users coexist). 
- [ ] **D1**: lock "highlight My days vs Free days" (currently a live toggle, default custody).
- [ ] **Bundle IDs**: pick iOS `bundleIdentifier` + Android `package` (e.g. `app.spontany.mobile`). Needed before any build.
- [ ] **Apple Developer account** ($99/yr) and **Google Play Developer** ($25 once) — required to ship. [you]

## Phase 1 — Backend (mostly exists from the PWA)
- [ ] **Deploy the notes change**: merge `feature/day-notes-backend` and push `main` (Railway auto-deploys). The `note` column + `POST /api/calendar/note` go live. [you]
- [ ] **Native auth path**: the magic-link flow sets a *cookie*; a native app needs the raw `access_token` in a JSON response. Add a small token-exchange (e.g. `POST /api/auth/exchange` returning the token after link verification, or a deep-link `spontany://auth?token=…`). [code, then you deploy]
- [ ] Confirm the endpoints native needs already return what's required: `/api/me`, `/api/calendar/:userId`, `/api/calendar/save`, `/api/connections/all`, `/api/connections/*` (invite/approve), `/api/outings*` (events + RSVP). Map the mock model → these. [code]
- [ ] **Push**: add an endpoint to register an Expo push token per user (the PWA uses web-push/VAPID; native uses Expo push tokens — separate). [code, then you deploy]
- [ ] Set any new env vars in Railway **before** deploying code that reads them. [you]

## Phase 2 — Native auth (replace the no-token mock)
- [ ] Magic-link sign-in screen → request link → handle the deep-link/exchange → store token in `expo-secure-store` (the `session.ts` plumbing already exists; remove `DEV_TOKEN`). [code]
- [ ] Gate the app on real auth (sign-in before onboarding). [code]

## Phase 3 — Wire mock → live (swap the in-memory stores for the API)
- [ ] **Calendar/custody**: pattern + overrides → persist via `/api/calendar/save`; reads already wired. [code]
- [ ] **Notes**: already calls `/api/calendar/note` when a token exists — verify round-trip. [code]
- [ ] **Partner connect**: replace the mock `partner` flow with real `/api/connections` (invite link, approve, status). Overlap then uses the partner's real calendar. [code]
- [ ] **Events + RSVP**: map link-drop save/invite + accept/maybe/decline/propose-change onto `outings` + `outing_invitees`. Replace the `mock/store` + `linkdrop/stream` with API calls. [code]
- [ ] Remove the seeded incoming proposals + "simulate partner joining" demo affordances. [code]

## Phase 4 — Dev build on your phone (unlocks native-only features)
- [ ] `npm i -g eas-cli` and `eas login`. [you]
- [ ] `eas build:configure` (creates `eas.json`, project ID). [code can scaffold; you run]
- [ ] **Development build**: `eas build --profile development --platform ios` (and/or android) → install on your device. Expo Go can't run custom native modules; this can. [you]
- [ ] **Native share extension** ("share to Spontany" from any app) — add the config plugin + handler; only testable on the dev build. [code]
- [ ] Verify link-drop via the share sheet end-to-end on device. [you]

## Phase 5 — Push notifications
- [ ] `expo-notifications`: request permission, get the Expo push token, register it with the backend. [code]
- [ ] Send on: partner invite, RSVP response, schedule change. Test on the dev build. [you]

## Phase 6 — Store prep
- [ ] App icon + splash (replace defaults) — needs source art. [code wires; you provide art]
- [ ] Store listing: name, description, screenshots, privacy policy URL (custody/kid PII — reuse the PWA's). [you]
- [ ] App privacy disclosures (data collected: calendar, partner connection; no per-kid data). [you]
- [ ] `app.json`: version, bundle IDs, permissions strings (notifications, etc.). [code]

## Phase 7 — Submit
- [ ] `eas build --profile production --platform ios|android`. [you]
- [ ] `eas submit` → TestFlight / Play internal testing first, then review. [you]
- [ ] Soft-launch to a few real co-parent pairs; watch for the overlap/RSVP edge cases. [you]

---

### Smallest path to "on my phone this week"
Phase 1 deploy (notes branch) → Phase 4 dev build (`eas build --profile development`) → it runs on your phone against the live backend with a pasted token, *before* full auth/partner wiring. Everything else can follow.
