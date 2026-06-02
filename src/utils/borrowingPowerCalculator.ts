/**
 * Borrowing Power Calculator
 *
 * Lender-style serviceability assessment modelled on Macquarie Bank's
 * Mortgage Solutions Serviceability Calculator (May 2026 version).
 *
 * Works FORWARDS: income, expenses, debts → max borrowing power.
 * (Complementary to calculateBorrowingCapacity.ts which works BACKWARDS:
 *  affordable repayment → max loan via PV formula.)
 *
 * Core formula:
 *   Assessable Income - Living Expenses - Existing Commitments = Net Surplus
 *   Max Loan = the loan amount whose annual repayment (at assessment rate) = Net Surplus
 *
 * References to Macquarie spreadsheet cells are noted inline.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Overtime, bonus, commission, rental income shaded at 80% (Macquarie B171-B172: ×0.8) */
export const INCOME_SHADING_RATE = 0.80

/** 45.6% of credit card LIMIT used as annual commitment (Macquarie B223: C223×0.456) */
export const CREDIT_CARD_FACTOR = 0.456

/** APRA-standard assessment buffer added to carded rate (Macquarie: Var_buffer) */
export const ASSESSMENT_BUFFER = 0.03

/** Minimum assessment rate floor (APRA guidance) */
export const FLOOR_RATE = 0.055

/** Current market carded rate — Big 4 median Q1 2026 */
export const DEFAULT_CARDED_RATE = 0.0625

/** Standard P&I loan term in years */
export const DEFAULT_LOAN_TERM = 30

/** Net Surplus Ratio minimum — loan passes if NSR >= 1.0 (Macquarie Notes: F34) */
export const NSR_MINIMUM = 1.0

/** NSR required when LVR > 90% (Macquarie Notes: J36) */
export const NSR_HIGH_LVR = 1.2

/**
 * Simplified HEM (Household Expenditure Measure) benchmarks — annual.
 *
 * Derived from Macquarie's HEM Table sheet (23 income tiers × status codes).
 * The full spreadsheet cross-references income tier, couple/single status,
 * and dependant count against a weekly HEM amount (× 52 to annualise).
 *
 * For the online calculator we use a simplified flat floor per status+deps,
 * consistent with how Macquarie's own online calculator abstracts the full
 * tiered table. These are conservative mid-tier estimates.
 *
 * Key: `${applicants}-${dependants}` where applicants is 1 or 2+
 */
const HEM_BENCHMARKS: Record<string, number> = {
  // Single applicant
  '1-0': 25_044,
  '1-1': 30_108,
  '1-2': 33_384,
  '1-3': 36_660,
  '1-4': 39_936,
  '1-5': 43_212,
  // Couple / 2+ applicants
  '2-0': 37_128,
  '2-1': 42_192,
  '2-2': 45_468,
  '2-3': 48_744,
  '2-4': 52_020,
  '2-5': 55_296,
}

/** Fallback per-dependant increment if key not found */
const HEM_PER_DEPENDANT = 3_276

// ─── Types ───────────────────────────────────────────────────────────────────

export type LoanPurpose = 'owner-occupied' | 'investment'
export type RepaymentType = 'pi' | 'io'

export interface BorrowingPowerInput {
  /** Owner-occupied or investment */
  purpose: LoanPurpose
  /** Number of applicants on the loan (1, 2, or 3+) */
  applicants: number
  /** Number of financial dependants */
  dependants: number
  /** Principal & Interest or Interest Only */
  repaymentType: RepaymentType

  // Income (annual, pre-tax)
  /** Applicant 1 base PAYG income — taken at 100% */
  baseIncome: number
  /** Applicant 1 additional income (rental, bonus, commission) — shaded at 80% */
  additionalIncome: number
  /** Applicant 2 base income (if 2+ applicants) */
  baseIncome2: number
  /** Applicant 2 additional income (if 2+ applicants) */
  additionalIncome2: number

  // Expenses & commitments (monthly unless noted)
  /** Total monthly living expenses declared */
  livingExpenses: number
  /** Total credit card limit (not balance — the limit) */
  creditCardLimit: number
  /** Existing home loan monthly repayments */
  homeLoanRepayments: number
  /** Other loan monthly repayments (car, personal, student) */
  otherLoanRepayments: number
}

export interface BorrowingPowerResult {
  /** Maximum borrowing amount */
  maxBorrowing: number
  /** Estimated monthly repayment at the actual carded rate (not assessment rate) */
  monthlyRepayment: number
  /** Total repayments over the life of the loan */
  totalRepayments: number
  /** Total interest paid over the life of the loan */
  totalInterest: number
  /** Assessment rate used for serviceability (carded + buffer) */
  assessmentRate: number
  /** Net Surplus Ratio achieved */
  nsr: number

  // Breakdown for transparency
  totalAssessableIncome: number
  annualLivingExpenses: number
  annualExistingCommitments: number
  netSurplus: number
  hemBenchmark: number
}

// ─── Calculator ──────────────────────────────────────────────────────────────

/**
 * Look up HEM benchmark for given applicant count and dependants.
 */
const getHemBenchmark = (applicants: number, dependants: number): number => {
  const applicantKey = applicants >= 2 ? '2' : '1'
  const depsCapped = Math.min(dependants, 5)
  const key = `${applicantKey}-${depsCapped}`

  if (HEM_BENCHMARKS[key] !== undefined) {
    return HEM_BENCHMARKS[key]
  }

  // Fallback: base + per-dependant increment
  const baseKey = `${applicantKey}-0`
  const base = HEM_BENCHMARKS[baseKey] ?? 25_044
  return base + dependants * HEM_PER_DEPENDANT
}

