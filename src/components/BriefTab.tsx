import React, { useMemo, useState } from 'react'
import { Target, DollarSign, TrendingUp, Home } from 'lucide-react'
import { ChartCard } from './ui/ChartCard'
import { PlaceholderChart } from './ui/PlaceholderChart'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { calculatePerPropertyProjection, type TimelinePropertyData } from '../utils/perPropertyProjections'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { GROWTH_RATE_TIERS } from '../constants/financialParams'
import type { GrowthCurve } from '../types/property'

// Format full number with commas, no dollar sign
const fmtNum = (v: number) => Math.round(v).toLocaleString('en-AU')

// ── Sub-tab button (reuses Dashboard pattern) ──────────────────────────────

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

// ── Key-value table row helper ──────────────────────────────────────────────

const KVRow: React.FC<{
  label: string
  value: string | number
  bold?: boolean
  border?: boolean
}> = ({ label, value, bold, border = true }) => (
  <tr className={`${border ? 'border-b border-neutral-200' : ''} last:border-b-0 hover:bg-neutral-50/50 transition-colors`}>
    <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100 whitespace-nowrap">
      {label}
    </td>
    <td className={`py-2 px-3 text-sm ${bold ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}>
      {value}
    </td>
  </tr>
)


// ── Main component ──────────────────────────────────────────────────────────

type BriefSubTab = 'purchase' | 'hold' | 'performance'

export const BriefTab: React.FC = () => {
  const [subTab, setSubTab] = useState<BriefSubTab>('purchase')
  const { timelineProperties } = useAffordabilityCalculator()
  const { instances } = usePropertyInstance()
  const { profile } = useInvestmentProfile()

  const nextProp = timelineProperties[0]
  const instanceData = nextProp ? instances[nextProp.instanceId] : null

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

  // ── Tab 1: The Purchase ─────────────────────────────────────────────────

  const purchaseTab = (
    <div className="grid grid-cols-3 gap-4 items-start">
      {/* Property Summary */}
      <ChartCard title="Property summary" flush>
        <table className="w-full text-sm">
          <tbody>
            <KVRow label="State" value={instanceData.state} />
            <KVRow label="Purchase year" value={Math.floor(nextProp.affordableYear)} />
            <KVRow label="Purchase price ($)" value={fmtNum(instanceData.purchasePrice)} />
            <KVRow label="Valuation ($)" value={fmtNum(instanceData.valuationAtPurchase)} />
            <KVRow label="LVR (%)" value={instanceData.lvr} />
            <KVRow label="Loan amount ($)" value={fmtNum(nextProp.loanAmount)} />
            <KVRow label="Interest rate (%)" value={instanceData.interestRate} />
            <KVRow label="Loan product" value={instanceData.loanProduct === 'IO' ? 'Interest only' : 'Principal & interest'} />
            <KVRow label="Loan term" value={`${instanceData.loanTerm} years`} />
            <KVRow label="Growth assumption" value={instanceData.growthAssumption} />
            <KVRow label="Rent/wk ($)" value={fmtNum(instanceData.rentPerWeek)} />
            <KVRow label="Gross yield (%)" value={grossYield} />
          </tbody>
        </table>
      </ChartCard>

      {/* Purchase Costs */}
      <ChartCard title="Purchase costs" flush>
        <table className="w-full text-sm">
          <tbody>
            <KVRow label="Deposit ($)" value={fmtNum(nextProp.depositRequired)} />
            {acqCosts && (
              <>
                <KVRow label="Stamp duty ($)" value={fmtNum(acqCosts.stampDuty)} />
                <KVRow label="LMI ($)" value={fmtNum(acqCosts.lmi)} />
                <KVRow label="Legal / conveyancing ($)" value={fmtNum(acqCosts.legalFees)} />
                <KVRow label="Inspections ($)" value={fmtNum(acqCosts.inspectionFees)} />
                <KVRow label="Other fees ($)" value={fmtNum(acqCosts.otherFees)} />
              </>
            )}
            {!acqCosts && (
              <>
                <KVRow label="Stamp duty ($)" value={fmtNum(instanceData.stampDutyOverride ?? 0)} />
                <KVRow label="Engagement fee ($)" value={fmtNum(instanceData.engagementFee)} />
                <KVRow label="Holding deposit ($)" value={fmtNum(instanceData.conditionalHoldingDeposit)} />
                <KVRow label="Insurance upfront ($)" value={fmtNum(instanceData.buildingInsuranceUpfront)} />
                <KVRow label="B&P inspection ($)" value={fmtNum(instanceData.buildingPestInspection)} />
                <KVRow label="Plumbing / electrical ($)" value={fmtNum(instanceData.plumbingElectricalInspections)} />
                <KVRow label="Independent valuation ($)" value={fmtNum(instanceData.independentValuation)} />
                <KVRow label="Mortgage fees ($)" value={fmtNum(instanceData.mortgageFees)} />
                <KVRow label="Conveyancing ($)" value={fmtNum(instanceData.conveyancing)} />
                <KVRow label="Post-settlement maint ($)" value={fmtNum(instanceData.maintenanceAllowancePostSettlement)} />
              </>
            )}
            <KVRow label="Total cash required ($)" value={fmtNum(nextProp.totalCashRequired)} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Funding Source */}
      <ChartCard title="Funding source" flush>
        <table className="w-full text-sm">
          <tbody>
            <KVRow label="Cash ($)" value={fmtNum(nextProp.fundingBreakdown?.cash ?? 0)} />
            <KVRow label="Savings ($)" value={fmtNum(nextProp.fundingBreakdown?.savings ?? 0)} />
            <KVRow label="Equity release ($)" value={fmtNum(nextProp.fundingBreakdown?.equity ?? 0)} />
            <KVRow label="Total funded ($)" value={fmtNum(nextProp.fundingBreakdown?.total ?? nextProp.totalCashRequired)} bold />
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
        <table className="w-full text-sm">
          <tbody>
            <KVRow label="Rent/wk ($)" value={fmtNum(cashflow.weeklyRent)} />
            <KVRow label="Gross annual income ($)" value={fmtNum(cashflow.grossAnnualIncome)} />
            <KVRow label="Vacancy ($)" value={fmtNum(cashflow.vacancyAmount)} />
            <KVRow label="Adjusted income ($)" value={fmtNum(cashflow.adjustedIncome)} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Cash Out */}
      <ChartCard title="Annual cash out" flush>
        <table className="w-full text-sm">
          <tbody>
            <KVRow label="Loan interest ($)" value={fmtNum(cashflow.loanInterest)} />
            <KVRow label="Property management ($)" value={fmtNum(cashflow.propertyManagementFee)} />
            <KVRow label="Building insurance ($)" value={fmtNum(cashflow.buildingInsurance)} />
            <KVRow label="Council rates + water ($)" value={fmtNum(cashflow.councilRatesWater)} />
            <KVRow label="Strata ($)" value={fmtNum(cashflow.strata)} />
            <KVRow label="Maintenance ($)" value={fmtNum(cashflow.maintenance)} />
            <KVRow label="Land tax ($)" value={fmtNum(cashflow.landTax)} />
            {cashflow.principalPayments > 0 && (
              <KVRow label="Principal payments ($)" value={fmtNum(cashflow.principalPayments)} />
            )}
            <KVRow label="Total expenses ($)" value={fmtNum(totalHoldingCosts)} bold />
          </tbody>
        </table>
      </ChartCard>

      {/* Net Result */}
      <ChartCard title="Net result" flush>
        <table className="w-full text-sm">
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
        <ChartCard title="Cashflow projection">
          <PlaceholderChart label="Net cashflow over hold period" height={160} />
        </ChartCard>
        <ChartCard title="Equity growth">
          <PlaceholderChart label="Property equity over time" height={160} />
        </ChartCard>
        <ChartCard title="Loan balance">
          <PlaceholderChart label="Loan balance drawdown over time" height={160} />
        </ChartCard>
        <ChartCard title="What it costs to hold">
          <PlaceholderChart label="Stacked holding costs breakdown" height={160} />
        </ChartCard>
      </div>

      {/* Year-by-Year Projections table — full width */}
      <ChartCard title="Year-by-year projections" flush>
        <table className="w-full text-sm">
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
                <tr key={row.year} className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50/50 transition-colors">
                  <td className="py-2 px-3 text-xs font-semibold text-neutral-500 border-r border-neutral-100">{label}</td>
                  <td className="py-2 px-3 text-sm text-neutral-600 border-r border-neutral-100">{fmtNum(row.propertyValue)}</td>
                  <td className="py-2 px-3 text-sm text-neutral-600 border-r border-neutral-100">{fmtNum(row.loanBalance)}</td>
                  <td className="py-2 px-3 text-sm text-neutral-600 border-r border-neutral-100">{fmtNum(row.equity)}</td>
                  <td className="py-2 px-3 text-sm text-neutral-600 border-r border-neutral-100">
                    {row.year === 0 ? '—' : fmtNum(row.netCashflow)}
                  </td>
                  <td className="py-2 px-3 text-sm text-neutral-600">
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
      {/* Sub-tab navigation */}
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

      {/* Tab content */}
      {subTab === 'purchase' && purchaseTab}
      {subTab === 'hold' && holdTab}
      {subTab === 'performance' && performanceTab}
    </div>
  )
}
