/**
 * BriefView - the presentational Next Purchase Brief.
 *
 * Data-driven: it takes a target property (`nextProp`), its editable instance
 * (`instanceData`), the projection + detailed cashflow, and an `edit` adapter.
 * All row edits flow through the adapter (BriefEditContext), so the SAME markup
 * serves two hosts:
 *   - BriefTab (portfolio): commits to PropertyInstanceContext.updateInstance.
 *   - PurchaseBriefCalc (Toolkit): commits to local component state.
 * This keeps the standalone calculator pixel-identical to the dashboard brief
 * by construction - one source of truth for the UI.
 */

import React, { useState, useCallback, useContext } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ChartCard } from './ui/ChartCard'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { InfoPopover } from './RetirementScenario/InfoPopover'
import { BriefTotalPerformanceChart, type PerfHorizon } from './BriefPerformanceCharts'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { calcGrossYield } from '../utils/sharedFinancialCalcs'
import { parseShorthandNumber } from '../utils/parseShorthandNumber'
import type { PropertyInstanceDetails } from '../types/propertyInstance'
import type { TimelineProperty } from '../types/property'
import type { PerPropertyProjection } from '../engine/projectionEngine'

const fmtNum = (v: number) => Math.round(v).toLocaleString('en-AU')
const fmt$ = (v: number) => `$${fmtNum(v)}`

// ── Edit adapter ────────────────────────────────────────────────────────────
// The host supplies commit (write a field on the target instance) and an
// optional notify (change-receipt breadcrumb). Rows read it from context so the
// table markup stays free of any store-specific wiring.

export interface BriefEditAdapter {
  commit: (field: keyof PropertyInstanceDetails, value: number | string | boolean) => void
  notify?: (fieldLabel: string, from: number | string, to: number | string) => void
}

const NOOP_EDIT: BriefEditAdapter = { commit: () => {} }
const BriefEditContext = React.createContext<BriefEditAdapter>(NOOP_EDIT)
const useBriefEdit = () => useContext(BriefEditContext)

// ── Row helpers (§2.2 tables + §2.7 editable hover-pill) ─────────────────────
// Values render as clean text; on hover an editable value gets a quiet violet-50
// pill + caret. `tone` drives the §2.2 matrix ladder (section / breakdown / net)
// used by the Annual cashflow table.

type RowTone = 'section' | 'breakdown' | 'net'

const rowContainerCls = (tone: RowTone | undefined, bold: boolean | undefined) => {
  const base =
    tone === 'section' ? 'border-t border-[#E9EAEB]'
    : tone === 'net' ? 'border-t border-[#D5D7DA]'
    : bold ? 'border-t border-[#D5D7DA]'
    : 'border-b border-[#F2F2F2] last:border-b-0'
  return `${base} hover:bg-[#FAFAFA] transition-colors`
}

// Vertical label/value divider - same grid language as the Purchases table
const valueCellDividerCls = 'border-l border-[#F2F4F7]'

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

// Shared editable-value input styling - matches the Purchases table exactly
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
    <td className={`py-2 px-3 text-xs text-right ${valueCellDividerCls} ${valueClsFor(undefined, bold, 0)}`}>
      {value}
    </td>
  </tr>
)

// ── Editable number row ─────────────────────────────────────────────────────

const EditableNumRow: React.FC<{
  label: string
  value: number
  field?: keyof PropertyInstanceDetails
  bold?: boolean
  tone?: RowTone
  decimals?: number
  unit?: 'money' | 'pct' | 'weekly'
  readOnly?: boolean
}> = ({ label, value, field, bold, tone, decimals, unit, readOnly }) => {
  const { commit, notify } = useBriefEdit()
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
      <td className={`py-1 px-2 ${valueCellDividerCls}`}>
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
                notify?.(label, value, n)
                commit(field, n)
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
  options: { value: string; label: string }[]
}> = ({ label, value, field, options }) => {
  const { commit, notify } = useBriefEdit()

  return (
    <tr className={rowContainerCls(undefined, false)}>
      <td className="py-2 px-3 text-xs font-medium text-[#717680] whitespace-nowrap">
        {label}
      </td>
      <td className={`py-1 px-2 ${valueCellDividerCls}`}>
        <select
          value={value}
          onChange={e => { notify?.(label, value, e.target.value); commit(field, e.target.value) }}
          className="w-full bg-transparent text-right outline-none rounded px-1.5 py-0.5 text-xs text-[#414651] hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 cursor-pointer transition-colors"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
    </tr>
  )
}

