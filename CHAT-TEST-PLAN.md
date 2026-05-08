# AI Chat Follow-Up & Modification Test Plan

All tests assume a plan already exists on screen (start by generating one via chat, e.g. "Tom, 130k income, 80k deposit, 3k savings, QLD").

## TIER 1 — High-risk paths (known fragile)

| # | Prompt | What could break | What to check |
|---|--------|-----------------|---------------|
| 1 | "Change his income to 150k" | AI sends wrong param key | Dashboard income updates, console shows `profileUpdates` |
| 2 | "Actually she saves 5k a month" | AI might use `annualSavings: 60000` instead of `monthlySavings: 5000` | Annual savings = $60k on dashboard |
| 3 | "Switch to cash flow" | AI returns modification instead of initial_plan | Full plan rebuild with CF-focused properties |
| 4 | "Switch to commercial transition" | Same as above, different preset | Plan rebuilds with commercial properties |
| 5 | "Add another regional house in QLD around 450k" (when one exists) | ID collision drops the new one | Property count goes UP by 1 |
| 6 | "Add 2 more properties" | AI might return existing + new, or no properties at all | Exactly 2 new properties added |
| 7 | "Sarah. 120k income. 50k deposit." (with existing plan) | AI rebuilds plan, destroys dashboard | Shows "clear the current plan" message, dashboard untouched |

## TIER 2 — Compound / multi-change (structurally tricky)

| # | Prompt | What could break | What to check |
|---|--------|-----------------|---------------|
| 8 | "Make property 1 cheaper and move property 2 to 2027" | AI flattens to single modification | Both changes land — price drops on P1, period changes on P2 |
| 9 | "Drop property 3 and add a metro unit in VIC" | Remove + add in one request | Property count stays same (one removed, one added) |
| 10 | "Change all properties to IO loans and drop the LVR to 80%" | Two bulk changes | Every property shows IO + 80% LVR |
| 11 | "Make it 5 properties instead of 4, and push the timeline to 25 years" | Add + profile change in one message | 5 properties + timeline = 25 years |

## TIER 3 — Relative / ambiguous (AI math + clarification)

| # | Prompt | What could break | What to check |
|---|--------|-----------------|---------------|
| 12 | "Increase property 2 by 100k" | AI sends delta instead of absolute | Price = original + 100k, not 100k |
| 13 | "Drop the rent by $50/week on property 1" | Same — relative change | Rent = original - 50 |
| 14 | "What about 5k savings?" | Ambiguous — explanation or modification? | Should clarify, NOT silently modify |
| 15 | "What if rates go up 1%?" | Should explain, not modify | Text answer about impact, dashboard untouched |
| 16 | "Can we afford a 6th property?" | Explanation, not add | Text answer, no new property added |

## TIER 4 — Edge cases / unsupported paths

