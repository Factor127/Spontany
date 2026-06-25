# Spontany — V1 scope (native rebuild)

**Status:** scope locked for build · **Date:** 2026-06-20
**Codebase:** new Expo / React Native app, built parallel to the live PWA (which stays as-is)
**Target:** App Store + Play Store launch ("version 2")

---

## 1. What this app is now

A custody calendar for **one custody parent (kids 0–14) partnered with another custody parent.**
Not a general "compare any two schedules" tool — that was the old, broader persona. We narrowed it.

It does four things, and only these four, well:

1. **See where our custody overlaps** — instantly, unmistakably.
2. **Add a personal note to any day** — free text, never changes the custody arrangement.
3. **Drop a link → fork it** — save an event for myself, or invite my partner to it.
4. **Partner RSVP** — one partner proposes an event on a day, the other confirms/declines.

Everything else the live PWA can do is **hidden / deferred to a later version** (see §8).

---

## 2. The non-negotiable: the four-layer visual system

This is the foundational rule of the UI. It is locked before any screen is built, because the
old app broke it (a partner-confirmed event recolored the day to look like a non-custody day —
the opposite of the truth).

> **Only custody ownership may set a day cell's background fill. Nothing else, ever.**

| Layer | Meaning | Visual channel | Never does |
|---|---|---|---|
| 1 · Custody | whose day is it | **background fill** | — |
| 2 · Overlap ("together") | both parents free | **frame / inset ring** | never a fill |
| 3 · Event | something planned that day | **chip / pill** | never a fill, never the overlap hue |
| 4 · Note | personal free-text reminder | **quiet label** | never looks like an event |

Because each layer owns a *different* visual variable (fill vs. border vs. chip vs. label), all four
can be true on one day at once and stay legible. Status *within* a layer (event proposed vs.
confirmed) is shown by fill/icon **inside that layer's own hue** — never by borrowing another layer's color.

### Provisional token set (light mode → dark mode)

```
Custody · my day (kids with me)   fill #EEEDFE / border #CECBF6 / text #26215C   (dark: #2A2655 / #4A4490 / #CECBF6)
Custody · free day                 surface (white) / muted border                (dark: app surface)
Overlap · both free                inset ring 2px #0F6E56                         (dark: #5DCAA5)
Event · proposed                   dashed coral: bg #FAECE7 text #4A1B0C br #D85A30
Event · confirmed                  solid coral:  bg #D85A30 text #FFFFFF + check
Note                               label: text #5F5E5A + note icon               (dark: #B4B2A9)
```

**Two open decisions (provisional defaults in use, not blocking the build):**
- **D1 — which days get the loud color?** Default: highlight the days you *have* the kids (custody = purple fill, free days quiet). Alternative: invert to highlight *free* days (the "what can I plan" lens). _Pending Ran's confirmation._
- **D2 — event hue.** Default coral. Swappable, as long as it stays distinct from custody (purple) and overlap (teal).

---

## 3. Tech stack

| Concern | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native) + Expo Router** | true native, clean app-store path, file-based routing reuses Next.js mental model |
| UI / design system | **NativeWind + react-native-reusables** | shadcn-style design language on native (the look + token discipline we wanted from shadcn; literal shadcn is web-only) |
| Link-drop capture | **native Share Extension (iOS) / Share Intent (Android)** | "share to Spontany" from any app — the reason we went native over a webview wrapper |
| Push | **Expo Notifications** | first-class on native |
| Backend | **reuse the existing Express + SQLite API** (additive endpoints only) | one source of truth; native + PWA users share data; see §6 |
| Auth | magic link (existing flow) + Google OAuth | already built; no passwords (fits the audience) |

**Why not Next.js + Capacitor:** keeps literal shadcn but it's a webview app — weaker native share
sheet (our core feature), more App Store scrutiny on thin wrappers. We optimized for the native moments.

---

## 4. Screens (V1)

1. **Calendar** (home) — month grid, the four-layer cells, a sticky "coming up together" strip at top
   listing the next few both-free days.
2. **Day sheet** — opens on tap: shows ownership (read-only label), note (add/edit free text),
   events on that day with RSVP state. Editing a note never touches ownership.
3. **Link-drop fork** — triggered by share-extension or in-app paste: parsed preview → two buttons
   ("Save — I want to go" / "Invite my partner"). Invite path pre-selects a both-free day.
4. **Event detail** — title, date, venue, partner RSVP state + confirm/decline.
5. **Partner / connection** — pair with your co-parent (invite link / accept). Single partner in V1.
6. **Onboarding** — set your custody pattern (alternating weeks / specific days / custom), invite partner.
7. **Settings** — profile, notifications, sign out.

