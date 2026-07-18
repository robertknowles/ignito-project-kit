/**
 * Auto-fix chat disclosure
 *
 * The create_plan chat message is templated server-side (nl-parse/templates.ts)
 * BEFORE the app-side planPreCheck/autoFixPlan runs. When auto-fix changes the
 * plan (pushes purchases to later years, reduces prices, flips entities to
 * trust, or drops properties entirely), the templated message becomes a lie:
 * "Built a 4-property plan priced from $380k to $750k" while the actual plan
 * behind the confirmation brief has different prices - or nothing at all.
 *
 * This module rewrites the chat message AFTER auto-fix so that:
 *   1. The headline claim (property count + price range) reflects the
 *      POST-auto-fix plan.
 *   2. Every auto-fix change is disclosed as one plain-language line the BA
 *      can read in chat - not only buried in the confirmation brief's
 *      _autoFixChanges block.
 *
 * Used by ChatPanel.handlePlanGenerated (live app) and by the accuracy suite's
 * headless replay (accuracy-testing/run-scenario-suite-ai.ts) so the two paths
 * can't drift.
 */

import type { NLParseResponse } from '@/types/nlParse';

/** Structural match for planPreCheck's AutoFixChange / nlParse's _autoFixChanges. */
export interface AutoFixChangeLike {
  /** 1-based index into the ORIGINAL (pre-fix) property list, as shown to the BA. */
  propertyIndex: number;
  propertyLabel: string;
  changeType: 'entity_to_trust' | 'price_reduced' | 'period_pushed' | 'dropped';
  reason: string;
  detail: string;
}

// Same dollar formatting as nl-parse/templates.ts so rewritten fragments read
// identically to server-templated ones ($450k, $1.3M).
function formatDollars(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${n.toLocaleString()}`;
}

/**
 * One plain-English line per auto-fix change. BA-facing: says what moved and
 * why in funding terms, no engine jargon.
 */
export function buildAutoFixDisclosureLines(changes: AutoFixChangeLike[]): string[] {
  return changes.map((c) => {
    const n = c.propertyIndex;
    switch (c.changeType) {
      case 'period_pushed': {
        const years = c.detail.match(/from (\d{4}) to (\d{4})/);
        const why =
          c.reason === 'deposit accumulation'
            ? "the deposit isn't available until then"
            : "the client's borrowing capacity doesn't cover it until then";
        return years
          ? `Note: property ${n} was **moved from ${years[1]} to ${years[2]}** — ${why}.`
          : `Note: property ${n} was **moved to a later year** — ${why}.`;
      }
      case 'price_reduced': {
        const amounts = c.detail.match(/from \$(\d+)k to \$(\d+)k/);
        const rent = c.detail.match(/rent adjusted from \$(\d+)\/wk to \$(\d+)\/wk/);
        const rentNote = rent ? `; rent adjusted to **$${Number(rent[2]).toLocaleString()}/wk** to keep the stated yield` : '';
        return amounts
          ? `Note: property ${n}'s price was **reduced from ${formatDollars(Number(amounts[1]) * 1000)} to ${formatDollars(Number(amounts[2]) * 1000)}** — the available deposit doesn't cover the original price${rentNote}.`
          : `Note: property ${n}'s price was **reduced** — the available deposit doesn't cover the original price${rentNote}.`;
      }
      case 'entity_to_trust':
        return `Note: property ${n} was **placed in a trust** — buying it as an individual exceeded the client's ${c.reason}.`;
      case 'dropped':
        return `Note: property ${n} was **removed** — it doesn't fit within the client's borrowing capacity, even when pushed to later years.`;
      default:
        return `Note: property ${n}: ${c.detail}.`;
    }
  });
}

/**
 * Rewrite the templated create_plan chat message so it describes the
 * POST-auto-fix plan, then append one disclosure line per auto-fix change.
 *
 * Preserves the rest of the templated message (feasibility descriptor,
 * strategy wording) - only the count/price-range claims are corrected.
 * When auto-fix emptied the plan entirely, the whole message is replaced:
 * there is no plan to describe.
 */
export function rewritePlanMessageAfterAutoFix(
  originalMessage: string,
  finalResponse: NLParseResponse,
  changes: AutoFixChangeLike[],
): string {
  const props = finalResponse.properties ?? [];
  const notes = buildAutoFixDisclosureLines(changes);

  if (props.length === 0) {
    const empty =
      "I drafted a plan, but the affordability check **removed every property** — none of the purchases fit within the client's deposit and borrowing capacity, even when pushed to later years, so the plan is currently empty. Increase the **deposit, savings or borrowing capacity** (or lower the price point) and I'll rebuild it.";
    return [empty, ...notes].join('\n');
  }

  const count = props.length;
  const prices = props.map((p) => p.purchasePrice).sort((a, b) => a - b);
  const priceRange =
    prices.length === 1
      ? `at ${formatDollars(prices[0])}`
      : `from ${formatDollars(prices[0])} to ${formatDollars(prices[prices.length - 1])}`;

  // Match the templated fragments: "Built a **4-property plan** for X, priced
  // **from $380k to $750k**." (templates.ts) or the $Nk-only form autoFixPlan's
  // own drop-patch produces. Anchoring on "priced" avoids touching dollar
  // figures elsewhere in the message (e.g. the feasibility descriptor).
  // The optional \*\* groups tolerate both bolded and legacy plain messages.
  const countRe = /\b\d+-property plan/;
  const priceRe = /priced (?:\*\*)?(?:at|from) \$[\d.,]+[kM](?:\s+to\s+\$[\d.,]+[kM])?(?:\*\*)?/;

  let msg = originalMessage;
  if (countRe.test(msg) && priceRe.test(msg)) {
    msg = msg.replace(countRe, `${count}-property plan`).replace(priceRe, `priced **${priceRange}**`);
  } else {
    // Message shape changed upstream - append the correction instead of
    // silently leaving the stale claim as the only description.
    msg += `\n\nAfter the affordability check, the final plan has **${count} ${count === 1 ? 'property' : 'properties'}** priced **${priceRange}**.`;
  }

  return [msg, ...notes].join('\n');
}
