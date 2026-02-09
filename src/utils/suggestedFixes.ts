import type { TimelineProperty } from '@/types/property';
import type { GuardrailViolation } from '@/utils/guardrailValidator';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
import type { EventType, EventCategory, EventPayload } from '@/contexts/PropertySelectionContext';

/**
 * A suggested fix for a guardrail violation
 */
export interface SuggestedFix {
  /** The field to adjust */
  field: 'purchasePrice' | 'lvr' | 'rentPerWeek' | 'interestRate' | 'oneOffCosts' | 'lmiCapitalization';
  /** Current value of the field */
  currentValue: number;
  /** Suggested new value to resolve the violation */
  suggestedValue: number;
  /** Human-readable explanation of the fix */
  explanation: string;
  /** Which violation type this fix addresses */
  violationType: 'deposit' | 'borrowing' | 'serviceability';
  /** Action type for special fix types */
  actionType?: 'editCosts' | 'capitalizeLmi';
}

/**
 * A suggested event to add to the timeline to resolve a guardrail violation
 */
export interface SuggestedEventFix {
  /** The type of event to add */
  eventType: EventType;
  /** The event category */
  category: EventCategory;
  /** The payload for the event */
  payload: EventPayload;
  /** Human-readable explanation of why this event helps */
  explanation: string;
  /** Which violation type this event addresses */
  violationType: 'deposit' | 'borrowing' | 'serviceability';
  /** Formatted amount for display */
  formattedAmount: string;
}

/**
 * Current property values used for calculating fixes
 */
interface CurrentPropertyValues {
  purchasePrice: number;
  lvr: number;
  rentPerWeek: number;
}

/**
 * Extended property values including one-off costs for comprehensive fix suggestions
 */
export interface ExtendedPropertyValues extends CurrentPropertyValues {
  /** Total one-off purchase costs */
  totalOneOffCosts?: number;
  /** Current LMI amount (if paid upfront) */
  lmiAmount?: number;
  /** Whether LMI is currently waived */
  lmiWaiver?: boolean;
  /** Property instance for detailed cost access */
  propertyInstance?: PropertyInstanceDetails | null;
}

/**
 * Format currency for display in fix explanations
 */
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `$${Math.round(absValue / 1000)}K`;
  }
  return `$${Math.round(absValue)}`;
};

/**
 * Round to nearest specified increment
 */
const roundToNearest = (value: number, increment: number): number => {
  return Math.round(value / increment) * increment;
};

/**
 * Calculate suggested fixes for guardrail violations.
 * 
 * Key principle: Only property-level fields can be adjusted to fit the strategy
 * within client constraints. Client inputs (income, deposit pool, borrowing capacity)
 * are sacred and cannot be modified.
 * 
 * @param property - The timeline property with violations
 * @param violations - Array of guardrail violations
 * @param currentValues - Current adjusted values (may differ from property defaults)
 * @param availableFunds - Available funds at the target purchase period
 * @param extendedValues - Optional extended values including one-off costs and LMI details
 * @returns Array of suggested fixes
 */
export const calculateSuggestedFixes = (
  property: TimelineProperty,
  violations: GuardrailViolation[],
  currentValues: CurrentPropertyValues,
  availableFunds: number,
  extendedValues?: ExtendedPropertyValues
): SuggestedFix[] => {
  const fixes: SuggestedFix[] = [];

  violations.forEach((violation) => {
    switch (violation.type) {
      case 'deposit':
        // Calculate fixes for deposit shortfall
        calculateDepositFixes(property, violation, currentValues, availableFunds, fixes);
        // Calculate one-off cost fixes if extended values provided
        if (extendedValues) {
          calculateOneOffCostFixes(violation, extendedValues, fixes);
          calculateLMICapitalizationFix(violation, extendedValues, fixes);
        }
        break;

      case 'borrowing':
        // Calculate fixes for borrowing capacity issues
        calculateBorrowingFixes(property, violation, currentValues, fixes);
        break;

      case 'serviceability':
        // Calculate fixes for serviceability issues
        calculateServiceabilityFixes(property, violation, currentValues, fixes);
        break;
    }
  });

  // Remove duplicate suggestions and return
  return deduplicateFixes(fixes);
};

