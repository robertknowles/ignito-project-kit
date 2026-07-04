/**
 * Timeline Placement Engine — Stage 1 of the calculation pipeline.
 *
 * Pure extraction of useAffordabilityCalculator's `calculateTimelineProperties`
 * memo body (Phase 0 of the Compare evolution plan). Zero React dependencies —
 * callable headlessly with a snapshot of context state.
 *
 * MOVED code, not rewritten: the math here must produce byte-identical numbers
 * to the pre-extraction dashboard. Do not "improve" it.
 */

import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';
import type { EventBlock, PauseBlock, PropertyType } from '../contexts/PropertySelectionContext';
import type { PropertyAssumption } from '../contexts/DataAssumptionsContext';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import type { ExistingProperty } from '../types/existingProperty';
import type { TimelineProperty } from '../types/property';
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator';
import { calculateOneOffCosts, calculateDepositBalance } from '../utils/oneOffCostsCalculator';
import { calculateLMI } from '../utils/lmiCalculator';
import { calculateStampDuty } from '../utils/stampDutyCalculator';
import { calculateLandTax } from '../utils/landTaxCalculator';
import { applyPropertyOverrides } from '../utils/applyPropertyOverrides';
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
import { getGrowthRateAdjustment } from '../utils/eventProcessing';
import {
  PERIODS_PER_YEAR,
  SERVICEABILITY_FACTOR,
  RENTAL_SERVICEABILITY_CONTRIBUTION_RATE,
  EQUITY_EXTRACTION_LVR_CAP,
  ANNUAL_INFLATION_RATE,
  ANNUAL_WAGE_GROWTH_RATE,
  annualRateToPeriodRate,
  periodToDisplay,
  periodToYear,
  yearToPeriod,
  RENTAL_RECOGNITION_RATE,
  SAVINGS_DEPLOYMENT_RATE,
  DEPENDENT_BC_PENALTY,
  DEPENDENT_SAVINGS_PENALTY,
  calculateInflationFactor,
} from '../constants/financialParams';
import { calculateBorrowingCeiling } from '../utils/borrowingCapacityCeiling';
import { calculateExistingPortfolioGrowthByPeriod } from '../utils/metricsCalculator';
import {
  checkAffordability as engineCheckAffordability,
  calculateAvailableFunds as engineCalculateAvailableFunds,
  type EngineDeps,
  type PurchaseRecord,
  type AvailableFundsResult,
} from './affordabilityEngine';

// ── Inputs ───────────────────────────────────────────────────────────

export interface TimelineEngineInputs {
  profile: InvestmentProfileData;
  propertyOrder: string[];
  selections: Record<string, number>;
  propertyTypes: PropertyType[];
  instances: Record<string, PropertyInstanceDetails>;
  existingProperties: ExistingProperty[];
  eventBlocks: EventBlock[];
  pauseBlocks: PauseBlock[];
  timelineLoanTypes: Record<string, 'IO' | 'PI'>;
  getPropertyData: (title: string, growthAssumption?: string) => PropertyAssumption | undefined;
}

/** Context for the affordability bridge helpers shared by the engine and the hook. */
export interface AffordabilityBridgeContext {
  profile: InvestmentProfileData;
  existingProperties: ExistingProperty[];
  eventBlocks: EventBlock[];
  getInstance: (instanceId: string) => PropertyInstanceDetails | null;
  getPropertyData: (title: string, growthAssumption?: string) => PropertyAssumption | undefined;
}

// ── Affordability bridge (moved from useAffordabilityCalculator) ─────

