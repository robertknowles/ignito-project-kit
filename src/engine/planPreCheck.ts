/**
 * Plan Pre-Check — runs the affordability engine against an AI-proposed plan
 * BEFORE showing the confirmation brief.
 *
 * Uses the same checkAffordability + calculateAvailableFunds as the dashboard.
 * If properties fail, returns structured feedback for the AI to adjust.
 */

import type { NLParseResponse } from '../types/nlParse';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import { calcLoanAmount } from '../utils/sharedFinancialCalcs';
import type { ExistingProperty } from '../types/existingProperty';
import { mapToInvestmentProfile, mapToPropertySelections, mapToExistingProperties } from '../utils/nlDataMapper';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { calculateLMI } from '../utils/lmiCalculator';
import { calculateOneOffCosts, calculateDepositBalance } from '../utils/oneOffCostsCalculator';
import {
  checkAffordability,
  calculateAvailableFunds,
  type PurchaseRecord,
  type EngineDeps,
} from './affordabilityEngine';
import {
  PERIODS_PER_YEAR,
  EQUITY_EXTRACTION_LVR_CAP,
  annualRateToPeriodRate,
} from '../constants/financialParams';
import { getGrowthRateAdjustment } from '../utils/eventProcessing';

export interface PreCheckFailure {
  propertyIndex: number;
  propertyLabel: string;
  depositTestPass: boolean;
  serviceabilityTestPass: boolean;
  borrowingCapacityTestPass: boolean;
  depositTestSurplus: number;
  serviceabilityTestSurplus: number;
  borrowingCapacityRemaining: number;
}

export interface PreCheckResult {
  allFeasible: boolean;
  failures: PreCheckFailure[];
  feedbackMessage: string;
}

export interface AutoFixResult {
  fixed: boolean;
  fixedResponse: NLParseResponse;
  changes: AutoFixChange[];
  /** Plain-language summary for the AI to explain to the user */
  explanationPrompt: string;
}

export interface AutoFixChange {
  propertyIndex: number;
  propertyLabel: string;
  changeType: 'entity_to_trust' | 'price_reduced' | 'period_pushed' | 'dropped';
  reason: string;
  detail: string;
}

const INITIAL_PROFILE_DEFAULTS: Partial<InvestmentProfileData> = {
  depositPool: 0,
  borrowingCapacity: 500000,
  portfolioValue: 0,
  currentDebt: 0,
  annualSavings: 0,
  timelineYears: 20,
  baseSalary: 60000,
  salaryServiceabilityMultiplier: 6.0,
  equityFactor: 0.80,
  equityReleaseFactor: 0.70,
  useExistingEquity: true,
  maxPurchasesPerYear: 3,
  existingPortfolioGrowthRate: 0.05,
  interestRate: 0.0625,
  vacancyRate: 0.04,
  wageGrowthRate: 0.025,
  inflationRate: 0.03,
  rentEscalationRate: 0.05,
  serviceabilityRatio: 1.0,
  depositBuffer: 0,
  rentFactor: 0.8,
  equityGoal: 0,
  cashflowGoal: 0,
  targetPassiveIncome: 80000,
  ioToPiTransitionYears: 5,
  strategyPreset: 'eg-low',
  pacingMode: 'aggressive',
  existingAnnualRent: 0,
  sellingCostsPercent: 0.03,
  lvrStrategy: 'client_comfort',
  lvrStrategyCustomPercent: 80,
  marginalTaxRate: 0.325,
  companyTaxRate: 0.25,
  trustTaxRate: 0.325,
  smsfTaxRate: 0.15,
  marginalTaxRateAtConsolidation: 0.325,
  cgtOneYearDiscount: 0.5,
  growthCurve: { growthYear1: '8', growthYears2to3: '6', growthYear4: '5', growthYear5plus: '4' },
};