| # | Prompt | What could break | What to check |
|---|--------|-----------------|---------------|
| 17 | "Make property 1 a metro unit" (when it's regional) | AI sends unsupported type change | Friendly message about type swap not supported |
| 18 | "Set the vacancy rate to 4% on property 2" | Unsupported field | Friendly "can't change from chat" message |
| 19 | "Remove all properties" | Edge case — empty plan after removal | Plan clears without crash |
| 20 | "Change property 7 to 500k" (only 4 exist) | Out of range index | Friendly "plan only has 4 properties" message |
| 21 | "Move property 1 to earlier" (no specific year) | Missing targetPeriod | Should clarify or pick period 1 |

## TIER 5 — Classification traps (messages that fall between the cracks)

These are the ones most likely to cause weird behaviour in a live demo. They test whether the AI can figure out *what kind of thing* the user is asking for, not just whether the mapper handles it.

### Mixed intent — half question, half instruction

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 22 | "I think 500k is too much for property 2, what do you reckon?" | Sounds like an opinion request but the BA probably wants a price change | Should clarify: "Want me to drop the price, or just talking through options?" |
| 23 | "Property 1 is a bit aggressive — maybe something safer?" | Vague subjective request with no concrete number or field | Should ask what specifically to change (price? growth assumption? LVR?) |
| 24 | "Could we look at something around 600k for the next one?" | Thinking out loud vs adding a property — unclear | Should clarify: "Want me to add a ~$600k property, or are you exploring?" |

### Hypotheticals that look like instructions

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 25 | "If she gets a pay rise to 180k, could we add another property?" | Conditional — the pay rise hasn't happened | Should explain impact in text, NOT modify income or add a property |
| 26 | "Say they had no HECS debt, would that change things?" | Hypothetical about a field the system doesn't model (debt) | Text explanation — NOT a modification attempt |
| 27 | "What would it look like with 6 properties?" | Could be "add 2 more" or "just tell me" | Should clarify, or explain in text without changing the dashboard |

### Undo / reversal requests (no undo mechanism exists)

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 28 | "Actually, undo that last change" | System has no undo — AI might guess and get it wrong | Should explain: "I can't undo, but tell me what to set it back to" |
| 29 | "Go back to what it was before" | Same — no state history | Same — ask BA what the previous value was |
| 30 | "No wait, that's wrong. Put it back." | Urgency + reversal, high chance AI tries to guess | Should NOT guess — ask what to revert to |

### Indirect property references

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 31 | "Make the expensive one cheaper" | AI needs to identify which property is most expensive | Should resolve to the highest-priced property and modify it, or clarify if ambiguous |
| 32 | "Drop the Queensland one to 400k" | Multiple properties might be in QLD | If only one in QLD, modify it. If multiple, ask which one. |
| 33 | "The last property — move it earlier" | "Last" could mean most recently added OR last in the list | Should resolve to last in order (property N), or clarify |

### BA talking to the client (not instructing the AI)

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 34 | "So Sarah, what we're looking at here is about 2.1M equity by year 15" | AI might interpret "Sarah" as a new client brief | Should recognise as conversational commentary — explanation or ignore, NOT rebuild |
| 35 | "Yeah I think we could stretch to 5 properties for you" | Sounds like a plan change but the BA is talking to the client | Should clarify: "Want me to add properties to get to 5, or just discussing?" |
| 36 | "Let me show you what happens if we go more aggressive" | BA narrating for the client — but what does "more aggressive" mean? | Should ask: "More aggressive how — higher LVR, higher growth targets, more properties?" |

### Partial info updates (unsupported fields)

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 37 | "Oh wait, they also have a HECS debt of 40k" | Debt is not a modification target | Text explanation: "I can't model debt directly — it affects borrowing capacity which you can adjust in the profile panel" |
| 38 | "Her partner earns 90k too" | Is this changing income? Adding a person? Combined = 220k? | Should clarify: "Want me to update the income to combined 220k, or is 130k already the household figure?" |
| 39 | "They've got an existing investment property worth 600k with 200k owing" | Existing assets aren't modelled | Should explain this isn't modelled in the roadmap, suggest adjusting deposit/equity pool |

### Subjective / vibes-based requests

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 40 | "This is too risky" | No concrete field to change | Should ask what aspect feels risky — LVR too high? IO loans? Too many properties? |
| 41 | "Make it more conservative" | Maps to multiple possible changes (lower LVR, PI loans, fewer properties, lower growth) | Should clarify or suggest a specific interpretation |
| 42 | "Can we slow it down a bit?" | Could mean longer timeline, fewer properties, or later purchase dates | Should clarify intent |
| 43 | "I want something my client can actually sleep at night with" | Pure vibes | Should ask what would make the client more comfortable — lower repayments? Fewer properties? More equity buffer? |

### Self-correction mid-message

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 44 | "Change property 2 — actually no, property 3 — to 500k" | AI might change property 2, or both, or neither | Should change property 3 to 500k only |
| 45 | "Add a house in — wait, make it a unit — in QLD for 400k" | Mid-sentence type correction | Should add a unit (not a house) in QLD at 400k |
| 46 | "Set LVR to 90. No, 85. Actually keep it at 80." | Three contradictory instructions | Should do nothing (final instruction is to keep current value) or clarify |

### Questions about the tool itself

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 47 | "What can you change from here?" | Meta-question — AI might try to modify something | Text explanation of what's adjustable via chat |
| 48 | "How does this work?" | About the tool, not the plan | Text explanation of chat capabilities |
| 49 | "Can you show me a comparison of two strategies?" | Comparison type is disabled | Should explain comparisons aren't available — suggest "switch to X" instead |

### Rapid-fire / terse commands

| # | Prompt | Why it's dangerous | Expected behaviour |
|---|--------|-------------------|-------------------|
| 50 | "p2 500k" | Extremely terse — might not parse as a modification | Should change property 2 to $500k |
| 51 | "IO all" | Shorthand for "change all properties to IO" | Should change all loan products to IO |
| 52 | "nsw not qld" | No property specified, no context | Should clarify which property to move to NSW |
| 53 | "+1 property" | Ultra-terse add request | Should add a property or clarify what type/state/price |

---

## How to run these tests

1. Generate a base plan: "Tom, 130k income, 80k deposit, 3k savings, QLD"
2. Work through each tier top to bottom
3. After each test, note in the Result column: PASS / FAIL / WEIRD
4. For FAILs: open browser console, look for `[ChatPanel]`, `[nlDataMapper]`, or `[nl-parse]` logs
5. Reset between tiers if the plan gets too mutated (clear plan, regenerate)

## Scoring

- **Investor-ready**: PASS on Tiers 1-3, acceptable on Tier 4, Tier 5 mostly graceful
- **Needs work**: Any FAIL in Tier 1-2
- **Dangerous for demo**: Multiple FAILs in Tier 1, or any crash/blank-dashboard
