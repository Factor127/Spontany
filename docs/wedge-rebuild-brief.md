# Spontany — Wedge Rebuild Brief

**Date:** 2026-05-10
**Owner:** Ran
**Status:** Working brief. The architectural principles are settled. The five LP concepts are settled. The test sequence is the working hypothesis — adjust as data lands.

---

## Why this exists

The previous loop (six LPs, one $1K paid campaign, ~31 registered users, ~1 active user other than the founder's partner) produced enough data to know what's wrong. The funnel breaks at retention, not at signup, because users who register encounter a calendar that demands work before delivering anything magical. The fix isn't to optimize the registration LP — it's to rebuild the wedge so value is delivered *before* signup is asked, and so the architecture forbids the dead-end "registered solo, nothing happens" state.

Three converging signals say the same thing:

1. **Competitor research:** The custody-management space is full of feature-loaded apps. The unique angle Spontany has is *matching*, not management.
2. **Ad data:** "Custody matching is here" gets clicks. The management framings don't.
3. **Adva's interview:** What works in the app for the only active user is *clarity* and *one less text with the ex*. The screenshot-of-schedule pattern is downstream output, not standalone value.

The four-day pivot through this thread produced a sharper thesis than where we started: **matching, not management; magic before signup; no solo state; relationship type drives framing.**

---

## Architectural principles (rules every LP must follow)

These are gates, not advice. If a candidate LP violates one, it doesn't ship.

**1. No solo state.** The atomic unit isn't a user — it's a relationship pair. The product cannot be entered alone. Every successful flow must produce two engaged parties, not one.

**2. Magic before signup.** Value is delivered before any account creation is asked. The signup ask is downstream of the moment the user feels something work. Email capture / account creation appears after the result page, never before.

**3. Two-player completion is the primary metric.** Not signup rate. Of every Person A who enters the flow, what % get a Person B to also complete and both land on the result page. This is the only number that predicts retention.

**4. Per-person visibility, not global.** Schedules are not broadcast. Invitations flow through the user; availability stays behind a wall. Three out of thirteen interviews (Roi, Adva, Michal) flagged this as a hard requirement. Skip it and you lose the audience that needs it most.

**5. Inner-circle cap.** 3 close + 1 partner + 1 ex. The numbers are testable but the principle is fixed. Small, named, curated. The cap is doing real work — it's what makes the freshness problem tractable and what protects users like Adva from feeling overloaded.

**6. Relationship type frames the experience.** The same product underneath, different stories on top. The user picks at the moment of inviting whether they're matching with a partner, coordinating with an ex, or making themselves available to a loved-one-they-feel-guilty-about. The framing changes; the architecture doesn't.

---

## The five LP concepts

Each is a different doorway into the same architecture. Each has a different audience, a different headline candidate, a different magic moment. They share the underlying flow (invite → accept → both engage → result page).

### LP-1 — Match Mirror (partner / matching vector)

**Promise:** *"Find time you'd actually be free together this month."*

**Audience:** Divorced parents in a current or evolving partnership. The person on the other side of the invite is the partner.

**Why it works:** Adva's killer pitch ("It'll organize their days and times — they'll fly on this") plus the ad-platform signal that custody-matching framing converts. The emotional handle is *possibility* — overlap you didn't know you had.

**Mechanic:**
1. Land on LP, single promise, single CTA.
2. User enters their custody pattern (3 taps, visual selector).
3. User picks "send to partner" — types a name + WhatsApp number, hits send.
4. WhatsApp link goes to partner. Partner opens, no signup, 30-second pattern entry.
5. Both land on the result page: a calendar visualization showing 8–14 nights together this month neither knew about.
6. *Then* the soft signup: "Save this match — get notified when new windows open."

**Magic moment:** The result page. Both people, on their own phones, seeing real overlap that neither of them knew about thirty seconds earlier. Not invented. Not manufactured. Real.

**Build effort:** Low. The match flow already exists at `/match`. The work is repackaging it as the entire front door, not a buried feature. Existing components: `routes/match.js`, `public/match.html`, the schedule picker, the WhatsApp share helper.

**Success metric:** Two-player completion rate ≥ 25%. 7-day return rate of Person A ≥ 30%.

**Why it might fail:** The partner doesn't open the link, or opens it but bounces because the framing doesn't carry over from WhatsApp. The invitee experience is the make-or-break.

---

### LP-2 — Link-to-Invite (intent capture vector)

**Promise:** *"Found something you want to go to? Drop the link. We'll figure out who's free."*

**Audience:** Anyone with active social/cultural intent — saw a concert, a play, a dinner reservation slot, an event link forwarded by a friend. Not specifically divorced.

**Why it works:** Inverts the usual problem. Most LPs have to manufacture intent ("you should care about this"). This one assumes intent already exists ("you saw something, you want to go") and removes the friction between intent and action. The user arrives in a converting psychological state.

**Mechanic:**
1. Land on LP, single input field: "Paste a link."
2. User pastes (Resident Advisor, Ticketmaster, Eventbrite, Instagram event, anything).
3. App calls existing unfurl service, parses the event, displays a clean preview.
4. App places it in the user's schedule (asks for the user's pattern in passing if not known).
5. App asks: "Who do you want to go with?" — relationship type + name + contact.
6. Invite goes out. Result page once both have engaged.

