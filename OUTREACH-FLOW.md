# PropPath outreach flow

The canonical sales motion for PropPath, tailored to the Australian investment-focused buyers' agent market (~500 agencies, ~1,500 individuals).

## Principles

Read these before every batch of outreach. They override any tactical instinct.

- **Lower the ask, not the touches.** Push the product (free login, low friction), not your calendar.
- **DM text is hospitality, not sales.** Let the video do the work. Two sentences max.
- **Branch on signal, not on calendar.** Read vs unread vs replied each gets a different response.
- **Wait longer than feels right.** Minimum 4 days between touches; longer in this market reads as confident, not absent.
- **One person per agency at a time.** Never message two people at the same firm in parallel.
- **Don't burn whales early.** Outreach order: smallest agencies within High-relevance tier first. Freedom Property and Empower Wealth wait until messaging is sharp.
- **Real reasons only on follow-ups.** Never "just following up." If you don't have a specific reason, don't send.
- **Mark Dead and stop.** Eight unanswered touches makes you the founder no-one returns calls from. In a 1,500-person market, reputation cost > pipeline cost.
- **Warm intro > 20 cold messages.** Engineer them via Joshua/Simon and active beta testers.

## CRM stage definitions

Aligned with the existing `crm_contact_status` enum in the database.

| Stage | Meaning | Time-in-stage upper bound |
|---|---|---|
| `not_contacted` | In the map view, not yet touched. | n/a (resting pool) |
| `connection_sent` | LinkedIn connection request sent (or InMail sent after 10 days unaccepted). Awaiting acceptance / read. | 30 days |
| `connected` | Connection accepted, video/DM not yet sent. | 3 days |
| `video_sent` | Personalised video and DM delivered. Awaiting read or reply. | 30 days |
| `replied` | They responded. You're now in conversation. | n/a (active relationship) |
| `demo_booked` | Live demo or trial-account chat scheduled. | n/a |
| `beta_tester` | Actively using the platform with real clients. | n/a |
| `dead` | Outreach concluded without engagement. Wait 90 days before any re-engagement. | n/a |

## The flow

### Day 0 — pre-touch (60 seconds in CRM)

- Tick the contact in the industry map. Status moves to `connection_sent`.
- 30-second LinkedIn scan. Note one specific thing in the contact `notes` field: recent post, recent deal, podcast appearance, mutual connection, podcast they hosted, anything genuinely personal. If nothing real surfaces in 30 seconds, **skip them and tick a different prospect**. No fake personalisation.
- Send LinkedIn connection request. **Blank invite** — no message attached. Blank invites have higher accept rates in this market and avoid signalling sales intent up front.

### Day 1-10 — wait for acceptance

No follow-up activity. Resist the urge to "bump" the connection. The connection request itself is a touch; chasing it is a second touch on the same nothing.

### Day 10 — fork: accepted vs not accepted

**Branch A: They accepted (anywhere between Day 1 and Day 10).**

Move stage to `connected`. Proceed to Day +1-after-acceptance step below.

**Branch B: Still no acceptance at Day 10.**

Send an **InMail** (LinkedIn Premium feature) carrying the same content as the post-acceptance message would have. Status stays `connection_sent` until they read or reply. Three constraints:

- Prioritise InMail spend on Mid and Whale-tier accounts only — InMail credits are limited (5-50/month depending on plan) and Small-tier prospects don't justify the credit.
- InMail copy is identical to the post-acceptance DM template (see below). No special "we couldn't connect on LinkedIn" framing — that reads as desperate.
- If neither the connection request nor the InMail produces a read or reply by Day 30, mark Dead.

### Day of accept (or InMail) + 1 — first real touch

Send the **personalised video + DM** via LinkedIn message (or InMail thread).

- **Video:** ~90 seconds. First 15-20 seconds is hyper-personal — names them, references the specific thing noted on Day 0, frames why PropPath is relevant to *their* practice (not a generic value pitch). Remaining 60-75 seconds is the platform doing the thing that matches their work. CTA inside the video: pull, not push. "If you want to play with this on a real client, I'll drop you a login — no calls, no pitch."
- **DM text alongside:** two sentences max. Don't repeat what's in the video. Example shape:

  > "Hey [Name] — built something I think you'd find useful. 90 seconds, no slides, tell me to piss off if it's not your thing."

Move status to `video_sent`. Stamp `video_sent_at`.

### Day video + 4 — check read status and branch

Three branches, three different moves. **Do not send the same message regardless of signal.**

**Branch 1: Read + replied** (whether positive, sceptical, or "not now")

Stop running the pipeline flow. Exit into conversation mode. The goal of the next 30 days is to make them feel heard and let them pull the product in. Get on a 15-minute Zoom that's *their* questions, not your pitch. Status moves through `replied` -> `demo_booked` -> `beta_tester` as the conversation progresses.

