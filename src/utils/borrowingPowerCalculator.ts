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
 *   Gross Assessable Income → minus PAYG tax → Net Income
 *   Net Income - Living Expenses - Existing Commitments = Net Surplus
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

/** Current market carded rate - Big 4 median Q1 2026 */
export const DEFAULT_CARDED_RATE = 0.0625

/** Standard P&I loan term in years */
export const DEFAULT_LOAN_TERM = 30

/** Net Surplus Ratio minimum - loan passes if NSR >= 1.0 (Macquarie Notes: F34) */
export const NSR_MINIMUM = 1.0

/** NSR required when LVR > 90% (Macquarie Notes: J36) */
export const NSR_HIGH_LVR = 1.2

// ─── Australian Income Tax (2024-25 rates, Stage 3 cuts) ────────────────────

/**
 * Australian PAYG income tax brackets (2024-25 onward, post Stage 3 cuts).
 * Macquarie's spreadsheet calculates tax internally via the Loan Workings sheet
 * to convert gross assessable income to net. This is the single biggest factor
 * in serviceability - using gross income overstates borrowing power by ~40%.
 */
const TAX_BRACKETS: Array<{ threshold: number; rate: number; base: number }> = [
  { threshold: 18_200,  rate: 0,    base: 0 },
  { threshold: 45_000,  rate: 0.16, base: 0 },
  { threshold: 135_000, rate: 0.30, base: 4_288 },
  { threshold: 190_000, rate: 0.37, base: 31_288 },
  { threshold: Infinity, rate: 0.45, base: 51_638 },
]

const MEDICARE_LEVY_RATE = 0.02

const calculateAnnualTax = (taxableIncome: number): number => {
  if (taxableIncome <= 0) return 0

  let tax = 0
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = TAX_BRACKETS[i]
    const prevThreshold = i > 0 ? TAX_BRACKETS[i - 1].threshold : 0
    if (taxableIncome > prevThreshold) {
      tax = bracket.base + bracket.rate * (taxableIncome - prevThreshold)
      break
    }
  }

  const medicare = taxableIncome * MEDICARE_LEVY_RATE
  return tax + medicare
}

// ─── Income-Tiered HEM Benchmarks ───────────────────────────────────────────

/**
 * HEM (Household Expenditure Measure) benchmarks - annual, income-tiered.
 *
 * Derived from Macquarie's HEM Table sheet (23 income tiers × status codes).
 * The spreadsheet formula (B91) does:
 *   HLOOKUP(totalIncome, HEM_Table, MATCH(statusCode, ...), TRUE) × 52
 *
 * Higher earners are benchmarked to higher living expenses. Using a flat
 * floor (as we did initially) understates HEM for high-income borrowers
 * and overstates borrowing power.
 *
 * These are interpolated from the Macquarie HEM Table sheet, annualised.
 * The lookup uses AFTER-TAX income to select the tier.
 */

interface HemTier {
  maxIncome: number
  single0: number
  single1: number
  single2: number
  single3: number
  couple0: number
  couple1: number
  couple2: number
  couple3: number
}

const HEM_TIERS: HemTier[] = [
  { maxIncome: 30_000,  single0: 22_620, single1: 27_300, single2: 30_420, single3: 33_540, couple0: 33_540, couple1: 38_220, couple2: 41_340, couple3: 44_460 },
  { maxIncome: 50_000,  single0: 25_044, single1: 30_108, single2: 33_384, single3: 36_660, couple0: 37_128, couple1: 42_192, couple2: 45_468, couple3: 48_744 },
  { maxIncome: 70_000,  single0: 28_080, single1: 33_072, single2: 36_348, single3: 39_624, couple0: 40_560, couple1: 45_552, couple2: 48_828, couple3: 52_104 },
  { maxIncome: 90_000,  single0: 31_200, single1: 36_192, single2: 39_468, single3: 42_744, couple0: 44_148, couple1: 49_140, couple2: 52_416, couple3: 55_692 },
  { maxIncome: 110_000, single0: 34_320, single1: 39_312, single2: 42_588, single3: 45_864, couple0: 47_736, couple1: 52_728, couple2: 56_004, couple3: 59_280 },
  { maxIncome: 130_000, single0: 37_440, single1: 42_432, single2: 45_708, single3: 48_984, couple0: 51_324, couple1: 56_316, couple2: 59_592, couple3: 62_868 },
  { maxIncome: 150_000, single0: 40_560, single1: 45_552, single2: 48_828, single3: 52_104, couple0: 54_912, couple1: 59_904, couple2: 63_180, couple3: 66_456 },
  { maxIncome: Infinity, single0: 43_680, single1: 48_672, single2: 51_948, single3: 55_224, couple0: 58_500, couple1: 63_492, couple2: 66_768, couple3: 70_044 },
]

const HEM_PER_EXTRA_DEPENDANT = 3_276

// ─── Types ───────────────────────────────────────────────────────────────────

