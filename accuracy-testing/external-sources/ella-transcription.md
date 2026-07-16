# Ella's Cashflow Calculator — transcription

**Source:** 1 screenshot (WhatsApp, 16 Jul 2026): `/Users/robknowles/Projects/Company Calculators/Ella/WhatsApp Image 2026-07-16 at 09.59.08.jpeg`
**What it is:** Excel sheet titled "Cashflow Calculator", one tab per property. Visible tabs: "…dmond Cres Durack" (cropped) and the active tab **"11 Emma Ct Driver"** — Driver and Durack are Darwin (NT) suburbs. This transcription is the "11 Emma Ct Driver" tab only.
**Readability:** excellent — every cell legible except where noted.

## Inputs (top-left block)

| Label | Value |
|---|---|
| Property Type | House |
| Purchase price | $650,000 |
| Deposit percentage | 20.0% |
| Deposit paid | $130,000 |
| Loan amount | $520,000 |
| Interest rate: Principle and Interest | 6.29% |
| Interest rate: Interest Only | 6.39% |
| Rent (per week) | $650 |
| Rent annual | $33,800 |

## Expenses / yields (mid-left block, monthly + ratios)

| Label | Value |
|---|---|
| Loan repayments – Interest only @ 0.0629 (monthly) | $2,725.67 |
| Loan repayments – Interest only @ 0.0639 (monthly) | $2,769.00 |
| Management fee @8.8% | $2,974 |
| Yield on Purchase Price | 5.20% |
| Yield on Total acquisition price | 4.90% |
| Yield on loan | 6.5% |

## Annual Total block

| Line | Annual $ |
|---|---|
| Loan repayments Interest only @ 0.0629 | $32,708 |
| Loan repayments Interest only @ 0.0639 | $33,228 |
| Council / water rates | $3,500 |
| Insurance | $1,000 |
| Management fee @8.8% | $1,859 |
| Advertising / letting | $750 |
| Land tax | $1,300 |
| **Total @ 0.0629** | **$41,117** |
| **Total @ 0.0639** | **$41,637** |

Note: the sheet shows management fee twice — $2,974 in the mid block and $1,859 in the Annual Total block. 8.8% × $33,800 = $2,974.40, so the $2,974 is the true 8.8%-of-rent figure; the $1,859 inside the annual total is unexplained on the visible sheet (possibly ex-GST, discounted, or an error in her sheet). Flag for the comparison — do not silently pick one.

## Initial Outlay block (right side)

| Line | $ |
|---|---|
| Purchase price | $650,000 |
| Deposit | $130,000 |
| Stamp Duty + Transfer | $35,838 |
| Conveyancer / Legals | $1,500 |
| Buyer's agent fee (already paid) | (blank) |
| Building & Pest | $1,850 |
| **Total Funds required** | **$169,188** |
| **Total acquisition cost** | **$689,188** |

(This is the "$169,000 in their settlement account" figure from the 2 Jul call — actual value $169,188.)

## Cashflow bottom block

| | Annual Total | Per Month | Per week |
|---|---|---|---|
| Interest Only — Cashflow @ 0.0629 | ($7,317) | [not shown] | [not shown] |
| Interest Only — Cashflow @ 0.0639 | ($7,837) | ($653.08) | ($163.27) |
| Interest & Principle — Cashflow | ($13,166) | −$1,097.17 | ($274.29) |

(Both I&P rows show annual ($13,166); the second I&P annual cell repeats the value.)

## PMT helper block (far right, partially visible)

pv $520,000 · r 0.12% · n 1560 [slightly blurry] · pmt $741.[cut off] — a weekly P&I repayment calc (0.12%/wk ≈ 6.29%/52, n 1560 = 30yr × 52).

## Cross-checks (arithmetic that validates the transcription)

- $520,000 × 6.29% = $32,708 ✓; × 6.39% = $33,228 ✓
- $650/wk × 52 = $33,800 ✓
- Outlay: 130,000 + 35,838 + 1,500 + 1,850 = $169,188 ✓
- Cashflow @0.0629: 33,800 − 41,117 = −$7,317 ✓; @0.0639: −$7,837 ✓
- Yield on PP: 33,800/650,000 = 5.20% ✓; on acquisition: 33,800/689,188 = 4.90% ✓; "yield on loan" 33,800/520,000 = 6.5% ✓

## Notes for the PropPath comparison (Task 4)

- NT property (Darwin) — stamp duty check must use NT, not VIC as the 2 Jul call implied for her typical clients.
- Line items we may not represent: advertising/letting ($750), the dual-rate (P&I vs IO side-by-side) view, $/week out-of-pocket framing.
- Land tax present ($1,300).
- No growth/multi-year projection anywhere on this sheet — Ella's sheet validates year-1 cashflow + upfront cash only, NOT compounding.