/**
 * Calculate suggested fixes for deposit violations
 * 
 * Key insight: totalCashRequired = deposit + stampDuty + lmi + otherCosts
 * where:
 *   deposit = price * (1 - LVR/100)
 *   stampDuty ≈ price * 0.04 to 0.055 (varies by state, use 4.5% average)
 *   lmi = varies by LVR (0 if LVR <= 80%, can be $10k-$50k+ for high LVR)
 *   otherCosts ≈ $15,000 to $25,000 (inspections, conveyancing, etc.)
 */
const calculateDepositFixes = (
  property: TimelineProperty,
  violation: GuardrailViolation,
  currentValues: CurrentPropertyValues,
  availableFunds: number,
  fixes: SuggestedFix[]
): void => {
  const { purchasePrice, lvr } = currentValues;
  const shortfall = violation.shortfall;

  // Estimate costs that scale with price
  const STAMP_DUTY_RATE = 0.045; // ~4.5% average across states
  const FIXED_COSTS = 20000; // Approximate fixed costs (inspections, conveyancing, etc.)
  
  // For LVR > 80%, estimate LMI as percentage of loan amount
  const estimateLMI = (price: number, lvrPercent: number): number => {
    if (lvrPercent <= 80) return 0;
    const loanAmount = price * (lvrPercent / 100);
    // LMI roughly 1-4% of loan for LVR 81-95%
    const lmiRate = (lvrPercent - 80) * 0.002 + 0.01; // 1% at 81%, up to ~4% at 95%
    return loanAmount * lmiRate;
  };

  // Fix 1: Reduce purchase price
  // Total cash required ≈ price * (1 - LVR/100) + price * stampDutyRate + LMI + fixedCosts
  // Solve for price: price = (availableFunds - fixedCosts - LMI) / (1 - LVR/100 + stampDutyRate)
  const depositRate = (100 - lvr) / 100;
  const cashRateExLMI = depositRate + STAMP_DUTY_RATE;
  
  // Iterative approach to find max affordable price (because LMI depends on price)
  let maxAffordablePrice = purchasePrice;
  for (let i = 0; i < 5; i++) {
    const estimatedLMI = estimateLMI(maxAffordablePrice, lvr);
    const availableForPriceRelatedCosts = availableFunds - FIXED_COSTS - estimatedLMI;
    maxAffordablePrice = availableForPriceRelatedCosts / cashRateExLMI;
  }
  
  // Apply safety margin (5%) to ensure we actually pass
  maxAffordablePrice = maxAffordablePrice * 0.95;
  
  if (maxAffordablePrice > 0 && maxAffordablePrice < purchasePrice) {
    const suggestedPrice = roundToNearest(maxAffordablePrice, 5000);
    
    if (suggestedPrice >= 100000 && suggestedPrice < purchasePrice) {
      fixes.push({
        field: 'purchasePrice',
        currentValue: purchasePrice,
        suggestedValue: suggestedPrice,
        explanation: `Reduce purchase price to ${formatCurrency(suggestedPrice)} to meet deposit requirement`,
        violationType: 'deposit',
      });
    }
  }

  // Fix 2: Increase LVR (borrow more, need less deposit)
  // This reduces the deposit portion but may increase LMI
  // Only suggest if it actually helps (i.e., deposit savings > LMI increase)
  
  // Calculate current total cash required estimate
  const currentLMI = estimateLMI(purchasePrice, lvr);
  const currentDeposit = purchasePrice * (100 - lvr) / 100;
  const currentStampDuty = purchasePrice * STAMP_DUTY_RATE;
  const currentTotalCash = currentDeposit + currentStampDuty + currentLMI + FIXED_COSTS;
  
  // Try increasing LVR to find one that works
  for (let testLvr = lvr + 1; testLvr <= 95; testLvr++) {
    const testDeposit = purchasePrice * (100 - testLvr) / 100;
    const testLMI = estimateLMI(purchasePrice, testLvr);
    const testTotalCash = testDeposit + currentStampDuty + testLMI + FIXED_COSTS;
    
    // Check if this LVR brings total cash required below available funds (with 5% margin)
    if (testTotalCash * 1.05 <= availableFunds) {
      fixes.push({
        field: 'lvr',
        currentValue: lvr,
        suggestedValue: testLvr,
        explanation: `Increase LVR to ${testLvr}% to reduce deposit needed${testLvr > 80 ? ' (will require LMI)' : ''}`,
        violationType: 'deposit',
      });
      break;
    }
  }
};

/**
 * Calculate suggested fixes for borrowing capacity violations
 * 
 * The shortfall represents how much the loan amount exceeds borrowing capacity.
 * We need to either reduce the loan amount or change the property to reduce the loan needed.
 */
