import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext'

type EntityType = 'individual' | 'trust' | 'company' | 'smsf'

/**
 * Calculate the effective CGT rate for a given entity type.
 * When `isConsolidationPeriod` is true and entity is individual,
 * uses the (typically lower) marginal tax rate at consolidation year.
 */
export function getEffectiveCgtRate(
  entity: EntityType | undefined,
  profile: InvestmentProfileData,
  isConsolidationPeriod = false
): number {
  const marginalRate = isConsolidationPeriod && (entity ?? 'individual') === 'individual'
    ? (profile.marginalTaxRateAtConsolidation ?? profile.marginalTaxRate ?? 0.39)
    : (profile.marginalTaxRate ?? 0.45)
  const discount = profile.cgtOneYearDiscount ?? 0.50
  const e = entity ?? 'individual'
  switch (e) {
    case 'individual':
      return marginalRate * (1 - discount)
    case 'trust':
      return (profile.trustTaxRate ?? 0.30) * (1 - discount)
    case 'company':
      return profile.companyTaxRate ?? 0.25
    case 'smsf':
      return (profile.smsfTaxRate ?? 0.15) * (1 - 1 / 3)
    default:
      return marginalRate * (1 - discount)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSED CGT REFORM (2026-27 Federal Budget - NOT YET LAW)
//
// Announced 12 May 2026, intended to commence 1 July 2027 if the Treasury Laws
// Amendment (Tax Reform No. 1) Bill 2026 passes the Senate. For individuals,
// trusts and partnerships the 50% CGT discount is replaced with CPI cost-base
// indexation + a 30% minimum tax on the real (above-inflation) gain. Only gains
// accruing AFTER 1 July 2027 use the new method; gains up to that date keep
// current treatment. Companies, SMSFs and foreign residents are out of scope.
//
// We model this as a "base-level" TIME-APPORTIONED approximation (see
// calculateCgtComparison) so it can sit alongside current law as a scenario.
// Current law remains the product default - nothing here changes existing
// roadmap numbers.
// ─────────────────────────────────────────────────────────────────────────────

/** 1 July 2027 expressed as a fractional year for time-apportionment. */
export const CGT_REFORM_START_YEAR = 2027.5

/** Minimum tax rate applied to the real (post-indexation) gain under the reform. */
export const CGT_REFORM_MIN_RATE = 0.30

export interface CgtRegimeResult {
  /** Dollar CGT liability. */
  cgt: number
  /** cgt / capitalGain - for display only. */
  effectiveRate: number
}

export interface CgtComparison {
  capitalGain: number
  current: CgtRegimeResult
  reform: CgtRegimeResult & {
    /** Slice of the gain taxed under current (pre-1 Jul 2027) rules. */
    preReformGain: number
    /** Real (above-inflation) slice taxed under the new (post-1 Jul 2027) rules. */
    postReformGain: number
    /** Inflation indexed out of the post-reform slice. */
    indexationRelief: number
    /** False for company/SMSF - reform doesn't apply, so reform === current. */
    inScope: boolean
  }
}

/**
 * Compute CGT under BOTH current law and the proposed 1 July 2027 reform.
 *
 * The reform gain is split straight-line over the modelled hold period around
 * the 1 July 2027 cutoff. Any gain already embedded by `holdStartYear`
 * (`valueAtHoldStart − costBase`) is treated as entirely pre-reform, since it
 * accrued before the cutoff.
 *
 * New builds keep a CHOICE between the 50% discount and the new method, applied
 * to the whole gain (no pre/post split) - we take whichever is cheaper.
 *
 * BASE-LEVEL SIMPLIFICATIONS (deliberate, see scope decision):
 *  - Established apportionment is straight-line by time, not by an actual
 *    1 Jul 2027 market valuation (that is the "full legal" method, deferred).
 *  - CPI is taken from `profile.inflationRate` rather than a forecast series.
 */
export function calculateCgtComparison(params: {
  entity: EntityType | undefined
  profile: InvestmentProfileData
  /** Nominal capital gain (sale value − cost base), as the engine computes it. */
  capitalGain: number
  /** Cost base used for the current-law gain (purchase price). */
  costBase: number
  /** Value at the start of the modelled hold; gain above cost base here is pre-reform. */
  valueAtHoldStart?: number
  /** Year the modelled hold begins (e.g. BASE_YEAR for existing properties). */
  holdStartYear: number
  /** Year of sale. */
  saleYear: number
  /** New builds keep the discount choice and the negative-gearing exemption. */
  isNewBuild?: boolean
  isConsolidationPeriod?: boolean
}): CgtComparison {
  const {
    entity, profile, capitalGain, costBase, valueAtHoldStart,
    holdStartYear, saleYear, isNewBuild = false, isConsolidationPeriod = false,
  } = params

  const e = entity ?? 'individual'
  const safeGain = Math.max(0, capitalGain)

  // ── Current law ──
  const currentRate = getEffectiveCgtRate(entity, profile, isConsolidationPeriod)
  const currentCgt = safeGain * currentRate
  const current: CgtRegimeResult = { cgt: currentCgt, effectiveRate: currentRate }

  // Companies & SMSFs are out of scope of the reform - mirror current law.
  if (e === 'company' || e === 'smsf') {
    return {
      capitalGain: safeGain,
      current,
      reform: {
        cgt: currentCgt, effectiveRate: currentRate,
        preReformGain: safeGain, postReformGain: 0, indexationRelief: 0, inScope: false,
      },
    }
  }

  // ── Reform - shared rate inputs ──
  const discount = profile.cgtOneYearDiscount ?? 0.50
  const marginal = (isConsolidationPeriod && e === 'individual')
    ? (profile.marginalTaxRateAtConsolidation ?? profile.marginalTaxRate ?? 0.39)
    : (profile.marginalTaxRate ?? 0.45)
  const entityRate = e === 'trust' ? (profile.trustTaxRate ?? 0.30) : marginal
  const cpi = profile.inflationRate ?? 0.03
  const totalYears = Math.max(saleYear - holdStartYear, 1e-6)

  // New builds CHOOSE the cheaper of (a) the 50% discount or (b) the new method
  // applied to the whole gain - they are not subject to the pre/post-2027 split.
  if (isNewBuild) {
    const relief = Math.min(safeGain, Math.max(0, costBase * (Math.pow(1 + cpi, totalYears) - 1)))
    const realGain = Math.max(0, safeGain - relief)
    const newMethodCgt = realGain * Math.max(entityRate, CGT_REFORM_MIN_RATE)
    const chooseNew = newMethodCgt < currentCgt
    const reformCgt = chooseNew ? newMethodCgt : currentCgt
    return {
      capitalGain: safeGain,
      current,
      reform: {
        cgt: reformCgt,
        effectiveRate: safeGain > 0 ? reformCgt / safeGain : 0,
        preReformGain: chooseNew ? 0 : safeGain,
        postReformGain: chooseNew ? realGain : 0,
        indexationRelief: chooseNew ? relief : 0,
        inScope: true,
      },
    }
  }

  // Established properties: time-apportion the gain straight-line at 1 Jul 2027.
  const yearsPre = Math.min(Math.max(CGT_REFORM_START_YEAR - holdStartYear, 0), totalYears)
  const yearsPost = totalYears - yearsPre
  const preFraction = totalYears > 0 ? yearsPre / totalYears : 1

  // Gain already accrued before the modelled hold is entirely pre-reform.
  const embeddedGain = Math.min(safeGain, Math.max(0, (valueAtHoldStart ?? costBase) - costBase))
  const growthGain = safeGain - embeddedGain
  const preGain = embeddedGain + growthGain * preFraction
  const postGain = growthGain * (1 - preFraction)

  // Pre-reform slice: current discount method.
  const preRate = entityRate * (1 - discount)

  // Post-reform slice: index out inflation, tax the real gain at max(rate, 30%).
  const valueAt2027 = costBase + preGain // approximate cost base entering the post period
  const indexationRelief = Math.min(postGain, Math.max(0, valueAt2027 * (Math.pow(1 + cpi, yearsPost) - 1)))
  const realPostGain = Math.max(0, postGain - indexationRelief)
  const postRate = Math.max(entityRate, CGT_REFORM_MIN_RATE)

  const reformCgt = preGain * preRate + realPostGain * postRate

  return {
    capitalGain: safeGain,
    current,
    reform: {
      cgt: reformCgt,
      effectiveRate: safeGain > 0 ? reformCgt / safeGain : 0,
      preReformGain: preGain,
      postReformGain: realPostGain,
      indexationRelief,
      inScope: true,
    },
  }
}