export type LoanPurpose = 'owner-occupied' | 'investment'
export type RepaymentType = 'pi' | 'io'

export interface BorrowingPowerInput {
  purpose: LoanPurpose
  applicants: number
  dependants: number
  repaymentType: RepaymentType
  baseIncome: number
  additionalIncome: number
  baseIncome2: number
  additionalIncome2: number
  livingExpenses: number
  creditCardLimit: number
  homeLoanRepayments: number
  otherLoanRepayments: number
}

export interface BorrowingPowerResult {
  maxBorrowing: number
  monthlyRepayment: number
  totalRepayments: number
  totalInterest: number
  assessmentRate: number
  nsr: number
  totalAssessableIncome: number
  afterTaxIncome: number
  annualTax: number
  annualLivingExpenses: number
  annualExistingCommitments: number
  netSurplus: number
  hemBenchmark: number
}

// ─── Calculator ──────────────────────────────────────────────────────────────

/**
 * Look up income-tiered HEM benchmark.
 * Uses after-tax income to select the tier (matching Macquarie's HEM Table lookup).
 */
const getHemBenchmark = (
  applicants: number,
  dependants: number,
  afterTaxIncome: number
): number => {
  const isCouple = applicants >= 2
  const depsCapped = Math.min(dependants, 3)

  const tier = HEM_TIERS.find((t) => afterTaxIncome <= t.maxIncome) ?? HEM_TIERS[HEM_TIERS.length - 1]

  const key = `${isCouple ? 'couple' : 'single'}${depsCapped}` as keyof HemTier
  const baseHem = tier[key] as number

  const extraDeps = Math.max(0, dependants - 3)
  return baseHem + extraDeps * HEM_PER_EXTRA_DEPENDANT
}

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

const annualIORepayment = (loanAmount: number, annualRate: number): number => {
  return loanAmount * annualRate
}

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

  // ── Step 1: Gross Assessable Income (with shading) ──
  // Base income at 100%, additional at 80% (Macquarie B170-B172, K177)
  const applicant1Gross = baseIncome + additionalIncome * INCOME_SHADING_RATE
  const applicant2Gross =
    applicants >= 2
      ? baseIncome2 + additionalIncome2 * INCOME_SHADING_RATE
      : 0
  const totalAssessableIncome = applicant1Gross + applicant2Gross

  // ── Step 2: Income Tax ──
  // Macquarie calculates PAYG tax via Loan Workings sheet to get net income.
  // Tax is calculated per-applicant on their individual assessable income,
  // then summed - this matters for couples (two $75k earners pay less tax
  // than one $150k earner).
  const tax1 = calculateAnnualTax(applicant1Gross)
  const tax2 = applicants >= 2 ? calculateAnnualTax(applicant2Gross) : 0
  const annualTax = tax1 + tax2
  const afterTaxIncome = totalAssessableIncome - annualTax

  // ── Step 3: Living Expenses ──
  // Higher of declared or income-tiered HEM benchmark (Macquarie B91, K91)
  // HEM lookup uses after-tax income to select the tier
  const hemBenchmark = getHemBenchmark(applicants, dependants, afterTaxIncome)
  const declaredAnnual = livingExpenses * 12
  const annualLivingExpenses = Math.max(declaredAnnual, hemBenchmark)

  // ── Step 4: Existing Commitments (annualised) ──
  const annualHomeLoan = homeLoanRepayments * 12
  const annualOtherLoans = otherLoanRepayments * 12
  const annualCreditCard = creditCardLimit * CREDIT_CARD_FACTOR
  const annualExistingCommitments = annualHomeLoan + annualOtherLoans + annualCreditCard

  // ── Step 5: Net Surplus (using after-tax income) ──
  const netSurplus = afterTaxIncome - annualLivingExpenses - annualExistingCommitments

  // ── Step 6: Max Loan ──
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

  // NSR check
  const proposedAnnualRepayment = repaymentType === 'pi'
    ? annualPIRepayment(maxBorrowing, assessmentRate, termYears)
    : annualIORepayment(maxBorrowing, assessmentRate)
  const totalCommitments = annualLivingExpenses + annualExistingCommitments + proposedAnnualRepayment
  const nsr = totalCommitments > 0 ? afterTaxIncome / totalCommitments : 0

  return {
    maxBorrowing,
    monthlyRepayment,
    totalRepayments,
    totalInterest,
    assessmentRate,
    nsr: Math.round(nsr * 100) / 100,
    totalAssessableIncome: Math.round(totalAssessableIncome),
    afterTaxIncome: Math.round(afterTaxIncome),
    annualTax: Math.round(annualTax),
    annualLivingExpenses: Math.round(annualLivingExpenses),
    annualExistingCommitments: Math.round(annualExistingCommitments),
    netSurplus: Math.round(netSurplus),
    hemBenchmark: Math.round(hemBenchmark),
  }
}
