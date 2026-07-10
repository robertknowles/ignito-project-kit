/**
 * Stamp duty calculator - toolkit (owner-occupier & investor).
 *
 * Estimates the government costs of a residential property purchase across all
 * Australian states and territories:
 *   - transfer (stamp) duty
 *   - mortgage registration fee
 *   - land transfer / title registration fee
 *   - First Home Owner Grant (FHOG)
 *   - first-home-buyer and eligible-pensioner duty concessions
 *
 * Duty brackets for the standard/investor path reuse the verified engine in
 * ./stampDutyCalculator. The ACT is charged on a separate residential
 * (owner-occupier) scale. Concession thresholds are documented inline and are
 * indicative only - they change frequently and vary with individual
 * circumstances. This is an estimate, not advice. Figures do not include
 * foreign-buyer surcharges. Last reviewed against state revenue offices: 2026-07.
 */
import { calculateStampDuty } from './stampDutyCalculator'

export type AusState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT'
export type PropertyUse = 'primary' | 'investment'
export type PurchaseType = 'established' | 'new' | 'vacant'

export const AUS_STATES: { value: AusState; label: string }[] = [
  { value: 'ACT', label: 'ACT' },
  { value: 'NSW', label: 'NSW' },
  { value: 'NT', label: 'NT' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'VIC', label: 'VIC' },
  { value: 'WA', label: 'WA' },
]

export interface StampDutyInput {
  state: AusState
  propertyValue: number
  totalIncome: number
  propertyUse: PropertyUse
  purchaseType: PurchaseType
  numberOfChildren: number
  isFirstHomeBuyer: boolean
  isPensioner: boolean
}

export interface StampDutyResult {
  stampDuty: number
  mortgageRegistrationFee: number
  landTransferFee: number
  totalGovernmentFees: number
  firstHomeOwnerGrant: number
  totalGovernmentGrant: number
  concessionNote: string | null
}

// ── ACT residential (owner-occupier) conveyance duty ────────────────────────
// Investment / non-owner-occupier ACT duty uses the standard engine.
function actResidentialDuty(price: number): number {
  if (price <= 260000) return Math.max(20, price * 0.0049)
  if (price <= 300000) return 1274 + (price - 260000) * 0.022
  if (price <= 500000) return 2154 + (price - 300000) * 0.034
  if (price <= 750000) return 8408 + (price - 500000) * 0.0432
  if (price <= 1000000) return 19754 + (price - 750000) * 0.059
  if (price <= 1455000) return 34504 + (price - 1000000) * 0.064
  return price * 0.0454
}

// ── Government fees ──────────────────────────────────────────────────────────
const MORTGAGE_REGISTRATION_FEE: Record<AusState, number> = {
  NSW: 172,
  VIC: 124,
  QLD: 232,
  SA: 196,
  WA: 221,
  TAS: 155,
  NT: 165,
  ACT: 184,
}

/** Land transfer / title registration fee - tiered by value (indicative). */
function landTransferFee(state: AusState, price: number): number {
  switch (state) {
    case 'ACT':
      if (price <= 300000) return 436
      if (price <= 500000) return 466
      if (price <= 750000) return 496
      if (price <= 1000000) return 529
      return 624
    case 'NSW':
      return 172
    case 'VIC':
      // ~ $91.80 + $2.34 per $1,000, capped
      return Math.min(3610, 92 + Math.ceil(price / 1000) * 2.34)
    case 'QLD':
      if (price <= 180000) return 209
      return 209 + Math.ceil(Math.max(0, price - 180000) / 10000) * 39
    case 'SA':
      if (price <= 50000) return 200
      if (price <= 100000) return 289
      if (price <= 250000) return 350
      if (price <= 500000) return 470
      return 5680
    case 'WA':
      return 218
    case 'TAS':
      if (price <= 500000) return 224.86
      return 246.86
    case 'NT':
      return 165
    default:
      return 200
  }
}

// ── First Home Owner Grant (new homes) ──────────────────────────────────────
function firstHomeOwnerGrant(input: StampDutyInput): number {
  const { state, propertyValue, purchaseType, isFirstHomeBuyer, propertyUse } = input
  // FHOG applies to owner-occupier first home buyers building/buying a NEW home.
  if (!isFirstHomeBuyer || propertyUse !== 'primary') return 0
  if (purchaseType !== 'new') return 0

  switch (state) {
    case 'NSW':
      return propertyValue <= 750000 ? 10000 : 0
    case 'VIC':
      return propertyValue <= 750000 ? 10000 : 0
    case 'QLD':
      return propertyValue < 750000 ? 30000 : 0
    case 'WA':
      return propertyValue <= 750000 ? 10000 : 0
    case 'SA':
      return 15000
    case 'TAS':
      return 30000
    case 'NT':
      return 50000
    case 'ACT':
      return 0 // ACT has no FHOG - uses the Home Buyer Concession Scheme instead
    default:
      return 0
  }
}

