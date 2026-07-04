/**
 * Affordability Engine — SINGLE SOURCE OF TRUTH
 *
 * Pure functions for the three affordability tests: deposit, serviceability,
 * and borrowing capacity ceiling. Zero React dependencies.
 *
 * Consumed by:
 * - useAffordabilityCalculator (main timeline loop, modal preview, drag-drop)
 * - ChatPanel pre-check (before showing confirmation brief)
 *
 * All three callers get identical math. No inline copies.
 */

import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { ExistingProperty } from '../types/existingProperty';
import type { EventBlock } from '../contexts/PropertySelectionContext';
import { convertExistingToInstance } from '../utils/existingPropertyAdapter';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { calculateBorrowingCeiling } from '../utils/borrowingCapacityCeiling';
import {
  getEffectiveInterestRate,
  getPropertyEffectiveRate,
} from '../utils/eventProcessing';
import {
  PERIODS_PER_YEAR,
  SERVICEABILITY_FACTOR,
  RENTAL_SERVICEABILITY_CONTRIBUTION_RATE,
  EQUITY_EXTRACTION_LVR_CAP,
  DEFAULT_INTEREST_RATE,
  ANNUAL_INFLATION_RATE,
  ANNUAL_WAGE_GROWTH_RATE,
  RENTAL_RECOGNITION_RATE,
  SAVINGS_DEPLOYMENT_RATE,
  DEFAULT_VACANCY_RATE,
  calculateInflationFactor,
  ENTITY_SERVICEABILITY_FACTORS,
  yearToPeriod,
} from '../constants/financialParams';
import { calculateExistingPortfolioGrowthByPeriod } from '../utils/metricsCalculator';

// Hot-path debug logging (per-scanned-period BC trace). Off by default —
// flip to true locally when debugging borrowing-capacity disagreements.
const DEBUG_BC_LOGGING = false;

// ── Types ────────────────────────────────────────────────────────────

export interface PurchaseRecord {
  period: number;
  cost: number;
  depositRequired: number;
  totalCashRequired?: number;
  loanAmount: number;
  title: string;
  instanceId: string;
  loanType?: 'IO' | 'PI';
  cumulativeEquityReleased?: number;
}

export interface AvailableFundsResult {
  total: number;
  baseDeposit: number;
  cumulativeSavings: number;
  cashflowReinvestment: number;
  equityRelease: number;
  depositsUsed: number;
  cashRemaining: number;
  savingsRemaining: number;
  equityRemaining: number;
  totalEquityUsed: number;
}

export interface AffordabilityCheckResult {
  canAfford: boolean;
  depositTestPass: boolean;
  serviceabilityTestPass: boolean;
  borrowingCapacityTestPass: boolean;
  depositTestSurplus: number;
  serviceabilityTestSurplus: number;
  borrowingCapacityRemaining: number;
}

/** Lookup functions the engine needs from the React layer */
export interface EngineDeps {
  getInstance: (instanceId: string) => any | null;
  getPropertyData: (title: string, growthAssumption?: string) => any | null;
  calculatePropertyGrowth: (cost: number, periodsOwned: number, propertyData: any, basePeriod?: number) => number;
}

// ── Core Functions ───────────────────────────────────────────────────

export function calculateAnnualLoanPayment(
  loanAmount: number,
  interestRate: number,
  loanType: 'IO' | 'PI',
  loanTermYears: number = 30
): number {
  if (loanType === 'IO') {
    return loanAmount * interestRate;
  }
  const monthlyRate = interestRate / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  return monthlyPayment * 12;
}

/**
 * A planned purchase is "sold" (and therefore excluded from serviceability,
 * debt and funds) once the current period reaches its instance saleYear.
 * Mirrors the existing-property `ep.saleYear` checks throughout this engine.
 */
function isPurchaseSold(
  purchase: PurchaseRecord,
  currentPeriod: number,
  deps: EngineDeps,
): boolean {
  const sy = deps.getInstance(purchase.instanceId)?.saleYear;
  return !!sy && sy > 0 && currentPeriod >= yearToPeriod(sy);
}

// ── Available Funds ──────────────────────────────────────────────────

