/**
 * Borrowing Capacity Calculator
 * 
 * Reverse-engineered from the Australian Government's MoneySmart calculator.
 * Uses the Present Value (PV) formula to determine maximum loan amount based on
 * affordable repayment.
 * 
 * Formula: LoanAmount = (R - F) × [(1 - (1 + r)^-n) / r]
 * 
 * Where:
 * - R = Affordable repayment per period
 * - F = Fees per period
 * - r = Periodic interest rate (annual rate / frequency)
 * - n = Total number of payments (years × frequency)
 */

export type RepaymentFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface BorrowingCapacityInput {
  affordableRepayment: number;  // The amount user can afford per period
  interestRate: number;         // Annual interest rate as percentage (e.g., 6.04)
  loanTermYears: number;        // Loan term in years (e.g., 25)
  repaymentFrequency: RepaymentFrequency;
  feesPerPeriod: number;        // Fees charged per repayment period
  feesFrequency: RepaymentFrequency; // How often fees are charged
}

export interface BorrowingCapacityResult {
  borrowingCapacity: number;
  totalRepayments: number;
  totalInterest: number;
  totalFees: number;
}

const FREQUENCY_MAP: Record<RepaymentFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
};

/**
 * Converts fees from one frequency to another
 */
const convertFeesToRepaymentFrequency = (
  fees: number,
  feesFrequency: RepaymentFrequency,
  repaymentFrequency: RepaymentFrequency
): number => {
  const feesPerYear = fees * FREQUENCY_MAP[feesFrequency];
  return feesPerYear / FREQUENCY_MAP[repaymentFrequency];
};

/**
 * Calculate the maximum borrowing capacity based on affordable repayment
 */
export const calculateBorrowingCapacity = (
  input: BorrowingCapacityInput
): BorrowingCapacityResult => {
  const {
    affordableRepayment,
    interestRate,
    loanTermYears,
    repaymentFrequency,
    feesPerPeriod,
    feesFrequency,
  } = input;

  const periodsPerYear = FREQUENCY_MAP[repaymentFrequency];
  const totalPeriods = loanTermYears * periodsPerYear;

  // Convert fees to match repayment frequency
  const adjustedFees = convertFeesToRepaymentFrequency(
    feesPerPeriod,
    feesFrequency,
    repaymentFrequency
  );

  // Net repayment after fees
  const netRepayment = affordableRepayment - adjustedFees;

  // Handle edge case: fees exceed repayment
  if (netRepayment <= 0) {
    return {
      borrowingCapacity: 0,
      totalRepayments: 0,
      totalInterest: 0,
      totalFees: adjustedFees * totalPeriods,
    };
  }

  // Handle edge case: zero interest rate
  if (interestRate === 0) {
    const borrowingCapacity = netRepayment * totalPeriods;
    return {
      borrowingCapacity: Math.round(borrowingCapacity),
      totalRepayments: affordableRepayment * totalPeriods,
      totalInterest: 0,
      totalFees: adjustedFees * totalPeriods,
    };
  }

  // Convert annual rate to periodic rate (as decimal)
  const periodicRate = (interestRate / 100) / periodsPerYear;

  // PV Formula: PV = PMT × [(1 - (1 + r)^-n) / r]
  const borrowingCapacity = netRepayment * ((1 - Math.pow(1 + periodicRate, -totalPeriods)) / periodicRate);

  // Calculate totals
  const totalRepayments = affordableRepayment * totalPeriods;
  const totalFees = adjustedFees * totalPeriods;
  const totalInterest = totalRepayments - totalFees - borrowingCapacity;

  return {
    borrowingCapacity: Math.round(borrowingCapacity),
    totalRepayments: Math.round(totalRepayments),
    totalInterest: Math.round(Math.max(0, totalInterest)),
    totalFees: Math.round(totalFees),
  };
};

/**
 * Convenience function with individual parameters (matches original spec)
 */
export const calculateBorrowingCapacitySimple = (
  affordableRepayment: number,
  interestRate: number,
  loanTermYears: number,
  repaymentFrequency: RepaymentFrequency,
  feesPerPeriod: number = 0,
  feesFrequency: RepaymentFrequency = 'monthly'
): number => {
  const result = calculateBorrowingCapacity({
    affordableRepayment,
    interestRate,
    loanTermYears,
    repaymentFrequency,
    feesPerPeriod,
    feesFrequency,
  });
  return result.borrowingCapacity;
};

