import React from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Home } from 'lucide-react'
import { getPropertyIcon } from './icons/PropertyIcons'
import { calculateDetailedCashflow } from '../utils/detailedCashflowCalculator'
import { EQUITY_EXTRACTION_LVR_CAP } from '../constants/financialParams'
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors'
import type { PerPropertyProjection, TimelinePropertyData } from '../utils/perPropertyProjections'
import type { PropertyInstanceDetails } from '../types/propertyInstance'

// --- Types ---

interface PortfolioPropertySlice {
  title: string
  state: string
  purchasePrice: number
  rentPerWeek: number
  affordableYear: number
  lvr: number
  loanProduct: string
  interestRate: number
  loanAmount: number
  propertyTypeKey: string
}

interface OwnedPropertyCardProps {
  property: PortfolioPropertySlice
  projection: PerPropertyProjection
  propInstance: PropertyInstanceDetails
  timelineData: TimelinePropertyData
  trackingState: { photo?: string; address?: string } | null
  propertyImage: string | undefined
}

// --- Formatting helpers ---

const formatExact = (value: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatPct = (value: number) => `${value.toFixed(1)}%`

const formatYAxis = (value: number) => {
  if (value === 0) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`
  return `${sign}$${abs}`
}

const colorClass = (value: number) => (value >= 0 ? 'text-green-600' : 'text-red-500')

// --- Component ---

export const OwnedPropertyCard: React.FC<OwnedPropertyCardProps> = ({
  property,
  projection,
  propInstance,
  timelineData,
  trackingState,
  propertyImage,
}) => {
  // Itemised yr1 cashflow breakdown
  const yr1Breakdown = calculateDetailedCashflow(propInstance, timelineData.loanAmount)

  // Year snapshots
  const yr1 = projection.yearRows[0]
  const yr3 = projection.yearRows[2]
  const yr5 = projection.yearRows[4]
  const yr10 = projection.yearRows[9]

  // Releasable equity for Portfolio Impact card
  const releasableEquity = Math.max(0, yr5.propertyValue * EQUITY_EXTRACTION_LVR_CAP - yr5.loanBalance)

  // Initial property value (valuation at purchase, or purchase price as fallback)
  const initialValue = propInstance.valuationAtPurchase || timelineData.cost
  const initialEquity = initialValue - timelineData.loanAmount

  // Chart data
  const equityChartData = [
    { year: '0', equity: initialEquity },
    ...projection.equityOverTime.map(e => ({ year: String(e.year), equity: e.equity })),
  ]

  const cashflowChartData = projection.cashflowOverTime.map(cf => ({
    year: String(cf.year),
    netCashflow: cf.netCashflow,
  }))

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* ── Section 1: Property context bar ─────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
          {React.createElement(getPropertyIcon(property.propertyTypeKey), { size: 16, className: 'text-[#535862]' })}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-gray-700 truncate block">{trackingState?.address || property.title}</span>
          <span className="text-[10px] text-gray-400">{property.state} · Purchased {property.affordableYear} · {formatExact(property.purchasePrice)}</span>
        </div>
      </div>

      {/* ── Section 2: KPI Metric Strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-100 border-b border-gray-100">
        {[
          { label: 'Total Performance Yr 1', value: formatExact(yr1.totalPerformance), sub: 'Growth + net cashflow', raw: yr1.totalPerformance },
          { label: 'Net Cashflow Yr 1', value: formatExact(yr1.netCashflow), sub: `${formatExact(Math.round(yr1.netCashflow / 52))}/wk`, raw: yr1.netCashflow },
          { label: 'Cash on Cash Yr 5', value: formatPct(yr5.cocReturnCumulative), raw: yr5.cocReturnCumulative },
          { label: 'Return on Capital Yr 5', value: formatPct(yr5.roic), raw: yr5.roic },
          { label: 'Capital Returned In', value: `${projection.capitalReturnedInYears} ${projection.capitalReturnedInYears === 1 ? 'year' : 'years'}`, sub: 'Equity exceeds cash invested', raw: 1 },
        ].map(m => (
          <div key={m.label} className="bg-white px-4 py-3">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">{m.label}</div>
            <div className={`text-lg font-semibold ${colorClass(m.raw)}`}>{m.value}</div>
            {m.sub && <div className="text-[11px] text-gray-400 mt-0.5">{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Section 3: Three-Card Mid Row ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Card A: Annual Cashflow */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Annual Cashflow</h5>

          {/* Cash In */}
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Cash In</div>
          <div className="space-y-1 mb-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Gross rental income</span>
              <span className="text-xs font-medium text-green-600">{formatExact(yr1Breakdown.grossAnnualIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Vacancy ({propInstance.vacancyRate}%)</span>
              <span className="text-xs font-medium text-gray-700">{formatExact(-yr1Breakdown.vacancyAmount)}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 my-2" />

          {/* Cash Out */}
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Cash Out</div>
          <div className="space-y-1">
            {[
              { label: 'Interest', value: yr1Breakdown.loanInterest },
              { label: `Property mgmt (${propInstance.propertyManagementPercent}%)`, value: yr1Breakdown.propertyManagementFee },
              { label: 'Insurance', value: yr1Breakdown.buildingInsurance },
              { label: 'Council + water rates', value: yr1Breakdown.councilRatesWater },
              { label: 'Strata', value: yr1Breakdown.strata },
              { label: 'Maintenance', value: yr1Breakdown.maintenance },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className={`text-xs font-medium ${item.value > 0 ? 'text-red-500' : 'text-gray-700'}`}>
                  {item.value > 0 ? `-${formatExact(item.value)}` : formatExact(item.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Net */}
          <div className="flex justify-between mt-3 pt-3 border-t-2 border-gray-200">
            <span className={`text-xs font-semibold ${colorClass(yr1.netCashflow)}`}>
              Net: {formatExact(yr1.netCashflow)}
            </span>
            <span className={`text-xs font-semibold ${colorClass(yr1.netCashflow)}`}>
              {formatExact(Math.round(yr1.netCashflow / 52))}/wk
            </span>
          </div>
        </div>

        {/* Card B: Equity Growth */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Equity Growth</h5>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={equityChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...CHART_STYLE.grid} />
              <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
              <YAxis tickFormatter={formatYAxis} {...CHART_STYLE.yAxis} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: '6px', fontSize: '11px' }}
                formatter={(value: number) => formatExact(value)}
              />
              <Bar dataKey="equity" fill={CHART_COLORS.barPrimary} radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-[11px] text-gray-400 mt-1 px-1">
            <span>{formatExact(equityChartData[0].equity)}</span>
            <span>{formatExact(equityChartData[equityChartData.length - 1].equity)}</span>
          </div>
        </div>

        {/* Card C: Net Cashflow Trajectory */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Net Cashflow Trajectory</h5>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={cashflowChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...CHART_STYLE.grid} />
              <XAxis dataKey="year" {...CHART_STYLE.xAxis} />
              <YAxis tickFormatter={formatYAxis} {...CHART_STYLE.yAxis} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: '6px', fontSize: '11px' }}
                formatter={(value: number) => formatExact(value)}
              />
              <Bar dataKey="netCashflow" radius={[3, 3, 0, 0]} maxBarSize={24}>
                {cashflowChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.netCashflow >= 0 ? CHART_COLORS.barPrimary : CHART_COLORS.barNegative} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 px-1">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CHART_COLORS.barNegative }} /> Negative
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CHART_COLORS.barPrimary }} /> Positive
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 4: Year-by-Year Projections Table ──────────────────── */}
      <div className="px-5 py-4 border-t border-gray-100">
        <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Year-by-Year Projections</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 pr-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Year</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Property Value</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Loan Balance</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Equity</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Capital Growth</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Net Cashflow</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Cashflow (cumul.)</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Total Performance</th>
                <th className="text-right py-2 pl-2 font-semibold text-gray-500 uppercase text-[10px] tracking-wide">ROIC</th>
              </tr>
            </thead>
            <tbody>
              {/* Purchase row */}
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-3 font-semibold text-gray-500">Purchase</td>
                <td className="text-right py-2 px-2 font-medium text-gray-700">{formatExact(initialValue)}</td>
                <td className="text-right py-2 px-2 font-medium text-gray-700">{formatExact(timelineData.loanAmount)}</td>
                <td className="text-right py-2 px-2 font-medium text-gray-700">{formatExact(initialEquity)}</td>
                <td className="text-right py-2 px-2 text-gray-400">—</td>
                <td className="text-right py-2 px-2 text-gray-400">—</td>
                <td className="text-right py-2 px-2 text-gray-400">—</td>
                <td className="text-right py-2 px-2 text-gray-400">—</td>
                <td className="text-right py-2 pl-2 text-gray-400">—</td>
              </tr>

              {/* Year rows */}
              {projection.yearRows.map(row => {
                const isHighlighted = row.year === 5 || row.year === 10
                return (
                  <tr key={row.year} className={`border-b border-gray-100 ${isHighlighted ? 'bg-blue-50/40' : ''}`}>
                    <td className="py-2 pr-3 font-semibold text-gray-500">{row.year}</td>
                    <td className="text-right py-2 px-2 font-medium text-gray-700">{formatExact(row.propertyValue)}</td>
                    <td className="text-right py-2 px-2 font-medium text-gray-700">{formatExact(row.loanBalance)}</td>
                    <td className="text-right py-2 px-2 font-medium text-gray-700">{formatExact(row.equity)}</td>
                    <td className={`text-right py-2 px-2 font-medium ${colorClass(row.capitalGrowthAnnual)}`}>{formatExact(row.capitalGrowthAnnual)}</td>
                    <td className={`text-right py-2 px-2 font-medium ${colorClass(row.netCashflow)}`}>{formatExact(row.netCashflow)}</td>
                    <td className={`text-right py-2 px-2 font-medium ${colorClass(row.netCashflowCumulative)}`}>{formatExact(row.netCashflowCumulative)}</td>
                    <td className={`text-right py-2 px-2 font-medium ${colorClass(row.totalPerformance)}`}>{formatExact(row.totalPerformance)}</td>
                    <td className={`text-right py-2 pl-2 font-medium ${colorClass(row.roic)}`}>{formatPct(row.roic)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 5: Bottom Row — 3 Summary Cards ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-5 pb-5">
        {/* Cash on Cash Return */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Cash on Cash Return</h5>
          <div className="space-y-1.5">
            {[
              { label: 'Year 1', value: yr1.cocReturnCumulative },
              { label: 'Year 3', value: yr3.cocReturnCumulative },
              { label: 'Year 5', value: yr5.cocReturnCumulative },
              { label: 'Year 10', value: yr10.cocReturnCumulative },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className={`text-xs font-semibold ${colorClass(r.value)}`}>{formatPct(r.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yield Progression */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Yield Progression</h5>
          <div className="space-y-1.5">
            {[
              { label: 'Gross yr 1', value: yr1.grossYieldPct },
              { label: 'Net yr 1', value: yr1.propertyValue > 0 ? (yr1.netCashflow / yr1.propertyValue) * 100 : 0 },
              { label: 'Gross yr 5', value: yr5.grossYieldPct },
              { label: 'Net yr 10', value: yr10.propertyValue > 0 ? (yr10.netCashflow / yr10.propertyValue) * 100 : 0 },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className={`text-xs font-semibold ${r.value < 0 ? 'text-red-500' : 'text-gray-900'}`}>{formatPct(r.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Impact */}
        <div className="border-2 border-blue-500 rounded-lg p-4">
          <h5 className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-3">Portfolio Impact</h5>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Cash consumed</span>
              <span className="text-xs font-semibold text-gray-900">{formatExact(projection.totalCashInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Equity at yr 5</span>
              <span className="text-xs font-semibold text-green-600">{formatExact(yr5.equity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Releasable equity (80%)</span>
              <span className="text-xs font-semibold text-green-600">{formatExact(releasableEquity)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t-2 border-blue-500">
            <div className="flex justify-between">
              <span className="text-xs font-semibold text-blue-600">Funds for next purchase</span>
              <span className="text-sm font-bold text-green-600">{formatExact(releasableEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