/**
 * Calculate annual P&I repayment for a given loan amount.
 * Uses standard amortisation: PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
 * where r = monthly rate, n = total months.
 */
const annualPIRepayment = (
  loanAmount: number,
  annualRate: number,
  termYears: number
): number => {
  if (loanAmount <= 0) return 0
  if (annualRate <= 0) return loanAmount / (termYears * 12) * 12

  const monthlyRate = annualRate / 12
  const totalMonths = termYears * 12
  const monthlyPmt =
    loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)

  return monthlyPmt * 12
}

/**
 * Calculate annual IO repayment for a given loan amount.
 */
const annualIORepayment = (loanAmount: number, annualRate: number): number => {
  return loanAmount * annualRate
}

/**
 * Solve for the max loan amount where annual repayment = available surplus.
 *
 * For P&I: invert the PMT formula to get PV.
 *   PV = PMT_annual / 12 × [(1 - (1+r)^-n) / r]
 *   where r = monthlyAssessmentRate, n = totalMonths
 *
 * For IO: simply surplus / assessmentRate
 */
const solveMaxLoan = (
  annualSurplus: number,
  assessmentRate: number,
  termYears: number,
  repaymentType: RepaymentType
): number => {
  if (annualSurplus <= 0) return 0

  if (repaymentType === 'io') {
    return assessmentRate > 0 ? annualSurplus / assessmentRate : 0
  }

  // P&I: use PV formula
  const monthlyRate = assessmentRate / 12
  const totalMonths = termYears * 12
  const monthlyPayment = annualSurplus / 12

  if (monthlyRate <= 0) return monthlyPayment * totalMonths

  const pvFactor = (1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate
  return monthlyPayment * pvFactor
}

/**
 * Main borrowing power calculation.
 */
export const calculateBorrowingPower = (
  input: BorrowingPowerInput
): BorrowingPowerResult => {
  const {
    applicants,
    dependants,
    repaymentType,
    baseIncome,
    additionalIncome,
    baseIncome2,
    additionalIncome2,
    livingExpenses,
    creditCardLimit,
    homeLoanRepayments,
    otherLoanRepayments,
  } = input

  // ── Step 1: Assessable Income ──
  // Base income at 100%, additional at 80% (Macquarie B170-B172, K177)
  const applicant1Income = baseIncome + additionalIncome * INCOME_SHADING_RATE
  const applicant2Income =
    applicants >= 2
      ? baseIncome2 + additionalIncome2 * INCOME_SHADING_RATE
      : 0
  const totalAssessableIncome = applicant1Income + applicant2Income

  // ── Step 2: Living Expenses ──
  // Higher of declared or HEM benchmark (Macquarie B91, K91)
  const hemBenchmark = getHemBenchmark(applicants, dependants)
  const declaredAnnual = livingExpenses * 12
  const annualLivingExpenses = Math.max(declaredAnnual, hemBenchmark)

  // ── Step 3: Existing Commitments (annualised) ──
  // Home loans: monthly × 12 (Macquarie B200-B206)
  // Other loans: monthly × 12 (Macquarie B208-B216)
  // Credit cards: 45.6% of limit (Macquarie B223: C223 × 0.456)
  const annualHomeLoan = homeLoanRepayments * 12
  const annualOtherLoans = otherLoanRepayments * 12
  const annualCreditCard = creditCardLimit * CREDIT_CARD_FACTOR
  const annualExistingCommitments = annualHomeLoan + annualOtherLoans + annualCreditCard

  // ── Step 4: Net Surplus ──
  const netSurplus = totalAssessableIncome - annualLivingExpenses - annualExistingCommitments

  // ── Step 5: Max Loan ──
  // Assessment rate = max(carded + buffer, floor) — APRA standard
  const assessmentRate = Math.max(DEFAULT_CARDED_RATE + ASSESSMENT_BUFFER, FLOOR_RATE)
  const termYears = DEFAULT_LOAN_TERM

  const maxBorrowing = Math.max(0, Math.round(
    solveMaxLoan(netSurplus, assessmentRate, termYears, repaymentType)
  ))

  // ── Monthly repayment at actual carded rate (for display) ──
  let monthlyRepayment = 0
  if (maxBorrowing > 0) {
    if (repaymentType === 'pi') {
      monthlyRepayment = Math.round(annualPIRepayment(maxBorrowing, DEFAULT_CARDED_RATE, termYears) / 12)
    } else {
      monthlyRepayment = Math.round(annualIORepayment(maxBorrowing, DEFAULT_CARDED_RATE) / 12)
    }
  }

  const totalRepayments = monthlyRepayment * 12 * termYears
  const totalInterest = Math.max(0, totalRepayments - maxBorrowing)

  // NSR = income / (living expenses + all commitments including proposed loan)
  const proposedAnnualRepayment = repaymentType === 'pi'
    ? annualPIRepayment(maxBorrowing, assessmentRate, termYears)
    : annualIORepayment(maxBorrowing, assessmentRate)
  const totalCommitments = annualLivingExpenses + annualExistingCommitments + proposedAnnualRepayment
  const nsr = totalCommitments > 0 ? totalAssessableIncome / totalCommitments : 0

  return {
    maxBorrowing,
    monthlyRepayment,
    totalRepayments,
    totalInterest,
    assessmentRate,
    nsr: Math.round(nsr * 100) / 100,
    totalAssessableIncome: Math.round(totalAssessableIncome),
    annualLivingExpenses: Math.round(annualLivingExpenses),
    annualExistingCommitments: Math.round(annualExistingCommitments),
    netSurplus: Math.round(netSurplus),
    hemBenchmark: Math.round(hemBenchmark),
  }
}