export const createAffordabilityBridge = (ctx: AffordabilityBridgeContext) => {
  const { profile, existingProperties, eventBlocks, getInstance, getPropertyData } = ctx;

  // This function now optionally accepts a basePeriod to apply market correction events
  const calculatePropertyGrowth = (
    initialValue: number,
    periods: number,
    assumption: PropertyAssumption,
    basePeriod: number = 0 // The period at which the property was purchased (for event adjustment)
  ) => {
    let currentValue = initialValue;

    // Use per-property tiered growth rates
    const year1Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear1) / 100);
    const years2to3Rate = annualRateToPeriodRate(parseFloat(assumption.growthYears2to3) / 100);
    const year4Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear4) / 100);
    const year5plusRate = annualRateToPeriodRate(parseFloat(assumption.growthYear5plus) / 100);

    for (let period = 1; period <= periods; period++) {
      // Calculate the actual calendar period (for market correction event lookup)
      const actualPeriod = basePeriod + period;

      // Get market correction adjustment for this period
      const growthAdjustment = getGrowthRateAdjustment(actualPeriod, eventBlocks);

      let periodRate;

      if (period <= 2) {
        // Year 1 (periods 1-2)
        periodRate = year1Rate;
      } else if (period <= 6) {
        // Years 2-3 (periods 3-6)
        periodRate = years2to3Rate;
      } else if (period <= 8) {
        // Year 4 (periods 7-8)
        periodRate = year4Rate;
      } else {
        // Year 5+ (period 9+)
        periodRate = year5plusRate;
      }

      // Apply market correction adjustment (convert to period rate)
      // Growth adjustment is already a decimal (e.g., -0.03 for -3%)
      const adjustedPeriodRate = periodRate + annualRateToPeriodRate(growthAdjustment);

      // Ensure rate doesn't go negative
      currentValue *= (1 + Math.max(-0.1, adjustedPeriodRate)); // Cap at -10% per period
    }

    return currentValue;
  };

  // Engine dependency bridge — passes caller-supplied lookups into pure engine functions
  const engineDeps: EngineDeps = {
    getInstance,
    getPropertyData,
    calculatePropertyGrowth,
  };

  const calculateAvailableFunds = (
      currentPeriod: number,
      previousPurchases: PurchaseRecord[],
    ): AvailableFundsResult => {
      return engineCalculateAvailableFunds(currentPeriod, previousPurchases, profile, existingProperties, engineDeps);
    };

  // OLD calculateAvailableFunds body removed — now delegated to engine.
  // OLD checkAffordability body removed — now delegated to engine.
  // See src/engine/affordabilityEngine.ts for the single source of truth.


  const checkAffordability = (
    property: any,
    availableFunds: AvailableFundsResult | number,
    previousPurchases: PurchaseRecord[],
    currentPeriod: number,
    totalCashRequired?: number,
  ): { canAfford: boolean } => {
    const funds: AvailableFundsResult = typeof availableFunds === 'number'
      ? calculateAvailableFunds(currentPeriod, previousPurchases)
      : availableFunds;

    // Derive loanAmount if not on the property object (main loop doesn't set it)
    const loanAmount = property.loanAmount ?? (property.cost - property.depositRequired);

    // Compute totalCashRequired if not passed (main loop doesn't pass it)
    let cashRequired = totalCashRequired;
    if (cashRequired === undefined) {
      const inst = getInstance(property.instanceId);
      const instForCosts = inst ?? getPropertyInstanceDefaults(property.title || property.id || 'Default');
      const lvr = inst?.lvr ?? ((loanAmount / property.cost) * 100);
      const stampDuty = instForCosts.stampDutyOverride ?? calculateStampDuty(instForCosts.state, property.cost, false);
      const lmi = calculateLMI(loanAmount, lvr, inst?.lmiWaiver ?? false, inst?.valuationAtPurchase, property.cost);
      const isLmiCap = inst?.lmiCapitalized ?? false;
      const depBal = calculateDepositBalance(property.cost, lvr, instForCosts.conditionalHoldingDeposit);
      const oneOff = calculateOneOffCosts(instForCosts, stampDuty, depBal);
      cashRequired = oneOff.totalCashRequired + (isLmiCap ? 0 : lmi);
    }

    const title = property.title || property.id || '';
    return engineCheckAffordability(
      { cost: property.cost, depositRequired: property.depositRequired, loanAmount, instanceId: property.instanceId, title, loanType: property.loanType },
      funds, previousPurchases, currentPeriod, cashRequired,
      profile, existingProperties, eventBlocks, engineDeps,
    );
  };

  return { calculatePropertyGrowth, engineDeps, calculateAvailableFunds, checkAffordability };
};

// ── Event processing (moved from useAffordabilityCalculator) ─────────

/**
 * Computes a modified InvestmentProfileData based on events that have occurred
 * up to (and including) the specified period. This allows events to modify
 * simulation parameters like salary, borrowing capacity, etc.
 *
 * @param period - The period number (1, 2, 3...)
 * @param baseProfile - The original investment profile
 * @param events - Array of event blocks to process
 * @returns Modified profile with event effects applied
 */
export const getProfileAtPeriod = (
  period: number,
  baseProfile: InvestmentProfileData,
  events: EventBlock[]
): InvestmentProfileData => {
  // Start with a copy of the base profile
  let modifiedProfile = { ...baseProfile };

  // Sort events by period (process in chronological order)
  const eventsUpToPeriod = events
    .filter(e => e.period <= period)
    .sort((a, b) => a.period - b.period);

  // Track cumulative one-time cash events for the current period only
  let oneTimeCashAdjustment = 0;

  for (const event of eventsUpToPeriod) {
    switch (event.eventType) {
      // =============================================================================
      // INCOME EVENTS
      // =============================================================================
      case 'salary_change':
        if (event.payload.newSalary !== undefined) {
          modifiedProfile.baseSalary = event.payload.newSalary;
          // Recalculate borrowing capacity based on new salary
          modifiedProfile.borrowingCapacity =
            event.payload.newSalary * modifiedProfile.salaryServiceabilityMultiplier;
          // Estimate savings change (rough approximation - SAVINGS_DEPLOYMENT_RATE of salary delta)
          const salaryDelta = event.payload.newSalary - (event.payload.previousSalary || baseProfile.baseSalary);
          modifiedProfile.annualSavings = baseProfile.annualSavings + (salaryDelta * SAVINGS_DEPLOYMENT_RATE);
        }
        break;

      case 'partner_income_change':
        if (event.payload.newPartnerSalary !== undefined) {
          // Partner income affects household borrowing capacity and savings
          const partnerDelta = event.payload.newPartnerSalary - (event.payload.previousPartnerSalary || 0);
          // Add partner income contribution to borrowing capacity (assume same multiplier)
          modifiedProfile.borrowingCapacity += partnerDelta * modifiedProfile.salaryServiceabilityMultiplier;
          // Add to household savings (same SAVINGS_DEPLOYMENT_RATE as salary deltas)
          modifiedProfile.annualSavings += partnerDelta * SAVINGS_DEPLOYMENT_RATE;
        }
        break;

      case 'bonus_windfall':
        // One-time cash event - effect persists for all future periods
        if (event.period <= period && event.payload.bonusAmount !== undefined) {
          oneTimeCashAdjustment += event.payload.bonusAmount;
        }
        break;

      // =============================================================================
      // LIFE EVENTS
      // =============================================================================
      case 'inheritance':
        // One-time cash event - effect persists for all future periods
        if (event.period <= period && event.payload.cashAmount !== undefined) {
          oneTimeCashAdjustment += event.payload.cashAmount;
        }
        break;

      case 'major_expense':
        // One-time cash event (deduction) - effect persists for all future periods
        if (event.period <= period && event.payload.cashAmount !== undefined) {
          oneTimeCashAdjustment -= event.payload.cashAmount;
        }
        break;

      case 'dependent_change':
        if (event.payload.dependentChange !== undefined) {
          modifiedProfile.borrowingCapacity -=
            event.payload.dependentChange * DEPENDENT_BC_PENALTY;
          modifiedProfile.annualSavings -=
            event.payload.dependentChange * DEPENDENT_SAVINGS_PENALTY;
        }
        break;

      // =============================================================================
      // MARKET EVENTS
      // =============================================================================
      case 'interest_rate_change':
        // Market-wide rate change - this is handled in the cashflow calculations
        // by storing the rate change and applying it to all loan calculations
        // The profile doesn't directly store interest rate, but we could track it
        // for now, this is a placeholder - actual implementation in cashflow calc
        break;

      case 'market_correction':
        // Market correction affects growth rates - handled in property growth calc
        // This is a placeholder - actual implementation would modify growth curve
        break;

      // =============================================================================
      // PORTFOLIO EVENTS
      // =============================================================================
      case 'sell_property':
        // Property sale is complex - handled separately in timeline calculation
        // The equity release from sale would be tracked as available funds
        break;

      case 'refinance':
        // Refinance at new rate - similar to interest rate change but property-specific
        break;

      case 'renovate':
        // Renovation uses cash and increases property value
        // Cash deduction persists for all future periods (money is spent)
        if (event.period <= period && event.payload.renovationCost !== undefined) {
          oneTimeCashAdjustment -= event.payload.renovationCost;
        }
        break;
    }
  }

  // Apply cumulative cash adjustments to deposit pool
  // Cash events (inheritance, expense, bonus, renovation) persist from their period onwards
  modifiedProfile.depositPool = baseProfile.depositPool + oneTimeCashAdjustment;

  // Ensure values don't go negative
  modifiedProfile.borrowingCapacity = Math.max(0, modifiedProfile.borrowingCapacity);
  modifiedProfile.annualSavings = Math.max(0, modifiedProfile.annualSavings);
  modifiedProfile.depositPool = Math.max(0, modifiedProfile.depositPool);

  return modifiedProfile;
};

