import React, { useMemo, useState, useCallback, useRef, Fragment } from 'react'
import { Target, TrendingUp, Home, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import type { ExistingProperty } from '@/types/existingProperty'
import { ChartCard } from './ui/ChartCard'
import { BriefTotalPerformanceChart, BriefCashflowChart, BriefGrowthChart, type PerfHorizon } from './BriefPerformanceCharts'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useTabDwellTracking } from '../hooks/useInteractionTracking'
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

// ── Horizon toggle (10y / 20y / 30y) ────────────────────────────────────────

const HorizonToggle: React.FC<{
  value: PerfHorizon
  onChange: (h: PerfHorizon) => void
}> = ({ value, onChange }) => (
  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F5F5F5] border border-[#E9EAEB]">
    {([10, 20, 30] as PerfHorizon[]).map(h => (
      <button
        key={h}
        onClick={() => onChange(h)}
        className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors ${
          value === h
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        {h}y
      </button>
    ))}
  </div>
)

// ── Performance metric panel (right of the total-performance chart) ──────────

const PerfMetricSection: React.FC<{
  title: string
  rows: { label: string; value: string }[]
}> = ({ title, rows }) => (
  <div>
    <div className="px-3 py-2 bg-[#F9FAFB] border-y border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
      {title}
    </div>
    {rows.map(r => (
      <div key={r.label} className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 last:border-b-0">
        <span className="text-[13px] text-neutral-500">{r.label}</span>
        <span className="text-[13px] font-semibold text-neutral-900">{r.value}</span>
      </div>
    ))}
  </div>
)

// ── Summary stat group (beneath cashflow / growth charts) ────────────────────

const SummaryGroup: React.FC<{
  title: string
  rows: { label: string; value: string }[]
}> = ({ title, rows }) => (
  <div className="flex-1 min-w-0">
    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">{title}</div>
    <div className="flex flex-col gap-1">
      {rows.map(r => (
        <div key={r.label} className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-neutral-500 whitespace-nowrap">{r.label}</span>
          <span className="text-[12px] font-semibold text-neutral-900 whitespace-nowrap">{r.value}</span>
        </div>
      ))}
    </div>
  </div>
)

// ── Main component ──────────────────────────────────────────────────────────

type BriefSubTab = 'purchase' | 'performance'

export const BriefTab: React.FC = () => {
  const [subTab, setSubTab] = useState<BriefSubTab>('performance')
  useTabDwellTracking('brief_subtab', subTab)
  const [perfHorizon, setPerfHorizon] = useState<PerfHorizon>(20)
  // Series toggled off on the Total performance chart (click legend to hide/show)
  const [hiddenPerfSeries, setHiddenPerfSeries] = useState<string[]>([])
  const togglePerfSeries = useCallback((key: string) => {
    setHiddenPerfSeries(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }, [])
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

  // ── Combined annual cashflow table (cash in / cash out / net result) ──────
  // One table with section heading rows so the three groups stay visually
  // separated. Rendered on the Purchase tab below the purchase-costs grid.
  const cashflowTable = (
    <ChartCard title="Annual cashflow" flush>
      <table className="w-full text-xs">
        <tbody>
          {/* Annual cash in */}
          <tr><td colSpan={2} className="py-2 px-3 text-xs font-semibold text-neutral-500 bg-[#F9FAFB] border-t border-l border-r border-neutral-200">Annual cash in</td></tr>
          <EditableNumRow label="Rent/wk ($)" value={instanceData.rentPerWeek} field="rentPerWeek" instanceId={iid} />
          <EditableNumRow label="Gross annual income ($)" value={instanceData.grossAnnualIncomeOverride ?? cashflow.grossAnnualIncome} field="grossAnnualIncomeOverride" instanceId={iid} />
          <EditableNumRow label="Vacancy ($)" value={instanceData.vacancyRate ?? cashflow.vacancyAmount} field="vacancyRate" instanceId={iid} />
          <EditableNumRow label="Adjusted income ($)" value={instanceData.adjustedIncomeOverride ?? cashflow.adjustedIncome} field="adjustedIncomeOverride" instanceId={iid} />
          {/* Annual cash out */}
          <tr><td colSpan={2} className="py-2 px-3 text-xs font-semibold text-neutral-500 bg-[#F9FAFB] border-t border-l border-r border-neutral-200">Annual cash out</td></tr>
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
          {/* Net result */}
          <tr><td colSpan={2} className="py-2 px-3 text-xs font-semibold text-neutral-500 bg-[#F9FAFB] border-t border-l border-r border-neutral-200">Net result</td></tr>
          <EditableNumRow label="Net annual cashflow ($)" value={instanceData.netAnnualCashflowOverride ?? cashflow.netAnnualCashflow} field="netAnnualCashflowOverride" instanceId={iid} bold />
          <EditableNumRow label="Net monthly ($)" value={instanceData.netMonthlyCashflowOverride ?? cashflow.netMonthlyCashflow} field="netMonthlyCashflowOverride" instanceId={iid} />
          <EditableNumRow label="Net weekly ($)" value={instanceData.netWeeklyCashflowOverride ?? cashflow.netWeeklyCashflow} field="netWeeklyCashflowOverride" instanceId={iid} />
        </tbody>
      </table>
    </ChartCard>
  )

  // ── Tab 1: The Purchase ─────────────────────────────────────────────────

  // KPI row — persistent across both sub-tabs (rendered above the tab content)
  const kpiRow = (
    <div className="grid grid-cols-5 gap-4">
      <BriefStat label="Purchase price" value={fmt$(purchasePrice)} />
      <BriefStat label="Total cash required" value={fmt$(totalCash)} />
      <BriefStat label="LVR" value={`${Math.round(instanceData.lvr)}%`} />
      <BriefStat label="Gross yield" value={`${grossYield}%`} />
      <BriefStat label="Rent" value={`$${fmtNum(instanceData.rentPerWeek)}/wk`} />
    </div>
  )

  const purchaseTab = (
    <div className="flex flex-col gap-4">
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

      {/* Right column — purchase costs with the annual cashflow stacked below */}
      <div className="flex flex-col gap-4">
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

      {/* Combined annual cashflow — stacked below purchase costs */}
      {cashflowTable}
      </div>
      </div>
    </div>
  )

  // ── Tab 3: The Performance ──────────────────────────────────────────────

  // Milestone rows for the metric panel + summary boxes (scaled to horizon,
  // clamped to the furthest year that actually has projection data).
  const perfYearRows = projection.yearRows
  const pickYr = (yr: number) => perfYearRows.find(r => r.year === yr)
  const perfMaxYear = perfYearRows.reduce((m, r) => Math.max(m, r.year), 0)
  const effectiveHorizon = Math.min(perfHorizon, perfMaxYear)
  const milestones = Array.from(new Set([1, Math.round(effectiveHorizon / 2), effectiveHorizon]))
  const milestoneRows = (fmt: (r: (typeof perfYearRows)[number]) => string) =>
    milestones
      .map(yr => ({ yr, r: pickYr(yr) }))
      .filter(x => !!x.r)
      .map(x => ({ label: `Year ${x.yr}`, value: fmt(x.r!) }))

  const totalPerfRows = milestoneRows(r => fmt$(r.totalPerformance))
  const cocRows = milestoneRows(r => `${r.cocReturnCumulative.toFixed(1)}%`)
  const roicRows = milestoneRows(r => `${r.roic.toFixed(1)}%`)
  const grossYieldRows = milestoneRows(r => `${r.grossYieldPct.toFixed(1)}%`)
  const netCfRows = milestoneRows(r => fmt$(r.netCashflow))
  const capGrowthRows = milestoneRows(r => fmt$(r.capitalGrowthCumulative))
  const equityRows = milestoneRows(r => fmt$(r.equity))

  // ── Detailed annual breakdown (transposed: metrics × years) ───────────────
  // Mirrors the per-property performance worksheet — one column per year. This
  // table always projects the full 30-year horizon, independent of the 10/20/30
  // toggle that drives the charts above. An "At purchase" column carries the
  // balance-sheet rows.
  const detailHorizon = Math.min(30, perfMaxYear)
  const detailYears = perfYearRows.filter(r => r.year >= 1 && r.year <= detailHorizon)
  const loanAtPurchase = nextProp.loanAmount || (detailYears[0]?.loanBalance ?? 0)
  const purchaseValue = nextProp.cost || (detailYears[0]?.propertyValue ?? 0)
  const money = (v: number) => (v < 0 ? `-$${fmtNum(Math.abs(v))}` : `$${fmtNum(v)}`)
  const pct1 = (v: number) => `${v.toFixed(1)}%`
  const principalCum = (r: (typeof perfYearRows)[number]) => Math.max(0, Math.round(loanAtPurchase - r.loanBalance))

  type DetailRow = {
    label: string
    indent?: boolean
    italic?: boolean
    strong?: boolean
    spacerBefore?: boolean
    atPurchase?: string
    cell: (r: (typeof perfYearRows)[number], i: number) => string
  }
  const detailMetrics: DetailRow[] = [
    { label: 'Property value', atPurchase: money(purchaseValue), cell: r => money(r.propertyValue) },
    { label: 'Loan amount', atPurchase: money(loanAtPurchase), cell: r => money(r.loanBalance) },
    { label: 'Equity', atPurchase: money(purchaseValue - loanAtPurchase), cell: r => money(r.equity) },
    { label: 'Principal payments', cell: (r, i) => money((i === 0 ? loanAtPurchase : detailYears[i - 1].loanBalance) - r.loanBalance) },
    { label: 'Principal payments (cumulative)', cell: r => money(principalCum(r)) },
    { label: 'Estimated interest rate', italic: true, cell: r => pct1(loanAtPurchase > 0 ? (r.interestExpense / loanAtPurchase) * 100 : 0) },
    { label: 'Gross income', cell: r => money(r.grossIncome) },
    { label: 'Gross yield %', cell: r => pct1(r.grossYieldPct) },
    { label: 'Cash deductions', cell: r => money(r.interestExpense + r.operatingExpenses) },
    { label: 'Interest expense', indent: true, cell: r => money(r.interestExpense) },
    { label: 'Operating expenses', indent: true, cell: r => money(r.operatingExpenses) },
    { label: 'Net annual cashflow', strong: true, cell: r => money(r.netCashflow) },
    { label: 'Net annual cashflow (cumulative)', cell: r => money(r.netCashflowCumulative) },
    { label: 'Net yield %', cell: r => pct1(r.propertyValue > 0 ? (r.netCashflow / r.propertyValue) * 100 : 0) },
    { label: 'Income/(cost) per month', cell: r => money(r.monthlyCost) },
    { label: 'Income/(cost) per week', cell: r => money(Math.round(r.netCashflow / 52)) },
    { label: 'Capital growth (annual)', spacerBefore: true, cell: r => money(r.capitalGrowthAnnual) },
    { label: 'Capital growth (cumulative)', cell: r => money(r.capitalGrowthCumulative) },
    { label: 'Total performance', cell: r => money(r.totalPerformance) },
    { label: 'Total performance inc. principal', strong: true, cell: r => money(r.totalPerformance + principalCum(r)) },
    { label: 'Cash on cash return (cumulative)', spacerBefore: true, cell: r => pct1(r.cocReturnCumulative) },
    { label: 'Return on invested capital', strong: true, cell: r => pct1(r.roic) },
  ]

  const performanceTab = (
    <div className="flex flex-col gap-4">
      {/* Hero — total performance projections + metric panel */}
      <ChartCard
        title="Total performance projections"
        action={<HorizonToggle value={perfHorizon} onChange={setPerfHorizon} />}
      >
        {/* Interactive legend — click to toggle a line on/off; hover underlines */}
        <div className="flex items-center gap-4 flex-wrap mb-4">
          {[
            { key: 'totalIncPrincipal', color: '#6941C6', label: 'Total performance inc. principal' },
            { key: 'capitalGrowth', color: '#17B26A', label: 'Capital growth' },
            { key: 'netCashflow', color: '#7F56D9', label: 'Net cashflow' },
            { key: 'principalPaid', color: '#B692F6', label: 'Principal payments' },
          ].map(item => {
            const hidden = hiddenPerfSeries.includes(item.key)
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => togglePerfSeries(item.key)}
                title="Click to show/hide"
                className="group flex items-center gap-1.5 cursor-pointer select-none"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                  style={{ backgroundColor: item.color, opacity: hidden ? 0.3 : 1 }}
                />
                <span
                  className={`text-xs group-hover:underline ${hidden ? 'text-neutral-400 line-through' : 'text-neutral-500'}`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-[1fr_240px] gap-5 items-stretch">
          <BriefTotalPerformanceChart yearRows={perfYearRows} horizon={perfHorizon} hiddenKeys={hiddenPerfSeries} />
          <div className="flex flex-col rounded-xl border border-neutral-200 overflow-hidden self-stretch">
            <PerfMetricSection title="Total performance (growth + net cashflow)" rows={totalPerfRows} />
            <PerfMetricSection title="Cash on cash return (COC)" rows={cocRows} />
            <PerfMetricSection title="Return on invested capital" rows={roicRows} />
            <div className="mt-auto flex items-center justify-between px-3 py-2.5 bg-[#F9FAFB] border-t border-neutral-200">
              <span className="text-[12px] text-neutral-500">Initial capital returned in</span>
              <span className="text-[13px] font-semibold text-neutral-900">{projection.capitalReturnedInYears} yrs</span>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Cashflow + Growth projections */}
      <div className="grid grid-cols-2 gap-4 items-start">
        <ChartCard title="Cashflow projection" legend={[{ color: '#7F56D9', label: 'Net cashflow' }]}>
          <BriefCashflowChart yearRows={perfYearRows} horizon={perfHorizon} />
          <div className="flex gap-8 mt-4 pt-4 border-t border-neutral-100">
            <SummaryGroup title="Gross yield" rows={grossYieldRows} />
            <SummaryGroup title="Net cashflow" rows={netCfRows} />
          </div>
        </ChartCard>
        <ChartCard title="Growth projection" legend={[{ color: '#17B26A', label: 'Equity' }]}>
          <BriefGrowthChart yearRows={perfYearRows} horizon={perfHorizon} />
          <div className="flex gap-8 mt-4 pt-4 border-t border-neutral-100">
            <SummaryGroup title="Capital growth" rows={capGrowthRows} />
            <SummaryGroup title="Equity" rows={equityRows} />
          </div>
        </ChartCard>
      </div>

      {/* Detailed annual breakdown — transposed metrics × years */}
      <ChartCard title="Detailed annual breakdown" flush collapsible defaultCollapsed>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200">
                <th
                  className="sticky left-0 z-10 bg-white text-left text-xs font-bold text-neutral-900 py-2 px-3 whitespace-nowrap min-w-[210px]"
                  style={{ boxShadow: 'inset -1px 0 0 0 #A3A3A3' }}
                >
                  Metric
                </th>
                <th className="text-right text-xs font-bold text-neutral-900 py-2 px-3 whitespace-nowrap border-r border-neutral-100 min-w-[92px]">
                  At purchase
                </th>
                {detailYears.map((r) => (
                  <th
                    key={r.year}
                    className="text-right text-xs font-bold text-neutral-900 py-2 px-3 whitespace-nowrap border-r border-neutral-100 last:border-r-0 min-w-[92px]"
                  >
                    Year {r.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailMetrics.map((m) => (
                <Fragment key={m.label}>
                  {m.spacerBefore && (
                    <tr aria-hidden className="border-b border-neutral-100">
                      <td className="sticky left-0 z-10 bg-white py-2 px-3" style={{ boxShadow: 'inset -1px 0 0 0 #A3A3A3' }}>&nbsp;</td>
                      <td className="border-r border-neutral-100" />
                      {detailYears.map((r) => (
                        <td key={r.year} className="border-r border-neutral-100 last:border-r-0" />
                      ))}
                    </tr>
                  )}
                  <tr
                    className={`border-b border-neutral-100 ${m.strong ? 'bg-[#FAFAFA]' : ''}`}
                  >
                    <td
                      className={`sticky left-0 z-10 py-2 px-3 whitespace-nowrap ${m.strong ? 'bg-[#FAFAFA] font-semibold text-neutral-900' : 'bg-white'} ${m.indent ? 'pl-6 text-neutral-500 font-normal' : m.italic ? 'italic text-neutral-500 font-normal' : !m.strong ? 'font-medium text-neutral-700' : ''}`}
                      style={{ boxShadow: 'inset -1px 0 0 0 #A3A3A3' }}
                    >
                      {m.label}
                    </td>
                    <td className="text-right py-2 px-3 whitespace-nowrap border-r border-neutral-100 tabular-nums text-neutral-400">
                      {m.atPurchase ?? ''}
                    </td>
                    {detailYears.map((r, i) => (
                      <td
                        key={r.year}
                        className={`text-right py-2 px-3 whitespace-nowrap border-r border-neutral-100 last:border-r-0 tabular-nums ${m.strong ? 'text-neutral-900 font-semibold' : 'text-neutral-600'}`}
                      >
                        {m.cell(r, i)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
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
          icon={<TrendingUp size={14} />}
          label="The Performance"
          active={subTab === 'performance'}
          onClick={() => setSubTab('performance')}
        />
        <SubTabItem
          icon={<Home size={14} />}
          label="The Purchase"
          active={subTab === 'purchase'}
          onClick={() => setSubTab('purchase')}
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
        className="flex flex-col gap-4"
      >
        {/* KPI row — always visible across both sub-tabs */}
        {kpiRow}
        {subTab === 'performance' && performanceTab}
        {subTab === 'purchase' && purchaseTab}
      </motion.div>
    </div>
  )
}
