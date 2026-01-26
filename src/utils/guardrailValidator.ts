import type { TimelineProperty } from '@/types/property';

/**
 * Types of guardrail violations that can occur when placing a property
 */
export type GuardrailViolationType = 'deposit' | 'borrowing' | 'serviceability';

/**
 * Severity levels for guardrail violations
 * - error: Blocks the purchase (hard constraint)
 * - warning: Purchase possible but risky (soft constraint)
 */
export type GuardrailSeverity = 'error' | 'warning';

/**
 * Details about a specific guardrail violation
 */
export interface GuardrailViolation {
  /** Type of constraint violated */
  type: GuardrailViolationType;
  /** Severity of the violation */
  severity: GuardrailSeverity;
  /** Human-readable description of the violation */
  message: string;
  /** Amount by which the constraint is violated */
  shortfall: number;
  /** Current available value */
  currentValue: number;
  /** Required value to pass the test */
  requiredValue: number;
}

/**
 * Result of validating a property placement
 */
export interface ValidationResult {
  /** Whether all hard constraints pass */
  isValid: boolean;
  /** List of all violations (both errors and warnings) */
  violations: GuardrailViolation[];
  /** Whether the placement can be overridden (only warnings, no errors) */
  canOverride: boolean;
  /** Summary of test results */
  tests: {
    deposit: { pass: boolean; surplus: number };
    borrowing: { pass: boolean; surplus: number };
    serviceability: { pass: boolean; surplus: number };
  };
}

/**
 * Format currency for display in violation messages
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
 * Validates whether a property can be placed at a specific period.
 * Uses pre-calculated affordability results from useAffordabilityCalculator.
 * 
 * @param affordabilityResult - Pre-calculated result from calculateAffordabilityForProperty
 * @param property - The property being placed
 * @param targetPeriod - The period where the property would be placed
 * @returns ValidationResult with violations and test results
 */
export const validatePropertyPlacement = (
  affordabilityResult: {
    canAfford: boolean;
    depositTestSurplus: number;
    depositTestPass: boolean;
    serviceabilityTestSurplus: number;
    serviceabilityTestPass: boolean;
    availableFunds: number;
    borrowingCapacityRemaining?: number;
    borrowingCapacityPass?: boolean;
  },
  property: {
    title: string;
    cost: number;
    depositRequired: number;
    loanAmount: number;
    totalCashRequired?: number;
  },
  targetPeriod: number
): ValidationResult => {
  const violations: GuardrailViolation[] = [];
  
  // Calculate total cash required (deposit + acquisition costs)
  const totalCashRequired = property.totalCashRequired || property.depositRequired;
  
  // Deposit Test
  const depositTestPass = affordabilityResult.depositTestPass;
  const depositTestSurplus = affordabilityResult.depositTestSurplus;
  
  if (!depositTestPass) {
    const shortfall = Math.abs(depositTestSurplus);
    violations.push({
      type: 'deposit',
      severity: 'error',
      message: `Insufficient funds. Need ${formatCurrency(totalCashRequired)}, have ${formatCurrency(affordabilityResult.availableFunds)}. Shortfall: ${formatCurrency(shortfall)}`,
      shortfall,
      currentValue: affordabilityResult.availableFunds,
      requiredValue: totalCashRequired,
    });
  }
  
  // Borrowing Capacity Test
  const borrowingCapacityPass = affordabilityResult.borrowingCapacityPass ?? 
    (affordabilityResult.borrowingCapacityRemaining !== undefined && 
     affordabilityResult.borrowingCapacityRemaining >= 0);
  const borrowingCapacityRemaining = affordabilityResult.borrowingCapacityRemaining ?? 0;
  
  if (!borrowingCapacityPass) {
    const shortfall = Math.abs(borrowingCapacityRemaining);
    violations.push({
      type: 'borrowing',
      severity: 'error',
      message: `Insufficient borrowing capacity. Need ${formatCurrency(property.loanAmount)}, capacity exceeded by ${formatCurrency(shortfall)}`,
      shortfall,
      currentValue: property.loanAmount + borrowingCapacityRemaining,
      requiredValue: property.loanAmount,
    });
  }
  
  // Serviceability Test
  const serviceabilityTestPass = affordabilityResult.serviceabilityTestPass;
  const serviceabilityTestSurplus = affordabilityResult.serviceabilityTestSurplus;
  
  if (!serviceabilityTestPass) {
    const shortfall = Math.abs(serviceabilityTestSurplus);
    // Serviceability is typically a warning rather than hard block
    // because banks may still approve with mitigating factors
    const severity: GuardrailSeverity = shortfall > (property.cost * 0.02) ? 'error' : 'warning';
    
    violations.push({
      type: 'serviceability',
      severity,
      message: severity === 'error'
        ? `Serviceability test fails significantly. Annual shortfall: ${formatCurrency(shortfall)}`
        : `Serviceability test is tight. Annual shortfall: ${formatCurrency(shortfall)}`,
      shortfall,
      currentValue: serviceabilityTestSurplus,
      requiredValue: 0,
    });
  }
  
  // Determine overall validity
  const hasErrors = violations.some(v => v.severity === 'error');
  const isValid = violations.length === 0;
  const canOverride = !hasErrors && violations.length > 0;
  
  return {
    isValid,
    violations,
    canOverride,
    tests: {
      deposit: { pass: depositTestPass, surplus: depositTestSurplus },
      borrowing: { pass: borrowingCapacityPass, surplus: borrowingCapacityRemaining },
      serviceability: { pass: serviceabilityTestPass, surplus: serviceabilityTestSurplus },
    },
  };
};

/**
 * Quick validation check for drag-over feedback.
 * Returns just whether the placement is valid without full violation details.
 * 
 * @param affordabilityResult - Pre-calculated result from calculateAffordabilityForProperty
 * @returns boolean indicating if placement is valid
 */
export const isPlacementValid = (
  affordabilityResult: {
    canAfford: boolean;
    depositTestPass: boolean;
    serviceabilityTestPass: boolean;
    borrowingCapacityRemaining?: number;
  }
): boolean => {
  const borrowingCapacityPass = affordabilityResult.borrowingCapacityRemaining === undefined ||
    affordabilityResult.borrowingCapacityRemaining >= 0;
  
  return affordabilityResult.canAfford &&
    affordabilityResult.depositTestPass &&
    affordabilityResult.serviceabilityTestPass &&
    borrowingCapacityPass;
};

/**
 * Get the most severe violation from a validation result
 */
export const getMostSevereViolation = (
  result: ValidationResult
): GuardrailViolation | null => {
  if (result.violations.length === 0) return null;
  
  // Prioritize errors over warnings
  const errors = result.violations.filter(v => v.severity === 'error');
  if (errors.length > 0) {
    // Return the one with the largest shortfall
    return errors.reduce((max, v) => v.shortfall > max.shortfall ? v : max);
  }
  
  // Return the warning with the largest shortfall
  return result.violations.reduce((max, v) => v.shortfall > max.shortfall ? v : max);
};

/**
 * Get a summary message for validation result
 */
export const getValidationSummary = (result: ValidationResult): string => {
  if (result.isValid) {
    return 'All tests pass';
  }
  
  const errorCount = result.violations.filter(v => v.severity === 'error').length;
  const warningCount = result.violations.filter(v => v.severity === 'warning').length;
  
  const parts: string[] = [];
  if (errorCount > 0) {
    parts.push(`${errorCount} constraint${errorCount > 1 ? 's' : ''} violated`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
};