export function runPlanPreCheck(response: NLParseResponse, baseProfile?: InvestmentProfileData, fallbackExistingProps?: ExistingProperty[], options?: { silent?: boolean }): PreCheckResult {
  if (!response.properties || response.properties.length === 0) {
    return { allFeasible: true, failures: [], feedbackMessage: '' };
  }

  // Build profile: start from the actual dashboard profile (same source of truth),
  // then overlay the AI response's updates — exactly what confirmPlan does.
  const profileUpdates = mapToInvestmentProfile(response);
  const profile: InvestmentProfileData = {
    ...(baseProfile ?? INITIAL_PROFILE_DEFAULTS),
    ...profileUpdates,
  } as InvestmentProfileData;

  // When the AI response omits the existing portfolio, fall back to what the
  // dashboard already holds — confirmPlan keeps the context's existing
  // properties when the response has none, so the dashboard tests with their
  // equity. Without the same fallback here, the pre-check sees less available
  // funding than the dashboard and rejects placements the dashboard accepts.
  const existingProps = mapToExistingProperties(response) ?? fallbackExistingProps ?? [];
  if (existingProps.length > 0) {
    const totalDebt = existingProps.reduce((s, p) => s + (p.loan || 0), 0);
    const totalValue = existingProps.reduce((s, p) => s + (p.currentValue || 0), 0);
    const existingAnnualRent = existingProps.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0);
    profile.currentDebt = totalDebt;
    profile.portfolioValue = totalValue;
    profile.existingAnnualRent = existingAnnualRent;
  }

  // Apply the same LVR strategy override confirmPlan uses, so the pre-check
  // tests the LVR the dashboard will actually run with.
  const lvrOverride = profile.lvrStrategy === 'prudent_80' ? 80
    : profile.lvrStrategy === 'custom' ? (profile.lvrStrategyCustomPercent ?? 80)
    : undefined;
  const { propertyOrder, instances } = mapToPropertySelections(response, lvrOverride);

  if (!options?.silent) console.info('[PreCheck] Profile:', { BC: profile.borrowingCapacity, salary: profile.baseSalary, deposit: profile.depositPool, savings: profile.annualSavings, currentDebt: profile.currentDebt, portfolioValue: profile.portfolioValue, interestRate: profile.interestRate, wageGrowth: profile.wageGrowthRate, equityFactor: profile.equityFactor, equityRelease: profile.equityReleaseFactor, salaryMult: profile.salaryServiceabilityMultiplier });

  // Build engine deps from the mapped instances (no React context needed)
  const deps: EngineDeps = {
    getInstance: (instanceId: string) => instances[instanceId] ?? null,
    getPropertyData: (title: string, growthAssumption?: string) => {
      const defaults = getPropertyInstanceDefaults(title);
      const assumption = growthAssumption ?? defaults.growthAssumption ?? 'Medium';
      const curves: Record<string, any> = {
        High: { growthYear1: '12.5', growthYears2to3: '10', growthYear4: '7.5', growthYear5plus: '6', yield: '3.5' },
        Medium: { growthYear1: '8', growthYears2to3: '6', growthYear4: '5', growthYear5plus: '4', yield: '4.5' },
        Low: { growthYear1: '5', growthYears2to3: '4', growthYear4: '3.5', growthYear5plus: '3', yield: '5.5' },
      };
      return curves[assumption] ?? curves['Medium'];
    },
    calculatePropertyGrowth: (cost: number, periodsOwned: number, propertyData: any) => {
      let currentValue = cost;
      const year1Rate = annualRateToPeriodRate(parseFloat(propertyData.growthYear1) / 100);
      const years2to3Rate = annualRateToPeriodRate(parseFloat(propertyData.growthYears2to3) / 100);
      const year4Rate = annualRateToPeriodRate(parseFloat(propertyData.growthYear4) / 100);
      const year5plusRate = annualRateToPeriodRate(parseFloat(propertyData.growthYear5plus) / 100);
      for (let p = 1; p <= periodsOwned; p++) {
        let rate;
        if (p <= 2) rate = year1Rate;
        else if (p <= 6) rate = years2to3Rate;
        else if (p <= 8) rate = year4Rate;
        else rate = year5plusRate;
        currentValue *= (1 + Math.max(-0.1, rate));
      }
      return currentValue;
    },
  };

  const failures: PreCheckFailure[] = [];
  const purchaseHistory: PurchaseRecord[] = [];

  // Check each property sequentially (same as the dashboard timeline loop)
  propertyOrder.forEach((instanceId, index) => {
    const instance = instances[instanceId];
    if (!instance) return;

    const purchasePrice = instance.purchasePrice;
    const lvr = instance.lvr ?? 80;
    const baseLoanAmount = calcLoanAmount(purchasePrice, lvr);
    const depositRequired = purchasePrice - baseLoanAmount;

    // Calculate LMI
    const lmi = calculateLMI(baseLoanAmount, lvr, instance.lmiWaiver ?? false, instance.valuationAtPurchase, purchasePrice);
    const isLmiCapitalized = instance.lmiCapitalized ?? false;
    const loanAmount = isLmiCapitalized ? baseLoanAmount + lmi : baseLoanAmount;

    // Calculate acquisition costs
    const stampDuty = instance.stampDutyOverride ?? calculateStampDuty(instance.state, purchasePrice, false);
    const depositBalance = calculateDepositBalance(purchasePrice, lvr, instance.conditionalHoldingDeposit);
    const oneOffCosts = calculateOneOffCosts(instance, stampDuty, depositBalance);
    const lmiCashRequired = isLmiCapitalized ? 0 : lmi;
    const totalCashRequired = oneOffCosts.totalCashRequired + lmiCashRequired;

    // Use the AI's chosen period if available, otherwise default to sequential (1, 3, 5, 7...)
    const period = instance.manualPlacementPeriod ?? (index * 2 + 1);
    const title = instanceId.replace(/_instance_\d+$/, '');

    // Run the three tests via the engine
    const availableFunds = calculateAvailableFunds(period, purchaseHistory, profile, existingProps, deps);
    const result = checkAffordability(
      { cost: purchasePrice, depositRequired, loanAmount, instanceId, title, loanType: instance.loanProduct },
      availableFunds, purchaseHistory, period, totalCashRequired,
      profile, existingProps, [], deps,
    );

    if (!options?.silent) console.info(`[PreCheck] Property ${index + 1} ($${Math.round(purchasePrice / 1000)}k) at period ${period}: deposit=${result.depositTestPass ? 'PASS' : 'FAIL'}(${Math.round(result.depositTestSurplus / 1000)}k), svc=${result.serviceabilityTestPass ? 'PASS' : 'FAIL'}(${Math.round(result.serviceabilityTestSurplus / 1000)}k), BC=${result.borrowingCapacityTestPass ? 'PASS' : 'FAIL'}(${Math.round(result.borrowingCapacityRemaining / 1000)}k), entity=${instance.entity ?? 'individual'}, funds=$${Math.round(availableFunds.total / 1000)}k, cashReq=$${Math.round(totalCashRequired / 1000)}k`)

    if (!result.canAfford) {
      failures.push({
        propertyIndex: index + 1,
        propertyLabel: `Property ${index + 1} ($${Math.round(purchasePrice / 1000)}k)`,
        ...result,
      });
    }

    // Add to purchase history regardless (to test subsequent properties accurately)
    purchaseHistory.push({
      period,
      cost: purchasePrice,
      depositRequired,
      totalCashRequired,
      loanAmount,
      title,
      instanceId,
      loanType: instance.loanProduct ?? 'IO',
      cumulativeEquityReleased: 0,
    });

    // Update cumulativeEquityReleased on ALL previous purchases (mirrors dashboard logic)
    purchaseHistory.forEach(purchase => {
      if (purchase.period <= period) {
        const periodsOwned = period - purchase.period;
        if (periodsOwned > 0) {
          const pInst = deps.getInstance(purchase.instanceId);
          const propertyData = deps.getPropertyData(purchase.title, pInst?.growthAssumption);
          if (propertyData) {
            const currentValue = deps.calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
            const maxLoan = currentValue * EQUITY_EXTRACTION_LVR_CAP;
            purchase.cumulativeEquityReleased = Math.max(0, maxLoan - purchase.loanAmount);
          }
        }
      }
    });
  });

  if (failures.length === 0) {
    return { allFeasible: true, failures: [], feedbackMessage: '' };
  }

  // Build feedback message for the AI
  const failureLines = failures.map(f => {
    const tests: string[] = [];
    if (!f.depositTestPass) tests.push(`deposit shortfall $${Math.abs(Math.round(f.depositTestSurplus / 1000))}k`);
    if (!f.serviceabilityTestPass) tests.push(`serviceability exceeded by $${Math.abs(Math.round(f.serviceabilityTestSurplus / 1000))}k/yr`);
    if (!f.borrowingCapacityTestPass) tests.push(`BC ceiling exceeded by $${Math.abs(Math.round(f.borrowingCapacityRemaining / 1000))}k`);
    return `- ${f.propertyLabel}: ${tests.join(', ')}`;
  }).join('\n');

  const feedbackMessage = `[SYSTEM] The engine ran a pre-check on your proposed plan. ${failures.length} of ${propertyOrder.length} properties failed affordability tests:\n\n${failureLines}\n\nAdjust the plan and CALL create_plan AGAIN with the corrected properties. Do NOT respond with a text message — you MUST use the create_plan tool to resubmit. Options:\n1. Set entity to "trust" on properties that failed (reduces serviceability impact by 75%)\n2. Reduce property prices to fit within capacity\n3. Reduce the number of properties`;

  return { allFeasible: false, failures, feedbackMessage };
}

