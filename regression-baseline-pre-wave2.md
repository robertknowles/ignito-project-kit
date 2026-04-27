# Regression Baseline — pre-Wave-2 (post-Wave-1)

**Captured:** 2026-04-27
**State of code:** Wave 1 complete (growth tier consolidated, SAVINGS_DEPLOYMENT_RATE / dependent penalties surfaced, calculatePropertyScore + calculateRentalRecognitionRate wrapper deleted).
**Build:** `npm run build` ✓, `tsc --noEmit` ✓ clean.

## Scenario inputs

- Template: Balanced
- Borrowing capacity: $1M
- Annual income: $120k
- Deposit: $80k
- Equity goal: $2M
- Existing properties: none
- Assumed (auto-filled by AI): $2,000/mo savings ($24k/yr), 88% LVR, IO loans, 15-year timeline, individual ownership, high-growth targeting
- Client: John Smith (id 14)

## AI-generated property sequence

| # | Type | Price | State | Growth | Loan |
|---|---|---|---|---|---|
| 1 | Villas / Townhouses | ~$450k | QLD | High | IO |
| 2 | Houses (Regional) | ~$400k | NSW | High | IO |
| 3 | Duplexes | ~$550k | QLD | High | IO |
| 4 | Units / Apartments | ~$380k | VIC | Medium | IO |

Property order in localStorage: `["property_1_instance_0", "property_2_instance_0", "property_3_instance_0", "property_0_instance_0"]`

## Headline KPIs (Portfolio tab)

| Metric | Value |
|---|---|
| Portfolio Value | **$3.40M** |
| Total Equity | **$1.83M** |
| Net Cashflow | **$15,030/mo** |
| Next Purchase | **2027** |

## Funding sources (next 4 purchases)

| Property | Target | Status | Cash deposit | Accum. savings | Total to fund |
|---|---|---|---|---|---|
| Villas / Townhouses | 2027 | 88% ready | $80K | $11K | $91K |
| Houses (Regional) | 2030 | 4 yrs away | — | — | $84K |
| Duplexes | 2032 | 6 yrs away | — | — | $112K |
| Units / Apartments | 2034 | 8 yrs away | — | — | $85K |

## Investment Timeline axis

- Years: 2026–2040 (15 ticks)
- Y axis: $0, $900K, $1.8M, $2.7M, $3.6M
- Dot count on chart: 4 (= 4 purchase events)

## Per-Property tab

| Metric | Value |
|---|---|
| Properties | 4 selected, 0/4 owned |
| Combined Value | $1.8m (sum of purchase prices) |
| Total Equity (now) | $0 |
| Annual Cashflow | -$23k/yr |

Villas / Townhouses card detail: QLD · $450k · High Growth · Est. Cashflow -$10k/yr · Proj. Equity (10Y) $489k.

## Retirement tab

Settings: 15 yrs to retirement, 0 of 4 properties sold.

| Metric | Value |
|---|---|
| Cash in Hand | $0 |
| Portfolio Value | $3.8M |
| Total Equity | $2.2M |
| Debt Remaining | $1.6M |
| Annual Cashflow | +$25k/yr |

Per-property equity at retirement:

| Property | Equity |
|---|---|
| Villas / Townhouses | $783k |
| Houses (Regional) | $528k |
| Duplexes | $593k |
| Units / Apartments | $328k |

## Per-property monthly cashflow values seen on Portfolio tab

Set of distinct dollar values rendered on the per-property cashflow rows (used as a fingerprint — exact mapping varies by render):

```
-$2,851, $3,238, $2,501, -$737, $2,145, $540, $553, $2,704, $2,252,
-$451, $3,719, $3,269, -$450, $2,606, $1,394, -$1,213
```

(These are individual property period cashflows. After Wave 2 the same 16-or-so distinct values should reappear in the same magnitudes if behaviour is preserved.)

## How to verify against this baseline

1. Reload "Regression A" saved scenario.
2. Headline KPIs must match exactly: $3.40M / $1.83M / $15,030/mo / 2027.
3. Funding card amounts ($91K, $84K, $112K, $85K) must match.
4. Retirement tab: $3.8M / $2.2M / $1.6M / +$25k/yr / 15 yrs must match.
5. Per-property retirement equity ($783k / $528k / $593k / $328k) must match.

Any divergence ≠ rounding noise: halt Wave 2 immediately, investigate.