// ── Editable boolean row (Yes / No) ─────────────────────────────────────────
// Dedicated boolean variant so toggle-style fields (e.g. LMI Waiver) commit an
// actual boolean rather than the string value a <select> would emit.

const EditableBoolRow: React.FC<{
  label: string
  value: boolean
  field: keyof PropertyInstanceDetails
}> = ({ label, value, field }) => {
  const { commit, notify } = useBriefEdit()

  return (
    <tr className={rowContainerCls(undefined, false)}>
      <td className="py-2 px-3 text-xs font-medium text-[#717680] whitespace-nowrap">
        {label}
      </td>
      <td className={`py-1 px-2 ${valueCellDividerCls}`}>
        <select
          value={value ? 'yes' : 'no'}
          onChange={e => {
            const next = e.target.value === 'yes'
            notify?.(label, value ? 'Yes' : 'No', next ? 'Yes' : 'No')
            commit(field, next)
          }}
          className="w-full bg-transparent text-right outline-none rounded px-1.5 py-0.5 text-xs text-[#414651] hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 cursor-pointer transition-colors"
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
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

// ── Funding this purchase - cash-needs donut + loan/price + gearing bar ──────
// One card (replaces the old cash-donut + LVR-gauge pair). Left: the cash-needed
// ring; right: the cash-use breakdown, loan vs price, the gearing bar, and a
// plain-English caption covering gearing, capitalised LMI and funding source.
const FundingCard: React.FC<{
  segments: { label: string; value: number; color: string }[]
  total: number
  loanAmount: number
  purchasePrice: number
  lvr: number
  fillPct: number
  lmiCapitalised: boolean
  lmiAmount: number
  funding: { cash: number; savings: number; equity: number; total: number }
}> = ({ segments, total, loanAmount, purchasePrice, lvr, fillPct, lmiCapitalised, lmiAmount, funding }) => {
  // "cash and savings" / "cash, savings and equity release"
  const names = [
    funding.cash > 0 && 'cash',
    funding.savings > 0 && 'savings',
    funding.equity > 0 && 'equity release',
  ].filter(Boolean) as string[]
  const fundedFrom = names.length === 0 ? 'cash'
    : names.length === 1 ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return (
    <div className="flex items-center gap-8">
      {/* Cash-needed ring - spins open smoothly on mount (CSS transform, no
          Recharts sweep which jumps at the end with paddingAngle) */}
      <div className="relative shrink-0" style={{ width: 190, height: 190 }}>
        <motion.div
          style={{ width: '100%', height: '100%', transformOrigin: 'center' }}
          initial={{ rotate: -270, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                innerRadius={66}
                outerRadius={92}
                paddingAngle={2}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[24px] font-semibold text-[#181D27] leading-tight tracking-[-0.02em]">{fmt$(total)}</span>
          <span className="text-[13px] text-[#717680]">cash needed</span>
        </div>
      </div>

      {/* Breakdown + gearing */}
      <div className="flex-1 flex flex-col">
        {segments.map(s => (
          <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-[#F2F2F2]">
            <span className="flex items-center gap-2.5 text-[14px] text-[#535862]">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="text-[14px] font-semibold text-[#181D27]">{fmt$(s.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2.5 border-b border-[#F2F2F2]">
          <span className="text-[14px] text-[#535862]">Loan amount</span>
          <span className="text-[14px] font-semibold text-[#181D27]">{fmt$(loanAmount)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[14px] text-[#535862]">Purchase price</span>
          <span className="text-[14px] font-semibold text-[#181D27]">{fmt$(purchasePrice)}</span>
        </div>

        {/* Gearing bar */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[32px] font-semibold text-[#181D27] leading-none tracking-[-0.02em] shrink-0">{Math.round(lvr)}%</span>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#EBE6F9' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${fillPct}%`, background: '#7C3AED' }} />
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-snug text-[#717680]">
          Geared at {Math.round(lvr)}%.{lmiCapitalised ? ` Includes ${fmt$(lmiAmount)} LMI added to the loan.` : ''} Funded from {fundedFrom}.
        </p>
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

// ── Main presentational component ────────────────────────────────────────────

export interface BriefViewProps {
  /** The property to brief on (carries acquisitionCosts, funding, loan, etc.). */
  nextProp: TimelineProperty
  /** The editable instance detail (the single source the tables read + write). */
  instanceData: PropertyInstanceDetails
  /** Per-property projection (year rows + capital-returned). */
  projection: PerPropertyProjection
  /** Detailed annual cashflow for the target instance. */
  cashflow: ReturnType<typeof calculateDetailedCashflow>
  /** How field edits are committed (portfolio → context, calc → local state). */
  edit: BriefEditAdapter
  /** Optional header row above the content (back link + property heading). */
  header?: React.ReactNode
  /** Optional action in the "Funding this purchase" card header. */
  fundingAction?: React.ReactNode
  /** Purchases-tab deep link for the detailed-breakdown (i). */
  onNavigateToPurchases?: () => void
  /** Purchase pull-away animation (portfolio "Mark as purchased" only). */
  animateKey?: number
  animatePull?: boolean
}

export const BriefView: React.FC<BriefViewProps> = ({
  nextProp,
  instanceData,
  projection,
  cashflow,
  edit,
  header,
  fundingAction,
  onNavigateToPurchases,
  animateKey = 0,
  animatePull = false,
}) => {
  const [perfHorizon, setPerfHorizon] = useState<PerfHorizon>(20)
  // Series toggled off on the Total performance chart (click legend to hide/show)
  const [hiddenPerfSeries, setHiddenPerfSeries] = useState<string[]>([])
  const togglePerfSeries = useCallback((key: string) => {
    setHiddenPerfSeries(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }, [])

  const acqCosts = nextProp.acquisitionCosts
  const totalHoldingCosts = cashflow.totalOperatingExpenses + cashflow.totalNonDeductibleExpenses
  const grossYield = instanceData.purchasePrice > 0
    ? calcGrossYield(instanceData.rentPerWeek, instanceData.purchasePrice).toFixed(1)
    : '0.0'

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

  // Funding sources for the total cash required (engine waterfall: equity →
  // cash → savings). Falls back to all-cash if the engine didn't attach a split.
  const funding = nextProp.fundingBreakdown ?? { cash: totalCash, savings: 0, equity: 0, total: totalCash }
  // LMI capitalised into the loan (explains loanAmount sitting above price × LVR)
  const lmiAmount = acqCosts?.lmi ?? 0
  const lmiCapitalised = !!instanceData.lmiCapitalized && lmiAmount > 0

  // ── Combined annual cashflow table (cash in / cash out / net result) ──────
  const cashflowTable = (
    <ChartCard title="Annual cashflow" flush>
      {/* Inset wrapper - keeps grid lines clear of the card edges, matching the Purchases table */}
      <div className="px-5 pb-5">
      <table className="w-full">
        <tbody>
          {/* Rental income - GROSS rent basis (vacancy is applied in
              serviceability/funding assessment, not deducted here) */}
          <EditableNumRow tone="section" unit="money" label="Gross rental income" value={instanceData.adjustedIncomeOverride ?? instanceData.grossAnnualIncomeOverride ?? cashflow.grossAnnualIncome} field="grossAnnualIncomeOverride" />
          {/* Operating expenses */}
          <EditableNumRow tone="section" unit="money" label="Operating expenses" value={instanceData.totalExpensesOverride ?? totalHoldingCosts} field="totalExpensesOverride" />
          <EditableNumRow tone="breakdown" unit="money" label="Loan interest" value={instanceData.loanInterestOverride ?? cashflow.loanInterest} field="loanInterestOverride" />
          <EditableNumRow tone="breakdown" unit="pct" label="Property management" value={instanceData.propertyManagementPercent} field="propertyManagementPercent" decimals={1} />
          <EditableNumRow tone="breakdown" unit="money" label="Building insurance" value={instanceData.buildingInsuranceAnnual} field="buildingInsuranceAnnual" />
          <EditableNumRow tone="breakdown" unit="money" label="Council rates + water" value={instanceData.councilRatesWater} field="councilRatesWater" />
          <EditableNumRow tone="breakdown" unit="money" label="Strata" value={instanceData.strata} field="strata" />
          <EditableNumRow tone="breakdown" unit="money" label="Maintenance" value={instanceData.maintenanceAllowanceAnnual} field="maintenanceAllowanceAnnual" />
          <EditableNumRow tone="breakdown" unit="money" label="Land tax" value={cashflow.landTax} field="landTaxOverride" />
          {cashflow.principalPayments > 0 && (
            <EditableNumRow tone="breakdown" unit="money" label="Principal payments" value={cashflow.principalPayments} readOnly />
          )}
          {/* Net - the one 600 emphasis, semantic sign colour (§1.3) */}
          <EditableNumRow tone="net" unit="money" label="Net annual cashflow" value={instanceData.netAnnualCashflowOverride ?? cashflow.netAnnualCashflow} field="netAnnualCashflowOverride" />
          <EditableNumRow tone="breakdown" unit="money" label="Net monthly" value={instanceData.netMonthlyCashflowOverride ?? cashflow.netMonthlyCashflow} field="netMonthlyCashflowOverride" />
          <EditableNumRow tone="breakdown" unit="money" label="Net weekly" value={instanceData.netWeeklyCashflowOverride ?? cashflow.netWeeklyCashflow} field="netWeeklyCashflowOverride" />
        </tbody>
      </table>
      </div>
    </ChartCard>
  )

  // ── Tab 1: The Purchase ─────────────────────────────────────────────────

  const purchaseVisual = (
    <ChartCard title="Funding this purchase" action={fundingAction}>
      <FundingCard
        segments={cashSegments}
        total={totalCash}
        loanAmount={loanAmount}
        purchasePrice={purchasePrice}
        lvr={instanceData.lvr}
        fillPct={lvrFill}
        lmiCapitalised={lmiCapitalised}
        lmiAmount={lmiAmount}
        funding={funding}
      />
    </ChartCard>
  )

  // Editable detail - three equal peer tables (§2.5): Deal details · Purchase costs · Annual cashflow
  const purchaseDetail = (
    <div className="grid grid-cols-3 gap-4 items-start">
        {/* Deal details - the single editable record of the whole deal (§2.5),
            mirroring the main dashboard's property editor (Property + Loan). */}
        <ChartCard title="Deal details" flush>
          <div className="px-5 pb-5">
          <table className="w-full">
            <tbody>
              <EditableSelectRow label="State" value={instanceData.state} field="state" options={STATE_OPTIONS} />
              <EditableSelectRow label="Entity" value={instanceData.entity ?? 'individual'} field="entity" options={ENTITY_OPTIONS} />
              <KVRow label="Purchase year" value={Math.floor(nextProp.affordableYear)} />
              <EditableNumRow label="Purchase price" unit="money" value={instanceData.purchasePrice} field="purchasePrice" />
              <EditableNumRow label="Valuation at purchase" unit="money" value={instanceData.valuationAtPurchase} field="valuationAtPurchase" />
              <EditableNumRow label="Rent" unit="weekly" value={instanceData.rentPerWeek} field="rentPerWeek" />
              <KVRow label="Gross yield" value={`${grossYield}%`} />
              <EditableSelectRow label="Growth" value={instanceData.growthAssumption} field="growthAssumption" options={GROWTH_OPTIONS} />
              <EditableNumRow label="LVR" unit="pct" value={instanceData.lvr} field="lvr" />
              <KVRow label="Loan amount" value={fmt$(loanAmount)} />
              <EditableBoolRow label="LMI waiver" value={!!instanceData.lmiWaiver} field="lmiWaiver" />
              <EditableSelectRow label="Loan product" value={instanceData.loanProduct} field="loanProduct" options={LOAN_PRODUCT_OPTIONS} />
              <EditableNumRow label="Interest rate" unit="pct" decimals={2} value={instanceData.interestRate} field="interestRate" />
              <EditableNumRow label="Loan term (yrs)" value={instanceData.loanTerm} field="loanTerm" />
              <EditableNumRow label="Total cash required" unit="money" value={instanceData.totalCashRequiredOverride ?? nextProp.totalCashRequired} field="totalCashRequiredOverride" bold />
            </tbody>
          </table>
          </div>
        </ChartCard>

        {/* Purchase costs - one-off line items → Total cash required */}
        <ChartCard title="Purchase costs" flush>
          <div className="px-5 pb-5">
          <table className="w-full">
            <tbody>
              <EditableNumRow label="Deposit ($)" value={instanceData.depositOverride ?? nextProp.depositRequired} field="depositOverride" />
              <EditableNumRow label="Stamp duty ($)" value={acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0} field="stampDutyOverride" />
              <EditableNumRow label="LMI ($)" value={instanceData.lmiOverride ?? (acqCosts?.lmi ?? 0)} field="lmiOverride" />
              <EditableNumRow label="Engagement fee ($)" value={instanceData.engagementFee} field="engagementFee" />
              <EditableNumRow label="Insurance upfront ($)" value={instanceData.buildingInsuranceUpfront} field="buildingInsuranceUpfront" />
              <EditableNumRow label="B&P inspection ($)" value={instanceData.buildingPestInspection} field="buildingPestInspection" />
              <EditableNumRow label="Plumbing / elec. ($)" value={instanceData.plumbingElectricalInspections} field="plumbingElectricalInspections" />
              <EditableNumRow label="Ind. valuation ($)" value={instanceData.independentValuation} field="independentValuation" />
              <EditableNumRow label="Mortgage fees ($)" value={instanceData.mortgageFees} field="mortgageFees" />
              <EditableNumRow label="Conveyancing ($)" value={instanceData.conveyancing} field="conveyancing" />
              <EditableNumRow label="Post-sett. maint ($)" value={instanceData.maintenanceAllowancePostSettlement} field="maintenanceAllowancePostSettlement" />
              <EditableNumRow label="Total cash required ($)" value={instanceData.totalCashRequiredOverride ?? nextProp.totalCashRequired} field="totalCashRequiredOverride" bold />
            </tbody>
          </table>
          </div>
        </ChartCard>

        {/* Annual cashflow - §2.2 matrix ladder, semantic-red Net */}
        {cashflowTable}
      </div>
  )

  // ── Performance projections ─────────────────────────────────────────────

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

  const cocRows = milestoneRows(r => `${r.cocReturnCumulative.toFixed(1)}%`)
  const roicRows = milestoneRows(r => `${r.roic.toFixed(1)}%`)
  const grossYieldRows = milestoneRows(r => `${r.grossYieldPct.toFixed(1)}%`)
  const capGrowthRows = milestoneRows(r => fmt$(r.capitalGrowthCumulative))

  // ── Detailed annual breakdown (transposed: metrics × years) ───────────────
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

  // Hero - chart card + return-metrics card, two peers (prototype §3.11)
  const performanceHero = (
      <div className="flex gap-5 items-stretch">
        <div className="flex-1 min-w-0 bg-white border border-[#E9EAEB] rounded-[14px] pt-6 px-[26px] pb-5 flex flex-col">
          <div className="flex items-center justify-between gap-6 flex-wrap mb-4">
            <span className="text-[14px] font-semibold text-[#181D27] whitespace-nowrap">Total performance projection</span>
            <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-[18px] flex-wrap">
              {[
                { key: 'capitalGrowth', color: '#7C3AED', label: 'Capital growth', info: "The increase in the property's value over time, growing each year by its assumed growth rate. You realise this value when you sell or draw on the equity." },
                { key: 'netCashflow', color: '#8B5CF6', label: 'Net cashflow', info: "The rent received each year minus the running costs (loan interest, property management, council rates, insurance and maintenance). Above $0 the rent covers all the costs; below $0 the costs are higher than the rent." },
                { key: 'principalPaid', color: '#98A2B3', label: 'Principal paid down', info: "The portion of the loan you've repaid, which becomes equity you own. It stays level during the interest-only period, then grows once principal repayments begin." },
              ].map(item => {
                const hidden = hiddenPerfSeries.includes(item.key)
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => togglePerfSeries(item.key)}
                        className="group flex items-center gap-[7px] cursor-help select-none"
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
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[240px] text-xs leading-snug font-normal"
                      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                    >
                      {item.info}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
              <HorizonToggle value={perfHorizon} onChange={setPerfHorizon} />
            </div>
            </TooltipProvider>
          </div>
          <div className="flex-1 mt-2">
            <BriefTotalPerformanceChart yearRows={perfYearRows} horizon={perfHorizon} hiddenKeys={hiddenPerfSeries} />
          </div>
        </div>
        {/* Return-metrics rail (§3.11) - Gross yield · Capital growth · CoC · ROIC */}
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
  )

  // Detailed annual breakdown - transposed metrics × years
  const detailBreakdown = (
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
  )

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <BriefEditContext.Provider value={edit}>
      <div className="flex flex-col gap-4">
        {header}
        {/* Merged content - pulls away on purchase, next brief slides in */}
        <motion.div
          key={animateKey}
          initial={animateKey === 0 ? false : { opacity: 0, y: 16 }}
          animate={animatePull ? { opacity: 0, y: -32, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {/* Purchase snapshot - where the cash goes + loan-to-value */}
          {purchaseVisual}
          {/* Total performance projection + return-metrics rail */}
          {performanceHero}
          {/* Purchase detail - costs, annual cashflow, deal record */}
          {purchaseDetail}
          {/* Detailed annual breakdown (collapsible) */}
          {detailBreakdown}
        </motion.div>
      </div>
    </BriefEditContext.Provider>
  )
}