// ── Plan timing insights ─────────────────────────────────────────────

export interface PropertyTimingInsight {
  /** 0-based index into response.properties */
  propertyIndex: number;
  /** Period the property is currently tested at (targetPeriod or default) */
  testedPeriod: number;
  /** Whether all three tests pass at the tested period */
  feasibleAtTested: boolean;
  /** Earliest period where all tests pass (holding other properties fixed). Null = none found within the scan horizon. */
  earliestFeasiblePeriod: number | null;
  /**
   * Human-readable reasons for the binding constraint. When the property
   * fails at its tested period, these describe that failure. When it passes,
   * these describe why the year before earliestFeasiblePeriod fails — i.e.
   * what is stopping it from being earlier.
   */
  blockers: string[];
  /** Structured version of blockers — which tests bind this property's timing */
  bindingTests: BindingTest[];
}

export type BindingTest = 'deposit' | 'serviceability' | 'borrowingCapacity';

function failedTestKinds(f: PreCheckFailure): BindingTest[] {
  const out: BindingTest[] = [];
  if (!f.depositTestPass) out.push('deposit');
  if (!f.serviceabilityTestPass) out.push('serviceability');
  if (!f.borrowingCapacityTestPass) out.push('borrowingCapacity');
  return out;
}

function describeFailure(f: PreCheckFailure): string[] {
  const out: string[] = [];
  if (!f.depositTestPass) out.push(`deposit short $${Math.abs(Math.round(f.depositTestSurplus / 1000))}k`);
  if (!f.serviceabilityTestPass) out.push(`serviceability over by $${Math.abs(Math.round(f.serviceabilityTestSurplus / 1000))}k/yr`);
  if (!f.borrowingCapacityTestPass) out.push(`borrowing capacity over by $${Math.abs(Math.round(f.borrowingCapacityRemaining / 1000))}k`);
  return out;
}

