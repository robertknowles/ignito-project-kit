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
}

export const createDefaultExistingProperty = (): ExistingProperty => ({
  id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  address: '',
  state: 'NSW',
  boughtYear: new Date().getFullYear(),
  purchasePrice: 500_000,
  currentValue: 500_000,
  loan: 400_000,
  rentPerWeek: 450,
  yield: 4.0,
  interestRate: 6.0,
  loanType: 'IO',
  stampDuty: 0,
  legals: 1_500,
  buildingPest: 700,
  baFee: 0,
  cashDeposit: 100_000,
  propertyMgmtPercent: 8,
  councilWater: 2_500,
  insurance: 1_500,
  maintenance: 2_000,
})