**Magic moment:** The preview. The user pastes a messy link and gets back a clean event card with title, time, venue, image. Then it's already in their schedule. Then they're inviting someone. Four hits of value before signup is even visible.

**Build effort:** Low-to-medium. The unfurl service exists (`services/unfurl.js`). Schedule placement exists. Invite flow exists. The new build is the LP shape and the routing logic — not new capability.

**Success metric:** Paste-to-invite-sent ≥ 40% (very high bar — means the LP is delivering on its promise). Two-player completion ≥ 30%.

**Why it might fail:** Adva flagged this directly — "not all the parsers work." If the unfurl fails on the first link the user tries, the magic dies in the first three seconds. Reliability of the parser is load-bearing.

---

### LP-3 — The Receipt (guilt-discharge vector)

**Promise:** *"Make the time visible. The rest is on them."*

**Audience:** People with a relationship they feel guilty about not maintaining — adult kid, aging parent, long-distance friend, new partner where they're the more-invested one. Not specifically divorced. Probably skews older.

**Why it works:** From the mentor's interview — *"I'll put a time in the schedule for them to book, and I've done my part. I'm not guilty of not finding the time for people I care about."* The product isn't optimizing coordination — it's discharging guilt. The schedule slot serves as your proof to yourself that you tried. Whether the time gets booked is almost secondary to the act of having made it available.

