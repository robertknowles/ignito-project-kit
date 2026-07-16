/**
 * Server-side feasibility check — replaces the in-prompt arithmetic.
 *
 * Runs AFTER the AI returns a plan, computing the same rough equity
 * projection the prompt used to ask the AI to do (badly). Returns a
 * qualitative descriptor string that gets appended to the AI's message.
 *
 * Also checks the CASHFLOW goal (July 2026 — accuracy-suite cluster 1):
 * a stated passive-income goal was previously never feasibility-checked,
 * so a plan projecting $31k/yr against a $250k/yr goal read as clean
 * success. The cashflow descriptor always carries the numbers — goal,
 * projected, gap, year — so the reply cannot claim success on a missed
 * goal. On modify turns the engine's own projection (sent with the
 * request as enginePlanState) is used verbatim; on create turns, where
 * no engine run exists yet, a deliberately OPTIMISTIC rough estimate is
 * used and only speaks up when even the best case falls short.
 */

interface FeasibilityProperty {
  purchasePrice: number;
  lvr: number;
  growthAssumption: 'High' | 'Medium' | 'Low';
  lmiCapitalized?: boolean;
  rentPerWeek?: number;
}

/** Engine projection at horizon — mirror of CurrentPlanState.enginePlanState. */
interface EngineProjection {
  horizonYear?: number;
  projectedPortfolioValue?: number;
  projectedEquity?: number;
  projectedAnnualCashflow?: number;
  equityGoalReachedYear?: number | null;
}

interface FeasibilityInput {
  properties: FeasibilityProperty[];
  equityGoal: number;
  timelineYears: number;
  /** Stated annual passive-income goal (AUD/yr); 0/undefined = no goal. */
  cashflowGoal?: number;
  /** Present on plan-affecting turns where the engine has already run. */
  engineProjection?: EngineProjection | null;
}

interface CashflowFeasibilityResult {
  descriptor: string;
  ratio: number;
  goal: number;
  projected: number;
  gap: number;
  year: number;
  source: 'engine' | 'estimate';
}

interface FeasibilityResult {
  descriptor: string;
  ratio: number;
  projectedEquity: number;
  isGoalProvided: boolean;
  cashflow?: CashflowFeasibilityResult;
}

const COMPOUNDING_MULTIPLIERS: Record<number, number> = {
  1: 2.00,
  2: 1.90,
  3: 1.79,
  4: 1.75,
  5: 1.71,
};
const DEFAULT_MULTIPLIER = 1.67;

const HIGH_GROWTH_BOOST = 1.25;

// Cashflow estimate dials (create-plan turns only, where no engine run
// exists yet). Deliberately optimistic — no vacancy/opex haircut — so a
// shortfall verdict means even the best case misses the goal.
const RENT_GROWTH_RATE = 0.03;
const INTEREST_RATE = 0.06;
const FALLBACK_GROSS_YIELD = 0.045;

export function computeFeasibility(input: FeasibilityInput): FeasibilityResult | null {
  const { properties, equityGoal, timelineYears, cashflowGoal, engineProjection } = input;

  const hasEquityGoal = !!equityGoal && equityGoal > 0;
  const hasCashflowGoal = !!cashflowGoal && cashflowGoal > 0;

  if (!properties || properties.length === 0 || (!hasEquityGoal && !hasCashflowGoal)) {
    return null;
  }

  // ── Equity goal ─────────────────────────────────────────────────
  let descriptor = '';
  let ratio = Infinity;
  let projectedEquity = 0;

  if (hasEquityGoal) {
    if (engineProjection?.projectedEquity !== undefined) {
      // Engine numbers are authoritative — use them instead of the rough model.
      projectedEquity = engineProjection.projectedEquity;
      ratio = projectedEquity / equityGoal;
      if (
        engineProjection.equityGoalReachedYear !== null &&
        engineProjection.equityGoalReachedYear !== undefined
      ) {
        ratio = Math.max(ratio, 1.0);
      }
    } else {
      const n = properties.length;
      const avgPrice = properties.reduce((s, p) => s + p.purchasePrice, 0) / n;
      const avgLvr = properties.reduce((s, p) => s + (p.lvr ?? 0.8), 0) / n;
      const debtFactor = avgLvr > 0.85 ? 0.91 : avgLvr;

      const baseMultiplier = COMPOUNDING_MULTIPLIERS[n] ?? DEFAULT_MULTIPLIER;

      const highGrowthCount = properties.filter(
        (p) => p.growthAssumption === 'High',
      ).length;
      const highGrowthRatio = highGrowthCount / n;
      const growthAdjustment = 1 + (HIGH_GROWTH_BOOST - 1) * highGrowthRatio;

      const multiplier = baseMultiplier * growthAdjustment;

      const portfolioValue = avgPrice * n * multiplier;
      const totalDebt = avgPrice * n * debtFactor;
      projectedEquity = portfolioValue - totalDebt;

      const safeEquity = projectedEquity * 0.95;
      ratio = safeEquity / equityGoal;
    }

    const goalFormatted = formatCurrency(equityGoal);

    if (ratio >= 1.1) {
      descriptor = `the model projects a comfortable path to the ${goalFormatted} target`;
    } else if (ratio >= 0.9) {
      descriptor = `the model shows the plan clearing the ${goalFormatted} target`;
    } else if (ratio >= 0.8) {
      descriptor = `reaching ${goalFormatted} is tight on this profile — the model lands close but not clear`;
    } else if (ratio >= 0.65) {
      descriptor = `${goalFormatted} is a stretch on this profile — the model projects landing short`;
    } else {
      descriptor = `${goalFormatted} isn't realistic on this profile based on the inputs`;
    }
  }

  // ── Cashflow goal ───────────────────────────────────────────────
  const cashflow = hasCashflowGoal
    ? computeCashflowFeasibility(properties, cashflowGoal!, timelineYears, engineProjection)
    : undefined;

  return { descriptor, ratio, projectedEquity, isGoalProvided: hasEquityGoal, cashflow };
}

