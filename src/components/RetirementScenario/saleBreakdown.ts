import type { InvestmentProfileData } from '../../contexts/InvestmentProfileContext'
import type { RetirementPropertyProjection } from './useRetirementProjection'

/**
 * Retirement sell-down — sale breakdown & CGT helper.
 *
 * Pure, unit-testable. Turns a projected property at the retirement year into a
 * waterfall (sale price → costs → loan → cash before tax → CGT → net cash) and
 * computes CGT under BOTH the current 50% discount and the proposed 2027
 * indexation method, side by side, plus the separate SMSF treatment.
 *
 * Formulas follow the build spec (§7). They are a deliberate simplification of
 * the time-apportioned engine in utils/cgtCalculator.ts (whole-period method),
 * which the spec flags (§12) as the intended treatment for this what-if.
 *
 * Compliance: this only models and compares — it never prefers a method.
 * Every figure is an estimate; the UI carries the not-tax-advice disclaimer.
 */

export type CgtMethod = 'discount' | 'indexation'
export type SaleLedger = 'personal' | 'smsf'

/** 1 July 2027 — sales on/after this default to the indexation method. */
export const CGT_REFORM_START_YEAR = 2027.5
/** Minimum tax rate on the real (post-indexation) gain. */
export const CGT_INDEXATION_FLOOR = 0.30
/** SMSF keeps its one-third discount, taxed at 15%. */
const SMSF_DISCOUNT = 1 / 3
const SMSF_RATE = 0.15
/** 50% CGT discount under current law. */
const CGT_DISCOUNT = 0.5

interface RegimeResult {
  /** Dollar CGT liability. */
  cgt: number
  /** Gain actually subject to tax (after discount / indexation). */
  taxableGain: number
  /** Net cash released under this regime (cashBeforeTax − cgt). */
  net: number
}

interface IndexationResult extends RegimeResult {
  /** Cost base lifted by CPI over the hold. */
  indexedCostBase: number
}

export interface SaleBreakdown {
  salePrice: number
  sellingCosts: number
  loanPayout: number
  cashBeforeTax: number
  costBase: number
  holdingYears: number
  ledger: SaleLedger
  /** Sale value less selling costs — the proceeds CGT is worked out on. */
  capitalProceeds: number
  /** max(0, capitalProceeds − costBase). */
  grossGain: number
  /** The method actually applied to this property (grandfathering / SMSF aware). */
  appliedMethod: CgtMethod
  /** Tax rate applied (decimal) — the local what-if rate. */
  rate: number
  /** CGT under the active method (or the SMSF treatment). */
  activeCgt: number
  /** Taxable gain under the active method (or SMSF treatment). */
  activeTaxableGain: number
  /** cashBeforeTax − activeCgt. */
  netCashReleased: number
  /** Both personal regimes, always computed for side-by-side comparison. */
  discount: RegimeResult
  indexation: IndexationResult
  /** Present only when the property's ledger is SMSF. */
  smsf?: RegimeResult
}

/**
 * Grandfathering: assets *acquired* before 1 Jul 2027 keep the current 50%
 * discount for their whole life; assets acquired on/after fall under the
 * proposed indexation method. The cutoff is the purchase year, not the sale
 * year — a property bought in 2018 and sold in 2040 is still grandfathered.
 *
 * SMSF and new builds are handled separately by the caller (SMSF keeps its own
 * one-third treatment; new builds may elect either method).
 */
export function grandfatheredMethod(purchaseYear: number): CgtMethod {
  return purchaseYear < CGT_REFORM_START_YEAR ? 'discount' : 'indexation'
}

export function buildSaleBreakdown(
  prop: RetirementPropertyProjection,
  profile: InvestmentProfileData,
  retirementYear: number,
  opts: { methodOverride?: CgtMethod; taxRatePct: number },
): SaleBreakdown {
  const rate = opts.taxRatePct / 100
  const cpi = profile.inflationRate ?? 0.03
  const ledger: SaleLedger = prop.entity === 'smsf' ? 'smsf' : 'personal'

  const salePrice = prop.futureValue
  const loanPayout = prop.futureDebt
  const sellingCosts = salePrice * ((profile.sellingCostsPercent ?? 3) / 100)
  const capitalProceeds = salePrice - sellingCosts
  const costBase = prop.costBase
  const grossGain = Math.max(0, capitalProceeds - costBase)
  const holdingYears = Math.max(0, retirementYear - prop.purchaseYear)
  const cashBeforeTax = salePrice - sellingCosts - loanPayout

  // Method A — current 50% discount.
  const discountTaxable = grossGain * (1 - CGT_DISCOUNT)
  const discountCgt = discountTaxable * rate
  const discount: RegimeResult = {
    cgt: discountCgt,
    taxableGain: discountTaxable,
    net: cashBeforeTax - discountCgt,
  }

  // Method B — proposed indexation (real gain taxed at max(rate, 30%)).
  const indexedCostBase = costBase * Math.pow(1 + cpi, holdingYears)
  const indexationTaxable = Math.max(0, capitalProceeds - indexedCostBase)
  const indexationCgt = Math.max(indexationTaxable * rate, indexationTaxable * CGT_INDEXATION_FLOOR)
  const indexation: IndexationResult = {
    cgt: indexationCgt,
    taxableGain: indexationTaxable,
    indexedCostBase,
    net: cashBeforeTax - indexationCgt,
  }

  // SMSF — out of scope of the reform, keeps its one-third discount at 15%.
  let smsf: RegimeResult | undefined
  if (ledger === 'smsf') {
    const smsfTaxable = grossGain * (1 - SMSF_DISCOUNT)
    const smsfCgt = smsfTaxable * SMSF_RATE
    smsf = { cgt: smsfCgt, taxableGain: smsfTaxable, net: cashBeforeTax - smsfCgt }
  }

  // Per-property method (grandfathering as a default, never locked):
  //   • SMSF  → always its own one-third treatment (the toggle can't change it).
  //   • default → each property uses its grandfathered method, decided by
  //              acquisition year (bought before 1 Jul 2027 → 50% discount).
  //   • override → the BA flips this one property to the other method to model a
  //              scenario that may not become law.
  const appliedMethod: CgtMethod =
    opts.methodOverride ?? grandfatheredMethod(prop.purchaseYear)

  // Active regime drives the headline + waterfall. SMSF always uses its own.
  const active = smsf ?? (appliedMethod === 'indexation' ? indexation : discount)

  return {
    salePrice,
    sellingCosts,
    loanPayout,
    cashBeforeTax,
    costBase,
    holdingYears,
    ledger,
    capitalProceeds,
    grossGain,
    appliedMethod,
    rate,
    activeCgt: active.cgt,
    activeTaxableGain: active.taxableGain,
    netCashReleased: active.net,
    discount,
    indexation,
    smsf,
  }
}
