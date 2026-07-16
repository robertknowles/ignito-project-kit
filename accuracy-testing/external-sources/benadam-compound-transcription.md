# Compound (Ben & Adam) Calculator — transcription & notes

**Source:** 4 CSV exports of one xlsx (machine-readable — no vision needed), in `/Users/robknowles/Projects/Company Calculators/Ben:Adam/`:
- `…xlsx - Calculator.csv` (main model)
- `…xlsx - Growth Assumptions.csv`
- `…xlsx - LMI.csv`
- `…xlsx - Costs by LGA.csv` (structure only — data cells empty in export; pulls from a Google Sheets master DB)

**What it is:** "Compound Calculator" — a per-deal sheet for **5/804 Warrigal Road, Malvern East, VIC 3145** (filename says 8/804; sheet body says 5/804), contract 13/05/25. Three sections: THE PURCHASE (cash required + payment timeline), THE HOLD (10-year performance projections), plus Due Diligence and Value-Add Planning blocks. This is the richest external source we have: it projects 10 years, so it validates **compounding**, not just year-1.

## Inputs

| Label | Value |
|---|---|
| Purchase Price | $315,000 |
| Valuation at Purchase | $380,000 (**buys under market — $65k day-one equity; this is Task-3 gap #9 in the wild**) |
| Growth Assumption | High |
| State / LGA | VIC / Muswellbrook (LGA dropdown looks stale — Malvern East isn't Muswellbrook) |
| %MV | 0.0% |
| Min Yield | 7.5% |
| Rent Per Week | $450 |
| LVR | 88% |
| LMI Waiver? | No → LMI $5,544 (from LMI tab: 1.5–2% band; $277,200 × 2% = $5,544) |
| Loan Product | I/O |
| Interest Rate | 6.04% |
| Loan Term | 30 years |
| Loan amount (LVR×PP) | $277,200; loan carried in projections = **$282,744** (= loan + LMI capitalised, 88% of $315k+LMI…: shown as "$282,744, 88.00%") |
| Loan pre-approval / BC Remaining | $500,000 / $222,800 |
| Funds Available / Required / Remaining | $75,000 / $66,972 / $8,028 |

## THE PURCHASE — cash required by payment stage

| Stage | Item | Amount |
|---|---|---|
| Engagement | Compound Property — Engagement Fee | $10,000 |
| Exchange (conditional) | Holding deposit | $10,000 |
| | Building & Landlord Insurance | $1,401.64 |
| | Building & Pest Inspection | $600 |
| | Plumbing & Electrical Inspections / Independent Valuation | $0 |
| Settlement | Deposit balance | $27,800 |
| | Stamp Duty Estimate | $13,970 |
| | Mortgage Fees and Discharge | $1,000 |
| | Conveyancing (fees + searches) | $2,200 |
| | Rates adjustment | $0 |
| **Total** | **Total Cash Required For Deal** | **$66,972** |

Stage subtotals: Engagement $10,000 · Exchange $12,002 · Unconditional $0 · Settlement $44,970 · Post-settlement $0. Deposit structure: 12% total ($37,800), 2% at conditional, 0% at unconditional, balance at settlement.

## THE HOLD — year-1 cashflow lines

| Line | Value |
|---|---|
| Gross Annual Rental Income | $23,400 ($450 × 52) |
| Vacancy Period | 0/52 weeks → 0.0% |
| Letting Fee | 0 |
| Loan Interest | $16,983.40 (6.04% × $282,744? — actually 6.04% × 281,182…; sheet value transcribed as-is) |
| Property Management | 6.6% → $1,544.40 |
| Building and landlord insurance | $350.00 |
| Council Rates + Water Estimate | $2,000.00 |
| Strata | $2,700.00 |
| Maintenance Allowance | $0.00 |
| Forecast Annual Cash Expenses | $23,577.77 |
| Land Tax (if applicable) | $975.00 (non-deductible bucket) |
| Principal Payments | $0 (I/O) |
| Potential Annual Net Cash Outflows | $24,552.77 |
| Net Annual Cashflow Year 1 | −$1,153 |

## Assumptions (cashflow)

- 10y Average Rental Growth: 3.5% · Inflation: 3.0% (operating expenses escalate ~3%/yr in the table)
- Interest Rate Yr1: 6.04% · 10yr average: 6.04% (flat)

## Growth assumptions (per-year, front-loaded — NOT a flat rate)

"High" profile used in this deal (from Growth Assumptions tab; "Average" = flat 6.5%):

| Year | Price growth (High) | Rental growth (sheet body) |
|---|---|---|
| 1 | 12% | 4% |
| 2 | 10% | 4% |
| 3 | 8% | 4% |
| 4 | 5% | 4% |
| 5 | 5% | 4% |
| 6–10 | 5% | 3% |

(Growth Assumptions tab's own rental-growth "High" column reads 9/9/7/5/5/3.7…% — the sheet body uses 4%→3%. Transcribed both; body values govern the projections below.)

## LMI tab

| LVR band | LMI % |
|---|---|
| 0.81–0.83 | 0.75% |
| 0.83–0.85 | 1% |
| 0.85–0.88 | 1.5% |
| 0.88–0.90 | 2% |
| 0.90–1.00 | 3% |

## 10-year projection table (the compounding check)

| Year | Property Value | Loan | Equity | Gross Income | Cash Deductions | Net Cashflow | Net CF (cum.) | $/month | $/week |
|---|---|---|---|---|---|---|---|---|---|
| At purchase | $380,000 | $282,744 | $97,256 | — | — | — | — | — | — |
| 1 | $425,600 | $282,744 | $142,856 | $23,400 | $24,553 | −$1,153 | −$1,153 | −$96 | −$22 |
| 2 | $468,160 | $282,744 | $185,416 | $24,336 | $24,780 | −$444 | −$1,597 | −$37 | −$9 |
| 3 | $505,613 | $282,744 | $222,869 | $25,309 | $25,014 | $296 | −$1,301 | $25 | $6 |
| 4 | $530,893 | $282,744 | $248,149 | $26,322 | $25,255 | $1,067 | −$234 | $89 | $21 |
| 5 | $557,438 | $282,744 | $274,694 | $27,375 | $25,503 | $1,872 | $1,638 | $156 | $36 |
| 6 | $585,310 | $282,744 | $302,566 | $28,470 | $25,758 | $2,711 | $4,349 | $226 | $52 |
| 7 | $614,576 | $282,744 | $331,832 | $29,324 | $26,022 | $3,302 | $7,652 | $275 | $64 |
| 8 | $645,304 | $282,744 | $362,560 | $30,203 | $26,293 | $3,911 | $11,562 | $326 | $75 |
| 9 | $677,570 | $282,744 | $394,826 | $31,110 | $26,572 | $4,538 | $16,100 | $378 | $87 |
| 10 | $711,448 | $282,744 | $428,704 | $32,043 | $26,765 | $5,278 | $21,378 | $440 | $101 |

Supporting rows: Interest Expense flat $16,983/yr (yr10 shows $16,889 in one cell); Operating Expenses $7,569 → $9,876 (≈3%/yr); Gross Yield 7.4%→10.2%; Net Yield −0.4%→1.7%; Capital Growth cumulative $331,448; **Total Performance (Growth + Net Cashflow): Y1 $44,447 · Y5 $179,076 · Y10 $352,826**; Cash-on-Cash cumulative: −1.7% (Y1) → 31.9% (Y10); Return on Invested Capital: 66.4% (Y1) → 526.8% (Y10); "Initial capital returned in: 2 years".

## Due diligence block (competitive intel — not for number comparison)

Land size 1012 m², Supply Risk Low, Suburb Vacancy 1.0% (trend Down), Public Housing 0%, Renters 22%, Lifestyle 8/10, Convenience 8/10.

## Value-Add Planning block (renovation / subdivision / granny flat / other)

Per-year Costs, Equity Uplift, Rental Uplift rows — all $0 in this deal, but the *structure* exists (feature intel: they model value-add uplift per year).

## Notes for the PropPath comparison (Task 7)

1. **Buy under market is native here** ($315k price vs $380k valuation, equity from day one) — directly exercises Task-3 gap #9 (`valuationAtPurchase` overwrite bug). Our engine must hold $97,256 starting equity, not $37,800.
2. LMI capitalised into the loan ($277,200 + LMI → $282,744 carried) — check how our engine treats LMI (capitalised vs cash).
3. Per-year varying growth (12/10/8/5/5%) — our engine uses [check: flat rate?]. To reproduce their curve we need per-year growth override or accept divergence and compare against their "Average 6.5% flat" column instead.
4. Interest held flat on IO for all 10 years incl. years 6–10 (no IO→P&I reversion!) — note as a modelling difference; our engine reverts to P&I after the IO term.
5. Line items: strata, letting fee, maintenance allowance, mortgage fees & discharge, plumbing/electrical inspection, insurance at exchange — check representability.
6. Their engagement fee: $10,000 (vs our $8k default — Task-3 gap #1 in the wild).
7. Rich metrics we don't show: cash-on-cash return, ROIC, "initial capital returned in N years", gross/net yield per year, $/week income.
8. Anomalies to NOT blindly replicate: PM fee 6.6% of what appears to be only $23,400 → $1,544.40 (that's 6.6% exactly ✓); insurance $350/yr in cashflow but $1,401.64 paid at exchange; rental growth 4% in body vs 9% "High" tab; LGA says Muswellbrook for a Malvern East property.
