import React, { useMemo, useState, useCallback, useRef } from 'react'
import { Target, DollarSign, TrendingUp, Home, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import type { ExistingProperty } from '@/types/existingProperty'
import { ChartCard } from './ui/ChartCard'
import { BriefCashflowChart, BriefEquityChart, BriefLoanChart, BriefHoldingCostChart } from './BriefPerformanceCharts'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useChangeReceipt } from '../contexts/ChangeReceiptContext'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { calcGrossYield } from '../utils/sharedFinancialCalcs'
import { parseShorthandNumber } from '../utils/parseShorthandNumber'
import { useRemoveTimelineProperty } from '../hooks/useRemoveTimelineProperty'
import type { PropertyInstanceDetails } from '../types/propertyInstance'

const fmtNum = (v: number) => Math.round(v).toLocaleString('en-AU')

// ── Sub-tab button ──────────────────────────────────────────────────────────

const SubTabItem: React.FC<{
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
      active
        ? 'bg-neutral-50 text-neutral-800'
        : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
    }`}
  >
    {icon}
    {label}
  </button>
)

// ── Read-only row ───────────────────────────────────────────────────────────

const KVRow: React.FC<{
  label: string
  value: string | number
  bold?: boolean
  border?: boolean
}> = ({ label, value, bold, border = true }) => (
  <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0`}>
    <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">
      {label}
    </td>
    <td className={`py-2 px-3 text-xs text-black font-semibold`}>
      {value}
    </td>
  </tr>
)

// ── Editable number row ─────────────────────────────────────────────────────

const EditableNumRow: React.FC<{
  label: string
  value: number
  field: keyof PropertyInstanceDetails
  instanceId: string
  bold?: boolean
  border?: boolean
  decimals?: number
}> = ({ label, value, field, instanceId, bold, border = true, decimals }) => {
  const { updateInstance } = usePropertyInstance()
  const { notifyEdit } = useChangeReceipt()
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const display = decimals !== undefined ? value.toFixed(decimals) : fmtNum(value)

  return (
    <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0`}>
      <td className={`py-2 px-3 text-xs font-semibold border-r border-neutral-100 whitespace-nowrap ${bold ? 'text-neutral-900' : 'text-neutral-500'}`}>
        {label}
      </td>
      <td className="py-1.5 px-2">
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : display}
          onFocus={() => { setFocused(true); setDraft(String(value)) }}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false)
            const n = parseShorthandNumber(draft)
            if (n !== null && n !== value) {
              notifyEdit('brief', { subject: 'Next purchase', fieldLabel: label, from: value, to: n })
              updateInstance(instanceId, { [field]: n } as Partial<PropertyInstanceDetails>)
            }
          }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className={`w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs text-black font-semibold hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300`}
        />
      </td>
    </tr>
  )
}

// ── Editable select row ─────────────────────────────────────────────────────

const EditableSelectRow: React.FC<{
  label: string
  value: string
  field: keyof PropertyInstanceDetails
  instanceId: string
  options: { value: string; label: string }[]
  border?: boolean
}> = ({ label, value, field, instanceId, options, border = true }) => {
  const { updateInstance } = usePropertyInstance()
  const { notifyEdit } = useChangeReceipt()

  return (
    <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0`}>
      <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">
        {label}
      </td>
      <td className="py-1.5 px-2">
        <select
          value={value}
          onChange={e => { notifyEdit('brief', { subject: 'Next purchase', fieldLabel: label, from: value, to: e.target.value }); updateInstance(instanceId, { [field]: e.target.value } as Partial<PropertyInstanceDetails>) }}
          className="w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs text-black font-semibold hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300 cursor-pointer"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
    </tr>
  )
}

const STATE_OPTIONS = [
  { value: 'VIC', label: 'VIC' },
  { value: 'NSW', label: 'NSW' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
]

const LOAN_PRODUCT_OPTIONS = [
  { value: 'IO', label: 'Interest only' },
  { value: 'PI', label: 'Principal & interest' },
]

const GROWTH_OPTIONS = [
  { value: 'High', label: 'High (12.5% → 10% → 7.5% → 6%)' },
  { value: 'Medium', label: 'Medium (6% → 5.5% → 5% → 5%)' },
  { value: 'Low', label: 'Low (5% → 4% → 3.5% → 3%)' },
]

const ENTITY_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'trust', label: 'Trust' },
  { value: 'company', label: 'Company' },
  { value: 'smsf', label: 'SMSF' },
]

