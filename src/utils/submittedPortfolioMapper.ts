import type { ExistingProperty } from '@/types/existingProperty'

/**
 * Shape of one existing-portfolio row as collected by the client onboarding
 * form (ClientOnboarding.tsx) and stored verbatim in
 * scenarios.data.clientSubmittedInputs.existingProperties. Values may arrive
 * as strings/null after a JSON round-trip, so everything is coerced.
 */
export interface SubmittedPortfolioRow {
  value?: number | string | null      // current market value
  debt?: number | string | null       // outstanding loan balance
  weeklyRent?: number | string | null // gross rent per week
  entity?: string | null              // 'Personal' | 'Company' | 'Trust' | 'SMSF'
}

/** Form entity labels → store entity keys. Unknown/missing → 'individual'. */
const ENTITY_MAP: Record<string, NonNullable<ExistingProperty['entity']>> = {
  personal: 'individual',
  company: 'company',
  trust: 'trust',
  smsf: 'smsf',
}

/**
 * Map the client-submitted per-property rows into real ExistingProperty[]
 * store rows (the shape ScenarioSaveContext / PortfolioTab / the engines
 * read), so the form path no longer relies on the AI re-extracting the
 * portfolio from prose.
 *
 * Defaults intentionally mirror mapToExistingProperties in
 * src/utils/nlDataMapper.ts (the AI-extraction path) so both entry points
 * produce identical rows for identical inputs:
 * purchasePrice = current value (the form only asks for value), boughtYear =
 * current year, interest 6% IO over 30 years, standard holding-cost defaults,
 * Medium growth, 2% vacancy, equity release allowed.
 *
 * `state`/`address` are left EMPTY: the form never asks for them, and no
 * engine path needs them for existing properties (stamp duty is override-0,
 * land tax is override-null → 0). An empty state renders as an unselected
 * dropdown in the Portfolio tab instead of a fabricated NSW.
 *
 * Row ORDER is preserved 1:1 with the submitted array (including blank rows)
 * because the confirmation-brief merge matches AI-extracted rows back to
 * store rows by index when addresses are empty.
 */
export function mapSubmittedToExistingProperties(
  rows: SubmittedPortfolioRow[]
): ExistingProperty[] {
  const stamp = Date.now()
  const year = new Date().getFullYear()

  return rows.map((row, i) => {
    const value = Number(row?.value) || 0
    const debt = Number(row?.debt) || 0
    const weeklyRent = Number(row?.weeklyRent) || 0
    const annualRent = weeklyRent * 52

    return {
      id: `ep-form-${stamp}-${i}`,
      address: '',
      state: '',
      boughtYear: year,
      purchasePrice: value,
      currentValue: value,
      loan: debt,
      rentPerWeek: weeklyRent,
      yield: value > 0 ? (annualRent / value) * 100 : 4.0,
      interestRate: 6.0,
      loanType: 'IO' as const,
      stampDuty: 0,
      legals: 1_500,
      buildingPest: 700,
      baFee: 0,
      cashDeposit: Math.max(0, value - debt),
      propertyMgmtPercent: 8,
      councilWater: 2_500,
      insurance: 1_500,
      maintenance: 2_000,
      growthAssumption: 'Medium' as const,
      loanTerm: 30,
      strata: 0,
      vacancyRate: 0.02,
      allowEquityRelease: true,
      saleYear: null,
      isNewBuild: false,
      entity: ENTITY_MAP[String(row?.entity ?? '').toLowerCase()] ?? 'individual',
    }
  })
}
