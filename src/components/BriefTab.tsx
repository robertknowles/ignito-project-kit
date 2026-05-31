import React, { useMemo, useState, useCallback } from 'react'
import { Target, DollarSign, TrendingUp, Home, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useScenarioSave } from '@/contexts/ScenarioSaveContext'
import type { ExistingProperty } from '@/types/existingProperty'
import { ChartCard } from './ui/ChartCard'
import { BriefCashflowChart, BriefEquityChart, BriefLoanChart, BriefHoldingCostChart } from './BriefPerformanceCharts'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { calculatePerPropertyProjection, type TimelinePropertyData } from '../utils/perPropertyProjections'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { GROWTH_RATE_TIERS } from '../constants/financialParams'
import type { GrowthCurve } from '../types/property'
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
    <td className={`py-2 px-3 text-xs ${bold ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}>
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
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const display = decimals !== undefined ? value.toFixed(decimals) : fmtNum(value)

  return (
    <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0`}>
      <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">
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
            const n = parseFloat(draft)
            if (!isNaN(n) && n !== value) {
              updateInstance(instanceId, { [field]: n } as Partial<PropertyInstanceDetails>)
            }
          }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className={`w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs ${
            bold ? 'font-medium text-neutral-900' : 'text-neutral-600'
          } hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300`}
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

  return (
    <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0`}>
      <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">
        {label}
      </td>
      <td className="py-1.5 px-2">
        <select
          value={value}
          onChange={e => updateInstance(instanceId, { [field]: e.target.value } as Partial<PropertyInstanceDetails>)}
          className="w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300 cursor-pointer"
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

// ── Main component ──────────────────────────────────────────────────────────

type BriefSubTab = 'purchase' | 'hold' | 'performance'

export const BriefTab: React.FC = () => {
  const [subTab, setSubTab] = useState<BriefSubTab>('purchase')
  const { timelineProperties } = useAffordabilityCalculator()
  const { instances } = usePropertyInstance()
  const { profile } = useInvestmentProfile()

  const { existingProperties, setExistingProperties } = useScenarioSave()

  const nextProp = timelineProperties[0]
  const instanceData = nextProp ? instances[nextProp.instanceId] : null

  const handleMarkPurchased = useCallback(() => {
    if (!nextProp || !instanceData) return
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
      yield: instanceData.rentPerWeek ? (instanceData.rentPerWeek * 52) / (instanceData.purchasePrice || 1) * 100 : 0,
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
    }
    setExistingProperties([...existingProperties, newExisting])
    toast.success('Property marked as purchased and moved to Existing Portfolio')
  }, [nextProp, instanceData, existingProperties, setExistingProperties])

  const growthCurve: GrowthCurve = useMemo(() => {
    if (!instanceData) return GROWTH_RATE_TIERS.Medium
    return GROWTH_RATE_TIERS[instanceData.growthAssumption] || GROWTH_RATE_TIERS.Medium
  }, [instanceData])

  const projection = useMemo(() => {
    if (!nextProp || !instanceData) return null
    try {
      const tpData: TimelinePropertyData = {
        title: nextProp.title,
        cost: nextProp.cost,
        loanAmount: nextProp.loanAmount,
        depositRequired: nextProp.depositRequired,
        period: nextProp.period,
        affordableYear: nextProp.affordableYear,
        displayPeriod: nextProp.displayPeriod,
        loanType: nextProp.loanType || instanceData.loanProduct || 'IO',
        acquisitionCosts: nextProp.acquisitionCosts,
      }
      return calculatePerPropertyProjection(tpData, instanceData, { growthCurve, projectionYears: 20 })
    } catch (e) {
      console.error('[BriefTab] projection error:', e)
      return null
    }
  }, [nextProp, instanceData, growthCurve])

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
    ? ((instanceData.rentPerWeek * 52) / instanceData.purchasePrice * 100).toFixed(1)
    : '0.0'

  const iid = nextProp.instanceId

  // ── Tab 1: The Purchase ─────────────────────────────────────────────────

  const purchaseTab = (
    <div className="grid grid-cols-2 gap-4 items-start">
      {/* Property Summary (includes funding source rows) */}
      <ChartCard title="Property summary" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableSelectRow label="State" value={instanceData.state} field="state" instanceId={iid} options={STATE_OPTIONS} />
            <KVRow label="Purchase year" value={Math.floor(nextProp.affordableYear)} />
            <EditableNumRow label="Purchase price ($)" value={instanceData.purchasePrice} field="purchasePrice" instanceId={iid} />
            <EditableNumRow label="Valuation ($)" value={instanceData.valuationAtPurchase} field="valuationAtPurchase" instanceId={iid} />
            <EditableNumRow label="LVR (%)" value={instanceData.lvr} field="lvr" instanceId={iid} />
            <KVRow label="Loan amount ($)" value={fmtNum(nextProp.loanAmount)} />
            <EditableNumRow label="Interest rate (%)" value={instanceData.interestRate} field="interestRate" instanceId={iid} decimals={2} />
            <EditableSelectRow label="Loan product" value={instanceData.loanProduct} field="loanProduct" instanceId={iid} options={LOAN_PRODUCT_OPTIONS} />
            <EditableNumRow label="Loan term (yrs)" value={instanceData.loanTerm} field="loanTerm" instanceId={iid} />
            <EditableSelectRow label="Growth assumption" value={instanceData.growthAssumption} field="growthAssumption" instanceId={iid} options={GROWTH_OPTIONS} />
            <EditableNumRow label="Rent/wk ($)" value={instanceData.rentPerWeek} field="rentPerWeek" instanceId={iid} />
            <KVRow label="Gross yield (%)" value={grossYield} />
            {/* Funding source */}
            <tr><td colSpan={2} className="py-2 px-3 text-xs font-semibold text-neutral-500 bg-[#F9FAFB] border-t border-l border-r border-neutral-200">Funding source</td></tr>
            <KVRow label="Cash ($)" value={fmtNum(nextProp.fundingBreakdown?.cash ?? 0)} />
            <KVRow label="Savings ($)" value={fmtNum(nextProp.fundingBreakdown?.savings ?? 0)} />
            <KVRow label="Equity release ($)" value={fmtNum(nextProp.fundingBreakdown?.equity ?? 0)} />
            <KVRow label="Total funded ($)" value={fmtNum(nextProp.fundingBreakdown?.total ?? nextProp.totalCashRequired)} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Purchase Costs — detailed breakdown, each instance field editable */}
      <ChartCard title="Purchase costs" flush>
        <table className="w-full text-xs">
          <tbody>
            <KVRow label="Deposit ($)" value={fmtNum(nextProp.depositRequired)} />
            <EditableNumRow label="Stamp duty ($)" value={acqCosts?.stampDuty ?? instanceData.stampDutyOverride ?? 0} field="stampDutyOverride" instanceId={iid} />
            <KVRow label="LMI ($)" value={fmtNum(acqCosts?.lmi ?? 0)} />
            <EditableNumRow label="Engagement fee ($)" value={instanceData.engagementFee} field="engagementFee" instanceId={iid} />
            <EditableNumRow label="Holding deposit ($)" value={instanceData.conditionalHoldingDeposit} field="conditionalHoldingDeposit" instanceId={iid} />
            <EditableNumRow label="Insurance upfront ($)" value={instanceData.buildingInsuranceUpfront} field="buildingInsuranceUpfront" instanceId={iid} />
            <EditableNumRow label="B&P inspection ($)" value={instanceData.buildingPestInspection} field="buildingPestInspection" instanceId={iid} />
            <EditableNumRow label="Plumbing / elec. ($)" value={instanceData.plumbingElectricalInspections} field="plumbingElectricalInspections" instanceId={iid} />
            <EditableNumRow label="Ind. valuation ($)" value={instanceData.independentValuation} field="independentValuation" instanceId={iid} />
            <EditableNumRow label="Mortgage fees ($)" value={instanceData.mortgageFees} field="mortgageFees" instanceId={iid} />
            <EditableNumRow label="Conveyancing ($)" value={instanceData.conveyancing} field="conveyancing" instanceId={iid} />
            <EditableNumRow label="Post-sett. maint ($)" value={instanceData.maintenanceAllowancePostSettlement} field="maintenanceAllowancePostSettlement" instanceId={iid} />
            <KVRow label="Total cash required ($)" value={fmtNum(nextProp.totalCashRequired)} bold />
          </tbody>
        </table>
      </ChartCard>

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
            <KVRow label="Gross annual income ($)" value={fmtNum(cashflow.grossAnnualIncome)} />
            <KVRow label="Vacancy ($)" value={fmtNum(cashflow.vacancyAmount)} />
            <KVRow label="Adjusted income ($)" value={fmtNum(cashflow.adjustedIncome)} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Cash Out */}
      <ChartCard title="Annual cash out" flush>
        <table className="w-full text-xs">
          <tbody>
            <KVRow label="Loan interest ($)" value={fmtNum(cashflow.loanInterest)} />
            <EditableNumRow label="Prop. mgmt (%)" value={instanceData.propertyManagementPercent} field="propertyManagementPercent" instanceId={iid} decimals={1} />
            <EditableNumRow label="Building insurance ($)" value={instanceData.buildingInsuranceAnnual} field="buildingInsuranceAnnual" instanceId={iid} />
            <EditableNumRow label="Council rates + water ($)" value={instanceData.councilRatesWater} field="councilRatesWater" instanceId={iid} />
            <EditableNumRow label="Strata ($)" value={instanceData.strata} field="strata" instanceId={iid} />
            <EditableNumRow label="Maintenance ($)" value={instanceData.maintenanceAllowanceAnnual} field="maintenanceAllowanceAnnual" instanceId={iid} />
            <EditableNumRow label="Land tax ($)" value={cashflow.landTax} field="landTaxOverride" instanceId={iid} />
            {cashflow.principalPayments > 0 && (
              <KVRow label="Principal payments ($)" value={fmtNum(cashflow.principalPayments)} />
            )}
            <KVRow label="Total expenses ($)" value={fmtNum(totalHoldingCosts)} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Net Result — all computed */}
      <ChartCard title="Net result" flush>
        <table className="w-full text-xs">
          <tbody>
            <KVRow label="Net annual cashflow ($)" value={fmtNum(cashflow.netAnnualCashflow)} bold />
            <KVRow label="Net monthly ($)" value={fmtNum(cashflow.netMonthlyCashflow)} />
            <KVRow label="Net weekly ($)" value={fmtNum(cashflow.netWeeklyCashflow)} />
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
        onClick={handleMarkPurchased}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#414651] bg-white border border-[#D5D7DA] rounded-lg hover:bg-[#F9FAFB] transition-colors"
      >
        <CheckCircle2 size={14} />
        Purchased property
      </button>
      </div>

      {/* Tab content */}
      {subTab === 'purchase' && purchaseTab}
      {subTab === 'hold' && holdTab}
      {subTab === 'performance' && performanceTab}
    </div>
  )
}
