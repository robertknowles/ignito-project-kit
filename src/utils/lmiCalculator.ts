/**
 * Calculate Lenders Mortgage Insurance (LMI) based on LVR
 * Note: LMI rates vary by lender. These are industry estimates.
 */
export function calculateLMI(
  purchasePrice: number,
  lvr: number,
  lmiWaiver: boolean
): number {
  if (lmiWaiver) return 0;
  if (lvr <= 80) return 0;
  
  const loanAmount = purchasePrice * (lvr / 100);
  
  // LMI tiers based on LVR
  if (lvr <= 85) {
    return loanAmount * 0.015; // ~1.5%
  } else if (lvr <= 90) {
    return loanAmount * 0.020; // ~2.0%
  } else if (lvr <= 95) {
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