export function calculateAvailableFunds(
  currentPeriod: number,
  previousPurchases: PurchaseRecord[],
  profile: InvestmentProfileData,
  existingProperties: ExistingProperty[],
  deps: EngineDeps,
): AvailableFundsResult {
  const baseDeposit = profile.depositPool;
  const annualSavings = profile.annualSavings;

  let netCashflow = 0;
  let grossRentalIncome = 0;

  existingProperties.forEach(ep => {
    if (ep.saleYear && ep.saleYear > 0) {
      const salePeriod = yearToPeriod(ep.saleYear);
      if (currentPeriod >= salePeriod) return;
    }
    const epInstance = convertExistingToInstance(ep, profile.interestRate ?? 0.0625);
    const yearsElapsed = (currentPeriod - 1) / PERIODS_PER_YEAR;
    const rentEscFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsElapsed);
    const inflFactor = calculateInflationFactor(currentPeriod - 1, profile.inflationRate ?? ANNUAL_INFLATION_RATE);

    const cashflow = calculateDetailedCashflow(epInstance, ep.loan);
    const adjustedIncome = cashflow.adjustedIncome * rentEscFactor;
    const recognizedIncome = adjustedIncome * RENTAL_RECOGNITION_RATE;
    const inflAdjExpenses = cashflow.totalOperatingExpenses * inflFactor;
    const inflAdjNonDeductible = (cashflow.totalNonDeductibleExpenses - cashflow.principalPayments) * inflFactor;

    grossRentalIncome += recognizedIncome;
    netCashflow += recognizedIncome - inflAdjExpenses - inflAdjNonDeductible - cashflow.loanInterest - cashflow.principalPayments;
  });

  previousPurchases.forEach(purchase => {
    if (purchase.period <= currentPeriod) {
      if (isPurchaseSold(purchase, currentPeriod, deps)) return;
      const periodsOwned = currentPeriod - purchase.period;
      const propertyInstance = deps.getInstance(purchase.instanceId);
      const propertyData = deps.getPropertyData(purchase.title, propertyInstance?.growthAssumption);

      if (propertyData) {
        const currentValue = deps.calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData, purchase.period);

        if (propertyInstance) {
          const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
          const yearsOwned = periodsOwned / PERIODS_PER_YEAR;
          const rentEscalationFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsOwned);
          const adjustedIncome = cashflowBreakdown.adjustedIncome * rentEscalationFactor;
          const inflationFactor = calculateInflationFactor(periodsOwned, profile.inflationRate ?? ANNUAL_INFLATION_RATE);
          const inflationAdjustedOperatingExpenses = cashflowBreakdown.totalOperatingExpenses * inflationFactor;
          const inflationAdjustedNonDeductible = (cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.principalPayments) * inflationFactor;
          const recognitionRate = RENTAL_RECOGNITION_RATE;
          const recognizedIncome = adjustedIncome * recognitionRate;
          const propertyCashflow = recognizedIncome - inflationAdjustedOperatingExpenses - inflationAdjustedNonDeductible - cashflowBreakdown.loanInterest - cashflowBreakdown.principalPayments;

          grossRentalIncome += recognizedIncome;
          netCashflow += propertyCashflow;
        } else {
          const yieldRate = parseFloat(propertyData.yield) / 100;
          const recognitionRate = RENTAL_RECOGNITION_RATE;
          const adjustedIncome = currentValue * yieldRate * recognitionRate;
          grossRentalIncome += adjustedIncome;
          netCashflow += adjustedIncome;
        }
      }
    }
  });

  // Savings: deployed portion of annual savings + cashflow reinvestment
  const deployedSavingsPerPeriod = (annualSavings * SAVINGS_DEPLOYMENT_RATE) / PERIODS_PER_YEAR;
  const cashflowContributionPerPeriod = Math.max(0, netCashflow) / PERIODS_PER_YEAR;
  let totalBaseSavings = 0;
  let totalCashflowReinvestment = 0;

  for (let p = 1; p <= currentPeriod; p++) {
    totalBaseSavings += deployedSavingsPerPeriod;
    if (p > 1) {
      totalCashflowReinvestment += cashflowContributionPerPeriod;
    }
  }

  // Existing portfolio equity
  let existingPortfolioEquity = 0;
  if (profile.useExistingEquity) {
    const growthRate = profile.existingPortfolioGrowthRate || 0.05;
    if (existingProperties.length > 0) {
      existingProperties.forEach(ep => {
        if (ep.saleYear && ep.saleYear > 0 && currentPeriod >= yearToPeriod(ep.saleYear)) return;
        if (ep.allowEquityRelease === false) return;
        const yearsElapsed = (currentPeriod - 1) / PERIODS_PER_YEAR;
        const grownValue = ep.currentValue * Math.pow(1 + growthRate, yearsElapsed);
        const equity = Math.max(0, grownValue * EQUITY_EXTRACTION_LVR_CAP - ep.loan);
        existingPortfolioEquity += equity;
      });
    } else if (profile.portfolioValue > 0) {
      const grownPortfolioValue = calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, currentPeriod - 1, growthRate);
      existingPortfolioEquity = Math.max(0, grownPortfolioValue * EQUITY_EXTRACTION_LVR_CAP - profile.currentDebt);
    }
  }

  // Cash pool: deposit + one-time events (already baked into depositPool by context)
  let runningCashBalance = baseDeposit;
  let runningSavingsBalance = totalBaseSavings + totalCashflowReinvestment;
  let cumulativeEquityUsed = 0;

  // Process previous purchases — equity-first allocation
  for (let period = 1; period <= currentPeriod; period++) {
    // Calculate extractable equity at this period
    let extractableEquityThisPeriod = existingPortfolioEquity;
    previousPurchases.forEach(purchase => {
      if (purchase.period < period) {
        const propertyInstance = deps.getInstance(purchase.instanceId);
        const propertyData = deps.getPropertyData(purchase.title, propertyInstance?.growthAssumption);
        if (propertyData) {
          const periodsOwned = period - purchase.period;
          const propertyCurrentValue = deps.calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData, purchase.period);
          const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
          const usableEquity = Math.max(0, propertyCurrentValue * EQUITY_EXTRACTION_LVR_CAP - currentLoanAmount);
          extractableEquityThisPeriod += usableEquity;
        }
      }
    });

    const purchasesInThisPeriod = previousPurchases.filter(p => p.period === period);
    purchasesInThisPeriod.forEach(purchase => {
      const cashNeeded = purchase.totalCashRequired || purchase.depositRequired;
      let remaining = cashNeeded;

      // 1. Equity first
      const rawEquity = Math.max(0, extractableEquityThisPeriod - cumulativeEquityUsed);
      const availableEquity = rawEquity * (profile.equityReleaseFactor ?? 0.70);
      const fromEquity = Math.min(remaining, availableEquity);
      remaining -= fromEquity;
      cumulativeEquityUsed += fromEquity;

      // 2. Cash second
      const fromCash = Math.min(remaining, runningCashBalance);
      remaining -= fromCash;
      runningCashBalance = Math.max(0, runningCashBalance - fromCash);

      // 3. Savings last
      const fromSavings = Math.min(remaining, runningSavingsBalance);
      runningSavingsBalance = Math.max(0, runningSavingsBalance - fromSavings);
    });
  }

  // Calculate total extractable equity at current period
  let totalExtractableEquity = existingPortfolioEquity;
  previousPurchases.forEach(purchase => {
    if (purchase.period < currentPeriod) {
      const eqInst = deps.getInstance(purchase.instanceId);
      const propertyData = deps.getPropertyData(purchase.title, eqInst?.growthAssumption);
      if (propertyData) {
        const periodsOwned = currentPeriod - purchase.period;
        const propertyCurrentValue = deps.calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
        const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
        const usableEquity = Math.max(0, propertyCurrentValue * EQUITY_EXTRACTION_LVR_CAP - currentLoanAmount);
        totalExtractableEquity += usableEquity;
      }
    }
  });

  const rawEquityRemaining = Math.max(0, totalExtractableEquity - cumulativeEquityUsed);
  const equityRemaining = rawEquityRemaining * (profile.equityReleaseFactor ?? 0.70);
  const cashRemaining = runningCashBalance;
  const savingsRemaining = runningSavingsBalance;
  const totalAvailable = cashRemaining + savingsRemaining + equityRemaining;

  const totalDepositsUsed = previousPurchases.reduce((sum, purchase) => {
    if (purchase.period <= currentPeriod) {
      return sum + (purchase.totalCashRequired || purchase.depositRequired);
    }
    return sum;
  }, 0);

  return {
    total: totalAvailable,
    baseDeposit: cashRemaining,
    cumulativeSavings: totalBaseSavings + totalCashflowReinvestment,
    cashflowReinvestment: totalCashflowReinvestment,
    equityRelease: totalExtractableEquity,
    depositsUsed: totalDepositsUsed,
    cashRemaining,
    savingsRemaining,
    equityRemaining,
    totalEquityUsed: cumulativeEquityUsed,
  };
}

