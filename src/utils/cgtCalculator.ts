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
