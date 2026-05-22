import React, { useMemo, useState } from 'react'
import { Target } from 'lucide-react'
import { ChartCard } from './ui/ChartCard'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { calculatePerPropertyProjection, type TimelinePropertyData } from '../utils/perPropertyProjections'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { GROWTH_RATE_TIERS } from '../constants/financialParams'
import { CHART_COLORS } from '../constants/chartColors'
import type { GrowthCurve } from '../types/property'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const fmtK = (v: number) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${abs}`
}

const MiniBarChart: React.FC<{
  data: { year: number; value: number }[];
  colorPositive: string;
  colorNegative: string;
}> = ({ data, colorPositive, colorNegative }) => {
  const [hovered, setHovered] = useState<number | null>(null)
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1)

  return (
    <div>
      <div className="flex items-end gap-1 h-20 relative">
        {data.map((d, i) => {
          const height = Math.max(3, (Math.abs(d.value) / maxAbs) * 72)
          return (
            <div
              key={i}
              className="flex-1 relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
            >
              <div
                className={`w-full rounded-sm ${d.value >= 0 ? colorPositive : colorNegative}`}
                style={{ height: `${height}px` }}
              />
              {hovered === i && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                  Yr {d.year}: {fmt(d.value)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((_, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 5 === 0 && <span className="text-[8px] text-gray-400">{i}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export const BriefTab: React.FC = () => {
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Target size={48} className="mb-4 text-gray-300" />
        <p className="text-sm">No properties in the plan yet — add one via chat to see the brief.</p>
      </div>
    )
  }

  const state = instanceData.state
  const year = Math.floor(nextProp.affordableYear)
  const price = nextProp.cost
  const lvr = instanceData.lvr
  const growthY1 = growthCurve.year1
  const rent = instanceData.rentPerWeek
  const deposit = nextProp.depositRequired
  const loan = nextProp.loanAmount
  const totalCapital = nextProp.totalCashRequired
  const cashPortion = nextProp.fundingBreakdown?.cash ?? deposit
  const savingsPortion = nextProp.fundingBreakdown?.savings ?? 0
  const totalHoldingCosts = cashflow.totalOperatingExpenses + cashflow.totalNonDeductibleExpenses
  const rentCoverage = totalHoldingCosts > 0 ? Math.round((cashflow.adjustedIncome / totalHoldingCosts) * 100) : 0
  const holdingGap = cashflow.netAnnualCashflow

  const cfPositiveYear = (() => {
    const row = projection.cashflowOverTime.find(d => d.netCashflow >= 0)
    return row ? row.year : null
  })()

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Next Purchase — combined banner + funding */}
      <ChartCard title="Next Purchase">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-medium text-gray-900 mb-0.5">
              {state} · {year} · {fmt(price)}
            </h2>
            <p className="text-xs text-gray-500">
              {lvr}% LVR · {growthY1.toFixed(1)}% Y1 growth · ${rent}/wk rent
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-400 tracking-wide">Deposit</div>
            <div className="text-sm font-medium text-gray-900">{fmt(deposit)}</div>
            <div className="text-[10px] text-gray-400 tracking-wide mt-1.5">Loan</div>
            <div className="text-sm font-medium text-gray-900">{fmt(loan)}</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-sm font-medium text-gray-900 mb-0.5">{fmt(totalCapital)}</div>
          <p className="text-xs text-gray-500 mb-2.5">Total capital required at settlement</p>

          {/* Stacked bar */}
          <div className="h-3 rounded-full overflow-hidden flex mb-2.5" style={{ maxWidth: 420 }}>
            {cashPortion > 0 && (
              <div
                className="bg-blue-500"
                style={{ width: `${(cashPortion / totalCapital) * 100}%` }}
              />
            )}
            {savingsPortion > 0 && (
              <div
                style={{ width: `${Math.max((savingsPortion / totalCapital) * 100, 8)}%`, backgroundColor: CHART_COLORS.linePurple }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-500">Cash deposit</span>
              <span className="font-medium text-gray-700">{fmt(cashPortion)}</span>
            </div>
            {savingsPortion > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.linePurple }} />
                <span className="text-gray-500">Savings buildup</span>
                <span className="font-medium text-gray-700">{fmt(savingsPortion)}</span>
              </div>
            )}
          </div>
        </div>
      </ChartCard>

      {/* 3. Year-by-Year Projections */}
      <ChartCard title="Year-by-Year Projections" flush>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Year</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Value</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Loan</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Equity</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Net CF</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3">RoIC</th>
            </tr>
          </thead>
          <tbody>
            {keyRows.map((row) => {
              const label = row.year === 0 ? 'Purchase' : `Year ${row.year}`
              return (
                <tr key={row.year} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="py-1.5 px-3 font-medium text-gray-600 border-r border-gray-100">{label}</td>
                  <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{fmt(row.propertyValue)}</td>
                  <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{fmt(row.loanBalance)}</td>
                  <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{fmt(row.equity)}</td>
                  <td className={`py-1.5 px-3 border-r border-gray-100 ${row.netCashflow >= 0 ? 'text-blue-500' : 'text-gray-500'}`}>
                    {row.year === 0 ? '—' : fmt(row.netCashflow)}
                  </td>
                  <td className="py-1.5 px-3 text-gray-600">
                    {row.year === 0 ? '—' : `${row.roic.toFixed(1)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ChartCard>

      {/* 4. Net Cashflow Trajectory + Equity Growth — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <ChartCard title="Net Cashflow Trajectory · Yr 1–20">
          <MiniBarChart
            data={projection.cashflowOverTime.slice(0, 20).map(d => ({ year: d.year, value: d.netCashflow }))}
            colorPositive="bg-blue-500"
            colorNegative="bg-gray-300"
          />
        </ChartCard>

        <ChartCard title="Equity Growth · Yr 0 → 20">
          <MiniBarChart
            data={projection.equityOverTime.slice(0, 21).map(d => ({ year: d.year, value: d.equity }))}
            colorPositive="bg-blue-500"
            colorNegative="bg-blue-500"
          />
        </ChartCard>
      </div>

      {/* 5. What It Costs To Hold */}
      <ChartCard title="What It Costs To Hold" action={
        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <span>Year 1</span>
        </div>
      }>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`text-lg font-medium ${holdingGap >= 0 ? 'text-blue-500' : 'text-gray-700'}`}>
              {holdingGap >= 0 ? '+' : ''}{fmt(holdingGap)} /yr
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Gap after rent · rent covers {rentCoverage}% of holding costs
            </p>

            {/* Coverage bar */}
            <div className="mt-3" style={{ maxWidth: 420 }}>
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>$0</span>
                <span>Yearly costs: {fmt(totalHoldingCosts)}</span>
              </div>
              <div className="h-6 rounded-full overflow-hidden flex bg-gray-200">
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-[10px] font-medium px-2"
                  style={{ width: `${Math.min(rentCoverage, 100)}%` }}
                >
                  Rent {fmtK(cashflow.adjustedIncome)}
                </div>
                {holdingGap < 0 && (
                  <div className="flex-1 flex items-center justify-end text-[10px] font-medium text-gray-600 px-2">
                    Gap {fmtK(holdingGap)}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] mt-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-blue-500" />
                  <span className="text-gray-500">Covered by rent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-gray-200 border border-gray-300" />
                  <span className="text-gray-500">Out of pocket</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coverage gauge */}
          <div className="text-right ml-6">
            <div className="text-[10px] text-gray-400 tracking-wide mb-0.5">Coverage</div>
            <div className={`text-lg font-medium ${rentCoverage >= 100 ? 'text-blue-500' : 'text-blue-500'}`}>
              {rentCoverage}%
            </div>
            {cfPositiveYear && (
              <div className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                CF positive {cfPositiveYear}
              </div>
            )}
          </div>
        </div>

        {/* Cost breakdown tiles */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-gray-400 tracking-wide mb-0.5">Interest</div>
            <div className="text-sm font-medium text-gray-700">{fmt(cashflow.loanInterest)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-gray-400 tracking-wide mb-0.5">Council + Water</div>
            <div className="text-sm font-medium text-gray-700">{fmt(cashflow.councilRatesWater)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-gray-400 tracking-wide mb-0.5">Insurance + Maint</div>
            <div className="text-sm font-medium text-gray-700">{fmt(cashflow.buildingInsurance + cashflow.maintenance)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-gray-400 tracking-wide mb-0.5">Property Mgmt</div>
            <div className="text-sm font-medium text-gray-700">{fmt(cashflow.propertyManagementFee)}</div>
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