/** Linear taper between a full-exemption cap and a no-concession ceiling. */
function taperedConcession(price: number, exemptCap: number, ceiling: number, fullDuty: number): number {
  if (price <= exemptCap) return 0
  if (price >= ceiling) return fullDuty
  const ratio = (price - exemptCap) / (ceiling - exemptCap)
  return fullDuty * ratio
}

// ── Duty with first-home / pensioner concessions ────────────────────────────
function dutyWithConcessions(input: StampDutyInput, fullDuty: number): { duty: number; note: string | null } {
  const { state, propertyValue, propertyUse, purchaseType, isFirstHomeBuyer, isPensioner, totalIncome, numberOfChildren } = input

  // Concessions only apply to owner-occupiers (a place to live).
  if (propertyUse !== 'primary') return { duty: fullDuty, note: null }

  const eligible = isFirstHomeBuyer || isPensioner
  const who = isFirstHomeBuyer ? 'First home buyer' : 'Pensioner'

  // ACT - Home Buyer Concession Scheme: nil duty when household income is under
  // the threshold (raised per dependent child), regardless of new/established.
  if (state === 'ACT' && eligible) {
    const incomeThreshold = 250000 + numberOfChildren * 4600
    if (totalIncome <= incomeThreshold) {
      return { duty: 0, note: `${who} - ACT Home Buyer Concession Scheme: no duty payable.` }
    }
    return { duty: fullDuty, note: `Household income exceeds the ACT concession threshold (${incomeThreshold.toLocaleString('en-AU')}).` }
  }

  if (!eligible) return { duty: fullDuty, note: null }

  switch (state) {
    case 'NSW': {
      // Exempt to $800k, tapered concession to $1m.
      const payable = taperedConcession(propertyValue, 800000, 1000000, fullDuty)
      return { duty: payable, note: payable === 0 ? `${who} - full duty exemption applied.` : payable < fullDuty ? `${who} - concessional duty applied.` : `Value above the NSW concession ceiling.` }
    }
    case 'VIC': {
      const payable = taperedConcession(propertyValue, 600000, 750000, fullDuty)
      return { duty: payable, note: payable === 0 ? `${who} - full duty exemption applied.` : payable < fullDuty ? `${who} - concessional duty applied.` : `Value above the VIC concession ceiling.` }
    }
    case 'QLD': {
      const payable = taperedConcession(propertyValue, 700000, 800000, fullDuty)
      return { duty: payable, note: payable === 0 ? `${who} - full duty exemption applied.` : payable < fullDuty ? `${who} - concessional duty applied.` : `Value above the QLD concession ceiling.` }
    }
    case 'WA': {
      const payable = taperedConcession(propertyValue, 450000, 600000, fullDuty)
      return { duty: payable, note: payable === 0 ? `${who} - full duty exemption applied.` : payable < fullDuty ? `${who} - concessional duty applied.` : `Value above the WA concession ceiling.` }
    }
    case 'SA': {
      // Full relief for new homes / vacant land (first home); established gets no relief.
      if (purchaseType === 'new' || purchaseType === 'vacant') {
        return { duty: 0, note: `${who} - SA full duty relief on new home / vacant land.` }
      }
      return { duty: fullDuty, note: `SA duty relief applies to new homes and vacant land only.` }
    }
    case 'TAS': {
      // 50% concession on established homes to $750k.
      if (purchaseType === 'established' && propertyValue <= 750000) {
        return { duty: fullDuty * 0.5, note: `${who} - TAS 50% duty concession applied.` }
      }
      return { duty: fullDuty, note: null }
    }
    case 'NT':
      // NT provides grants rather than a general first-home duty concession.
      return { duty: fullDuty, note: `NT assistance is provided via grants rather than a duty concession.` }
    default:
      return { duty: fullDuty, note: null }
  }
}

export function calculateToolkitStampDuty(input: StampDutyInput): StampDutyResult {
  const { state, propertyValue, propertyUse } = input

  // Base (full) duty before concessions.
  const fullDuty =
    state === 'ACT' && propertyUse === 'primary'
      ? actResidentialDuty(propertyValue)
      : calculateStampDuty(state, propertyValue)

  const { duty, note } = dutyWithConcessions(input, fullDuty)

  const mortgageRegistrationFee = MORTGAGE_REGISTRATION_FEE[state]
  const landFee = landTransferFee(state, propertyValue)
  const stampDuty = Math.round(duty)
  const totalGovernmentFees = stampDuty + Math.round(mortgageRegistrationFee) + Math.round(landFee)

  const grant = firstHomeOwnerGrant(input)

  return {
    stampDuty,
    mortgageRegistrationFee: Math.round(mortgageRegistrationFee),
    landTransferFee: Math.round(landFee),
    totalGovernmentFees,
    firstHomeOwnerGrant: grant,
    totalGovernmentGrant: grant,
    concessionNote: note,
  }
}