// ── Main placement computation (moved from useAffordabilityCalculator) ──

export function computeTimelineProperties(inputs: TimelineEngineInputs): TimelineProperty[] {
  const {
    profile,
    propertyOrder,
    selections,
    propertyTypes,
    existingProperties,
    eventBlocks,
    pauseBlocks,
    timelineLoanTypes,
    getPropertyData,
  } = inputs;

  const getInstance = (instanceId: string): PropertyInstanceDetails | null =>
    inputs.instances[instanceId] ?? null;

  // Debug flag - set to true to enable detailed debugging
  const DEBUG_MODE = false; // Disabled for performance

  const { calculatePropertyGrowth, calculateAvailableFunds, checkAffordability } =
    createAffordabilityBridge({ profile, existingProperties, eventBlocks, getInstance, getPropertyData });

  // Helper function to check if a period falls within any pause block
  const isPausedPeriod = (
    period: number,
    propertyIndex: number
  ): boolean => {
    // Calculate which pause blocks should be active based on property sequence
    let propertiesProcessed = 0;
    let pausesProcessed = 0;
    let totalItemsProcessed = 0;

    // Walk through the sequence to determine if we're in a pause at this property index
    for (let i = 0; i <= propertyIndex; i++) {
      // Check if we should insert a pause at this position
      while (pausesProcessed < pauseBlocks.length &&
             pauseBlocks[pausesProcessed].order === totalItemsProcessed) {
        pausesProcessed++;
        totalItemsProcessed++;
      }

      if (i < propertyIndex) {
        propertiesProcessed++;
        totalItemsProcessed++;
      }
    }

    // Now check if there's an active pause at the current property index
    if (pausesProcessed < pauseBlocks.length &&
        pauseBlocks[pausesProcessed].order === totalItemsProcessed) {
      // Calculate pause period range
      // The pause starts after the last property and extends for the pause duration
      // This is handled by the main loop - we just need to know if we should skip this period
      return false; // Pauses are handled by extending the timeline, not blocking periods
    }

    return false;
  };

  const determineNextPurchasePeriod = (
    property: any,
    previousPurchases: Array<{ period: number; cost: number; depositRequired: number; totalCashRequired?: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }>,
    propertyIndex: number
  ): { period: number } => {
    let currentPurchases = [...previousPurchases];
    let iterationCount = 0;
    const maxPeriods = profile.timelineYears * PERIODS_PER_YEAR;
    const maxIterations = profile.timelineYears * PERIODS_PER_YEAR * 2; // Double the periods

    // Calculate pause offset: how many periods to add due to pauses before this property
    let pausePeriodsToAdd = 0;
    let itemsProcessed = 0;

    // Determine pauses that should occur before this property
    for (let i = 0; i < pauseBlocks.length; i++) {
      const pause = pauseBlocks[i];
      if (pause.order <= propertyIndex) {
        pausePeriodsToAdd += Math.ceil(pause.duration * PERIODS_PER_YEAR);
      }
    }

    // FIFO ORDERING: Each property must be purchased at or after the previous property's period
    // This ensures properties are added in the order the user specified
    const minPeriod = previousPurchases.length > 0
      ? previousPurchases[previousPurchases.length - 1].period
      : 1;

    for (let period = minPeriod; period <= maxPeriods + pausePeriodsToAdd; period++) {
      iterationCount++;
      if (iterationCount > maxIterations) {
return { period: Infinity };
      }

      // Check if this period is within a pause range
      let isInPause = false;
      let pauseEndPeriod = 0;

      // Calculate pause periods based on purchase sequence
      let currentPauseStartPeriod = 0;
      for (let i = 0; i < pauseBlocks.length; i++) {
        const pause = pauseBlocks[i];

        // Find when this pause should start (after property at pause.order position)
        if (pause.order <= propertyIndex) {
          // Find the last purchase period before or at this pause order
          const purchasesBeforePause = previousPurchases.filter((_, idx) => idx < pause.order);
          if (purchasesBeforePause.length > 0) {
            const lastPurchasePeriod = Math.max(...purchasesBeforePause.map(p => p.period));
            currentPauseStartPeriod = lastPurchasePeriod + 1;
            pauseEndPeriod = currentPauseStartPeriod + Math.ceil(pause.duration * PERIODS_PER_YEAR);

            if (period >= currentPauseStartPeriod && period < pauseEndPeriod) {
              isInPause = true;
              break;
            }
          }
        }
      }

      if (isInPause) {
        if (DEBUG_MODE) {
          }
        continue;
      }

      // PURCHASE VELOCITY LIMIT - check against max purchases per year from profile
      // Calculate which year this period is in and count purchases for that year
      const currentYear = Math.floor((period - 1) / PERIODS_PER_YEAR);
      const yearStartPeriod = currentYear * PERIODS_PER_YEAR + 1;
      const yearEndPeriod = yearStartPeriod + PERIODS_PER_YEAR - 1;
      const purchasesThisYear = currentPurchases.filter(p => p.period >= yearStartPeriod && p.period <= yearEndPeriod).length;
      const maxPurchasesPerYear = profile.maxPurchasesPerYear || 3;

      if (purchasesThisYear >= maxPurchasesPerYear) {
        if (DEBUG_MODE) {
          }
        continue; // Skip to the next period - year limit reached
      }

      // Check if property instance exists
      // If not, we'll just use template defaults for this calculation
      // DON'T call createInstance here - it will be created in useEffect
      const propertyInstance = getInstance(property.instanceId);
      if (!propertyInstance) {
        // Just log - instance will be created in useEffect
        if (DEBUG_MODE) {
}
      }

      const availableFunds = calculateAvailableFunds(period, currentPurchases);
      const affordabilityResult = checkAffordability(property, availableFunds.total, currentPurchases, period);

      if (affordabilityResult.canAfford) {
        return { period };
      }
    }

    return { period: Infinity };
  };

  // Main calculation logic - Create a list of all properties to purchase
  // Use propertyOrder to maintain user-defined insertion order (FIFO)
  const allPropertiesToPurchase: Array<{ property: any; index: number; instanceId: string }> = [];

  // If propertyOrder is available and non-empty, use it to determine order
  if (propertyOrder && propertyOrder.length > 0) {
    propertyOrder.forEach((instanceId) => {
      // Parse instanceId format: "propertyId_instance_index"
      const parts = instanceId.split('_instance_');
      if (parts.length === 2) {
        const propertyId = parts[0];
        const index = parseInt(parts[1], 10);
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property) {
          allPropertiesToPurchase.push({ property, index, instanceId });
        }
      }
    });
  } else {
    // Fallback to old behavior if propertyOrder is not available (backwards compatibility)
    Object.entries(selections).forEach(([propertyId, quantity]) => {
      if (quantity > 0) {
        const property = propertyTypes.find(p => p.id === propertyId);
        if (property) {
          for (let i = 0; i < quantity; i++) {
            // Generate a stable instanceId for this property (based on propertyId and index)
            // This ensures the same property in the same position keeps its loan type setting
            const instanceId = `${propertyId}_instance_${i}`;
            allPropertiesToPurchase.push({ property, index: i, instanceId });
          }
        }
      }
    });
  }

  const timelineProperties: TimelineProperty[] = [];
  let purchaseHistory: Array<{ period: number; cost: number; depositRequired: number; totalCashRequired?: number; loanAmount: number; title: string; instanceId: string; loanType?: 'IO' | 'PI'; cumulativeEquityReleased?: number }> = [];

  // Process properties sequentially, determining purchase period for each
  allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
    // Get the correct values from the instance (if it has been updated)
    const propertyInstance = getInstance(instanceId);
    const correctPurchasePrice = propertyInstance?.purchasePrice ?? property.cost;

    // CRITICAL: Use instance LVR for loan amount calculation, not template deposit percentage
    // This ensures agent edits to LVR are reflected in calculations
    const instanceLvr = propertyInstance?.lvr ?? ((property.cost - property.depositRequired) / property.cost * 100);
    const baseLoanAmount = correctPurchasePrice * (instanceLvr / 100);
    const computedDepositRequired = correctPurchasePrice - baseLoanAmount;
    const correctDepositRequired = propertyInstance?.depositOverride ?? computedDepositRequired;

    // Calculate LMI early to determine if it affects loan amount (when capitalized)
    // LMI is based on the base loan amount before capitalization
    const earlyLmi = propertyInstance?.lmiOverride ?? calculateLMI(
      baseLoanAmount,
      instanceLvr,
      propertyInstance?.lmiWaiver ?? false,
      propertyInstance?.valuationAtPurchase,
      correctPurchasePrice
    );

    // Check if LMI is being capitalized into the loan
    const isLmiCapitalized = propertyInstance?.lmiCapitalized ?? false;

    // Final loan amount includes LMI if capitalized (increases debt but reduces upfront cash)
    const computedLoanAmount = isLmiCapitalized ? baseLoanAmount + earlyLmi : baseLoanAmount;
    const correctLoanAmount = propertyInstance?.loanAmountOverride ?? computedLoanAmount;

    // Attach instanceId to property for use in determineNextPurchasePeriod
    const propertyWithInstance = { ...property, instanceId, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: correctLoanAmount };

    // MANUAL PLACEMENT MODE: Check if property has been manually placed via drag-and-drop
    // If so, use the manual placement period instead of auto-calculating
    let result: { period: number };

    // Track whether this placement passes affordability checks (used for status)
    let manualPlacementAffordable = true;

    if (propertyInstance?.isManuallyPlaced && propertyInstance?.manualPlacementPeriod !== undefined) {
      // Use the manually specified period but STILL validate against BC gate
      result = { period: propertyInstance.manualPlacementPeriod };
      const manualAffordability = checkAffordability(propertyWithInstance, calculateAvailableFunds(propertyInstance.manualPlacementPeriod, purchaseHistory).total, purchaseHistory, propertyInstance.manualPlacementPeriod);
      manualPlacementAffordable = manualAffordability.canAfford;
    } else {
      // Auto-calculate the purchase period based on affordability
      result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
    }

    const loanAmount = correctLoanAmount;

    // Calculate portfolio metrics at time of purchase
    let portfolioValueAfter = 0;
    let totalEquityAfter = 0;
    let availableFundsUsed = 0;
    let totalDebtAfter = 0;

    // Initialize cashflow variables with default values
    let grossRentalIncome = 0;
    let loanInterest = 0;
    let expenses = 0;
    let netCashflow = 0;
    let portfolioSize = 0;
    let rentalRecognitionRate = 0.80;

    // Expense breakdown accumulators for timeline
    let timelineAccCouncilRatesWater = 0;
    let timelineAccStrataFees = 0;
    let timelineAccInsurance = 0;
    let timelineAccManagementFees = 0;
    let timelineAccRepairsMaintenance = 0;
    let timelineAccLandTax = 0;
    let timelineAccOther = 0;

    if (result.period !== Infinity) {
      const purchasePeriod = result.period;

      // Calculate existing portfolio value (with growth, sale-aware)
      const growthRate = profile.existingPortfolioGrowthRate || 0.05;
      if (existingProperties.length > 0) {
        existingProperties.forEach(ep => {
          if (ep.saleYear && ep.saleYear > 0 && purchasePeriod >= yearToPeriod(ep.saleYear)) return;
          const yearsElapsed = (purchasePeriod - 1) / PERIODS_PER_YEAR;
          portfolioValueAfter += ep.currentValue * Math.pow(1 + growthRate, yearsElapsed);
          totalDebtAfter += ep.loan;
        });
      } else if (profile.portfolioValue > 0) {
        portfolioValueAfter += calculateExistingPortfolioGrowthByPeriod(profile.portfolioValue, purchasePeriod - 1, growthRate);
        totalDebtAfter = profile.currentDebt;
      }

      // Add all previous purchases (with growth based on periods owned)
      // CRITICAL FIX: Only include purchases made by or before the current purchase period
      purchaseHistory.forEach(purchase => {
        if (purchase.period <= purchasePeriod) {
          const periodsOwned = purchasePeriod - purchase.period;
          const phInst = getInstance(purchase.instanceId);
          if (phInst?.saleYear && phInst.saleYear > 0 && purchasePeriod >= yearToPeriod(phInst.saleYear)) return;
          const propertyData = getPropertyData(purchase.title, phInst?.growthAssumption);
          if (propertyData) {
            portfolioValueAfter += calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
            // Current loan = original loan + any equity released so far
            const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
            totalDebtAfter += currentLoanAmount;
          }
        }
      });

      // Add the current property being purchased (use correct purchase price)
      portfolioValueAfter += correctPurchasePrice;
      totalDebtAfter += loanAmount;

      // Calculate equity
      totalEquityAfter = portfolioValueAfter - totalDebtAfter;

      // Calculate available funds used
      const fundsBreakdown = calculateAvailableFunds(purchasePeriod, purchaseHistory);
      availableFundsUsed = fundsBreakdown.total;

      // Calculate cashflow breakdown for this property
      // Calculate portfolio size for rental recognition
      portfolioSize = purchaseHistory.filter(p => p.period <= purchasePeriod).length + 1;
      rentalRecognitionRate = RENTAL_RECOGNITION_RATE;

      // Get the loan type for this instance (default to 'IO' if not set)
      const currentInstanceLoanType = timelineLoanTypes[instanceId] || 'IO';

      // Calculate cashflow from all properties including this one (use correct purchase price from top of loop)
      [...purchaseHistory, { period: purchasePeriod, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: loanAmount, title: property.title, instanceId: instanceId, loanType: currentInstanceLoanType }].forEach(purchase => {
        const periodsOwned = purchasePeriod - purchase.period;
        const propertyInstance = getInstance(purchase.instanceId);
        if (propertyInstance?.saleYear && propertyInstance.saleYear > 0 && purchasePeriod >= yearToPeriod(propertyInstance.saleYear)) return;
        const propertyData = getPropertyData(purchase.title, propertyInstance?.growthAssumption);

        if (propertyData && purchase.period <= purchasePeriod) {
          // Use instance data if available, otherwise use defaults
          const propertyDetails = propertyInstance
            ? applyPropertyOverrides(propertyData, propertyInstance)
            : propertyData;

          // Calculate current property value with tiered growth
          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);

          // Calculate land tax if not overridden
          const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
            propertyDetails.state,
            currentValue
          );

          // Update property details with calculated land tax for cashflow calculation
          const propertyWithLandTax = {
            ...propertyDetails,
            landTaxOverride: propertyDetails.landTaxOverride ?? landTax
          };

          // 1. Calculate Growth & Inflation Factors
          const growthFactor = currentValue / purchase.cost;
          const inflationFactor = calculateInflationFactor(periodsOwned, profile.inflationRate ?? ANNUAL_INFLATION_RATE);

          // 2. Calculate Detailed Cashflow (Base)
          // This gets us the base rent and expenses for the property instance
          const cashflowBreakdown = calculateDetailedCashflow(
            propertyWithLandTax,
            purchase.loanAmount
          );

          // 3. Rent escalation via flat profile rate (decoupled from property growth)
          const tlYearsOwned = periodsOwned / PERIODS_PER_YEAR;
          const tlRentEscalationFactor = Math.pow(1 + (profile.rentEscalationRate ?? 0.05), tlYearsOwned);
          const adjustedRentalIncome = cashflowBreakdown.adjustedIncome * tlRentEscalationFactor;

          // 4. Apply Inflation to Expenses
          // CRITICAL FIX: Separate Principal from Expenses to avoid double-counting
          const inflationAdjustedOperating = cashflowBreakdown.totalOperatingExpenses * inflationFactor;

          // IMPORTANT: totalNonDeductibleExpenses includes principalPayments + landTax
          // We must exclude principalPayments to avoid double-counting in the netCashflow formula
          const nonDeductibleWithoutPrincipal = cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.principalPayments;
          const inflationAdjustedNonDeductible = nonDeductibleWithoutPrincipal * inflationFactor;

          // 5. Calculate Final Component Values (Operating + Non-Deductible WITHOUT Principal)
          const totalExpenses = inflationAdjustedOperating + inflationAdjustedNonDeductible;

          // 6. Update Accumulators for the UI
          grossRentalIncome += adjustedRentalIncome;
          loanInterest += cashflowBreakdown.loanInterest; // Interest ONLY
          expenses += totalExpenses; // Operating + Land Tax ONLY (Principal excluded)

          // Accumulate expense breakdown components (only inflation, NOT property growth)
          timelineAccCouncilRatesWater += cashflowBreakdown.councilRatesWater * inflationFactor;
          timelineAccStrataFees += cashflowBreakdown.strata * inflationFactor;
          timelineAccInsurance += cashflowBreakdown.buildingInsurance * inflationFactor;
          timelineAccManagementFees += cashflowBreakdown.propertyManagementFee * tlRentEscalationFactor;
          timelineAccRepairsMaintenance += cashflowBreakdown.maintenance * inflationFactor;
          timelineAccLandTax += cashflowBreakdown.landTax * inflationFactor;
        }
      });

      // 7. Correct Net Cashflow Formula
      // Net = Income - Expenses - Interest - Principal Repayments
      // Note: We need to calculate total principal payments separately
      let totalPrincipalPayments = 0;
      [...purchaseHistory, { period: purchasePeriod, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: loanAmount, title: property.title, instanceId: instanceId, loanType: currentInstanceLoanType }].forEach(purchase => {
        const periodsOwned = purchasePeriod - purchase.period;
        const propertyInstance = getInstance(purchase.instanceId);
        if (propertyInstance?.saleYear && propertyInstance.saleYear > 0 && purchasePeriod >= yearToPeriod(propertyInstance.saleYear)) return;
        const propertyData = getPropertyData(purchase.title, propertyInstance?.growthAssumption);

        if (propertyData && purchase.period <= purchasePeriod) {
          const propertyDetails = propertyInstance
            ? applyPropertyOverrides(propertyData, propertyInstance)
            : propertyData;

          const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
          const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
            propertyDetails.state,
            currentValue
          );

          const propertyWithLandTax = {
            ...propertyDetails,
            landTaxOverride: propertyDetails.landTaxOverride ?? landTax
          };

          const cashflowBreakdown = calculateDetailedCashflow(
            propertyWithLandTax,
            purchase.loanAmount
          );

          totalPrincipalPayments += cashflowBreakdown.principalPayments;
        }
      });

      netCashflow = grossRentalIncome - expenses - loanInterest - totalPrincipalPayments;
    }

    // Calculate all purchase costs for this property (using instance fields for all 39 inputs)
    const timelinePropertyInstance = getInstance(instanceId);
    const propertyInstanceForCosts = timelinePropertyInstance ?? getPropertyInstanceDefaults(property.title);

    // Note: instanceLvr already defined above from property instance

    // Calculate stamp duty (with override support)
    const stampDuty = propertyInstanceForCosts.stampDutyOverride ?? calculateStampDuty(
      propertyInstanceForCosts.state,
      correctPurchasePrice,
      false
    );

    // Use the LMI calculated earlier (earlyLmi) for consistency
    // This ensures the same LMI value is used for both loan amount and cash required calculations
    const lmi = earlyLmi;

    // Calculate deposit balance
    const depositBalance = calculateDepositBalance(
      correctPurchasePrice,
      instanceLvr,
      propertyInstanceForCosts.conditionalHoldingDeposit
    );

    // Calculate all one-off costs using property instance (includes all 12 purchase cost fields)
    const oneOffCosts = calculateOneOffCosts(
      propertyInstanceForCosts,
      stampDuty,
      depositBalance
    );

    // Add LMI to total cash required ONLY if not capitalized into the loan
    // When LMI is capitalized, it's added to the loan amount instead of paid upfront
    const lmiCashRequired = isLmiCapitalized ? 0 : lmi;
    const totalCashRequired = propertyInstance?.totalCashRequiredOverride ?? (oneOffCosts.totalCashRequired + lmiCashRequired);

    // Calculate test results
    const depositTestSurplus = availableFundsUsed - totalCashRequired;
    const depositTestPass = depositTestSurplus >= 0;

    // Enhanced serviceability test with rental income contribution
    const baseCapacity = profile.borrowingCapacity * SERVICEABILITY_FACTOR;
    const rentalContribution = grossRentalIncome * RENTAL_SERVICEABILITY_CONTRIBUTION_RATE;
    const enhancedCapacity = baseCapacity + rentalContribution;
    const maxAnnualInterest = enhancedCapacity;
    const serviceabilityTestSurplus = maxAnnualInterest - loanInterest;
    const serviceabilityTestPass = serviceabilityTestSurplus >= 0;

    // Initialize funds breakdown variables with defaults
    let cumulativeSavings = 0;
    let baseDeposit = 0;
    let equityRelease = 0;
    let cashflowReinvestment = 0;

    // Funding breakdown for THIS purchase (SINGLE SOURCE OF TRUTH)
    let fundingFromCash = 0;
    let fundingFromSavings = 0;
    let fundingFromEquity = 0;

    // Balances AFTER this purchase (SINGLE SOURCE OF TRUTH for useRoadmapData)
    let cashAfterPurchase = 0;
    let savingsAfterPurchase = 0;
    let equityUsedAfterPurchase = 0;

    // Calculate available funds breakdown only if property is affordable
    // CRITICAL: These values represent what was available AT TIME OF PURCHASE (before this purchase)
    // This is used for the Deposit Test modal to show "what we had" when making the decision
    if (result.period !== Infinity) {
      const purchasePeriod = result.period;
      const fundsBreakdownFinal = calculateAvailableFunds(purchasePeriod, purchaseHistory);

      // Use the "remaining" values which represent what's available BEFORE this purchase
      // (purchaseHistory doesn't include current purchase yet)
      baseDeposit = fundsBreakdownFinal.cashRemaining;
      cumulativeSavings = fundsBreakdownFinal.cumulativeSavings;  // Use accumulated savings (for display), not remaining
      equityRelease = fundsBreakdownFinal.equityRemaining;
      cashflowReinvestment = fundsBreakdownFinal.cashflowReinvestment;

      // ============================================================================
      // CALCULATE FUNDING BREAKDOWN FOR THIS PURCHASE (SINGLE SOURCE OF TRUTH)
      // This determines exactly how much comes from each source
      // Equity → Cash → Savings (with 75% savings buffer)
      // ============================================================================
      let remaining = totalCashRequired;

      // 1. EQUITY FIRST - leverage existing portfolio
      fundingFromEquity = Math.min(remaining, equityRelease);
      remaining -= fundingFromEquity;

      // 2. CASH SECOND - from deposit pool
      fundingFromCash = Math.min(remaining, baseDeposit);
      remaining -= fundingFromCash;

      // 3. SAVINGS LAST - use all accumulated savings (already only 25% of total)
      const savingsAvailableForPurchase = cumulativeSavings;
      fundingFromSavings = Math.min(remaining, savingsAvailableForPurchase);

      // Calculate balances AFTER this purchase (SINGLE SOURCE OF TRUTH)
      // These will be passed to useRoadmapData to avoid recalculation
      cashAfterPurchase = baseDeposit - fundingFromCash;
      savingsAfterPurchase = cumulativeSavings - fundingFromSavings;
      equityUsedAfterPurchase = fundsBreakdownFinal.totalEquityUsed + fundingFromEquity;

      // Update cumulative equity released tracking on previous purchases
      purchaseHistory.forEach(purchase => {
        if (purchase.period <= purchasePeriod) {
          const periodsOwned = purchasePeriod - purchase.period;
          const erInst = getInstance(purchase.instanceId);
          if (erInst?.saleYear && erInst.saleYear > 0 && purchasePeriod >= yearToPeriod(erInst.saleYear)) return;
          const propertyData = getPropertyData(purchase.title, erInst?.growthAssumption);
          if (propertyData) {
            const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
            const maxLoan = currentValue * EQUITY_EXTRACTION_LVR_CAP;
            const equityReleasedFromProperty = Math.max(0, maxLoan - purchase.loanAmount);
            purchase.cumulativeEquityReleased = equityReleasedFromProperty;
          }
        }
      });
    }

    // BORROWING CAPACITY CEILING for timeline display — SINGLE SOURCE OF TRUTH
    const purchasePeriodForCeiling = result.period !== Infinity ? result.period : 1;
    const timelineEffectiveBorrowingCapacity = calculateBorrowingCeiling(purchasePeriodForCeiling, {
      statedBC: profile.borrowingCapacity ?? 0,
      baseSalary: profile.baseSalary ?? 60000,
      salaryMultiplier: profile.salaryServiceabilityMultiplier ?? 6.0,
      wageGrowth: profile.wageGrowthRate ?? ANNUAL_WAGE_GROWTH_RATE,
      grossRentalIncome,
      eventBlocks,
    });

    // Get the loan type for this specific instance (default to 'IO' if not set)
    const instanceLoanType = timelineLoanTypes[instanceId] || 'IO';

    const timelineProperty: TimelineProperty = {
      id: `${property.id}_${index}`,
      instanceId: instanceId,
      title: property.title,
      cost: correctPurchasePrice,
      depositRequired: correctDepositRequired,
      loanAmount: loanAmount,
      period: result.period !== Infinity ? result.period : Infinity,
      affordableYear: result.period !== Infinity ? periodToYear(result.period) : Infinity,
      displayPeriod: result.period !== Infinity ? periodToDisplay(result.period) : 'N/A',
      status: (result.period === Infinity || !manualPlacementAffordable) ? 'challenging' : 'feasible',
      propertyIndex: index,
      portfolioValueAfter: portfolioValueAfter,
      totalEquityAfter: totalEquityAfter,
      totalDebtAfter: totalDebtAfter,
      availableFundsUsed: availableFundsUsed,
      loanType: instanceLoanType,

      // Cashflow breakdown
      grossRentalIncome,
      loanInterest,
      expenses,
      netCashflow,

      // Expense breakdown
      expenseBreakdown: {
        councilRatesWater: timelineAccCouncilRatesWater,
        strataFees: timelineAccStrataFees,
        insurance: timelineAccInsurance,
        managementFees: timelineAccManagementFees,
        repairsMaintenance: timelineAccRepairsMaintenance,
        landTax: timelineAccLandTax,
        other: timelineAccOther,
      },

      // Test details
      depositTestSurplus,
      depositTestPass,
      serviceabilityTestSurplus,
      serviceabilityTestPass,
      borrowingCapacityUsed: loanAmount,
      // CRITICAL: This calculation MUST match the borrowing capacity test in checkAffordability
      // Both use: effectiveBorrowingCapacity - totalDebt (where totalDebt is filtered by year)
      borrowingCapacityRemaining: Math.max(0, timelineEffectiveBorrowingCapacity - totalDebtAfter),

      // Flags and rates
      isGapRuleBlocked: false, // Set based on gap rule logic
      rentalRecognitionRate,

      // Portfolio state before purchase (use correct purchase price)
      portfolioValueBefore: portfolioValueAfter - correctPurchasePrice,
      totalEquityBefore: totalEquityAfter - (correctPurchasePrice - loanAmount),
      totalDebtBefore: totalDebtAfter - loanAmount,

      // Available funds breakdown
      baseDeposit,
      cumulativeSavings,
      cashflowReinvestment,
      equityRelease,

      // Acquisition costs (using all 12 purchase cost fields from instance)
      state: propertyInstanceForCosts.state,
      acquisitionCosts: {
        stampDuty: stampDuty,
        lmi: lmi,
        legalFees: oneOffCosts.conveyancing,
        inspectionFees: oneOffCosts.buildingPestInspection + oneOffCosts.plumbingElectricalInspections + oneOffCosts.independentValuation,
        // Other fees includes ALL remaining one-off costs
        otherFees: oneOffCosts.mortgageFees +
                   oneOffCosts.engagementFee +
                   oneOffCosts.conditionalHoldingDeposit +
                   oneOffCosts.buildingInsuranceUpfront +
                   oneOffCosts.maintenanceAllowancePostSettlement,
        total: oneOffCosts.totalCashRequired + lmi,
      },
      totalCashRequired: totalCashRequired,

      // FUNDING BREAKDOWN - SINGLE SOURCE OF TRUTH
      // Calculated here, consumed by useRoadmapData for display
      fundingBreakdown: {
        cash: propertyInstance?.fundingCashOverride ?? fundingFromCash,
        savings: propertyInstance?.fundingSavingsOverride ?? fundingFromSavings,
        equity: propertyInstance?.fundingEquityOverride ?? fundingFromEquity,
        total: propertyInstance?.fundingTotalOverride ?? (fundingFromCash + fundingFromSavings + fundingFromEquity),
      },

      // RUNNING BALANCES AFTER PURCHASE - SINGLE SOURCE OF TRUTH
      // Used by useRoadmapData to display correct balances without recalculating
      balancesAfterPurchase: {
        cash: cashAfterPurchase,
        savings: savingsAfterPurchase,
        equityUsed: equityUsedAfterPurchase,
      },
    };

    timelineProperties.push(timelineProperty);

    // Add to purchase history if affordable (use correct purchase price)
    if (result.period !== Infinity) {
      purchaseHistory.push({
        period: result.period,
        cost: correctPurchasePrice,
        depositRequired: correctDepositRequired,
        totalCashRequired: totalCashRequired, // Include full acquisition costs for equity-first allocation
        loanAmount: loanAmount,
        // Key purchase history by the resolvable cell id, NOT property.title.
        // Since 13961b4 property.title is the client-facing category label
        // ("Equity Growth Property") which getPropertyData() cannot resolve to a
        // template — so the engine's equity-release loop skipped every prior
        // property and released $0, starving the deposit test. The brief
        // (planPreCheck) keys by cell id, which is why it disagreed. Mirror it.
        title: instanceId.replace(/_instance_\d+$/, ''),
        instanceId: instanceId,
        loanType: instanceLoanType,
        cumulativeEquityReleased: 0 // Initialize equity tracking
      });

      // No longer sorting purchaseHistory - FIFO ordering is enforced by minPeriod constraint
      // Each property is scheduled at or after the previous one, so history is naturally chronological
    }
  });

  // Return properties in user-defined order (FIFO - as they were added)
  // No longer sorting by period - properties stay in the order they were added
  // DEBUG: compare with pre-check (dev-only — hot-path logging gated for production)
  if (import.meta.env.DEV && timelineProperties.some(p => p.status === 'challenging')) {
    console.warn('[Dashboard Engine] Profile:', { BC: profile.borrowingCapacity, salary: profile.baseSalary, deposit: profile.depositPool, savings: profile.annualSavings, currentDebt: profile.currentDebt, portfolioValue: profile.portfolioValue, interestRate: profile.interestRate, wageGrowth: profile.wageGrowthRate, equityFactor: profile.equityFactor, equityRelease: profile.equityReleaseFactor, salaryMult: profile.salaryServiceabilityMultiplier });
    timelineProperties.forEach((p, i) => {
      const inst = getInstance(p.instanceId);
      console.warn(`  [${i}] ${p.title} period=${p.period} status=${p.status} BC_rem=${Math.round(p.borrowingCapacityRemaining/1000)}k entity=${inst?.entity ?? 'n/a'} cost=${Math.round(p.cost/1000)}k loan=${Math.round(p.loanAmount/1000)}k`);
    });
  }
  return timelineProperties;
}