**Branch 2: Read but no reply** (they opened the DM/InMail, didn't respond)

One soft second touch. Pick ONE shape — don't mix:

- *Curiosity nudge:* "Saw you had a look — what did you think?"
- *Industry observation tied to them:* "Saw [specific market move]. Curious how you'd model that for an existing client of yours."
- *Useful asymmetric value:* share something genuinely useful with no pitch attached. Only use this if you have something real.

No pitch language. No second video. No "just bumping this up."

**Branch 3: Unread** (DM/InMail still shows unread after 4 days)

This is the move most founders miss. **Graceful retreat**, not pressure.

> "Realised I dropped a 90-second video on you cold — happy to send a 60-sec written summary if video's not your format. Or no worries either way."

This separates you from the volume crowd. Most BAs have never had a founder explicitly offer to back off. It surprises them in a good way, and a meaningful fraction of unread-recipients actually engage at this point because the *retreat* is the unusual move.

### Day video + 14 — one more nudge

For anyone still in `video_sent` (no reply across Day 4 follow-up), one last touch. **Real reason only:**

- A new platform feature genuinely relevant to them.
- A quote from a beta tester at a peer agency.
- A specific industry data point.
- A mutual contact who's now using the platform.

If you don't have a real reason, **skip and move them to Day 30 directly**. "Just checking in" sends become "just being ignored" sends.

### Day video + 30 — Dead

Move to `dead`. Stop. Do not send another message.

This is the hardest discipline. The instinct is "one more touch and they'll come around." They won't, and the eighth message is the one they screenshot to share with a peer.

### Day dead + 90 — optional re-engagement

One-shot only. Requires a *genuinely* new reason — not "checking back in." Examples:

- "Five BAs are now using us; one of them is [name they'd respect]. Thought you might want a fresh look."
- A specific market event that ties to their stated focus.
- A mutual connection's introduction (which should preempt the cold re-engage anyway).

If no real reason exists, leave them alone permanently.

## Branching summary (visual)

```
Day 0  -> Connection request sent
         |
         +-- Day 1-10: Accept? --YES--> Day +1: Video + DM (move to video_sent)
         |                              |
         |                              +-- Day +4: Read? --REPLIED--> Conversation mode
         |                              |                |
         |                              |                +-READ-NO-REPLY-> Soft nudge
         |                              |                |
         |                              |                +-UNREAD-> Graceful retreat
         |                              |
         |                              +-- Day +14: Real-reason nudge OR skip
         |                              |
         |                              +-- Day +30: Mark Dead
         |
         +-- Day 10: Still not accepted -> InMail (Mid/Whale only)
                                          |
                                          +-- Same Day +4 / +14 / +30 branches
```

## What to measure

Track these per batch of 30 sends. After three batches you have enough signal to refine.

- **Connection accept rate.** % accepted within 10 days. Healthy benchmark for a small premium market: 35-55%.
- **InMail read rate.** % of InMails marked read within 7 days.
- **Read rate of first DM/InMail.** % marked read within 4 days of send.
- **Reply rate.** % of all first touches that get any kind of reply.
- **Reply-to-meeting rate.** Of replies, % that progress to a demo or trial login.
- **Demo-to-beta-tester rate.** Of meetings, % that become active beta testers.

Five metrics. Tracked in the CRM. After the first 30, look at where the drop-off is and adjust one variable (template, personalisation depth, follow-up timing) for the next batch.

## What we are explicitly NOT doing

- Multi-person prospecting within the same agency in parallel.
- Mass personalisation tokens beyond a real specific note (no `{firstName}` mail merge).
- Automated sequencing tools (Outreach, Apollo cadences, Lemlist) for the LinkedIn motion. Manual or nothing.
- Asking for meetings as the primary CTA on first touch.
- Sending pitch decks unsolicited.
- "Just checking in" messages.
- More than 4 touches across 30 days per contact.
- Re-engaging Dead prospects without a real new reason.

## Warm channels to engineer in parallel

Cold flow above is the workhorse, but the highest-converting channel for this market is referrals. Two specific motions:

1. **Joshua + Simon (post-investment).** Once the deal closes, ask Joshua specifically: "Who in the CHQ network or among your competitors would you be willing to ping with one sentence about us?" One warm intro from him is worth 20 cold messages.
2. **Beta tester references.** Once Compound (or any beta tester) is actively using PropPath and visibly enthusiastic, ask: "Anyone in your network who'd want to see this? Happy for you to introduce, or for me to mention you when I reach out." Use the reference name in the first DM — "Ben at Compound suggested I send you this" collapses the full flow into a single touch.

These don't replace the cold flow, but they should ship in parallel. Every warm intro is a Day 0 contact that bypasses the connection-accept fork entirely.

## Template stubs (to be drafted in v2 of this doc)

- Day 0 connection request: blank, no body.
- Day video DM (post-acceptance).
- Day 10 InMail (when connection not accepted).
- Day +4 read-no-reply soft nudge.
- Day +4 unread graceful retreat.
- Day +14 real-reason nudge.
- Day dead+90 re-engagement opener.

Drafting these is the next concrete deliverable.
