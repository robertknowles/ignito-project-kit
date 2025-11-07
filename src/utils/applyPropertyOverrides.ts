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
    console.warn(`Invalid LVR: ${merged.lvr}, clamping to 0-100`);
    merged.lvr = Math.max(0, Math.min(100, merged.lvr));
  }
  
  if (merged.interestRate < 0 || merged.interestRate > 20) {
    console.warn(`Invalid interest rate: ${merged.interestRate}, clamping to 0-20`);
    merged.interestRate = Math.max(0, Math.min(20, merged.interestRate));
  }
  
  if (merged.vacancyRate < 0 || merged.vacancyRate > 100) {
    console.warn(`Invalid vacancy rate: ${merged.vacancyRate}, clamping to 0-100`);
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