// ── Entity-Discounted Debt ───────────────────────────────────────────

export function calculateEntityDiscountedDebt(
  currentPeriod: number,
  previousPurchases: PurchaseRecord[],
  existingProperties: ExistingProperty[],
  profile: InvestmentProfileData,
  deps: EngineDeps,
): number {
  let totalExistingDebt = 0;

  if (existingProperties.length > 0) {
    existingProperties.forEach(ep => {
      if (ep.saleYear && ep.saleYear > 0 && currentPeriod >= yearToPeriod(ep.saleYear)) return;
      if (ep.entity === 'smsf') return;
      const epCeilingFactor = ENTITY_SERVICEABILITY_FACTORS[ep.entity ?? 'individual'] ?? 1.0;
      totalExistingDebt += ep.loan * epCeilingFactor;
    });
  } else {
    totalExistingDebt = profile.currentDebt;
  }

  previousPurchases.forEach(purchase => {
    if (purchase.period <= currentPeriod) {
      if (isPurchaseSold(purchase, currentPeriod, deps)) return;
      const purchaseInst = deps.getInstance(purchase.instanceId);
      if (purchaseInst?.entity === 'smsf') return;
      const purchaseCeilingFactor = ENTITY_SERVICEABILITY_FACTORS[purchaseInst?.entity ?? 'individual'] ?? 1.0;
      const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
      totalExistingDebt += currentLoanAmount * purchaseCeilingFactor;
    }
  });

  return totalExistingDebt;
}