const fmt$ = (v: number) => `$${fmtNum(v)}`

// ── Compact KPI box ─────────────────────────────────────────────────────────

const BriefStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white border border-[#E9EAEB] rounded-xl px-4 py-3">
    <span className="metric-label">{label}</span>
    <div className="mt-1">
      <span className="stat-number">{value}</span>
    </div>
  </div>
)

// ── Cash breakdown donut ────────────────────────────────────────────────────

const CashDonut: React.FC<{
  segments: { label: string; value: number; color: string }[]
  total: number
}> = ({ segments, total }) => (
  <div className="flex items-center gap-6">
    <div className="relative shrink-0" style={{ width: 168, height: 168 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[15px] font-semibold text-neutral-900 leading-tight">{fmt$(total)}</span>
        <span className="text-[11px] text-neutral-500">cash needed</span>
      </div>
    </div>
    <div className="flex-1 flex flex-col gap-2.5">
      {segments.map(s => (
        <div key={s.label} className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] text-neutral-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="text-[13px] font-medium text-neutral-900">{fmt$(s.value)}</span>
        </div>
      ))}
    </div>
  </div>
)

// ── Loan-to-value gauge ─────────────────────────────────────────────────────

const LvrGauge: React.FC<{
  lvr: number
  fillPct: number
  loanAmount: number
  deposit: number
  purchasePrice: number
}> = ({ lvr, fillPct, loanAmount, deposit, purchasePrice }) => {
  const rows = [
    { label: 'Loan amount', value: loanAmount, dot: '#7F56D9' },
    { label: 'Deposit', value: deposit, dot: '#E9D7FE' },
    { label: 'Purchase price', value: purchasePrice, bold: true },
  ]
  return (
    <div className="flex flex-col gap-4 h-full justify-between">
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold text-neutral-900 leading-none tracking-tight">{Math.round(lvr)}%</span>
        <span className="text-[13px] text-neutral-500">geared</span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#E9D7FE' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPct}%`, background: '#7F56D9' }}
        />
      </div>
      <div className="flex flex-col">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-b-0">
            <span className="flex items-center gap-2 text-[13px] text-neutral-600">
              {r.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.dot }} />}
              {r.label}
            </span>
            <span className={`text-[13px] ${r.bold ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>
              {fmt$(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

type BriefSubTab = 'purchase' | 'hold' | 'performance'

export const BriefTab: React.FC = () => {
  const [subTab, setSubTab] = useState<BriefSubTab>('purchase')
  const { timelineProperties } = useAffordabilityCalculator()
  const { instances } = usePropertyInstance()
  const { profile, updateProfile } = useInvestmentProfile()
  const { notifyEdit } = useChangeReceipt()
  const removeTimelineProperty = useRemoveTimelineProperty()

  const { existingProperties, setExistingProperties } = useScenarioSave()
  const { propertyProjections } = usePortfolioProjection()

  // Purchase animation: clicking "Purchased property" plays a pull-away on the
  // brief content first, then commits the data move once it completes. The
  // commit is scheduled from the click itself (not an animation callback) so
  // nothing but the button can ever trigger it.
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseSeq, setPurchaseSeq] = useState(0)
  const completePurchaseRef = useRef<() => void>(() => {})

  const nextProp = timelineProperties.find(p => p.status === 'feasible')
  const instanceData = nextProp ? instances[nextProp.instanceId] : null

  const completePurchase = useCallback(() => {
    if (!nextProp || !instanceData) {
      setPurchasing(false)
      return
    }
    const acqCosts = nextProp.acquisitionCosts
    const newExisting: ExistingProperty = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      address: nextProp.title || '',
      state: instanceData.state || 'NSW',
      boughtYear: Math.floor(nextProp.affordableYear),
      purchasePrice: instanceData.purchasePrice || nextProp.cost,
      currentValue: instanceData.valuationAtPurchase || instanceData.purchasePrice || nextProp.cost,
      loan: nextProp.loanAmount || 0,
      rentPerWeek: instanceData.rentPerWeek || 0,
      yield: instanceData.rentPerWeek ? calcGrossYield(instanceData.rentPerWeek, instanceData.purchasePrice || 1) : 0,
      interestRate: instanceData.interestRate || 0,
      loanType: instanceData.loanProduct === 'IO' ? 'IO' : 'PI',
      stampDuty: acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0,
      legals: instanceData.conveyancing || 0,
      buildingPest: instanceData.buildingPestInspection || 0,
      baFee: instanceData.engagementFee || 0,
      cashDeposit: nextProp.depositRequired || 0,
      propertyMgmtPercent: instanceData.propertyManagementPercent || 0,
      councilWater: instanceData.councilRatesWater || 0,
      insurance: instanceData.buildingInsuranceAnnual || 0,
      maintenance: instanceData.maintenanceAllowanceAnnual || 0,
      growthAssumption: instanceData.growthAssumption || 'Medium',
      loanTerm: instanceData.loanTerm || 30,
      ioTermYears: instanceData.ioTermYears ?? 5,
      strata: instanceData.strata || 0,
      entity: instanceData.entity ?? 'individual',
    }
    const next = [...existingProperties, newExisting]
    setExistingProperties(next)
    // Keep profile aggregates in sync, same as PortfolioTab does on add/edit
    updateProfile({
      currentDebt: next.reduce((s, p) => s + p.loan, 0),
      portfolioValue: next.reduce((s, p) => s + p.currentValue, 0),
      existingAnnualRent: next.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0),
    })
    removeTimelineProperty(nextProp.instanceId)
    notifyEdit('brief', `${nextProp.title || 'Next purchase'} marked as purchased`)
    toast.success('Property moved to Existing Portfolio')
    setPurchasing(false)
    setPurchaseSeq(s => s + 1)
  }, [nextProp, instanceData, existingProperties, setExistingProperties, updateProfile, removeTimelineProperty, notifyEdit])
  completePurchaseRef.current = completePurchase

  const projection = useMemo(() => {
    if (!nextProp) return null
    return propertyProjections.get(nextProp.instanceId) ?? null
  }, [nextProp, propertyProjections])

  const cashflow = useMemo(() => {
    if (!instanceData || !nextProp) return null
    try {
      return calculateDetailedCashflow(instanceData, nextProp.loanAmount)
    } catch (e) {
      console.error('[BriefTab] cashflow error:', e)
      return null
    }
  }, [instanceData, nextProp])

  const keyRows = useMemo(() => {
    if (!projection) return []
    const rows = projection.yearRows
    const pick = (yr: number) => rows.find(r => r.year === yr)
    return [pick(1), pick(5), pick(10), pick(20)].filter(Boolean) as typeof rows
  }, [projection])

  if (!nextProp || !instanceData || !projection || !cashflow) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
        <Target size={48} className="mb-4 text-neutral-300" />
        <p className="text-sm">No properties in the plan yet — add one via chat to see the brief.</p>
      </div>
    )
  }

  const acqCosts = nextProp.acquisitionCosts
  const totalHoldingCosts = cashflow.totalOperatingExpenses + cashflow.totalNonDeductibleExpenses
  const grossYield = instanceData.purchasePrice > 0
    ? calcGrossYield(instanceData.rentPerWeek, instanceData.purchasePrice).toFixed(1)
    : '0.0'

  const iid = nextProp.instanceId

  // Derived values for the purchase visuals (KPI row, donut, LVR gauge)
  const deposit = instanceData.depositOverride ?? nextProp.depositRequired
  const stampDuty = acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0
  const totalCash = instanceData.totalCashRequiredOverride ?? nextProp.totalCashRequired
  const otherCosts = Math.max(0, totalCash - deposit - stampDuty)
  const loanAmount = instanceData.loanAmountOverride ?? nextProp.loanAmount
  const purchasePrice = instanceData.purchasePrice
  const lvrFill = purchasePrice > 0 ? Math.min(100, Math.max(0, (loanAmount / purchasePrice) * 100)) : 0
  const cashSegments = [
    { label: 'Deposit', value: deposit, color: '#7F56D9' },
    { label: 'Stamp duty', value: stampDuty, color: '#9E77ED' },
    { label: 'Other costs', value: otherCosts, color: '#E9D7FE' },
  ]

  // ── Tab 1: The Purchase ─────────────────────────────────────────────────

  const purchaseTab = (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-4">
        <BriefStat label="Purchase price" value={fmt$(purchasePrice)} />
        <BriefStat label="Total cash required" value={fmt$(totalCash)} />
        <BriefStat label="LVR" value={`${Math.round(instanceData.lvr)}%`} />
        <BriefStat label="Rent" value={`$${fmtNum(instanceData.rentPerWeek)}/wk`} />
        <BriefStat label="Gross yield" value={`${grossYield}%`} />
      </div>

      {/* Visual breakdown — cash donut + LVR gauge (equal height, content fills) */}
      <div className="grid grid-cols-2 gap-4 items-stretch">
        <ChartCard title="Where your cash goes">
          <CashDonut segments={cashSegments} total={totalCash} />
        </ChartCard>
        <ChartCard title="Loan to value">
          <LvrGauge
            lvr={instanceData.lvr}
            fillPct={lvrFill}
            loanAmount={loanAmount}
            deposit={deposit}
            purchasePrice={purchasePrice}
          />
        </ChartCard>
      </div>

      {/* Editable detail — property summary + purchase costs */}
      <div className="grid grid-cols-2 gap-4 items-start">
      {/* Property Summary (includes funding source rows) */}
      <ChartCard title="Property summary" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableSelectRow label="State" value={instanceData.state} field="state" instanceId={iid} options={STATE_OPTIONS} />
            <EditableSelectRow label="Entity" value={instanceData.entity ?? 'individual'} field="entity" instanceId={iid} options={ENTITY_OPTIONS} />
            <KVRow label="Purchase year" value={Math.floor(nextProp.affordableYear)} />
            <EditableNumRow label="Purchase price ($)" value={instanceData.purchasePrice} field="purchasePrice" instanceId={iid} />
            <EditableNumRow label="Valuation ($)" value={instanceData.valuationAtPurchase} field="valuationAtPurchase" instanceId={iid} />
            <EditableNumRow label="LVR (%)" value={instanceData.lvr} field="lvr" instanceId={iid} />
            <EditableNumRow label="Loan amount ($)" value={instanceData.loanAmountOverride ?? nextProp.loanAmount} field="loanAmountOverride" instanceId={iid} />
            <EditableNumRow label="Interest rate (%)" value={instanceData.interestRate} field="interestRate" instanceId={iid} decimals={2} />
            <EditableSelectRow label="Loan product" value={instanceData.loanProduct} field="loanProduct" instanceId={iid} options={LOAN_PRODUCT_OPTIONS} />
            <EditableNumRow label="Loan term (yrs)" value={instanceData.loanTerm} field="loanTerm" instanceId={iid} />
            <EditableSelectRow label="Growth assumption" value={instanceData.growthAssumption} field="growthAssumption" instanceId={iid} options={GROWTH_OPTIONS} />
            <EditableNumRow label="Rent/wk ($)" value={instanceData.rentPerWeek} field="rentPerWeek" instanceId={iid} />
            <KVRow label="Gross yield (%)" value={grossYield} />
            {/* Funding source */}
            <tr><td colSpan={2} className="py-2 px-3 text-xs font-semibold text-neutral-500 bg-[#F9FAFB] border-t border-l border-r border-neutral-200">Funding source</td></tr>
            <EditableNumRow label="Cash ($)" value={instanceData.fundingCashOverride ?? (nextProp.fundingBreakdown?.cash ?? 0)} field="fundingCashOverride" instanceId={iid} />
            <EditableNumRow label="Savings ($)" value={instanceData.fundingSavingsOverride ?? (nextProp.fundingBreakdown?.savings ?? 0)} field="fundingSavingsOverride" instanceId={iid} />
            <EditableNumRow label="Equity release ($)" value={instanceData.fundingEquityOverride ?? (nextProp.fundingBreakdown?.equity ?? 0)} field="fundingEquityOverride" instanceId={iid} />
            <EditableNumRow label="Total funded ($)" value={instanceData.fundingTotalOverride ?? (nextProp.fundingBreakdown?.total ?? nextProp.totalCashRequired)} field="fundingTotalOverride" instanceId={iid} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Purchase Costs — detailed breakdown, each instance field editable */}
      <ChartCard title="Purchase costs" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableNumRow label="Deposit ($)" value={instanceData.depositOverride ?? nextProp.depositRequired} field="depositOverride" instanceId={iid} />
            <EditableNumRow label="Stamp duty ($)" value={acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0} field="stampDutyOverride" instanceId={iid} />
            <EditableNumRow label="LMI ($)" value={instanceData.lmiOverride ?? (acqCosts?.lmi ?? 0)} field="lmiOverride" instanceId={iid} />
            <EditableNumRow label="Engagement fee ($)" value={instanceData.engagementFee} field="engagementFee" instanceId={iid} />
            <EditableNumRow label="Holding deposit ($)" value={instanceData.conditionalHoldingDeposit} field="conditionalHoldingDeposit" instanceId={iid} />
            <EditableNumRow label="Insurance upfront ($)" value={instanceData.buildingInsuranceUpfront} field="buildingInsuranceUpfront" instanceId={iid} />
            <EditableNumRow label="B&P inspection ($)" value={instanceData.buildingPestInspection} field="buildingPestInspection" instanceId={iid} />
            <EditableNumRow label="Plumbing / elec. ($)" value={instanceData.plumbingElectricalInspections} field="plumbingElectricalInspections" instanceId={iid} />
            <EditableNumRow label="Ind. valuation ($)" value={instanceData.independentValuation} field="independentValuation" instanceId={iid} />
            <EditableNumRow label="Mortgage fees ($)" value={instanceData.mortgageFees} field="mortgageFees" instanceId={iid} />
            <EditableNumRow label="Conveyancing ($)" value={instanceData.conveyancing} field="conveyancing" instanceId={iid} />
            <EditableNumRow label="Post-sett. maint ($)" value={instanceData.maintenanceAllowancePostSettlement} field="maintenanceAllowancePostSettlement" instanceId={iid} />
            <EditableNumRow label="Total cash required ($)" value={instanceData.totalCashRequiredOverride ?? nextProp.totalCashRequired} field="totalCashRequiredOverride" instanceId={iid} bold />
          </tbody>
        </table>
      </ChartCard>
      </div>
    </div>
  )

  // ── Tab 2: The Hold ─────────────────────────────────────────────────────

  const holdTab = (
    <div className="grid grid-cols-3 gap-4 items-start">
      {/* Cash In */}
      <ChartCard title="Annual cash in" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableNumRow label="Rent/wk ($)" value={instanceData.rentPerWeek} field="rentPerWeek" instanceId={iid} />
            <EditableNumRow label="Gross annual income ($)" value={instanceData.grossAnnualIncomeOverride ?? cashflow.grossAnnualIncome} field="grossAnnualIncomeOverride" instanceId={iid} />
            <EditableNumRow label="Vacancy ($)" value={instanceData.vacancyRate ?? cashflow.vacancyAmount} field="vacancyRate" instanceId={iid} />
            <EditableNumRow label="Adjusted income ($)" value={instanceData.adjustedIncomeOverride ?? cashflow.adjustedIncome} field="adjustedIncomeOverride" instanceId={iid} />
          </tbody>
        </table>
      </ChartCard>

      {/* Cash Out */}
      <ChartCard title="Annual cash out" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableNumRow label="Loan interest ($)" value={instanceData.loanInterestOverride ?? cashflow.loanInterest} field="loanInterestOverride" instanceId={iid} />
            <EditableNumRow label="Prop. mgmt (%)" value={instanceData.propertyManagementPercent} field="propertyManagementPercent" instanceId={iid} decimals={1} />
            <EditableNumRow label="Building insurance ($)" value={instanceData.buildingInsuranceAnnual} field="buildingInsuranceAnnual" instanceId={iid} />
            <EditableNumRow label="Council rates + water ($)" value={instanceData.councilRatesWater} field="councilRatesWater" instanceId={iid} />
            <EditableNumRow label="Strata ($)" value={instanceData.strata} field="strata" instanceId={iid} />
            <EditableNumRow label="Maintenance ($)" value={instanceData.maintenanceAllowanceAnnual} field="maintenanceAllowanceAnnual" instanceId={iid} />
            <EditableNumRow label="Land tax ($)" value={cashflow.landTax} field="landTaxOverride" instanceId={iid} />
            {cashflow.principalPayments > 0 && (
              <EditableNumRow label="Principal payments ($)" value={cashflow.principalPayments} field="totalExpensesOverride" instanceId={iid} />
            )}
            <EditableNumRow label="Total expenses ($)" value={instanceData.totalExpensesOverride ?? totalHoldingCosts} field="totalExpensesOverride" instanceId={iid} />
          </tbody>
        </table>
      </ChartCard>

      {/* Net Result */}
      <ChartCard title="Net result" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableNumRow label="Net annual cashflow ($)" value={instanceData.netAnnualCashflowOverride ?? cashflow.netAnnualCashflow} field="netAnnualCashflowOverride" instanceId={iid} />
            <EditableNumRow label="Net monthly ($)" value={instanceData.netMonthlyCashflowOverride ?? cashflow.netMonthlyCashflow} field="netMonthlyCashflowOverride" instanceId={iid} />
            <EditableNumRow label="Net weekly ($)" value={instanceData.netWeeklyCashflowOverride ?? cashflow.netWeeklyCashflow} field="netWeeklyCashflowOverride" instanceId={iid} />
          </tbody>
        </table>
      </ChartCard>
    </div>
  )

  // ── Tab 3: The Performance ──────────────────────────────────────────────

  const performanceTab = (
    <div className="flex flex-col gap-4">
      {/* Charts — 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Cashflow projection" legend={[{ color: '#7F56D9', label: 'Net Cashflow' }]}>
          <BriefCashflowChart yearRows={projection?.yearRows ?? []} />
        </ChartCard>
        <ChartCard title="Equity growth" legend={[{ color: '#7F56D9', label: 'Equity' }]}>
          <BriefEquityChart yearRows={projection?.yearRows ?? []} />
        </ChartCard>
        <ChartCard title="Loan balance" legend={[
          { color: '#7F56D9', label: 'Value' },
          { color: '#E9D7FE', label: 'Loan' },
          { color: '#737373', label: 'LVR', variant: 'line' },
        ]}>
          <BriefLoanChart yearRows={projection?.yearRows ?? []} />
        </ChartCard>
        <ChartCard title="What it costs to hold" legend={[
          { color: '#6941C6', label: 'Mortgage' },
          { color: '#9E77ED', label: 'Expenses' },
          { color: '#E5E5E5', label: 'Rent' },
        ]}>
          <BriefHoldingCostChart yearRows={projection?.yearRows ?? []} />
        </ChartCard>
      </div>

      {/* Year-by-Year Projections table — full width */}
      <ChartCard title="Year-by-year projections" flush>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap border-r border-neutral-100">Year</th>
              <th className="text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap border-r border-neutral-100">Value ($)</th>
              <th className="text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap border-r border-neutral-100">Loan ($)</th>
              <th className="text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap border-r border-neutral-100">Equity ($)</th>
              <th className="text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap border-r border-neutral-100">Net CF ($)</th>
              <th className="text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap">RoIC (%)</th>
            </tr>
          </thead>
          <tbody>
            {keyRows.map((row) => {
              const label = row.year === 0 ? 'Purchase' : `Year ${row.year}`
              return (
                <tr key={row.year} className="border-b border-neutral-200 last:border-b-0">
                  <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100">{label}</td>
                  <td className="py-2 px-3 text-xs text-neutral-600 border-r border-neutral-100">{fmtNum(row.propertyValue)}</td>
                  <td className="py-2 px-3 text-xs text-neutral-600 border-r border-neutral-100">{fmtNum(row.loanBalance)}</td>
                  <td className="py-2 px-3 text-xs text-neutral-600 border-r border-neutral-100">{fmtNum(row.equity)}</td>
                  <td className="py-2 px-3 text-xs text-neutral-600 border-r border-neutral-100">
                    {row.year === 0 ? '—' : fmtNum(row.netCashflow)}
                  </td>
                  <td className="py-2 px-3 text-xs text-neutral-600">
                    {row.year === 0 ? '—' : `${row.roic.toFixed(1)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ChartCard>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tab navigation + purchased button */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <SubTabItem
          icon={<Home size={14} />}
          label="The Purchase"
          active={subTab === 'purchase'}
          onClick={() => setSubTab('purchase')}
        />
        <SubTabItem
          icon={<DollarSign size={14} />}
          label="The Hold"
          active={subTab === 'hold'}
          onClick={() => setSubTab('hold')}
        />
        <SubTabItem
          icon={<TrendingUp size={14} />}
          label="The Performance"
          active={subTab === 'performance'}
          onClick={() => setSubTab('performance')}
        />
      </div>
      <button
        onClick={() => {
          if (purchasing) return
          setPurchasing(true)
          window.setTimeout(() => completePurchaseRef.current(), 380)
        }}
        disabled={purchasing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <CheckCircle2 size={14} />
        Purchased property
      </button>
      </div>

      {/* Tab content — pulls away on purchase, next brief slides in */}
      <motion.div
        key={purchaseSeq}
        initial={purchaseSeq === 0 ? false : { opacity: 0, y: 16 }}
        animate={purchasing ? { opacity: 0, y: -32, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {subTab === 'purchase' && purchaseTab}
        {subTab === 'hold' && holdTab}
        {subTab === 'performance' && performanceTab}
      </motion.div>
    </div>
  )
}