---

## 5. Feature specs

### 5.1 Custody calendar + overlap
- Binary per-day model retained: a day is **mine (kids with me)** or **free**. No per-kid entity (D3 closed — kid-level nuance lives in notes).
- Overlap = a day where **both** partners are free. Rendered as the teal inset frame + surfaced in the "coming up together" strip.
- Custody fill is the *only* thing that colors a day.

### 5.2 Day notes (NEW)
- Free-text note attached to a date. Does **not** change ownership.
- Storage: add `note TEXT` to `calendar_days` (additive migration).
- UI: day sheet → "add note" → single-line/short text → renders as the quiet label on the cell.
- Visual: deliberately desaturated so a note never reads as an event or a schedule change.

### 5.3 Link-drop + fork (REBUILT UX, existing plumbing)
- Entry points: native share extension, or paste a URL in-app.
- Server parses the URL (existing `/api/pulse/preview` + opportunity parse: OG tags + schema.org Event date).
- **The fork (the moment that was missing):**
  - **Save — I want to go** → silent, into my personal stream. No one notified.
  - **Invite my partner** → creates an event proposal on a day; if the parsed date is a both-free day,
    pre-select it; otherwise suggest the nearest both-free day. Sends to partner → enters RSVP.
- Reuses `pulse_items` (personal saves) and `outings` (invitable events).

### 5.4 Partner RSVP (KEPT — partner-scoped only)
- One partner proposes an event on a day → the other gets it → **confirm / decline**.
- Confirmed state shows as the solid-coral event chip on the day (NOT a fill change — this is the bug we fixed).
- Notifications: push + optional SMS to the partner only.
- **Out of V1:** group fan-out, multi-invitee threads, ticketing, public RSVP links (all → V2).

---

## 6. Backend strategy

**Reuse the existing Express + SQLite backend** (currently powering the live PWA on Railway). The native
app talks to the same REST API and the same database, so native and PWA users coexist and share data —
this also gives existing PWA users a migration path into the native app.

Additive work only (no rewrite, no breaking changes to the live app):
- `calendar_days.note TEXT` column + a save endpoint.
- Confirm the link-drop fork classification is exposed cleanly (save-for-me vs. propose-to-partner).
- Confirm partner RSVP endpoints return what the native event detail needs.

**Decision to confirm (D4):** shared backend + shared DB (recommended) vs. a separate backend for native.
Recommended: shared. SQLite-on-Railway is fine at current scale; revisit if native growth demands Postgres.

---

## 7. Native-specific work (the app-store payoff)

- **Share extension / share intent** — register Spontany as a share target so any app's "share" sheet
  can hand a URL straight into the link-drop fork. This is the headline native capability.
- **Expo Notifications** — push for partner proposals and RSVP responses.
- **App store assets** — icon, splash, store listing, privacy disclosures (custody/PII sensitivity:
  no per-kid data, notes are user-private, partner data shared only with the connected partner).
- **Offline read** — calendar should render last-synced data offline (it's a glanceable app).

---

## 8. Hidden / deferred to V2 (code kept, flagged off)

Opportunities/activity auto-suggestion engine · public Match tool (kept only as a web acquisition
funnel, not in the native app) · Pulse as a standalone "saved venues" browse tab (folded into the
event stream instead) · groups / contact rosters · multi-invitee RSVP threads · ticketing · public
RSVP links · broad SMS/email sequences · admin dashboard (internal, untouched).

Nothing is deleted — these are paid-for assets waiting for the second version.

---

## 9. Build phases

1. **Foundation** — Expo app scaffold, NativeWind + react-native-reusables, the four-layer theme tokens,
   the day-cell component proven against the §2 stress cases (the 16th and the 21st from the mockup).
2. **Calendar + overlap** — month grid, day sheet, "coming up together" strip, wired to the existing API.
3. **Notes** — `note` column + day-sheet editing + the quiet label.
4. **Link-drop + fork** — in-app paste first, then the native share extension.
5. **Partner pairing + RSVP** — connect a partner, propose, confirm/decline, push notifications.
6. **Polish + store prep** — onboarding, settings, offline read, store assets, submission.

---

## 10. Open decisions (carry into build)

- **D1** — highlight custody days or free days? (default: custody days)
- **D2** — event hue (default: coral)
- **D4** — shared backend/DB with the PWA? (recommended: yes)
- **D5** — Expo learning curve mitigation: keep V1 surface tight (these 4 features only).