const calculateBorrowingFixes = (
  property: TimelineProperty,
  violation: GuardrailViolation,
  currentValues: CurrentPropertyValues,
  fixes: SuggestedFix[]
): void => {
  const { purchasePrice, lvr } = currentValues;
  const shortfall = Math.abs(violation.shortfall);

  // Fix 1: Reduce purchase price to reduce loan amount needed
  // Loan = purchasePrice * (LVR/100)
  // If we need to reduce loan by shortfall, reduce price by shortfall / (LVR/100)
  // Add 10% buffer to ensure we pass
  const priceReductionNeeded = (shortfall * 1.1) / (lvr / 100);
  const suggestedPrice = roundToNearest(purchasePrice - priceReductionNeeded, 5000);
  
  if (suggestedPrice >= 100000 && suggestedPrice < purchasePrice) {
    fixes.push({
      field: 'purchasePrice',
      currentValue: purchasePrice,
      suggestedValue: suggestedPrice,
      explanation: `Reduce purchase price to ${formatCurrency(suggestedPrice)} to fit borrowing capacity`,
      violationType: 'borrowing',
    });
  }

  // Fix 2: Reduce LVR (smaller loan, but need more deposit)
  // This only works if they have sufficient deposit
  const currentLoan = purchasePrice * (lvr / 100);
  const maxLoan = currentLoan - shortfall;
  // Add 5% buffer to ensure we pass
  const requiredLvr = ((maxLoan * 0.95) / purchasePrice) * 100;
  
  if (requiredLvr >= 50 && requiredLvr < lvr) {
    const suggestedLvr = Math.max(50, Math.floor(requiredLvr));
    
    fixes.push({
      field: 'lvr',
      currentValue: lvr,
      suggestedValue: suggestedLvr,
      explanation: `Reduce LVR to ${suggestedLvr}% to reduce loan amount (requires more deposit)`,
      violationType: 'borrowing',
    });
  }
};

/**
 * Calculate suggested fixes for serviceability violations
 * 
 * Serviceability tests whether the borrower can service the loan payments.
 * The shortfall represents the annual payment gap (how much more payment capacity is needed).
 * 
 * Key factors:
 * - Loan amount affects interest payments: interest = loan * rate
 * - Rental income partially offsets payments (at reduced recognition rate ~60-80%)
 * - Assessment rate is typically higher than actual rate (e.g., 8.5% vs 6.5%)
 */
const calculateServiceabilityFixes = (
  property: TimelineProperty,
  violation: GuardrailViolation,
  currentValues: CurrentPropertyValues,
  fixes: SuggestedFix[]
): void => {
  const { purchasePrice, lvr, rentPerWeek } = currentValues;
  const shortfall = Math.abs(violation.shortfall);

  // Use typical assessment rate and rental recognition rate
  const ASSESSMENT_RATE = 0.085; // 8.5% assessment rate
  const RENTAL_RECOGNITION = 0.70; // Banks typically recognize 70% of rental income
  
  // Fix 1: Increase rental income
  // Each $1/week rent = $52/year gross, but only 70% is recognized for serviceability
  // So to improve serviceability by $shortfall, we need shortfall / (52 * 0.70) more per week
  // Add 20% buffer to ensure we pass
  const additionalWeeklyRent = Math.ceil((shortfall * 1.2) / (52 * RENTAL_RECOGNITION));
  const suggestedRent = roundToNearest(rentPerWeek + additionalWeeklyRent, 10);
  
  // Check if the suggested rent is reasonable (yield should be achievable, typically 3-6%)
  const suggestedYield = (suggestedRent * 52 / purchasePrice) * 100;
  
  if (suggestedRent > rentPerWeek && suggestedYield <= 7) {
    // Only suggest if yield is still realistic
    fixes.push({
      field: 'rentPerWeek',
      currentValue: rentPerWeek,
      suggestedValue: suggestedRent,
      explanation: `Increase weekly rent to $${suggestedRent}/week to improve serviceability (${suggestedYield.toFixed(1)}% yield)`,
      violationType: 'serviceability',
    });
  }

  // Fix 2: Reduce purchase price to reduce loan servicing costs
  // Annual interest = loan * rate = price * (LVR/100) * assessmentRate
  // To reduce annual interest by shortfall, reduce loan by shortfall / assessmentRate
  // Then reduce price by that amount / (LVR/100)
  // Add 15% buffer to ensure we pass
  const loanReductionNeeded = (shortfall * 1.15) / ASSESSMENT_RATE;
  const priceReductionNeeded = loanReductionNeeded / (lvr / 100);
  const suggestedPrice = roundToNearest(purchasePrice - priceReductionNeeded, 5000);
  
  if (suggestedPrice >= 100000 && suggestedPrice < purchasePrice) {
    fixes.push({
      field: 'purchasePrice',
      currentValue: purchasePrice,
      suggestedValue: suggestedPrice,
      explanation: `Reduce purchase price to ${formatCurrency(suggestedPrice)} to lower loan servicing costs`,
      violationType: 'serviceability',
    });
  }

  // Fix 3: Reduce LVR (smaller loan = lower interest payments)
  // Calculate how much LVR reduction is needed
  // Current annual interest = price * (lvr/100) * assessmentRate
  // We need to reduce by shortfall, so new interest = current - shortfall
  // new loan = (current interest - shortfall) / assessmentRate
  // new LVR = new loan / price * 100
  const currentAnnualInterest = purchasePrice * (lvr / 100) * ASSESSMENT_RATE;
  const targetAnnualInterest = currentAnnualInterest - (shortfall * 1.15);
  const targetLoan = targetAnnualInterest / ASSESSMENT_RATE;
  const targetLvr = Math.floor((targetLoan / purchasePrice) * 100);
  
  if (targetLvr >= 50 && targetLvr < lvr) {
    fixes.push({
      field: 'lvr',
      currentValue: lvr,
      suggestedValue: targetLvr,
      explanation: `Reduce LVR to ${targetLvr}% to reduce loan interest payments`,
      violationType: 'serviceability',
    });
  }
};

