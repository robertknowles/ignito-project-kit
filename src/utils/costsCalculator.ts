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
  isFirstHomeBuyer?: boolean;
  lmiWaiver?: boolean; // NEW: Whether LMI is waived (e.g., professional packages)
}

/**
 * Calculate Lenders Mortgage Insurance (LMI)
 * LMI is required when LVR > 80%
 * Rates are tiered based on LVR:
 * - 80-85%: ~1% of loan amount
 * - 85-90%: ~2% of loan amount
 * - 90-95%: ~4% of loan amount
 * @param lmiWaiver - If true, LMI is waived (e.g., professional packages, commercial properties)
 */
const calculateLMI = (loanAmount: number, lvr: number, lmiWaiver: boolean = false): number => {
  // No LMI if waived (e.g., professional packages)
  if (lmiWaiver) return 0;
  
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
  const { propertyPrice, loanAmount, lvr, isFirstHomeBuyer = false, lmiWaiver = false } = params;
  
  // 1. Stamp Duty (simplified as a flat percentage)
  const STAMP_DUTY_AVERAGE_RATE = 0.04; // 4%
  const stampDuty = propertyPrice * STAMP_DUTY_AVERAGE_RATE;
  
  // 2. LMI (only if LVR > 80% and not waived)
  const lmi = calculateLMI(loanAmount, lvr, lmiWaiver);
  
  // 3. Legal Fees (conveyancing, solicitor fees)
  // Typically $1,500 - $2,500 depending on complexity
  const legalFees = 2000;
  
  // 4. Inspection Fees (building + pest inspection)
  // Typically $500 - $800 combined
  const inspectionFees = 650;
  
  // 5. Other Fees (searches, mortgage registration, settlement fees)
  // Typically $1,000 - $2,000
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
    .map(item => `${item.label}: $${item.amount.toLocaleString()}`)
    .join('\n');
};