**Mechanic (asymmetric — different from LP-1 and LP-2):**
1. Land on LP. Promise: "Make the time available. The rest is on them."
2. User picks the relationship: "I want to make time for…" (partner / kid / parent / friend).
3. User posts 2–4 specific time windows ("Tuesday after 7", "Sunday afternoon", "next Thursday morning").
4. App generates a clean shareable link. User sends via WhatsApp.
5. Invitee opens, sees the windows, picks one (or doesn't).
6. Inviter gets notified of the booking — or doesn't. Either way, the proof exists in the inviter's account.

**Magic moment:** The act of posting and sending. The shareable card is clean, dignified, low-pressure. The invitee doesn't have to enter their own schedule — they just pick or don't pick. The inviter gets the relief of having posted, regardless of outcome.

**Build effort:** Medium. Asymmetric flow isn't fully in the code base — current `/match` flow assumes both parties enter patterns. New work: a one-sided "post slots" flow, a different shareable card design, and a different result/booking page.

**Success metric:** Slot-post completion (≥ 60% of starters), invitee booking rate (≥ 25%). Inviter return for second post within 14 days (≥ 40% — this is the retention test for whether the *guilt-discharge* loop is real or one-time).

**Why it might fail:** The framing is heavier than the others. *"You're guilty about a relationship"* is true but uncomfortable. If the LP copy can't hit the emotion without making the user feel exposed, it bounces hard. Tone is everything.

---

### LP-4 — Conversational On-Ramp (chat as onboarding + router)

**Promise:** *"Tell me about a time you wanted to make plans with someone and it didn't happen."*

**Audience:** Cold traffic. Anyone. The chat sorts them.

**Why it works:** Forms feel like work. Conversation feels like attention. The chat extracts the user's custody pattern, relationship inventory, friction points, and the moments they feel like company — without the user ever filling out a form. By the end, the system has a fuller profile than any onboarding flow has produced, and the user did zero perceived work.

The chat is also the *router*: based on what the user describes, it sorts them into LP-1 (match), LP-2 (intent capture), or LP-3 (receipt). They don't have to know which one they need; the conversation figures it out.

**Mechanic:**
1. Land on LP. Single chat input. AI opens with one question.
2. 3–5 exchanges. AI extracts: the relationship type, the custody/work pattern, the friction, the moment they feel the cost.
3. AI asks: "Want me to show you what this would look like fixed?"
4. Reveal — visualization plus the option to send the relevant invite (matched to the right LP track based on the conversation).
5. Soft signup at the end ("Save this conversation, save the people you mentioned").

**Magic moment:** The reveal at the end of the conversation. The AI has heard them, understood, and now produces a custom result tailored to what they actually said. It's the same magic as the other LPs but earned through dialogue rather than form-filling.

**Build effort:** High. Getting an LLM to reliably extract structured data from open conversation is non-trivial. People go off-script, contradict themselves, ramble. The chat needs to handle that without feeling like a phone tree. The plumbing alone is 1–2 weeks of work.

**Success metric:** Chat completion rate (≥ 50% of starters reach the reveal). Of those who reach the reveal, conversion to invite-sent (≥ 40%). The router sorting accuracy is a secondary metric — does the chat correctly identify which track each user belongs in?

**Why it might fail:** Tone. If the chat feels like a survey or a research instrument, the magic dies. It has to feel like a tool helping the user figure something out, not a founder extracting data. The bar for tone is much higher here than for the form-based LPs.

---

### LP-5 — One Less Text (coordination relief vector — held for v2)

**Promise:** *"Send your ex one less text."*

**Audience:** Divorced parents who currently negotiate logistics with an ex via WhatsApp / SMS. Adva's profile.

**Why it works:** Adva's exact words. The sentence is sharper than any messaging we've tested because it's specific, behavioral, and small enough to feel believable. Nobody promises to delete your ex from your life; *one less text* is a measurable, non-magical claim.

**Mechanic:** Same as LP-1 (Match Mirror) structurally — both parties enter their pattern and see overlap. The framing is different: this is positioned as relief from negotiation, not discovery of magic.

**Build effort:** Low — same underlying flow as LP-1, different copy and creative.

**Why it's held for v2:** It's a smaller emotional handle than the magic-first LPs, and the relief vector is operational — it's harder to sell cold than the magic vector. Lead with the magic LPs (1, 2, 3); add this as a fourth ad set once the wedge mechanic is proven.

**Success metric:** Same as LP-1 once it ships.

---

## Test sequence

Strict order. Don't ship more than one new LP per week.

**Week 1 — Ship LP-1 (Match Mirror) and LP-2 (Link-to-Invite) in parallel.**
Both reuse mostly-existing code. Two ad sets, one creative each, $200 budget, 14 days untouched. Different audiences, different framings. Let Meta learn each one independently.

**Read the data on day 14 only.** Not day 3, not day 7. Look at two-player completion rate, Person A 7-day return, and which LP produced more of both. Decide: continue, iterate one of them, or pivot.

**Week 3 — Ship LP-3 (The Receipt).**
Different audience (older skew, possibly non-divorced). Asymmetric flow needs new build. Run as a third ad set against the winners from week 1. $200 budget, 14 days untouched.

**Week 5 — Ship LP-4 (Conversational On-Ramp).**
Build the chat as a wrapper that routes into the existing LP-1/2/3 flows. Two-week build. Then run it as a fourth ad set against the previous winners.

**Week 7 — Ship LP-5 (One Less Text)** if the relief vector still seems worth testing after the magic vectors have run. By this point you'll have a strong sense of which audience is converting and which framings stick.

---

## What we're NOT building (yet, or ever)

- **The screenshot generator as a standalone LP.** Output, not value.
- **The full friend network.** Inner-circle cap stays at 3+1+1. Anything beyond that is v3 or never.
- **The court documentation use case.** Strong unprompted signal from Adva, but it's a different product entirely. Park in `docs/parking-lot.md` for quarterly review.
- **The single-divorcee audience.** Different wedge (no specific person to invite). Don't try to make one LP serve both partnered and single divorcees.
- **Anything beyond the wedge.** The Crafter, the Pulse feed, the Opportunities matcher, the Groups epic — all stay in the existing app, untouched, while the wedge is being rebuilt. They're for users who've already had the magic. They're not for cold traffic.

---

## Open questions (need decisions before building)

1. **Does the inviter pre-fill their pattern while waiting for the invitee?** Empty waiting kills momentum. Productive pre-fill respects relationship-first principle. Default: yes, allow it.
2. **What happens if the invitee declines or ghosts?** Need a graceful "send to someone else" path. One tap, no shame.
3. **Where does the chat in LP-4 live in the code base?** Inside the existing app routes, or as its own service? Probably its own service for isolation, but worth a small spike before committing.
4. **Branding consistency across LPs.** Should all five LPs share visual identity (likely yes), or should the relationship-type tracks have distinct color/tone (worth A/B testing)?
5. **Whether to build the visibility-control architecture now or after the wedge converts.** Per-person visibility is a hard requirement long-term. Short-term, the LPs can ship without it because the relationship-type framing implicitly limits exposure. Defer until v2 unless it becomes blocking.

---

## Headline candidates (for ad creative + LP copy)

These are the verbatim sentences from the corpus that are doing the most strategic work. They should appear in ad creative and LP copy, not be paraphrased.

| Source | Sentence | Best fit |
|--------|----------|----------|
| Adva | *"It'll organize their days and times — they'll fly on this."* | Pitch line, social proof |
| Adva | *"My male friends don't get along with their exes — this would come to them perfectly."* | Audience-targeting hook |
| Adva | *"One less text with your ex."* | LP-5 headline |
| Mentor | *"I've done my part. I'm not guilty of not finding the time for people I care about."* | LP-3 headline / subhead |
| Ad signal | *"Custody matching is here."* | Already validated; keep |

---

## Success criteria for the rebuild as a whole

By the end of week 8 (4 LPs shipped, ~$800 spent, ~6 weeks of build), we should have:

- At least one LP with two-player completion ≥ 25% and Person A 7-day return ≥ 30%. If yes, the wedge concept works and we scale that LP.
- A clear ranking of which framings (matching / intent / receipt / conversational) convert best by audience.
- 5+ post-test interviews with users who completed the wedge — adding to the corpus.
- A decision: scale the winning wedge, iterate it, or pivot the thesis.

If by end of week 8 no LP hits both gates, the thesis is wrong and we re-think from interviews. Either outcome is more useful than another month of incremental adjustment on the wrong thing.