/**
 * Calculate suggested fixes for one-off purchase costs
 * Suggests reducing one-off costs by the shortfall amount
 */
const calculateOneOffCostFixes = (
  violation: GuardrailViolation,
  extendedValues: ExtendedPropertyValues,
  fixes: SuggestedFix[]
): void => {
  const { totalOneOffCosts } = extendedValues;
  const shortfall = violation.shortfall;

  // Only suggest if we have one-off costs data and shortfall is reasonable to address via costs
  if (totalOneOffCosts === undefined || totalOneOffCosts <= 0) return;
  
  // Calculate suggested reduction - can't go below a minimum threshold
  const minReasonableCosts = 5000; // Minimum reasonable one-off costs
  const suggestedReduction = Math.min(shortfall, totalOneOffCosts - minReasonableCosts);
  
  // Only suggest if the reduction is meaningful (at least $1000)
  if (suggestedReduction >= 1000) {
    const suggestedCosts = totalOneOffCosts - suggestedReduction;
    
    fixes.push({
      field: 'oneOffCosts',
      currentValue: totalOneOffCosts,
      suggestedValue: suggestedCosts,
      explanation: `Reduce one-off costs by ${formatCurrency(suggestedReduction)}`,
      violationType: 'deposit',
      actionType: 'editCosts',
    });
  }
};

/**
 * Calculate LMI capitalization fix
 * Suggests financing LMI within the loan to free up cash when LMI is paid upfront
 */
const calculateLMICapitalizationFix = (
  violation: GuardrailViolation,
  extendedValues: ExtendedPropertyValues,
  fixes: SuggestedFix[]
): void => {
  const { lmiAmount, lmiWaiver, lvr } = extendedValues;

  // Only suggest if LMI is being paid and is not waived
  if (lmiWaiver || !lmiAmount || lmiAmount <= 0) return;
  
  // Only relevant for LVR > 80% where LMI applies
  if (lvr <= 80) return;
  
  // Suggest capitalizing LMI to free up cash
  fixes.push({
    field: 'lmiCapitalization',
    currentValue: lmiAmount,
    suggestedValue: 0, // 0 upfront cost when capitalized
    explanation: `Finance LMI within the loan to free up ${formatCurrency(lmiAmount)} cash`,
    violationType: 'deposit',
    actionType: 'capitalizeLmi',
  });
};

/**
 * Remove duplicate fixes (same field with similar suggested values)
 */
const deduplicateFixes = (fixes: SuggestedFix[]): SuggestedFix[] => {
  const seen = new Map<string, SuggestedFix>();

  for (const fix of fixes) {
    const key = fix.field;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, fix);
    } else {
      // Keep the fix that makes a bigger change (more likely to resolve the issue)
      const existingDiff = Math.abs(existing.suggestedValue - existing.currentValue);
      const newDiff = Math.abs(fix.suggestedValue - fix.currentValue);

      if (newDiff > existingDiff) {
        seen.set(key, fix);
      }
    }
  }

  return Array.from(seen.values());
};

