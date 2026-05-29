/**
 * Server-side feasibility check — replaces the in-prompt arithmetic.
 *
 * Runs AFTER the AI returns a plan, computing the same rough equity
 * projection the prompt used to ask the AI to do (badly). Returns a
 * qualitative descriptor string that gets appended to the AI's message.
 */

interface FeasibilityProperty {
  purchasePrice: number;
  lvr: number;
  growthAssumption: 'High' | 'Medium' | 'Low';
  lmiCapitalized?: boolean;
}

interface FeasibilityInput {
  properties: FeasibilityProperty[];
  equityGoal: number;
  timelineYears: number;
}

interface FeasibilityResult {
  descriptor: string;
  ratio: number;
  projectedEquity: number;
  isGoalProvided: boolean;
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

export function computeFeasibility(input: FeasibilityInput): FeasibilityResult | null {
  const { properties, equityGoal, timelineYears } = input;

  if (!properties || properties.length === 0 || !equityGoal || equityGoal <= 0) {
    return null;
  }

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
  const projectedEquity = portfolioValue - totalDebt;

  const safeEquity = projectedEquity * 0.95;
  const ratio = safeEquity / equityGoal;

  const goalFormatted = formatCurrency(equityGoal);

  let descriptor: string;
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

  return { descriptor, ratio, projectedEquity, isGoalProvided: true };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `$${Math.round(value / 1000)}k`;
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

  if (result.ratio < 0.9) {
    return `${result.descriptor.charAt(0).toUpperCase() + result.descriptor.slice(1)}. ${stripped}\n\n${dashboardLine}`;
  }

  return `${stripped}\n\nBased on the inputs, ${result.descriptor}. ${dashboardLine}`;
}