// ── Total Annual Loan Payments (entity-discounted) ───────────────────

export function calculateTotalAnnualLoanPayments(
  currentPeriod: number,
  previousPurchases: PurchaseRecord[],
  newProperty: { loanAmount: number; instanceId: string; loanType?: 'IO' | 'PI' },
  existingProperties: ExistingProperty[],
  profile: InvestmentProfileData,
  eventBlocks: EventBlock[],
  deps: EngineDeps,
): number {
  let totalAnnualLoanPayment = 0;
  const effectiveMarketRate = getEffectiveInterestRate(currentPeriod, eventBlocks);

  // Existing portfolio debt payments
  if (existingProperties.length > 0) {
    existingProperties.forEach(ep => {
      if (ep.saleYear && ep.saleYear > 0 && currentPeriod >= yearToPeriod(ep.saleYear)) return;
      if (ep.loan > 0) {
        const entityFactor = ENTITY_SERVICEABILITY_FACTORS[ep.entity ?? 'individual'] ?? 1.0;
        totalAnnualLoanPayment += calculateAnnualLoanPayment(ep.loan, effectiveMarketRate, 'IO') * entityFactor;
      }
    });
  } else if (profile.currentDebt > 0) {
    totalAnnualLoanPayment += calculateAnnualLoanPayment(profile.currentDebt, effectiveMarketRate, 'IO');
  }

  // Previous purchases
  const baseRate = profile.interestRate ?? DEFAULT_INTEREST_RATE;
  previousPurchases.forEach(purchase => {
    if (purchase.period <= currentPeriod) {
      if (isPurchaseSold(purchase, currentPeriod, deps)) return;
      const purchaseEffectiveRate = getPropertyEffectiveRate(currentPeriod, eventBlocks, purchase.instanceId, baseRate);
      const purchaseLoanType = purchase.loanType || 'IO';
      const purchaseInst = deps.getInstance(purchase.instanceId);
      const entityFactor = ENTITY_SERVICEABILITY_FACTORS[purchaseInst?.entity ?? 'individual'] ?? 1.0;
      totalAnnualLoanPayment += calculateAnnualLoanPayment(purchase.loanAmount, purchaseEffectiveRate, purchaseLoanType) * entityFactor;
    }
  });

  // New property
  const propertyEffectiveRate = getPropertyEffectiveRate(currentPeriod, eventBlocks, newProperty.instanceId, baseRate);
  const newPropInst = deps.getInstance(newProperty.instanceId);
  const newPropEntityFactor = ENTITY_SERVICEABILITY_FACTORS[newPropInst?.entity ?? 'individual'] ?? 1.0;
  const newPropertyLoanPayment = calculateAnnualLoanPayment(newProperty.loanAmount, propertyEffectiveRate, newProperty.loanType || 'IO');
  totalAnnualLoanPayment += newPropertyLoanPayment * newPropEntityFactor;

  return totalAnnualLoanPayment;
}

