import React, { useMemo, useState, useCallback, useRef } from 'react'
import { Target, TrendingUp, Home, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import type { ExistingProperty } from '@/types/existingProperty'
import { ChartCard } from './ui/ChartCard'
import { InfoPopover } from './RetirementScenario/InfoPopover'
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
    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-[13px] font-semibold transition-colors ${
      active
        ? 'bg-white text-[#181D27] shadow-sm'
        : 'text-[#717680] hover:text-[#414651]'
    }`}
  >
    {icon}
    {label}
  </button>
)

// ── Row helpers (§2.2 tables + §2.7 editable hover-pill) ─────────────────────
// Values render as clean text; on hover an editable value gets a quiet violet-50
// pill + caret. `tone` drives the §2.2 matrix ladder (section / breakdown / net)
// used by the Annual cashflow table.

type RowTone = 'section' | 'breakdown' | 'net'

const rowContainerCls = (tone: RowTone | undefined, bold: boolean | undefined) =>
  tone === 'section' ? 'border-t border-[#E9EAEB]'
  : tone === 'net' ? 'border-t border-[#D5D7DA]'
  : bold ? 'border-t border-[#D5D7DA]'
  : 'border-b border-[#F2F2F2] last:border-b-0'

const labelClsFor = (tone: RowTone | undefined, bold: boolean | undefined) =>
  tone === 'breakdown' ? 'pl-7 text-[#717680] font-normal'
  : tone === 'section' ? 'text-[#181D27] font-medium'
  : tone === 'net' ? 'text-[#181D27] font-semibold'
  : bold ? 'text-[#181D27] font-semibold' : 'text-[#717680] font-medium'

const valueClsFor = (tone: RowTone | undefined, bold: boolean | undefined, value: number) => {
  if (tone === 'net') {
    const c = value < 0 ? 'text-[#F04438]' : value > 0 ? 'text-[#17B26A]' : 'text-[#181D27]'
    return `${c} font-semibold`
  }
  if (tone === 'section') return 'text-[#181D27] font-semibold'
  if (tone === 'breakdown') return 'text-[#535862] font-normal'
  // Plain rows match the Purchases table's normal-weight values
  return bold ? 'text-[#181D27] font-semibold' : 'text-[#535862] font-normal'
}

// Shared editable-value input styling — matches the Purchases table exactly
// (12px values, grey hover pill, violet-300 focus ring).
const editableInputCls = 'w-full bg-transparent text-right outline-none rounded px-1.5 py-0.5 text-xs hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 transition-colors'

// ── Read-only row ───────────────────────────────────────────────────────────

const KVRow: React.FC<{
  label: string
  value: string | number
  bold?: boolean
}> = ({ label, value, bold }) => (
  <tr className={rowContainerCls(undefined, bold)}>
    <td className={`py-2 px-3 text-xs whitespace-nowrap ${labelClsFor(undefined, bold)}`}>
      {label}
    </td>
    <td className={`py-2 px-3 text-xs text-right ${valueClsFor(undefined, bold, 0)}`}>
      {value}
    </td>
  </tr>
)

// ── Editable number row ─────────────────────────────────────────────────────

const EditableNumRow: React.FC<{
  label: string
  value: number
  field?: keyof PropertyInstanceDetails
  instanceId: string
  bold?: boolean
  tone?: RowTone
  decimals?: number
  unit?: 'money' | 'pct' | 'weekly'
  readOnly?: boolean
}> = ({ label, value, field, instanceId, bold, tone, decimals, unit, readOnly }) => {
  const { updateInstance } = usePropertyInstance()
  const { notifyEdit } = useChangeReceipt()
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  // Unit-aware display (prototype carries units in the value, not the label).
  const raw = decimals !== undefined ? value.toFixed(decimals) : fmtNum(value)
  const display =
    unit === 'money' ? (value < 0 ? `-$${fmtNum(Math.abs(value))}` : `$${fmtNum(value)}`)
    : unit === 'pct' ? `${raw}%`
    : unit === 'weekly' ? `$${fmtNum(value)}/wk`
    : raw

  return (
    <tr className={rowContainerCls(tone, bold)}>
      <td className={`py-2 px-3 text-xs whitespace-nowrap ${labelClsFor(tone, bold)}`}>
        {label}
      </td>
      <td className="py-1 px-2">
        {readOnly || !field ? (
          <div className={`text-right px-1.5 py-0.5 text-xs ${valueClsFor(tone, bold, value)}`}>{display}</div>
        ) : (
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
            className={`${editableInputCls} ${valueClsFor(tone, bold, value)}`}
          />
        )}
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
}> = ({ label, value, field, instanceId, options }) => {
  const { updateInstance } = usePropertyInstance()
  const { notifyEdit } = useChangeReceipt()

  return (
    <tr className={rowContainerCls(undefined, false)}>
      <td className="py-2 px-3 text-xs font-medium text-[#717680] whitespace-nowrap">
        {label}
      </td>
      <td className="py-1 px-2">
        <select
          value={value}
          onChange={e => { notifyEdit('brief', { subject: 'Next purchase', fieldLabel: label, from: value, to: e.target.value }); updateInstance(instanceId, { [field]: e.target.value } as Partial<PropertyInstanceDetails>) }}
          className="w-full bg-transparent text-right outline-none rounded px-1.5 py-0.5 text-xs text-[#414651] hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 cursor-pointer transition-colors"
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
    { label: 'Loan amount', value: loanAmount, dot: '#7C3AED' },
    { label: 'Deposit', value: deposit, dot: '#D9D2F2' },
    { label: 'Purchase price', value: purchasePrice, bold: true },
  ]
  return (
    <div className="flex flex-col gap-4 h-full justify-between">
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold text-neutral-900 leading-none tracking-tight">{Math.round(lvr)}%</span>
        <span className="text-[13px] text-neutral-500">geared</span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#D9D2F2' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPct}%`, background: '#7C3AED' }}
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
  signColored?: boolean
}> = ({ title, rows, signColored }) => (
  <div className="pt-3 first:pt-0">
    <div className="text-[11px] font-semibold text-[#717680] uppercase tracking-wide mb-1">
      {title}
    </div>
    {rows.map(r => (
      <div key={r.label} className="flex items-center justify-between py-1">
        <span className="text-[13px] text-[#717680]">{r.label}</span>
        <span className={`text-[13px] font-semibold ${signColored ? (r.value.trim().startsWith('-') ? 'text-[#F04438]' : 'text-[#17B26A]') : 'text-[#181D27]'}`}>{r.value}</span>
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

export const BriefTab: React.FC<{
  /** Switches the dashboard to Portfolio Plan → Purchases (the editable source). */
  onNavigateToPurchases?: () => void
}> = ({ onNavigateToPurchases }) => {
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
    { label: 'Deposit', value: deposit, color: '#7C3AED' },
    { label: 'Stamp duty', value: stampDuty, color: '#8B5CF6' },
    { label: 'Other costs', value: otherCosts, color: '#D9D2F2' },
  ]

  // ── Combined annual cashflow table (cash in / cash out / net result) ──────
  // One table with section heading rows so the three groups stay visually
  // separated. Rendered on the Purchase tab below the purchase-costs grid.
  const cashflowTable = (
    <ChartCard title="Annual cashflow" flush>
      <table className="w-full">
        <tbody>
          {/* Adjusted rental income (§2.2 matrix ladder — section then breakdowns) */}
          <EditableNumRow tone="section" unit="money" label="Adjusted rental income" value={instanceData.adjustedIncomeOverride ?? cashflow.adjustedIncome} field="adjustedIncomeOverride" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Gross annual income" value={instanceData.grossAnnualIncomeOverride ?? cashflow.grossAnnualIncome} field="grossAnnualIncomeOverride" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Less vacancy" value={instanceData.vacancyRate ?? cashflow.vacancyAmount} field="vacancyRate" instanceId={iid} />
          {/* Operating expenses */}
          <EditableNumRow tone="section" unit="money" label="Operating expenses" value={instanceData.totalExpensesOverride ?? totalHoldingCosts} field="totalExpensesOverride" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Loan interest" value={instanceData.loanInterestOverride ?? cashflow.loanInterest} field="loanInterestOverride" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="pct" label="Property management" value={instanceData.propertyManagementPercent} field="propertyManagementPercent" instanceId={iid} decimals={1} />
          <EditableNumRow tone="breakdown" unit="money" label="Building insurance" value={instanceData.buildingInsuranceAnnual} field="buildingInsuranceAnnual" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Council rates + water" value={instanceData.councilRatesWater} field="councilRatesWater" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Strata" value={instanceData.strata} field="strata" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Maintenance" value={instanceData.maintenanceAllowanceAnnual} field="maintenanceAllowanceAnnual" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Land tax" value={cashflow.landTax} field="landTaxOverride" instanceId={iid} />
          {cashflow.principalPayments > 0 && (
            <EditableNumRow tone="breakdown" unit="money" label="Principal payments" value={cashflow.principalPayments} readOnly instanceId={iid} />
          )}
          {/* Net — the one 600 emphasis, semantic sign colour (§1.3) */}
          <EditableNumRow tone="net" unit="money" label="Net annual cashflow" value={instanceData.netAnnualCashflowOverride ?? cashflow.netAnnualCashflow} field="netAnnualCashflowOverride" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Net monthly" value={instanceData.netMonthlyCashflowOverride ?? cashflow.netMonthlyCashflow} field="netMonthlyCashflowOverride" instanceId={iid} />
          <EditableNumRow tone="breakdown" unit="money" label="Net weekly" value={instanceData.netWeeklyCashflowOverride ?? cashflow.netWeeklyCashflow} field="netWeeklyCashflowOverride" instanceId={iid} />
        </tbody>
      </table>
    </ChartCard>
  )

  // ── Tab 1: The Purchase ─────────────────────────────────────────────────

  // KPI row — persistent across both sub-tabs (rendered above the tab content)
  const kpiRow = (
    <div className="grid grid-cols-5 bg-white rounded-xl border border-[#E9EAEB] divide-x divide-[#E9EAEB]">
      {[
        { label: 'Purchase price', value: fmt$(purchasePrice) },
        { label: 'Total cash required', value: fmt$(totalCash) },
        { label: 'LVR', value: `${Math.round(instanceData.lvr)}%` },
        { label: 'Gross yield', value: `${grossYield}%` },
        { label: 'Rent', value: `$${fmtNum(instanceData.rentPerWeek)}/wk` },
      ].map(s => (
        <div key={s.label} className="px-[18px] py-4">
          <span className="text-xs text-[#717680]">{s.label}</span>
          <div className="mt-2">
            <span className="text-[24px] font-semibold text-[#181D27] tracking-[-0.02em] leading-none">{s.value}</span>
          </div>
        </div>
      ))}
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

      {/* Editable detail — three equal peer tables (§2.5): Purchase costs · Annual cashflow · Deal details */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {/* Purchase costs — one-off line items → Total cash required */}
        <ChartCard title="Purchase costs" flush>
          <table className="w-full">
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

        {/* Annual cashflow — §2.2 matrix ladder, semantic-red Net */}
        {cashflowTable}

        {/* Deal details — the single editable record of the whole deal (§2.5),
            deliberately mirroring the headline KPI row */}
        <ChartCard title="Deal details" flush>
          <table className="w-full">
            <tbody>
              <EditableSelectRow label="State" value={instanceData.state} field="state" instanceId={iid} options={STATE_OPTIONS} />
              <EditableSelectRow label="Entity" value={instanceData.entity ?? 'individual'} field="entity" instanceId={iid} options={ENTITY_OPTIONS} />
              <KVRow label="Purchase year" value={Math.floor(nextProp.affordableYear)} />
              <EditableNumRow label="Interest rate" unit="pct" decimals={2} value={instanceData.interestRate} field="interestRate" instanceId={iid} />
              <EditableSelectRow label="Loan product" value={instanceData.loanProduct} field="loanProduct" instanceId={iid} options={LOAN_PRODUCT_OPTIONS} />
              <EditableNumRow label="Purchase price" unit="money" value={instanceData.purchasePrice} field="purchasePrice" instanceId={iid} />
              <EditableNumRow label="Total cash required" unit="money" value={instanceData.totalCashRequiredOverride ?? nextProp.totalCashRequired} field="totalCashRequiredOverride" instanceId={iid} />
              <EditableNumRow label="LVR" unit="pct" value={instanceData.lvr} field="lvr" instanceId={iid} />
              <KVRow label="Gross yield" value={`${grossYield}%`} />
              <EditableNumRow label="Rent" unit="weekly" value={instanceData.rentPerWeek} field="rentPerWeek" instanceId={iid} />
            </tbody>
          </table>
        </ChartCard>
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
    sectionStart?: boolean
    atPurchase?: string
    cell: (r: (typeof perfYearRows)[number], i: number) => string
  }
  const detailMetrics: DetailRow[] = [
    { label: 'Property value', sectionStart: true, atPurchase: money(purchaseValue), cell: r => money(r.propertyValue) },
    { label: 'Loan amount', atPurchase: money(loanAtPurchase), cell: r => money(r.loanBalance) },
    { label: 'Equity', atPurchase: money(purchaseValue - loanAtPurchase), cell: r => money(r.equity) },
    { label: 'Principal payments', sectionStart: true, cell: (r, i) => money((i === 0 ? loanAtPurchase : detailYears[i - 1].loanBalance) - r.loanBalance) },
    { label: 'Principal payments (cumulative)', cell: r => money(principalCum(r)) },
    { label: 'Estimated interest rate', italic: true, cell: r => pct1(loanAtPurchase > 0 ? (r.interestExpense / loanAtPurchase) * 100 : 0) },
    { label: 'Gross income', sectionStart: true, cell: r => money(r.grossIncome) },
    { label: 'Gross yield %', cell: r => pct1(r.grossYieldPct) },
    { label: 'Cash deductions', cell: r => money(r.interestExpense + r.operatingExpenses) },
    { label: 'Interest expense', indent: true, cell: r => money(r.interestExpense) },
    { label: 'Operating expenses', indent: true, cell: r => money(r.operatingExpenses) },
    { label: 'Net annual cashflow', strong: true, cell: r => money(r.netCashflow) },
    { label: 'Net annual cashflow (cumulative)', cell: r => money(r.netCashflowCumulative) },
    { label: 'Net yield %', cell: r => pct1(r.propertyValue > 0 ? (r.netCashflow / r.propertyValue) * 100 : 0) },
    { label: 'Income/(cost) per month', cell: r => money(r.monthlyCost) },
    { label: 'Income/(cost) per week', cell: r => money(Math.round(r.netCashflow / 52)) },
    { label: 'Capital growth (annual)', sectionStart: true, cell: r => money(r.capitalGrowthAnnual) },
    { label: 'Capital growth (cumulative)', cell: r => money(r.capitalGrowthCumulative) },
    { label: 'Total performance', cell: r => money(r.totalPerformance) },
    { label: 'Total performance inc. principal', strong: true, cell: r => money(r.totalPerformance + principalCum(r)) },
    { label: 'Cash on cash return (cumulative)', sectionStart: true, cell: r => pct1(r.cocReturnCumulative) },
    { label: 'Return on invested capital', strong: true, cell: r => pct1(r.roic) },
  ]

  const performanceTab = (
    <div className="flex flex-col gap-4">
      {/* Hero — chart card + return-metrics card, two peers (prototype §3.11):
          chart title 14px/600 #181D27 with the legend on the header row (16×3px
          line swatches, 11px meta labels — still click-to-toggle); metrics in
          their own 280px card. */}
      <div className="flex gap-5 items-stretch">
        <div className="flex-1 min-w-0 bg-white border border-[#E9EAEB] rounded-[14px] pt-6 px-[26px] pb-5 flex flex-col">
          <div className="flex items-center justify-between gap-6 flex-wrap mb-4">
            <span className="text-[14px] font-semibold text-[#181D27] whitespace-nowrap">Total performance projection</span>
            <div className="flex items-center gap-[18px] flex-wrap">
              {[
                { key: 'capitalGrowth', color: '#7C3AED', label: 'Capital growth' },
                { key: 'netCashflow', color: '#8B5CF6', label: 'Net cashflow' },
                { key: 'principalPaid', color: '#98A2B3', label: 'Principal paid down' },
              ].map(item => {
                const hidden = hiddenPerfSeries.includes(item.key)
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => togglePerfSeries(item.key)}
                    title="Click to show/hide"
                    className="group flex items-center gap-[7px] cursor-pointer select-none"
                  >
                    <span
                      className="w-4 h-[3px] rounded-[2px] flex-shrink-0 transition-opacity"
                      style={{ backgroundColor: item.color, opacity: hidden ? 0.25 : 1 }}
                    />
                    <span
                      className={`text-[11px] group-hover:underline ${hidden ? 'text-neutral-400 line-through' : 'text-[#717680]'}`}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              })}
              <HorizonToggle value={perfHorizon} onChange={setPerfHorizon} />
            </div>
          </div>
          <div className="flex-1 mt-2">
            <BriefTotalPerformanceChart yearRows={perfYearRows} horizon={perfHorizon} hiddenKeys={hiddenPerfSeries} />
          </div>
        </div>
        {/* Return-metrics rail (§3.11) — Gross yield · Capital growth · CoC · ROIC */}
        <div className="w-[280px] flex-none bg-white border border-[#E9EAEB] rounded-[14px] p-6 flex flex-col">
          <div className="text-[11px] font-semibold text-[#717680] uppercase tracking-[0.06em] mb-5">Return metrics</div>
          <PerfMetricSection title="Gross yield" rows={grossYieldRows} />
          <PerfMetricSection title="Capital growth" rows={capGrowthRows} />
          <PerfMetricSection title="Cash-on-cash return" rows={cocRows} signColored />
          <PerfMetricSection title="Return on invested capital" rows={roicRows} />
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-200">
            <span className="text-[12px] text-[#717680]">Capital returned in</span>
            <span className="text-[13px] font-semibold text-[#181D27]">{projection.capitalReturnedInYears} yrs</span>
          </div>
        </div>
      </div>

      {/* Standalone projections — cashflow + growth, same chart language as the hero */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Cashflow projection" legend={[{ color: '#8B5CF6', label: 'Net cashflow' }]}>
          <BriefCashflowChart yearRows={perfYearRows} horizon={perfHorizon} />
        </ChartCard>
        <ChartCard title="Growth projection" legend={[{ color: '#7C3AED', label: 'Equity' }]}>
          <BriefGrowthChart yearRows={perfYearRows} horizon={perfHorizon} />
        </ChartCard>
      </div>

      {/* Detailed annual breakdown — transposed metrics × years */}
      <ChartCard
        title="Detailed annual breakdown"
        flush
        collapsible
        defaultCollapsed
        titleInfo={
          <InfoPopover
            accent
            title="Calculated view"
            body={['Every figure here is calculated from your plan. Nothing in this table is edited directly.']}
            action={onNavigateToPurchases ? { label: 'Go to Purchases', onClick: onNavigateToPurchases } : undefined}
          />
        }
      >
        <div className="overflow-x-auto">
          {/* PropPath §2.2 matrix table — 12px cells / 8px padding, sticky label
              column, hairline above section starts, stronger rule above the
              strong rows, negatives semantic red. No vertical rules or bands. */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left text-[11px] font-medium text-[#717680] py-2.5 pl-[18px] pr-4 whitespace-nowrap min-w-[240px]">
                  Metric
                </th>
                <th className="text-right text-[11px] font-medium text-[#717680] py-2.5 px-3.5 whitespace-nowrap min-w-[80px]">
                  At purchase
                </th>
                {detailYears.map((r) => (
                  <th
                    key={r.year}
                    className="text-right text-[11px] font-medium text-[#717680] py-2.5 px-3.5 whitespace-nowrap min-w-[80px]"
                  >
                    End of year {r.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailMetrics.map((m) => (
                <tr
                  key={m.label}
                  className={m.strong ? 'border-t border-[#D5D7DA]' : m.sectionStart ? 'border-t border-[#E9EAEB]' : ''}
                >
                  <td
                    className={`sticky left-0 z-10 bg-white py-2 pr-4 whitespace-nowrap text-[13px] ${
                      m.strong
                        ? 'pl-[18px] font-semibold text-[#181D27]'
                        : m.indent
                          ? 'pl-[34px] font-normal text-[#717680]'
                          : `pl-[18px] font-normal text-[#414651] ${m.italic ? 'italic' : ''}`
                    }`}
                  >
                    {m.label}
                  </td>
                  <td className="text-right py-2 px-3.5 whitespace-nowrap tabular-nums font-normal text-[#717680]">
                    {m.atPurchase ?? ''}
                  </td>
                  {detailYears.map((r, i) => {
                    const v = m.cell(r, i)
                    return (
                      <td
                        key={r.year}
                        className={`text-right py-2 px-3.5 whitespace-nowrap tabular-nums ${m.strong ? 'font-semibold' : 'font-normal'} ${
                          v.startsWith('-') ? 'text-[#F04438]' : m.strong ? 'text-[#181D27]' : 'text-[#535862]'
                        }`}
                      >
                        {v}
                      </td>
                    )
                  })}
                </tr>
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
      <div className="flex items-center gap-1.5 bg-[#F2F2F3] p-[3px] rounded-[9px]">
        <SubTabItem
          icon={<TrendingUp size={15} />}
          label="The Performance"
          active={subTab === 'performance'}
          onClick={() => setSubTab('performance')}
        />
        <SubTabItem
          icon={<Home size={15} />}
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
