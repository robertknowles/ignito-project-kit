/**
 * Mortgage repayment calculator - toolkit.
 *
 * Standard amortising home-loan model. The periodic repayment is derived from
 * the monthly principal & interest payment using the common Australian
 * calculator convention:
 *   - fortnightly repayment = monthly / 2   (26 payments/yr ⇒ pays off faster)
 *   - weekly repayment      = monthly / 4   (52 payments/yr ⇒ pays off faster)
 * This mirrors the assumption used by most lender calculators and naturally
 * illustrates the interest saving from more frequent repayments.
 *
 * Interest-only loans are assumed to revert to principal & interest after an
 * initial IO period (default 3 years), consistent with typical lender terms.
 */

export type PaymentType = 'principal-interest' | 'interest-only'
export type RepaymentFrequency = 'weekly' | 'fortnightly' | 'monthly'

export const IO_PERIOD_YEARS = 3

export interface MortgageInput {
  loanAmount: number
  loanTermYears: number
  /** Annual interest rate as a percentage, e.g. 3.66 */
  interestRate: number
  paymentType: PaymentType
  frequency: RepaymentFrequency
  /** Extra amount added to each monthly repayment */
  extraMonthlyPayment: number
  /** One-off lump-sum payment */
  lumpSum: number
  /** Extra repayments / lump sum begin after this many years */
  extraStartsAfterYears: number
}

export interface AmortisationRow {
  year: number
  principal: number
  interest: number
  balance: number
}

export interface MortgageResult {
  /** Repayment for the selected frequency */
  periodicRepayment: number
  monthlyRepayment: number
  totalPrincipalPaid: number
  totalInterestPaid: number
  totalExtraPayment: number
  periodsPerYear: number
  /** Actual years to pay off (may be < term with extra repayments) */
  payoffYears: number
  schedule: AmortisationRow[]
}

const PERIODS_PER_YEAR: Record<RepaymentFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
}

/** Divisor applied to the monthly repayment to get the per-period repayment. */
const FREQUENCY_DIVISOR: Record<RepaymentFrequency, number> = {
  weekly: 4,
  fortnightly: 2,
  monthly: 1,
}

/** Standard amortising payment for a loan over n periods at periodic rate r. */
function amortisingPayment(principal: number, periodicRate: number, periods: number): number {
  if (principal <= 0 || periods <= 0) return 0
  if (periodicRate === 0) return principal / periods
  const factor = Math.pow(1 + periodicRate, periods)
  return (principal * periodicRate * factor) / (factor - 1)
}

export function calculateMortgageRepayment(input: MortgageInput): MortgageResult {
  const {
    loanAmount,
    loanTermYears,
    interestRate,
    paymentType,
    frequency,
    extraMonthlyPayment,
    lumpSum,
    extraStartsAfterYears,
  } = input

  const periodsPerYear = PERIODS_PER_YEAR[frequency]
  const divisor = FREQUENCY_DIVISOR[frequency]
  const annualRate = interestRate / 100
  const monthlyRate = annualRate / 12
  const periodicRate = annualRate / periodsPerYear

  const emptyResult: MortgageResult = {
    periodicRepayment: 0,
    monthlyRepayment: 0,
    totalPrincipalPaid: 0,
    totalInterestPaid: 0,
    totalExtraPayment: 0,
    periodsPerYear,
    payoffYears: 0,
    schedule: [{ year: 0, principal: 0, interest: 0, balance: loanAmount || 0 }],
  }

  if (loanAmount <= 0 || loanTermYears <= 0) return emptyResult

  // ── Base monthly repayment (drives the periodic repayment) ──
  const totalMonths = loanTermYears * 12
  const ioMonths = paymentType === 'interest-only' ? Math.min(IO_PERIOD_YEARS * 12, totalMonths) : 0
  const piMonths = totalMonths - ioMonths

  // Interest-only monthly payment during the IO period
  const monthlyIoPayment = loanAmount * monthlyRate
  // P&I monthly payment for the remaining term (loan balance is unchanged during IO)
  const monthlyPiPayment = amortisingPayment(loanAmount, monthlyRate, piMonths || totalMonths)

  const periodicIoPayment = monthlyIoPayment / divisor
  const periodicPiPayment = monthlyPiPayment / divisor
  const periodicExtra = (extraMonthlyPayment || 0) / divisor

  // ── Period-by-period simulation ──
  const maxPeriods = loanTermYears * periodsPerYear
  const ioPeriods = paymentType === 'interest-only' ? Math.min(IO_PERIOD_YEARS * periodsPerYear, maxPeriods) : 0
  const extraStartPeriod = Math.round(extraStartsAfterYears * periodsPerYear)

  let balance = loanAmount
  let totalInterest = 0
  let totalExtra = 0
  let lumpApplied = false

  // Per-year accumulators
  const schedule: AmortisationRow[] = [{ year: 0, principal: 0, interest: 0, balance: loanAmount }]
  let yearPrincipal = 0
  let yearInterest = 0

  let period = 0
  for (period = 1; period <= maxPeriods && balance > 0.005; period++) {
    const inIoPeriod = period <= ioPeriods
    const extraActive = period > extraStartPeriod || extraStartsAfterYears <= 0

    const interest = balance * periodicRate
    totalInterest += interest

    const basePayment = inIoPeriod ? periodicIoPayment : periodicPiPayment
    let scheduledPrincipal = inIoPeriod ? 0 : Math.max(0, basePayment - interest)

    // Extra recurring repayment
    if (extraActive && periodicExtra > 0) {
      scheduledPrincipal += periodicExtra
      totalExtra += periodicExtra
    }

    // One-off lump sum, applied on the first eligible period
    if (!lumpApplied && lumpSum > 0 && (extraActive || extraStartsAfterYears <= 0)) {
      scheduledPrincipal += lumpSum
      totalExtra += lumpSum
      lumpApplied = true
    }

    // Never pay off more than the outstanding balance
    const principalPaid = Math.min(scheduledPrincipal, balance)
    balance -= principalPaid

    yearPrincipal += principalPaid
    yearInterest += interest

    // Close out the year (or final period)
    if (period % periodsPerYear === 0 || balance <= 0.005 || period === maxPeriods) {
      schedule.push({
        year: Math.ceil(period / periodsPerYear),
        principal: yearPrincipal,
        interest: yearInterest,
        balance: Math.max(0, balance),
      })
      yearPrincipal = 0
      yearInterest = 0
    }
  }

  const periodsElapsed = period - 1
  const totalPrincipalPaid = loanAmount - Math.max(0, balance)

  return {
    periodicRepayment: periodicIoPayment > 0 || periodicPiPayment > 0
      ? (paymentType === 'interest-only' ? periodicIoPayment : periodicPiPayment)
      : 0,
    monthlyRepayment: paymentType === 'interest-only' ? monthlyIoPayment : monthlyPiPayment,
    totalPrincipalPaid,
    totalInterestPaid: totalInterest,
    totalExtraPayment: totalExtra,
    periodsPerYear,
    payoffYears: periodsElapsed / periodsPerYear,
    schedule,
  }
}