/**
 * For each proposed property, find the earliest feasible purchase period and
 * the binding constraint. Powers the brief's "could buy earlier" hints and
 * bottleneck explanations. Runs the same pre-check the alerts use, so the
 * insights can never disagree with the alerts or the dashboard.
 */
export function analyzePlanTimings(
  response: NLParseResponse,
  baseProfile?: InvestmentProfileData,
  fallbackExistingProps?: ExistingProperty[],
): PropertyTimingInsight[] {
  if (!response.properties || response.properties.length === 0) return [];

  // How far past the tested period to keep scanning for a feasible slot
  const SCAN_AHEAD_PERIODS = 20; // 10 years

  // Which properties already fail in the plan as-is. A candidate move is only
  // "feasible" if it doesn't break any property that currently passes —
  // otherwise "could buy earlier" would just shuffle the failure elsewhere.
  const baseResult = runPlanPreCheck(response, baseProfile, fallbackExistingProps, { silent: true });
  const originallyFailing = new Set(baseResult.failures.map(f => f.propertyIndex));

  return response.properties.map((prop, i) => {
    const testedPeriod = prop.targetPeriod ?? (i * 2 + 1);

    // Re-run the pre-check with only this property's period changed. Returns
    // this property's own failure plus any NEW failure the move would cause
    // on a property that currently passes.
    const checkAt = (period: number): { own?: PreCheckFailure; breaks?: PreCheckFailure } => {
      const candidate: NLParseResponse = {
        ...response,
        properties: response.properties!.map((p, idx) => (idx === i ? { ...p, targetPeriod: period } : p)),
      };
      const result = runPlanPreCheck(candidate, baseProfile, fallbackExistingProps, { silent: true });
      return {
        own: result.failures.find(f => f.propertyIndex === i + 1),
        breaks: result.failures.find(f => f.propertyIndex !== i + 1 && !originallyFailing.has(f.propertyIndex)),
      };
    };

    // Scan year steps (odd periods, matching the brief's year stepper) from
    // period 1 outwards to find the earliest period where this property
    // passes all tests AND nothing else newly breaks.
    let earliestFeasiblePeriod: number | null = null;
    for (let p = 1; p <= testedPeriod + SCAN_AHEAD_PERIODS; p += 2) {
      const { own, breaks } = checkAt(p);
      if (!own && !breaks) {
        earliestFeasiblePeriod = p;
        break;
      }
    }

    const atTested = checkAt(testedPeriod);
    let blockers: string[] = [];
    let bindingTests: BindingTest[] = [];
    if (atTested.own) {
      blockers = describeFailure(atTested.own);
      bindingTests = failedTestKinds(atTested.own);
    } else if (earliestFeasiblePeriod !== null && earliestFeasiblePeriod > 2) {
      // Passing — explain what blocks the year before the earliest slot
      const earlier = checkAt(earliestFeasiblePeriod - 2);
      if (earlier.own) {
        blockers = describeFailure(earlier.own);
        bindingTests = failedTestKinds(earlier.own);
      } else if (earlier.breaks) {
        blockers = [`would break Property ${earlier.breaks.propertyIndex}`];
        bindingTests = failedTestKinds(earlier.breaks);
      }
    }

    return {
      propertyIndex: i,
      testedPeriod,
      feasibleAtTested: !atTested.own,
      earliestFeasiblePeriod,
      blockers,
      bindingTests,
    };
  });
}