// ── Total Rental Income ──────────────────────────────────────────────

export function calculateTotalRentalIncome(
  currentPeriod: number,
  previousPurchases: PurchaseRecord[],
  newProperty: { cost: number; instanceId: string; title: string },
  existingProperties: ExistingProperty[],
  profile: InvestmentProfileData,
  deps: EngineDeps,
): number {
  let totalRentalIncome = 0;

  // Existing portfolio rental income
  existingProperties.forEach(ep => {
    if (ep.saleYear && ep.saleYear > 0) {
      const salePeriod = yearToPeriod(ep.saleYear);
      if (currentPeriod >= salePeriod) return;
    }
    const yearsElapsed = (currentPeriod - 1) / PERIODS_PER_YEAR;
    const rentEscFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsElapsed);
    const annualRent = ep.rentPerWeek * 52 * rentEscFactor;
    const vacancyAdjusted = annualRent * (1 - (ep.vacancyRate ?? profile.vacancyRate ?? DEFAULT_VACANCY_RATE));
    totalRentalIncome += vacancyAdjusted * RENTAL_RECOGNITION_RATE;
  });

  // Previous purchases rental income
  previousPurchases.forEach(purchase => {
    if (purchase.period <= currentPeriod) {
      if (isPurchaseSold(purchase, currentPeriod, deps)) return;
      const periodsOwned = currentPeriod - purchase.period;
      const purchaseInstance = deps.getInstance(purchase.instanceId);
      const propertyData = deps.getPropertyData(purchase.title, purchaseInstance?.growthAssumption);

      if (purchaseInstance && propertyData) {
        const yearsOwned = periodsOwned / PERIODS_PER_YEAR;
        const rentEscalationFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), yearsOwned);
        const annualRent = purchaseInstance.rentPerWeek * 52 * rentEscalationFactor;
        const vacancyAdjusted = annualRent * (1 - (profile.vacancyRate ?? DEFAULT_VACANCY_RATE));
        totalRentalIncome += vacancyAdjusted * RENTAL_RECOGNITION_RATE;
      } else if (propertyData) {
        const currentValue = deps.calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
        const yieldRate = parseFloat(propertyData.yield) / 100;
        totalRentalIncome += currentValue * yieldRate * RENTAL_RECOGNITION_RATE;
      }
    }
  });

  // New property rental income
  const newPropertyInstance = deps.getInstance(newProperty.instanceId);
  const propertyData = deps.getPropertyData(newProperty.title, newPropertyInstance?.growthAssumption);
  if (newPropertyInstance) {
    const annualRent = newPropertyInstance.rentPerWeek * 52;
    const vacancyAdjusted = annualRent * (1 - (profile.vacancyRate ?? DEFAULT_VACANCY_RATE));
    totalRentalIncome += vacancyAdjusted * RENTAL_RECOGNITION_RATE;
  } else if (propertyData) {
    const yieldRate = parseFloat(propertyData.yield) / 100;
    totalRentalIncome += newProperty.cost * yieldRate * RENTAL_RECOGNITION_RATE;
  }

  return totalRentalIncome;
}

// ── Check Affordability — THE THREE TESTS ────────────────────────────