/**
 * Calculate the rental yield percentage based on rent and price
 */
export const calculateRentalYield = (rentPerWeek: number, purchasePrice: number): number => {
  if (purchasePrice <= 0) return 0;
  const annualRent = rentPerWeek * 52;
  return (annualRent / purchasePrice) * 100;
};

/**
 * Calculate required weekly rent for a target yield
 */
export const calculateRentForYield = (purchasePrice: number, targetYield: number): number => {
  const annualRent = purchasePrice * (targetYield / 100);
  return Math.round(annualRent / 52);
};

/**
 * Calculate suggested event-based fixes for guardrail violations.
 * 
 * These are "life event" solutions that can help resolve affordability issues
 * through income changes, windfalls, or other events rather than just adjusting
 * the property parameters.
 * 
 * @param violations - Array of current guardrail violations
 * @param currentSalary - Client's current annual salary
 * @param partnerSalary - Partner's current annual salary (0 if no partner)
 * @param targetPeriod - The period where the property is being placed
 * @returns Array of suggested event fixes
 */
export const calculateEventBasedFixes = (
  violations: GuardrailViolation[],
  currentSalary: number,
  partnerSalary: number,
  targetPeriod: number
): SuggestedEventFix[] => {
  const eventFixes: SuggestedEventFix[] = [];

  violations.forEach((violation) => {
    const shortfall = Math.abs(violation.shortfall);

    switch (violation.type) {
      case 'deposit':
        // For deposit shortfall, suggest cash injection events
        calculateDepositEventFixes(shortfall, eventFixes);
        break;

      case 'serviceability':
        // For serviceability shortfall, suggest income-boosting events
        calculateServiceabilityEventFixes(
          shortfall,
          currentSalary,
          partnerSalary,
          eventFixes
        );
        break;

      case 'borrowing':
        // For borrowing capacity shortfall, suggest income-boosting events
        // (since borrowing capacity is typically based on income)
        calculateBorrowingEventFixes(
          shortfall,
          currentSalary,
          partnerSalary,
          eventFixes
        );
        break;
    }
  });

  return eventFixes;
};

/**
 * Calculate event suggestions for deposit shortfall
 * Deposit issues can be resolved with cash injections
 */
const calculateDepositEventFixes = (
  shortfall: number,
  eventFixes: SuggestedEventFix[]
): void => {
  // Add 5% buffer to ensure we actually pass
  const requiredAmount = Math.ceil(shortfall * 1.05);
  const roundedAmount = roundToNearest(requiredAmount, 1000);

  // Suggestion 1: Bonus/Windfall
  eventFixes.push({
    eventType: 'bonus_windfall',
    category: 'income',
    payload: {
      bonusAmount: roundedAmount,
    },
    explanation: `Receive a ${formatCurrency(roundedAmount)} bonus or windfall to cover the deposit shortfall`,
    violationType: 'deposit',
    formattedAmount: formatCurrency(roundedAmount),
  });

  // Suggestion 2: Inheritance
  eventFixes.push({
    eventType: 'inheritance',
    category: 'life',
    payload: {
      cashAmount: roundedAmount,
    },
    explanation: `Receive ${formatCurrency(roundedAmount)} inheritance to cover the deposit shortfall`,
    violationType: 'deposit',
    formattedAmount: formatCurrency(roundedAmount),
  });
};

/**
 * Calculate event suggestions for serviceability shortfall
 * Serviceability is improved by increasing income (which improves borrowing capacity and cash flow)
 */
