# Spontany — native (v2)

Focused Expo / React Native rebuild for the app stores, built parallel to the live PWA.
Persona: one custody parent (kids 0–14) partnered with another custody parent.
Full scope: [`docs/v1-scope.md`](docs/v1-scope.md).

## Run it

```bash
cd spontany-native
npm install
npx expo install --fix   # reconcile package versions to the installed Expo SDK
npx expo start           # press i / a for simulator, or scan the QR with Expo Go
```

By default the calendar runs on the demo fortnight. To point it at the **live
backend** (`https://spontany.up.railway.app`) before the magic-link auth flow
exists, paste a user's `access_token` into `DEV_TOKEN` in
[`src/api/config.ts`](src/api/config.ts). It authenticates via the
`X-Access-Token` header, loads your calendar + your approved co-parent's, and
computes both-free days locally. Any failure falls back to demo data with a banner.

## What Phase 1 proves

The home screen renders the stress-test fortnight from the approved mockup so the
**four-layer visual rule** can be verified on a device before anything else is built:

> Only custody ownership sets a day cell's background fill. Overlap is a frame,
> events are a chip, notes are a label — each owns a different visual channel, so
> all four can be true on one day without colliding.

Look at two cells:
- **the 16th** — a *my-day* (custody fill) carrying a confirmed event. The fill never
  moves, so it stays clearly a custody day; the event is just a chip. This is the
  exact case the old app got backwards.
- **the 21st** — a free day stacking overlap frame + confirmed event + note at once,
  still legible.

## Layout

```
app/                 Expo Router screens
  _layout.tsx        root stack + safe-area provider
  index.tsx          calendar screen (home)
src/
  types.ts           Day / event model
  theme/tokens.ts    the four-layer palette (light + dark) — D1/D2 live here
  data/demoMonth.ts  per-month demo generator (custody + overlap)
  mock/store.ts      date-keyed overlay for user-added events/notes (survives nav)
  components/
    DayCell.tsx      the locked visual rule, encoded
    TogetherStrip.tsx  "coming up together" overlap strip
```

## Next phases (see scope doc §9)

2. ~~wire the calendar/overlap to the existing backend API~~ — done (`src/api`, `src/calendar/month.ts`, `src/hooks/useCalendarMonth.ts`)
3. ~~day notes (`calendar_days.note`)~~ — done. Tap a day → `DaySheet`. Backend side (additive `note` column + `POST /api/calendar/note`, notes returned on self-access only) is edited in the `C:\Projects\Spontany` repo but **not deployed** — push there to go live.
4. link-drop + fork — in-app paste **done** (`LinkDropSheet`: paste → parse → save-for-me vs. invite-partner-on-a-both-free-day). Parsing is **real**: client-side OG/JSON-LD extraction (`src/linkdrop/og.ts`) — direct fetch on native, via CORS proxies on web; prefers the backend `/api/pulse/preview` when authed. Native share extension still to do.
5. partner pairing + RSVP + push — RSVP loop **done** in mock (day sheet shows the event; proposed → confirm/decline; the demo control stands in for the partner's device). Real partner pairing + Expo push need the live backend + two devices, so they land when wiring live.
6. polish + store prep — **done in mock:** month navigation, settings + D1 highlight toggle, custody-pattern editor, single-day custody override (tap day → With me / Free, recomputes overlap, "↺ match my schedule" to reset), first-run onboarding wizard (name → schedule → invite partner; gated on launch until completed). **Remaining (device/backend-bound):** app icon/splash, native share extension, live-wiring of pairing/push.

Done since: rich RSVP (see event link · accept · maybe · decline · propose a change), events now carry url/time/venue, and an **activity surface** (`app/activity.tsx`, header ≡ with a badge) grouping Needs-your-response / Waiting / Confirmed / Declined; seeded incoming proposals demo the recipient flow.

Partner-connect flow (P0) now in mock: `app/partner.tsx` (invite → "simulate joining" → connected → disconnect), surfaced in Settings, and **connection gates overlap** — no connected partner ⇒ no both-free days, and the strip nudges you to connect. Real two-person sync is the backend/live step.

All four P0s from the gap review are in mock, plus the P1 polish: a "Saved to go" list (in Activity, from the link-drop stream) · propose-a-plan straight from a both-free day's sheet · today indicator (ring on the date) + a "Today" jump button when off the current month.

The full V1 user story is now clickable in the mock. What's left is go-live wiring (deploy backend branch, dev build, real auth + partner sync + push) and store assets (icon/splash, native share extension).

Design-system note: NativeWind + react-native-reusables (shadcn-style) come in at the
component-library step; `src/theme/tokens.ts` is already the single source of truth the
Tailwind config will consume, so no rework when it lands.

Polish idea (deferred): Apple **Liquid Glass** (iOS 26) on chrome only — header, FAB,
sheets, the "coming up together" strip — never on the calendar cells (translucency would
undermine the four-layer signal clarity). iOS-only; needs verifying SDK 54 glass support.
