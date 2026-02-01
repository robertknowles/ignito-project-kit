/**
 * Calculate Lenders Mortgage Insurance (LMI) based on LVR
 * Note: LMI rates vary by lender. These are industry estimates.
 * 
 * Important: Banks use the LOWER of purchase price or valuation when calculating LMI.
 * If valuation > purchase price, you get a better deal (lower effective LVR for LMI purposes).
 * If valuation < purchase price, the bank sees higher risk.
 * 
 * @param loanAmount - The actual loan amount (purchasePrice * LVR / 100)
 * @param lvr - The loan-to-value ratio based on purchase price
 * @param lmiWaiver - Whether LMI is waived (e.g., professional package)
 * @param valuationAtPurchase - Optional valuation for calculating effective LVR for LMI
 * @param purchasePrice - Optional purchase price for calculating effective LVR
 */
export function calculateLMI(
  loanAmount: number,
  lvr: number,
  lmiWaiver: boolean,
  valuationAtPurchase?: number,
  purchasePrice?: number
): number {
  if (lmiWaiver) return 0;
  
  // Calculate effective LVR for LMI purposes
  // Banks use the LOWER of purchase price or valuation
  let effectiveLvr = lvr;
  if (valuationAtPurchase && purchasePrice && valuationAtPurchase > 0) {
    const securityValue = Math.min(purchasePrice, valuationAtPurchase);
    effectiveLvr = (loanAmount / securityValue) * 100;
  }
  
  if (effectiveLvr <= 80) return 0;
  
  // LMI tiers based on effective LVR
  if (effectiveLvr <= 85) {
    return loanAmount * 0.015; // ~1.5%
  } else if (effectiveLvr <= 90) {
    return loanAmount * 0.020; // ~2.0%
  } else if (effectiveLvr <= 95) {
    return loanAmount * 0.035; // ~3.5%
  } else {
    return loanAmount * 0.045; // ~4.5%
  }
}

/**
 * Calculate total loan amount including capitalized LMI
 */
export function calculateLoanAmount(
  purchasePrice: number,
  lvr: number,
  lmi: number,
  capitalizeLMI: boolean = true
): number {
  const baseLoan = purchasePrice * (lvr / 100);
  return capitalizeLMI ? baseLoan + lmi : baseLoan;
}