/**
 * Auto-fix a plan that failed pre-check.
 *
 * Strategy (applied in order, re-checking after each pass):
 * 1. Serviceability / BC failures → switch entity to trust (75% discount)
 * 2. BC / serviceability still failing → push property to later period (+1 year at a time, max +4 years)
 * 3. Deposit failures → reduce price to fit available funds
 *
 * Returns the original response if no fixes were needed or possible.
 */
export function autoFixPlan(response: NLParseResponse, initialResult: PreCheckResult, baseProfile?: InvestmentProfileData, fallbackExistingProps?: ExistingProperty[]): AutoFixResult {
  if (!response.properties || initialResult.allFeasible) {
    return { fixed: false, fixedResponse: response, changes: [], explanationPrompt: '' };
  }

  // Deep-clone the response so we don't mutate the original
  const fixedResponse: NLParseResponse = JSON.parse(JSON.stringify(response));
  const changes: AutoFixChange[] = [];
  let currentFailures = initialResult.failures;

  // ── Pass 1: flip failing properties to trust ──
  for (const failure of currentFailures) {
    const propIdx = failure.propertyIndex - 1;
    const prop = fixedResponse.properties![propIdx];
    if (!prop) continue;

    const hasServiceabilityIssue = !failure.serviceabilityTestPass;
    const hasBCIssue = !failure.borrowingCapacityTestPass;

    if ((hasServiceabilityIssue || hasBCIssue) && prop.entity !== 'trust') {
      const oldEntity = prop.entity || 'individual';
      prop.entity = 'trust';

      const reasons: string[] = [];
      if (hasServiceabilityIssue) reasons.push('serviceability');
      if (hasBCIssue) reasons.push('borrowing capacity');

      changes.push({
        propertyIndex: failure.propertyIndex,
        propertyLabel: failure.propertyLabel,
        changeType: 'entity_to_trust',
        reason: reasons.join(' and '),
        detail: `Changed from ${oldEntity} to trust to reduce ${reasons.join(' and ')} impact`,
      });
    }
  }

  // Re-check
  let recheck = runPlanPreCheck(fixedResponse, baseProfile, fallbackExistingProps);
  if (recheck.allFeasible) {
    return { fixed: changes.length > 0, fixedResponse, changes, explanationPrompt: buildExplanationPrompt(changes) };
  }
  currentFailures = recheck.failures;

  // ── Pass 2: push failing properties to later periods ──
  // For ANY failing property, give the portfolio more time to grow:
  //  - BC/serviceability: wages increase → BC ceiling rises
  //  - Deposit: savings accumulate + equity released from earlier properties
  const MAX_PERIOD_PUSH = 20; // up to 10 years later (20 semi-annual periods)
  for (const failure of currentFailures) {
    const propIdx = failure.propertyIndex - 1;
    const prop = fixedResponse.properties![propIdx];
    if (!prop) continue;

    const hasBCIssue = !failure.borrowingCapacityTestPass;
    const hasServiceabilityIssue = !failure.serviceabilityTestPass;
    const hasDepositIssue = !failure.depositTestPass;

    // Push for BC/serviceability (trust only) OR deposit shortfalls (any entity)
    const shouldPush = ((hasBCIssue || hasServiceabilityIssue) && prop.entity === 'trust') || hasDepositIssue;

    if (shouldPush) {
      const currentPeriod = prop.targetPeriod ?? (propIdx * 2 + 1);
      let bestPeriod = currentPeriod;

      // Try pushing 1 year at a time (2 periods) until it passes or we hit the max
      for (let push = 2; push <= MAX_PERIOD_PUSH; push += 2) {
        const testPeriod = currentPeriod + push;
        prop.targetPeriod = testPeriod;

        const testResult = runPlanPreCheck(fixedResponse, baseProfile, fallbackExistingProps);
        const stillFailing = testResult.failures.find(f => f.propertyIndex === failure.propertyIndex);

        if (!stillFailing) {
          bestPeriod = testPeriod;
          break;
        }
        bestPeriod = testPeriod; // keep the latest push even if not fully resolved
      }

      if (bestPeriod !== currentPeriod) {
        prop.targetPeriod = bestPeriod;
        const oldYear = Math.ceil(currentPeriod / PERIODS_PER_YEAR) + 2024;
        const newYear = Math.ceil(bestPeriod / PERIODS_PER_YEAR) + 2024;

        const reason = hasDepositIssue ? 'deposit accumulation' : hasBCIssue ? 'borrowing capacity' : 'serviceability';
        changes.push({
          propertyIndex: failure.propertyIndex,
          propertyLabel: failure.propertyLabel,
          changeType: 'period_pushed',
          reason,
          detail: `Moved from ${oldYear} to ${newYear} to allow ${reason === 'deposit accumulation' ? 'savings to accumulate' : 'capacity to grow'}`,
        });
      }
    }
  }

  // Re-check
  recheck = runPlanPreCheck(fixedResponse, baseProfile, fallbackExistingProps);
  if (recheck.allFeasible) {
    return { fixed: changes.length > 0, fixedResponse, changes, explanationPrompt: buildExplanationPrompt(changes) };
  }
  currentFailures = recheck.failures;

  // ── Pass 3: reduce prices for remaining failures ──
  for (const failure of currentFailures) {
    const propIdx = failure.propertyIndex - 1;
    const prop = fixedResponse.properties![propIdx];
    if (!prop) continue;

    if (!failure.depositTestPass && failure.depositTestSurplus < 0) {
      const shortfall = Math.abs(failure.depositTestSurplus);
      const lvr = prop.lvr || 80;
      const depositPercent = (100 - lvr) / 100;
      const priceReduction = Math.ceil(shortfall / depositPercent / 5000) * 5000;
      const oldPrice = prop.purchasePrice;
      prop.purchasePrice = Math.max(200000, oldPrice - priceReduction);

      if (prop.purchasePrice < oldPrice) {
        changes.push({
          propertyIndex: failure.propertyIndex,
          propertyLabel: failure.propertyLabel,
          changeType: 'price_reduced',
          reason: 'deposit shortfall',
          detail: `Reduced from $${Math.round(oldPrice / 1000)}k to $${Math.round(prop.purchasePrice / 1000)}k to fit available deposit`,
        });
      }
    }
  }

  // Re-check after price reductions
  recheck = runPlanPreCheck(fixedResponse, baseProfile, fallbackExistingProps);
  if (recheck.allFeasible) {
    return { fixed: changes.length > 0, fixedResponse, changes, explanationPrompt: buildExplanationPrompt(changes) };
  }

  // ── Pass 4: drop properties that still fail after all other fixes ──
  const stillFailing = recheck.failures.map(f => f.propertyIndex - 1);
  if (stillFailing.length > 0 && fixedResponse.properties) {
    for (let i = stillFailing.length - 1; i >= 0; i--) {
      const idx = stillFailing[i];
      const dropped = fixedResponse.properties[idx];
      if (dropped) {
        changes.push({
          propertyIndex: idx + 1,
          propertyLabel: `Property ${idx + 1} ($${Math.round(dropped.purchasePrice / 1000)}k)`,
          changeType: 'dropped',
          reason: 'borrowing capacity',
          detail: `Removed — could not fit within borrowing capacity even after pushing to later periods`,
        });
      }
      fixedResponse.properties.splice(idx, 1);
    }

    // Regenerate the message text to match the remaining property count.
    // The original message was built server-side before auto-fix, so it
    // references the pre-drop count (e.g. "4-property plan" when only 1
    // survived). Patch the count, price range, and strip stale references
    // to dropped properties (e.g. "Properties 2, 3 held in trusts…").
    if (fixedResponse.message && fixedResponse.properties.length > 0) {
      const remaining = fixedResponse.properties;
      const count = remaining.length;
      const prices = remaining.map(p => p.purchasePrice).sort((a, b) => a - b);
      const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
      const priceRange = prices.length === 1
        ? `at ${fmt(prices[0])}`
        : `from ${fmt(prices[0])} to ${fmt(prices[prices.length - 1])}`;

      fixedResponse.message = fixedResponse.message
        .replace(/\b\d+-property plan/, `${count}-property plan`)
        .replace(/(?:at|from) \$[\d,]+k(?:\s+to\s+\$[\d,]+k)?/, priceRange)
        // Remove "Properties X, Y held in trusts …" sentence — may reference dropped properties
        .replace(/\s*Properties\s+[\d,\s]+held in trusts[^.]*\./g, '')
        // Remove "trust structures reduce serviceability…" fragment if orphaned
        .replace(/\s*—\s*trust structures reduce serviceability impact so the engine can place all purchases\./g, '');
    }
  }

  const finalCheck = runPlanPreCheck(fixedResponse, baseProfile, fallbackExistingProps);
  return {
    fixed: changes.length > 0,
    fixedResponse,
    changes,
    explanationPrompt: buildExplanationPrompt(changes, !finalCheck.allFeasible),
  };
}

