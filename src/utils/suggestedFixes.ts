import type { TimelineProperty } from '@/types/property';
import type { GuardrailViolation } from '@/utils/guardrailValidator';

/**
 * A suggested fix for a guardrail violation
 */
export interface SuggestedFix {
  /** The field to adjust */
  field: 'purchasePrice' | 'lvr' | 'rentPerWeek' | 'interestRate';
  /** Current value of the field */
  currentValue: number;
  /** Suggested new value to resolve the violation */
  suggestedValue: number;
  /** Human-readable explanation of the fix */
  explanation: string;
  /** Which violation type this fix addresses */
  violationType: 'deposit' | 'borrowing' | 'serviceability';
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
 * @returns Array of suggested fixes
 */
export const calculateSuggestedFixes = (
  property: TimelineProperty,
  violations: GuardrailViolation[],
  currentValues: CurrentPropertyValues,
  availableFunds: number
): SuggestedFix[] => {
  const fixes: SuggestedFix[] = [];

  violations.forEach((violation) => {
    switch (violation.type) {
      case 'deposit':
        // Calculate fixes for deposit shortfall
        calculateDepositFixes(property, violation, currentValues, availableFunds, fixes);
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

  // Fix 1: Reduce purchase price
  // If shortfall is $X and deposit % is (100 - LVR)%, then:
  // newPrice = (availableFunds - buffer) / (1 - LVR/100)
  const depositPercentage = (100 - lvr) / 100;
  const buffer = 5000; // Small buffer for fees
  const maxAffordablePrice = (availableFunds - buffer) / depositPercentage;
  
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
  // newLVR = 100 - (availableFunds / purchasePrice * 100)
  const minDepositRequired = availableFunds - buffer;
  const requiredLvr = 100 - (minDepositRequired / purchasePrice * 100);
  
  if (requiredLvr > lvr && requiredLvr <= 95) {
    const suggestedLvr = Math.min(95, Math.ceil(requiredLvr));
    
    fixes.push({
      field: 'lvr',
      currentValue: lvr,
      suggestedValue: suggestedLvr,
      explanation: `Increase LVR to ${suggestedLvr}% to reduce deposit needed (may require LMI above 80%)`,
      violationType: 'deposit',
    });
  }
};

/**
 * Calculate suggested fixes for borrowing capacity violations
 */
const calculateBorrowingFixes = (
  property: TimelineProperty,
  violation: GuardrailViolation,
  currentValues: CurrentPropertyValues,
  fixes: SuggestedFix[]
): void => {
  const { purchasePrice, lvr } = currentValues;
  const shortfall = violation.shortfall;

  // Fix 1: Reduce purchase price to reduce loan amount needed
  // Loan = purchasePrice * (LVR/100)
  // If we need to reduce loan by $X, reduce price by $X / (LVR/100)
  const priceReductionNeeded = shortfall / (lvr / 100);
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
  const requiredLvr = (maxLoan / purchasePrice) * 100;
  
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
 */
const calculateServiceabilityFixes = (
  property: TimelineProperty,
  violation: GuardrailViolation,
  currentValues: CurrentPropertyValues,
  fixes: SuggestedFix[]
): void => {
  const { purchasePrice, lvr, rentPerWeek } = currentValues;
  const shortfall = Math.abs(violation.shortfall);

  // Fix 1: Increase rental income
  // Higher rent improves net cashflow and serviceability
  // Simplified: Each $1/week rent = ~$52/year = small improvement in serviceability
  // Estimate: Need to improve annual cashflow by shortfall amount
  const additionalWeeklyRent = Math.ceil(shortfall / 52);
  const suggestedRent = roundToNearest(rentPerWeek + additionalWeeklyRent, 10);
  
  if (suggestedRent > rentPerWeek && suggestedRent <= rentPerWeek * 1.5) {
    // Only suggest if increase is reasonable (up to 50% more)
    fixes.push({
      field: 'rentPerWeek',
      currentValue: rentPerWeek,
      suggestedValue: suggestedRent,
      explanation: `Increase weekly rent to $${suggestedRent}/week to improve serviceability`,
      violationType: 'serviceability',
    });
  }

  // Fix 2: Reduce purchase price to reduce loan servicing costs
  // Lower loan = lower interest payments = better serviceability
  // Rough estimate: 10% price reduction as starting point
  const suggestedPrice = roundToNearest(purchasePrice * 0.9, 5000);
  
  if (suggestedPrice >= 100000) {
    fixes.push({
      field: 'purchasePrice',
      currentValue: purchasePrice,
      suggestedValue: suggestedPrice,
      explanation: `Reduce purchase price to ${formatCurrency(suggestedPrice)} to lower loan servicing costs`,
      violationType: 'serviceability',
    });
  }

  // Fix 3: Reduce LVR (smaller loan = lower interest payments)
  const suggestedLvr = Math.max(50, lvr - 10);
  
  if (suggestedLvr < lvr) {
    fixes.push({
      field: 'lvr',
      currentValue: lvr,
      suggestedValue: suggestedLvr,
      explanation: `Reduce LVR to ${suggestedLvr}% to reduce loan interest payments`,
      violationType: 'serviceability',
    });
  }
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