function computeCashflowFeasibility(
  properties: FeasibilityProperty[],
  cashflowGoal: number,
  timelineYears: number,
  engineProjection?: EngineProjection | null,
): CashflowFeasibilityResult | undefined {
  const currentYear = new Date().getFullYear();
  const year = engineProjection?.horizonYear ?? currentYear + (timelineYears || 20);

  let projected: number;
  let source: 'engine' | 'estimate';

  if (engineProjection?.projectedAnnualCashflow !== undefined) {
    projected = engineProjection.projectedAnnualCashflow;
    source = 'engine';
  } else {
    // Optimistic upper bound: gross rent grown to the goal year, minus IO
    // interest on the full loan. No vacancy/opex haircut on purpose — if
    // even this misses the goal, the shortfall is real.
    const growthFactor = Math.pow(1 + RENT_GROWTH_RATE, timelineYears || 20);
    projected = properties.reduce((sum, p) => {
      const annualRent = p.rentPerWeek
        ? p.rentPerWeek * 52
        : p.purchasePrice * FALLBACK_GROSS_YIELD;
      const rawLvr = p.lvr ?? 0.8;
      const lvrFraction = rawLvr > 1.5 ? rawLvr / 100 : rawLvr;
      const interest = p.purchasePrice * lvrFraction * INTEREST_RATE;
      return sum + (annualRent * growthFactor - interest);
    }, 0);
    projected = Math.round(projected);
    source = 'estimate';
  }

  const ratio = projected / cashflowGoal;
  const gap = Math.max(0, cashflowGoal - projected);

  // The estimate is a rough upper bound — never let it CLAIM success.
  // When it clears the goal, stay silent and let the engine's dashboard
  // numbers speak. Engine-sourced projections report in both directions.
  if (source === 'estimate' && ratio >= 0.9) {
    return undefined;
  }

  const goalFmt = formatCurrency(cashflowGoal);
  const projFmt = formatCurrency(projected);
  const gapFmt = formatCurrency(gap);

  let descriptor: string;
  if (source === 'engine') {
    if (ratio >= 1.1) {
      descriptor = `the engine projects ${projFmt}/yr net cashflow by ${year} — clear of the ${goalFmt}/yr income goal`;
    } else if (ratio >= 0.9) {
      descriptor = `the engine projects ${projFmt}/yr net cashflow by ${year}, on track for the ${goalFmt}/yr income goal`;
    } else if (ratio >= 0.8) {
      descriptor = `the ${goalFmt}/yr income goal is tight — the engine projects ${projFmt}/yr by ${year}, ${gapFmt}/yr short`;
    } else if (ratio >= 0.65) {
      descriptor = `the ${goalFmt}/yr income goal comes up short — the engine projects ${projFmt}/yr by ${year}, ${gapFmt}/yr short`;
    } else {
      descriptor = `the ${goalFmt}/yr income goal isn't reached on this plan — the engine projects ${projFmt}/yr by ${year}, leaving a ${gapFmt}/yr gap`;
    }
  } else {
    if (ratio >= 0.8) {
      descriptor = `the ${goalFmt}/yr income goal looks tight — the model estimates around ${projFmt}/yr by ${year}, about ${gapFmt}/yr short`;
    } else if (ratio >= 0.65) {
      descriptor = `the ${goalFmt}/yr income goal comes up short — the model estimates around ${projFmt}/yr by ${year}, about ${gapFmt}/yr short`;
    } else {
      descriptor = `the ${goalFmt}/yr income goal isn't realistic on this plan — the model estimates around ${projFmt}/yr by ${year}, about ${gapFmt}/yr short`;
    }
  }

  return { descriptor, ratio, goal: cashflowGoal, projected, gap, year, source };
}

function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `${sign}$${Math.round(abs / 1000)}k`;
}

export function injectFeasibilityDescriptor(
  message: string,
  result: FeasibilityResult,
): string {
  const dashboardLine = "See the dashboard for the engine's exact projection.";

  // Strip existing dashboardLine from the AI's message to prevent duplication.
  // The AI is instructed to include it, but we re-append it in every branch
  // below — without stripping, the ratio < 0.9 path produced a double.
  const stripped = message.replace(dashboardLine, '').replace(/\n+$/, '').trimEnd();

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Shortfalls lead the message so they cannot be buried; on-track
  // descriptors trail it, ahead of the dashboard pointer.
  const prefixes: string[] = [];
  const appends: string[] = [];

  if (result.isGoalProvided) {
    if (result.ratio < 0.9) {
      prefixes.push(`${capitalize(result.descriptor)}.`);
    } else {
      appends.push(`Based on the inputs, ${result.descriptor}.`);
    }
  }

  if (result.cashflow) {
    if (result.cashflow.ratio < 0.9) {
      prefixes.push(`${capitalize(result.cashflow.descriptor)}.`);
    } else {
      appends.push(`${capitalize(result.cashflow.descriptor)}.`);
    }
  }

  const body = prefixes.length > 0 ? `${prefixes.join(' ')} ${stripped}` : stripped;
  const tail = appends.length > 0 ? `${appends.join(' ')} ${dashboardLine}` : dashboardLine;

  return `${body}\n\n${tail}`;
}