function buildExplanationPrompt(changes: AutoFixChange[], stillHasIssues = false): string {
  const entityChanges = changes.filter(c => c.changeType === 'entity_to_trust');
  const periodChanges = changes.filter(c => c.changeType === 'period_pushed');
  const priceChanges = changes.filter(c => c.changeType === 'price_reduced');

  const parts: string[] = [];

  if (entityChanges.length > 0) {
    const props = entityChanges.map(c => `Property ${c.propertyIndex}`).join(' and ');
    parts.push(
      `${props} ${entityChanges.length === 1 ? 'has' : 'have'} been placed in a trust structure. ` +
      `This reduces the serviceability impact by 75%, keeping total loan commitments within borrowing capacity.`
    );
  }

  if (periodChanges.length > 0) {
    for (const c of periodChanges) {
      parts.push(`Property ${c.propertyIndex}: ${c.detail}.`);
    }
  }

  if (priceChanges.length > 0) {
    for (const c of priceChanges) {
      parts.push(`Property ${c.propertyIndex}: ${c.detail}.`);
    }
  }

  const droppedChanges = changes.filter(c => c.changeType === 'dropped');
  if (droppedChanges.length > 0) {
    const count = droppedChanges.length;
    parts.push(
      `${count} ${count === 1 ? 'property was' : 'properties were'} removed from the plan as ${count === 1 ? 'it' : 'they'} could not fit within the borrowing capacity ceiling, even with trust structures and extended timing.`
    );
  }

  if (stillHasIssues) {
    parts.push(
      `Note: some properties may still show as challenging on the dashboard. ` +
      `The buyer's agent can adjust timing, entity, or price on the confirmation brief.`
    );
  }

  return `[SYSTEM] The engine auto-adjusted this plan before showing it to the user. Briefly explain these changes in a natural, helpful way (1-2 sentences max, no bullet points). Do NOT mention "the engine" or "pre-check" — just explain the strategy as if you made the decision:\n\n${parts.join('\n\n')}`;
}
