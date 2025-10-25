export interface AcquisitionCosts {
  stampDuty: number;
  lmi: number;
  legalFees: number;
  inspectionFees: number;
  otherFees: number;
  total: number;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

export interface CostCalculationParams {
  propertyPrice: number;
  loanAmount: number;
  lvr: number;
  state: string; // e.g., 'NSW', 'VIC', 'QLD'
  isFirstHomeBuyer?: boolean;
}

// Simplified stamp duty rates (progressive brackets)
// Note: These are simplified rates. In production, you'd want to use exact state rates
const STAMP_DUTY_RATES: Record<string, Array<{ threshold: number; rate: number; base?: number }>> = {
  NSW: [
    { threshold: 16000, rate: 0.0125, base: 0 },
    { threshold: 35000, rate: 0.015, base: 200 },
    { threshold: 93000, rate: 0.0175, base: 485 },
    { threshold: 351000, rate: 0.035, base: 1500 },
    { threshold: 1168000, rate: 0.045, base: 10530 },
    { threshold: Infinity, rate: 0.055, base: 47295 },
  ],
  VIC: [
    { threshold: 25000, rate: 0.014, base: 0 },
    { threshold: 130000, rate: 0.024, base: 350 },
    { threshold: 960000, rate: 0.06, base: 2870 },
    { threshold: Infinity, rate: 0.065, base: 52670 },
  ],
  QLD: [
    { threshold: 5000, rate: 0.015, base: 0 },
    { threshold: 75000, rate: 0.035, base: 75 },
    { threshold: 540000, rate: 0.045, base: 2525 },
    { threshold: 1000000, rate: 0.0575, base: 23400 },
    { threshold: Infinity, rate: 0.0575, base: 23400 },
  ],
  // Add other states as needed
};

/**
 * Calculate stamp duty based on property price, state, and first home buyer status
 */
const calculateStampDuty = (
  propertyPrice: number,
  state: string,
  isFirstHomeBuyer: boolean
): number => {
  const rates = STAMP_DUTY_RATES[state] || STAMP_DUTY_RATES.NSW;
  
  // First home buyer exemptions (simplified - varies by state)
  // NSW: Exemption for properties under $650k, concessions up to $800k
  // VIC: Exemption for properties under $600k
  // QLD: Concessions for properties under $550k
  if (isFirstHomeBuyer) {
    if (state === 'NSW' && propertyPrice <= 650000) {
      return 0;
    } else if (state === 'VIC' && propertyPrice <= 600000) {
      return 0;
    } else if (state === 'QLD' && propertyPrice <= 550000) {
      // QLD offers concessions rather than full exemption
      return calculateStampDutyProgressive(propertyPrice, rates) * 0.5; // 50% concession
    }
  }
  
  return calculateStampDutyProgressive(propertyPrice, rates);
};

/**
 * Calculate stamp duty using progressive bracket system
 */
const calculateStampDutyProgressive = (
  propertyPrice: number,
  rates: Array<{ threshold: number; rate: number; base?: number }>
): number => {
  let duty = 0;
  let previousThreshold = 0;
  
  for (const bracket of rates) {
    if (propertyPrice > previousThreshold) {
      const taxableAmount = Math.min(propertyPrice, bracket.threshold) - previousThreshold;
      duty += taxableAmount * bracket.rate;
      previousThreshold = bracket.threshold;
      
      if (propertyPrice <= bracket.threshold) {
        break;
      }
    }
  }
  
  return Math.round(duty);
};

/**
 * Calculate Lenders Mortgage Insurance (LMI)
 * LMI is required when LVR > 80%
 * Rates are tiered based on LVR:
 * - 80-85%: ~1% of loan amount
 * - 85-90%: ~2% of loan amount
 * - 90-95%: ~4% of loan amount
 */
const calculateLMI = (loanAmount: number, lvr: number): number => {
  // No LMI required for LVR <= 80%
  if (lvr <= 80) return 0;
  
  let lmiRate = 0;
  
  if (lvr <= 85) {
    lmiRate = 0.01; // 1%
  } else if (lvr <= 90) {
    lmiRate = 0.02; // 2%
  } else if (lvr <= 95) {
    lmiRate = 0.04; // 4%
  } else {
    // Most lenders won't lend above 95% LVR without exceptional circumstances
    lmiRate = 0.05; // 5%
  }
  
  return Math.round(loanAmount * lmiRate);
};

/**
 * Main function to calculate all acquisition costs for a property purchase
 */
export const calculateAcquisitionCosts = (
  params: CostCalculationParams
): AcquisitionCosts => {
  const { propertyPrice, loanAmount, lvr, state, isFirstHomeBuyer = false } = params;
  
  // 1. Stamp Duty (state-based, with first home buyer considerations)
  const stampDuty = calculateStampDuty(propertyPrice, state, isFirstHomeBuyer);
  
  // 2. LMI (only if LVR > 80%)
  const lmi = calculateLMI(loanAmount, lvr);
  
  // 3. Legal Fees (conveyancing, solicitor fees)
  // Typically £1,500 - £2,500 depending on complexity
  const legalFees = 2000;
  
  // 4. Inspection Fees (building + pest inspection)
  // Typically £500 - £800 combined
  const inspectionFees = 650;
  
  // 5. Other Fees (searches, mortgage registration, settlement fees)
  // Typically £1,000 - £2,000
  const otherFees = 1500;
  
  // Calculate total acquisition costs
  const total = stampDuty + lmi + legalFees + inspectionFees + otherFees;
  
  return {
    stampDuty,
    lmi,
    legalFees,
    inspectionFees,
    otherFees,
    total,
    breakdown: [
      { label: 'Stamp Duty', amount: stampDuty },
      { label: 'LMI', amount: lmi },
      { label: 'Legal Fees', amount: legalFees },
      { label: 'Inspection Fees', amount: inspectionFees },
      { label: 'Other Fees', amount: otherFees },
    ],
  };
};

/**
 * Helper function to calculate LVR from property price and deposit
 */
export const calculateLVR = (propertyPrice: number, deposit: number): number => {
  const loanAmount = propertyPrice - deposit;
  return (loanAmount / propertyPrice) * 100;
};

/**
 * Helper function to format costs for display
 */
export const formatCostsBreakdown = (costs: AcquisitionCosts): string => {
  return costs.breakdown
    .filter(item => item.amount > 0)
    .map(item => `${item.label}: £${item.amount.toLocaleString()}`)
    .join('\n');
};