export function checkAffordability(
  property: { cost: number; depositRequired: number; loanAmount: number; instanceId: string; title: string; loanType?: 'IO' | 'PI' },
  availableFunds: AvailableFundsResult,
  previousPurchases: PurchaseRecord[],
  currentPeriod: number,
  totalCashRequired: number,
  profile: InvestmentProfileData,
  existingProperties: ExistingProperty[],
  eventBlocks: EventBlock[],
  deps: EngineDeps,
): AffordabilityCheckResult {

  // ── TEST 1: DEPOSIT ────────────────────────────────────────────────
  const depositTestSurplus = availableFunds.total - totalCashRequired;
  const depositTestPass = depositTestSurplus >= 0;

  // ── TEST 2: SERVICEABILITY ─────────────────────────────────────────
  const totalRentalIncome = calculateTotalRentalIncome(
    currentPeriod, previousPurchases,
    { cost: property.cost, instanceId: property.instanceId, title: property.title },
    existingProperties, profile, deps,
  );

  const totalAnnualLoanPayment = calculateTotalAnnualLoanPayments(
    currentPeriod, previousPurchases,
    { loanAmount: property.loanAmount, instanceId: property.instanceId, loanType: property.loanType },
    existingProperties, profile, eventBlocks, deps,
  );

  const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
  const rentalContribution = totalRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
  const maxAnnualPayment = baseCapacity + rentalContribution;
  const serviceabilityTestSurplus = maxAnnualPayment - totalAnnualLoanPayment;
  const serviceabilityTestPass = serviceabilityTestSurplus >= 0;

  // ── TEST 3: BORROWING CAPACITY CEILING (with cash offset) ─────────
  const effectiveBorrowingCapacity = calculateBorrowingCeiling(currentPeriod, {
    statedBC: profile.borrowingCapacity ?? 0,
    baseSalary: profile.baseSalary ?? 60000,
    salaryMultiplier: profile.salaryServiceabilityMultiplier ?? 6.0,
    wageGrowth: profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE,
    grossRentalIncome: totalRentalIncome,
    eventBlocks,
  });

  const existingDebt = calculateEntityDiscountedDebt(
    currentPeriod, previousPurchases, existingProperties, profile, deps,
  );

  const newPropInst = deps.getInstance(property.instanceId);
  const newPropertyIsSmsf = newPropInst?.entity === 'smsf';
  const newPropertyEntityFactor = ENTITY_SERVICEABILITY_FACTORS[newPropInst?.entity ?? 'individual'] ?? 1.0;
  const newLoanEntityDiscounted = newPropertyIsSmsf ? 0 : property.loanAmount * newPropertyEntityFactor;
  const totalDebtAfterPurchase = existingDebt + newLoanEntityDiscounted;

  // Cash offset: liquid cash (not equity) reduces effective debt exposure
  // Matches BC chart concept: offsetDebt = totalDebt - min(cashReserves, totalDebt)
  const cashReserves = availableFunds.cashRemaining + availableFunds.savingsRemaining;
  const offsetDebt = totalDebtAfterPurchase - Math.min(cashReserves, totalDebtAfterPurchase);

  const perLoanBCPass = newPropertyIsSmsf || (property.loanAmount * newPropertyEntityFactor) <= effectiveBorrowingCapacity;
  const cumulativeBCPass = newPropertyIsSmsf || offsetDebt <= effectiveBorrowingCapacity;
  const borrowingCapacityTestPass = perLoanBCPass && cumulativeBCPass;

  // DEBUG: log BC inputs from both callers.
  // Hot path — checkAffordability runs once per scanned period, so this is
  // gated behind a module flag (flip to true locally when debugging BC).
  if (DEBUG_BC_LOGGING) {
    console.warn(`[Engine BC] ${property.instanceId} period=${currentPeriod} entity=${newPropInst?.entity ?? 'individual'} factor=${newPropertyEntityFactor} loan=${Math.round(property.loanAmount/1000)}k discountedLoan=${Math.round(newLoanEntityDiscounted/1000)}k existingDebt=${Math.round(existingDebt/1000)}k totalDebt=${Math.round(totalDebtAfterPurchase/1000)}k cash=${Math.round(cashReserves/1000)}k offsetDebt=${Math.round(offsetDebt/1000)}k ceiling=${Math.round(effectiveBorrowingCapacity/1000)}k perLoan=${perLoanBCPass} cumBC=${cumulativeBCPass} PASS=${borrowingCapacityTestPass} prevPurchases=${previousPurchases.length}`);
  }

  const borrowingCapacityRemaining = newPropertyIsSmsf
    ? effectiveBorrowingCapacity - offsetDebt
    : Math.min(
        effectiveBorrowingCapacity - (property.loanAmount * newPropertyEntityFactor),
        effectiveBorrowingCapacity - offsetDebt,
      );

  // ── FINAL DECISION ─────────────────────────────────────────────────
  const canAfford = depositTestPass && serviceabilityTestPass && borrowingCapacityTestPass;

  return {
    canAfford,
    depositTestPass,
    serviceabilityTestPass,
    borrowingCapacityTestPass,
    depositTestSurplus,
    serviceabilityTestSurplus,
    borrowingCapacityRemaining,
  };
}
