/**
 * Retirement sell-down — explainer copy (single source of truth).
 *
 * Two altitudes (spec §8):
 *   • PAGE   — light info popovers on the headline strip + slider.
 *   • DETAIL — light info popovers inside the sale breakdown panel.
 *
 * Keep all policy / model wording here so it can be updated in ONE place when
 * the 2027 CGT rules are legislated, rather than hardcoded across components.
 *
 * Compliance: copy describes the model and the policy only — it must never
 * advise what the client should do, nor prefer one CGT method over another.
 */

export interface Explainer {
  title: string
  /** Paragraphs of prose. */
  body: string[]
}

export const PAGE_EXPLAINERS = {
  annualCashflow: {
    title: "What's counted",
    body: [
      'Rent coming in, less interest, rates, insurance, management and maintenance on the properties still held.',
      "Positive means the portfolio pays for itself. Negative means the client tops it up to keep holding.",
    ],
  },
  cashInHand: {
    title: 'Fills as you sell',
    body: [
      "$0 until a property is sold. Each sale adds its cash here, shown net of selling costs and CGT, so it's what the client actually walks away with.",
    ],
  },
  equityRetained: {
    title: 'Total, not usable',
    body: [
      'Value less loan across the properties still held. Usable equity (what a lender will actually release) is lower, typically up to 80% of value less the loan.',
    ],
  },
  sellYear: {
    title: 'Sets the sell year',
    body: [
      'The year the client retires and any sell-down happens. It also decides which CGT rules apply: sales after 1 Jul 2027 fall under the proposed indexation method.',
    ],
  },
} satisfies Record<string, Explainer>

export const DETAIL_EXPLAINERS = {
  sellingCosts: {
    title: 'What it costs to sell',
    body: [
      'Agent commission (around 2.2%), marketing, and conveyancing or legal fees. Taken off the sale price before any tax is worked out.',
    ],
  },
  marginalRate: {
    title: 'Whose rate?',
    body: [
      "The client's top marginal rate in the year of sale, including the Medicare levy. A property sale adds the gain to taxable income that year, which can push them into a higher bracket.",
    ],
  },
} satisfies Record<string, Explainer>

/** Always shown beneath the breakdown panel (spec §2). */
export const COMPLIANCE_FOOTER =
  'Estimate only, not tax advice. Confirm with the client\u2019s accountant. Indexation reflects proposed 2027 rules, not yet law.'