const calculateServiceabilityEventFixes = (
  shortfall: number,
  currentSalary: number,
  partnerSalary: number,
  eventFixes: SuggestedEventFix[]
): void => {
  // Serviceability shortfall is typically expressed as an annual amount
  // Banks assess loans at ~8.5% assessment rate
  // A salary increase helps because it increases maximum borrowing capacity
  // 
  // Rough rule: Each $1 of gross income adds ~$0.30-0.35 to annual servicing capacity
  // (after tax and living expenses are considered)
  // So to improve serviceability by $X, need salary increase of roughly $X / 0.32
  const INCOME_TO_SERVICEABILITY_RATIO = 0.32;
  
  // Add 15% buffer to ensure we pass
  const requiredIncomeIncrease = Math.ceil((shortfall * 1.15) / INCOME_TO_SERVICEABILITY_RATIO);
  const roundedIncrease = roundToNearest(requiredIncomeIncrease, 5000);

  // Suggestion 1: Salary increase for primary earner
  const newSalary = currentSalary + roundedIncrease;
  eventFixes.push({
    eventType: 'salary_change',
    category: 'income',
    payload: {
      newSalary: newSalary,
      previousSalary: currentSalary,
    },
    explanation: `Increase salary from ${formatCurrency(currentSalary)} to ${formatCurrency(newSalary)} (+${formatCurrency(roundedIncrease)}/year)`,
    violationType: 'serviceability',
    formattedAmount: `+${formatCurrency(roundedIncrease)}/yr`,
  });

  // Suggestion 2: Partner income change (if partner exists)
  if (partnerSalary > 0) {
    const newPartnerSalary = partnerSalary + roundedIncrease;
    eventFixes.push({
      eventType: 'partner_income_change',
      category: 'income',
      payload: {
        newPartnerSalary: newPartnerSalary,
        previousPartnerSalary: partnerSalary,
      },
      explanation: `Increase partner salary from ${formatCurrency(partnerSalary)} to ${formatCurrency(newPartnerSalary)} (+${formatCurrency(roundedIncrease)}/year)`,
      violationType: 'serviceability',
      formattedAmount: `+${formatCurrency(roundedIncrease)}/yr`,
    });
  } else {
    // Suggest adding partner income if no partner
    eventFixes.push({
      eventType: 'partner_income_change',
      category: 'income',
      payload: {
        newPartnerSalary: roundedIncrease,
        previousPartnerSalary: 0,
      },
      explanation: `Add partner with ${formatCurrency(roundedIncrease)}/year income to improve serviceability`,
      violationType: 'serviceability',
      formattedAmount: `+${formatCurrency(roundedIncrease)}/yr`,
    });
  }
};

/**
 * Calculate event suggestions for borrowing capacity shortfall
 * Borrowing capacity is primarily determined by income
 */
const calculateBorrowingEventFixes = (
  shortfall: number,
  currentSalary: number,
  partnerSalary: number,
  eventFixes: SuggestedEventFix[]
): void => {
  // Borrowing capacity shortfall means the loan amount exceeds what the bank will lend
  // Banks typically lend 5-7x gross income (varies by lender and circumstances)
  // Using a conservative 5.5x multiplier
  const INCOME_MULTIPLIER = 5.5;
  
  // Add 10% buffer to ensure we pass
  const requiredIncomeIncrease = Math.ceil((shortfall * 1.1) / INCOME_MULTIPLIER);
  const roundedIncrease = roundToNearest(requiredIncomeIncrease, 5000);

  // Suggestion 1: Salary increase for primary earner
  const newSalary = currentSalary + roundedIncrease;
  eventFixes.push({
    eventType: 'salary_change',
    category: 'income',
    payload: {
      newSalary: newSalary,
      previousSalary: currentSalary,
    },
    explanation: `Increase salary from ${formatCurrency(currentSalary)} to ${formatCurrency(newSalary)} to boost borrowing capacity`,
    violationType: 'borrowing',
    formattedAmount: `+${formatCurrency(roundedIncrease)}/yr`,
  });

  // Suggestion 2: Partner income change
  if (partnerSalary > 0) {
    const newPartnerSalary = partnerSalary + roundedIncrease;
    eventFixes.push({
      eventType: 'partner_income_change',
      category: 'income',
      payload: {
        newPartnerSalary: newPartnerSalary,
        previousPartnerSalary: partnerSalary,
      },
      explanation: `Increase partner salary from ${formatCurrency(partnerSalary)} to ${formatCurrency(newPartnerSalary)} to boost borrowing capacity`,
      violationType: 'borrowing',
      formattedAmount: `+${formatCurrency(roundedIncrease)}/yr`,
    });
  } else {
    eventFixes.push({
      eventType: 'partner_income_change',
      category: 'income',
      payload: {
        newPartnerSalary: roundedIncrease,
        previousPartnerSalary: 0,
      },
      explanation: `Add partner with ${formatCurrency(roundedIncrease)}/year income to boost borrowing capacity`,
      violationType: 'borrowing',
      formattedAmount: `+${formatCurrency(roundedIncrease)}/yr`,
    });
  }
};
