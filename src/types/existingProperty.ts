import type { PropertyInstanceDetails } from './propertyInstance'

/**
 * Snapshot captured when a planned property is "marked as purchased" from the
 * Next Purchase Brief. Lets the portfolio revert that purchase - restoring the
 * exact timeline instance it came from. Only the most recent purchase (highest
 * `seq`) can be reverted; earlier ones must be reverted in reverse order first.
 */
export interface RevertSnapshot {
  /** Monotonic purchase order - highest = the last purchase (revertable). */
  seq: number
  /** Property type id the instance belonged to (e.g. "metro-house-growth"). */
  propertyId: string
  /** The instance id it held in the timeline at purchase time. */
  instanceId: string
  /** Full instance detail to restore into the timeline on revert. */
  details: PropertyInstanceDetails
}

export interface ExistingProperty {
  id: string
  address: string
  state: string
  boughtYear: number
  purchasePrice: number
  currentValue: number
  loan: number
  rentPerWeek: number
  yield: number
  interestRate: number
  loanType: 'IO' | 'PI'
  stampDuty: number
  legals: number
  buildingPest: number
  baFee: number
  cashDeposit: number
  propertyMgmtPercent: number
  councilWater: number
  insurance: number
  maintenance: number
  growthAssumption?: 'High' | 'Medium' | 'Low'
  loanTerm?: number
  ioTermYears?: number
  strata?: number
  vacancyRate?: number
  saleYear?: number | null
  allowEquityRelease?: boolean
  entity?: 'individual' | 'trust' | 'company' | 'smsf'
  /** New build vs established - new builds keep the CGT discount choice and the
   *  negative-gearing exemption under the proposed 2027 reform. */
  isNewBuild?: boolean
  lvrOverride?: number | null
  yieldOverride?: number | null
  holdingCostOverride?: number | null
  purchaseCostsOverride?: number | null
  /** Present when this property was purchased from the Next Purchase Brief;
   *  drives the "Revert to next purchase" action in the portfolio. */
  revert?: RevertSnapshot
  /** Google Places metadata, populated when the address is picked from autocomplete */
  suburb?: string
  postcode?: string
  latitude?: number
  longitude?: number
  placeId?: string
  /** Street View (or satellite fallback) image cached by the property-image function */
  photoUrl?: string
}

export const createDefaultExistingProperty = (): ExistingProperty => ({
  id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  address: '',
  state: 'NSW',
  boughtYear: 0,
  purchasePrice: 0,
  currentValue: 0,
  loan: 0,
  rentPerWeek: 0,
  yield: 0,
  interestRate: 0,
  loanType: 'IO',
  stampDuty: 0,
  legals: 0,
  buildingPest: 0,
  baFee: 0,
  cashDeposit: 0,
  propertyMgmtPercent: 0,
  councilWater: 0,
  insurance: 0,
  maintenance: 0,
})
