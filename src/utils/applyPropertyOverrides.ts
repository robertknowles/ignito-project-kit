import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { calculateLMI, calculateLoanAmount } from './lmiCalculator';
import { calculateStampDuty } from './stampDutyCalculator';
import { calculateLandTax } from './landTaxCalculator';
import { calculateDepositBalance } from './oneOffCostsCalculator';

/**
 * Merge property defaults with user overrides and calculate derived fields
 */
export function applyPropertyOverrides(
  defaults: PropertyInstanceDetails,
  overrides: Partial<PropertyInstanceDetails>
): PropertyInstanceDetails {
  // Merge defaults with overrides
  const merged: PropertyInstanceDetails = {
    ...defaults,
    ...overrides,
  };
  
  // Validate ranges
  if (merged.lvr < 0 || merged.lvr > 100) {
merged.lvr = Math.max(0, Math.min(100, merged.lvr));
  }
  
  if (merged.interestRate < 0 || merged.interestRate > 20) {
merged.interestRate = Math.max(0, Math.min(20, merged.interestRate));
  }
  
  if (merged.vacancyRate < 0 || merged.vacancyRate > 100) {
merged.vacancyRate = Math.max(0, Math.min(100, merged.vacancyRate));
  }
  
  // Calculate stamp duty if not overridden
  if (merged.stampDutyOverride === null || merged.stampDutyOverride === undefined) {
    // Stamp duty will be calculated in useAffordabilityCalculator
    // This is just validation
  }
  
  // Calculate land tax if not overridden
  if (merged.landTaxOverride === null || merged.landTaxOverride === undefined) {
    // Land tax will be calculated in useAffordabilityCalculator
    // This is just validation
  }
  
  return merged;
}

/**
 * Validate property instance fields
 */
export function validatePropertyInstance(property: PropertyInstanceDetails): string[] {
  const errors: string[] = [];
  
  if (property.purchasePrice <= 0) {
    errors.push('Purchase price must be greater than 0');
  }
  
  if (property.valuationAtPurchase <= 0) {
    errors.push('Valuation must be greater than 0');
  }
  
  if (property.rentPerWeek < 0) {
    errors.push('Rent cannot be negative');
  }
  
  if (property.lvr < 0 || property.lvr > 100) {
    errors.push('LVR must be between 0 and 100');
  }
  
  if (property.interestRate < 0 || property.interestRate > 20) {
    errors.push('Interest rate must be between 0 and 20');
  }
  
  if (property.loanTerm <= 0 || property.loanTerm > 50) {
    errors.push('Loan term must be between 1 and 50 years');
  }
  
  return errors;
}

/**
 * Calculate the actual yield of a property based on instance values
 */
export function calculatePropertyYield(property: PropertyInstanceDetails): number {
  if (property.purchasePrice <= 0) return 0;
  const annualRent = property.rentPerWeek * 52;
  return (annualRent / property.purchasePrice) * 100;
}

/**
 * Check if a property's yield is below the minimum threshold
 * Returns warning information if yield is below minimum
 */
export function checkYieldThreshold(property: PropertyInstanceDetails): {
  isValid: boolean;
  actualYield: number;
  minimumYield: number;
  shortfall: number;
  warningMessage?: string;
} {
  const actualYield = calculatePropertyYield(property);
  const minimumYield = property.minimumYield || 0;
  const shortfall = minimumYield - actualYield;
  const isValid = actualYield >= minimumYield;
  
  return {
    isValid,
    actualYield,
    minimumYield,
    shortfall: isValid ? 0 : shortfall,
    warningMessage: isValid 
      ? undefined 
      : `Yield (${actualYield.toFixed(1)}%) is below minimum threshold (${minimumYield.toFixed(1)}%). Consider increasing rent or negotiating price.`
  };
}

/**
 * Get all warnings for a property instance
 * This can be used by the UI to show warning indicators on property cards
 */
export function getPropertyWarnings(property: PropertyInstanceDetails): string[] {
  const warnings: string[] = [];
  
  // Check yield threshold
  const yieldCheck = checkYieldThreshold(property);
  if (!yieldCheck.isValid && yieldCheck.warningMessage) {
    warnings.push(yieldCheck.warningMessage);
  }
  
  // Check if valuation is significantly different from purchase price
  if (property.valuationAtPurchase && property.purchasePrice) {
    const valuationDiff = ((property.valuationAtPurchase - property.purchasePrice) / property.purchasePrice) * 100;
    if (valuationDiff < -10) {
      warnings.push(`Valuation is ${Math.abs(valuationDiff).toFixed(0)}% below purchase price - consider renegotiating`);
    }
  }
  
  // Check for high LVR without LMI waiver
  if (property.lvr > 90 && !property.lmiWaiver) {
    warnings.push(`High LVR (${property.lvr}%) will result in significant LMI costs`);
  }
  
  return warnings;
}

