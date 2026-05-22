import React, { useState, useMemo, useCallback } from 'react'
import { ChevronRight, ChevronDown, Plus, X } from 'lucide-react'
import { ChartCard } from './ui/ChartCard'
import { CHART_COLORS } from '../constants/chartColors'
import { useScenarioSave } from '../contexts/ScenarioSaveContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import type { ExistingProperty } from '../types/existingProperty'
import { createDefaultExistingProperty } from '../types/existingProperty'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const fmtK = (v: number) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${abs}`
}

const deriveMetrics = (p: ExistingProperty) => {
  const equity = p.currentValue - p.loan
  const annualRent = p.rentPerWeek * 52
  const interest = p.loan * (p.interestRate / 100)
  const mgmt = annualRent * (p.propertyMgmtPercent / 100)
  const totalExpenses = interest + mgmt + p.councilWater + p.insurance + p.maintenance
  const netCashflow = annualRent - totalExpenses
  const capitalGrowth = p.currentValue - p.purchasePrice
  const growthPercent = p.purchasePrice > 0 ? (capitalGrowth / p.purchasePrice) * 100 : 0
  const yearsHeld = new Date().getFullYear() - p.boughtYear
  const lvr = p.currentValue > 0 ? (p.loan / p.currentValue) * 100 : 0
  const releasableEquity = Math.max(0, p.currentValue * 0.8 - p.loan)
  const totalCapitalIn = p.stampDuty + p.legals + p.buildingPest + p.baFee + p.cashDeposit
  const roc = totalCapitalIn > 0 ? (equity / totalCapitalIn) * 100 : 0
  return { equity, annualRent, interest, mgmt, totalExpenses, netCashflow, capitalGrowth, growthPercent, yearsHeld, lvr, releasableEquity, totalCapitalIn, roc }
}

const PropertyDetailPanel: React.FC<{ property: ExistingProperty }> = ({ property }) => {
  const m = deriveMetrics(property)
  return (
    <div className="grid grid-cols-3 gap-4 p-5 border-t border-gray-200">
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">One-off Purchase Costs</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Purchase price</span><span className="text-gray-900">{fmt(property.purchasePrice)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Stamp duty</span><span className="text-gray-900">{fmt(property.stampDuty)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Legals + conveyancing</span><span className="text-gray-900">{fmt(property.legals)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Building + pest</span><span className="text-gray-900">{fmt(property.buildingPest)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">BA fee</span><span className="text-gray-900">{fmt(property.baFee)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Cash deposit</span><span className="text-gray-900">{fmt(property.cashDeposit)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="text-gray-900 font-medium">Total capital in</span><span className="text-gray-900 font-medium">{fmt(m.totalCapitalIn)}</span></div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Yearly Cash In & Out</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Rental income</span><span className="text-blue-600 font-medium">+{fmt(m.annualRent)}</span></div>
          <div className="flex justify-between">
            <span className="text-gray-600">Interest ({property.loanType} {property.interestRate}%)</span>
            <span className="text-gray-900">–{fmt(m.interest)}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-600">Property mgmt ({property.propertyMgmtPercent}%)</span><span className="text-gray-900">–{fmt(m.mgmt)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Council + water</span><span className="text-gray-900">–{fmt(property.councilWater)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Insurance</span><span className="text-gray-900">–{fmt(property.insurance)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Maintenance</span><span className="text-gray-900">–{fmt(property.maintenance)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="text-gray-900 font-medium">Net cashflow</span>
            <span className={`font-medium ${m.netCashflow >= 0 ? 'text-blue-600' : 'text-gray-500'}`}>
              {m.netCashflow >= 0 ? '+' : ''}{fmt(m.netCashflow)}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Performance To Date</h4>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Capital growth</span>
            <span className={`font-medium ${m.capitalGrowth >= 0 ? 'text-blue-600' : 'text-gray-500'}`}>
              {m.capitalGrowth >= 0 ? '+' : ''}{fmt(m.capitalGrowth)}
            </span>
          </div>
          <div className="flex justify-between"><span className="text-gray-600">Growth %</span><span className={`font-medium ${m.growthPercent >= 0 ? 'text-blue-600' : 'text-gray-500'}`}>+{m.growthPercent.toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Years held</span><span className="text-gray-900">{m.yearsHeld} yrs</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Equity Now</div>
            <div className="text-base font-semibold text-gray-900">{fmt(m.equity)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">LVR</div>
            <div className="text-base font-semibold text-gray-900">{m.lvr.toFixed(0)}%</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Releasable @ 80%</div>
            <div className="text-base font-semibold text-gray-900">{fmtK(m.releasableEquity)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">ROC</div>
            <div className="text-base font-semibold text-gray-900">{m.roc.toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const PortfolioTab: React.FC = () => {
  const { existingProperties, setExistingProperties } = useScenarioSave()
  const { updateProfile } = useInvestmentProfile()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const properties = existingProperties

  const syncAggregates = useCallback((props: ExistingProperty[]) => {
    const totalDebt = props.reduce((s, p) => s + p.loan, 0)
    const totalValue = props.reduce((s, p) => s + p.currentValue, 0)
    updateProfile({ currentDebt: totalDebt, portfolioValue: totalValue })
  }, [updateProfile])

  const handleAdd = useCallback(() => {
    const newProp = createDefaultExistingProperty()
    const next = [...existingProperties, newProp]
    setExistingProperties(next)
    syncAggregates(next)
    setExpandedId(newProp.id)
  }, [existingProperties, setExistingProperties, syncAggregates])

  const handleRemove = useCallback((id: string) => {
    const next = existingProperties.filter(p => p.id !== id)
    setExistingProperties(next)
    syncAggregates(next)
    if (expandedId === id) setExpandedId(null)
  }, [existingProperties, setExistingProperties, syncAggregates, expandedId])

  const handleUpdate = useCallback((id: string, updates: Partial<ExistingProperty>) => {
    const next = existingProperties.map(p => p.id === id ? { ...p, ...updates } : p)
    setExistingProperties(next)
    if ('loan' in updates || 'currentValue' in updates) {
      syncAggregates(next)
    }
  }, [existingProperties, setExistingProperties, syncAggregates])

  const portfolioMetrics = useMemo(() => {
    const combinedValue = properties.reduce((s, p) => s + p.currentValue, 0)
    const totalEquity = properties.reduce((s, p) => s + (p.currentValue - p.loan), 0)
    const totalCashflow = properties.reduce((s, p) => s + deriveMetrics(p).netCashflow, 0)
    const releasableEquity = properties.reduce((s, p) => s + deriveMetrics(p).releasableEquity, 0)
    return { combinedValue, totalEquity, totalCashflow, releasableEquity }
  }, [properties])

  const capitalCompData = useMemo(() =>
    properties.map(p => ({
      name: p.address ? (p.address.split(' ').slice(1).join(' ').substring(0, 12) || p.address.substring(0, 12)) : `${p.state} ${p.boughtYear}`,
      loanBalance: p.loan,
      equity: p.currentValue - p.loan,
    })),
    [properties]
  )

  const incomeExpenseData = useMemo(() =>
    properties.map(p => {
      const m = deriveMetrics(p)
      return {
        name: p.address ? (p.address.split(' ').slice(1).join(' ').substring(0, 12) || p.address.substring(0, 12)) : `${p.state} ${p.boughtYear}`,
        rentalIncome: m.annualRent,
        expenses: -m.totalExpenses,
      }
    }),
    [properties]
  )

  const borrowableEquityData = useMemo(() => {
    const totalNewDebt = properties.reduce((s, p) => s + p.currentValue * 0.8, 0)
    const currentDebt = properties.reduce((s, p) => s + p.loan, 0)
    const borrowable = Math.max(0, totalNewDebt - currentDebt)
    return { totalNewDebt, currentDebt, borrowable }
  }, [properties])

  const waterfallData = useMemo(() => [
    { name: 'New debt @ 80%', value: borrowableEquityData.totalNewDebt, fill: CHART_COLORS.lineBlue },
    { name: 'Current debt', value: -borrowableEquityData.currentDebt, fill: CHART_COLORS.barNegative },
    { name: 'Borrowable equity', value: borrowableEquityData.borrowable, fill: CHART_COLORS.linePurple },
  ], [borrowableEquityData])

  if (properties.length === 0) {
    return (
      <ChartCard title="Existing Properties" flush>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-gray-500 mb-4">
            No existing properties yet — add via chat or manually below.
          </p>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add existing property
          </button>
        </div>
      </ChartCard>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#717680]">Combined Value</span>
          </div>
          <div className="mt-0.5">
            <span className="text-lg font-medium text-[#181D27] tracking-tight">{fmtK(portfolioMetrics.combinedValue)}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#717680]">Total Equity</span>
          </div>
          <div className="mt-0.5">
            <span className="text-lg font-medium text-[#181D27] tracking-tight">{fmtK(portfolioMetrics.totalEquity)}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#717680]">Annual Cashflow</span>
          </div>
          <div className="mt-0.5">
            <span className={`text-lg font-medium tracking-tight ${portfolioMetrics.totalCashflow >= 0 ? 'text-[#181D27]' : 'text-gray-500'}`}>
              {portfolioMetrics.totalCashflow >= 0 ? '+' : ''}{fmtK(portfolioMetrics.totalCashflow)}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#717680]">Releasable Equity</span>
          </div>
          <div className="mt-0.5">
            <span className="text-lg font-medium text-[#181D27] tracking-tight">{fmtK(portfolioMetrics.releasableEquity)}</span>
          </div>
        </div>
      </div>

      {/* ── EXISTING PROPERTIES TABLE ── */}
      <ChartCard title="Existing Properties" flush>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8 py-1.5 px-3 border-r border-gray-100"></th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Address</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">State</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Bought</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Purchase</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Current</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Loan</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Rent/wk</th>
              <th className="text-left text-[11px] font-medium text-gray-400 py-1.5 px-3 border-r border-gray-100">Yield</th>
              <th className="w-8 py-1.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {properties.map(p => {
              const isExpanded = expandedId === p.id
              return (
                <React.Fragment key={p.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''}`}
                  >
                    <td className="py-1.5 px-3 text-gray-400 border-r border-gray-100">
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td className="py-1.5 px-3 font-medium text-gray-600 border-r border-gray-100">{p.address || '(no address)'}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{p.state}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{p.boughtYear}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{fmt(p.purchasePrice)}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{fmt(p.currentValue)}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{fmt(p.loan)}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">${p.rentPerWeek}</td>
                    <td className="py-1.5 px-3 text-gray-600 border-r border-gray-100">{p.yield.toFixed(1)}%</td>
                    <td className="py-1.5 px-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(p.id) }}
                        className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="p-0 bg-white">
                        <PropertyDetailPanel property={p} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 py-3 px-3 transition-colors"
        >
          <Plus size={14} />
          Add existing property
        </button>
      </ChartCard>

      {/* ── PORTFOLIO ANALYTICS ── */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Capital Composition" legend={[
          { color: CHART_COLORS.lineBlue, label: 'Loan balance' },
          { color: CHART_COLORS.linePurple, label: 'Equity' },
        ]}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={capitalCompData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#717680' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#717680' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtK(v)} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="loanBalance" name="Loan balance" fill={CHART_COLORS.lineBlue} radius={[2, 2, 0, 0]} barSize={28} />
              <Bar dataKey="equity" name="Equity" fill={CHART_COLORS.linePurple} radius={[2, 2, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Income vs Expenses · Per Property" legend={[
          { color: CHART_COLORS.lineBlue, label: 'Rental income' },
          { color: CHART_COLORS.barNegative, label: 'Expenses + repayments' },
        ]}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={incomeExpenseData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#717680' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#717680' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtK(v)} />
              <Tooltip formatter={(v: number) => fmt(Math.abs(v as number))} />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Bar dataKey="rentalIncome" name="Rental income" fill={CHART_COLORS.lineBlue} radius={[2, 2, 0, 0]} barSize={28} />
              <Bar dataKey="expenses" name="Expenses + repayments" fill={CHART_COLORS.barNegative} radius={[0, 0, 2, 2]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Borrowable Equity · Portfolio-wide">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={waterfallData} barSize={80}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#717680' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#717680' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtK(v)} />
            <Tooltip formatter={(v: number) => fmt(Math.abs(v as number))} />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {waterfallData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center text-sm text-gray-600 mt-2">
          {fmtK(borrowableEquityData.borrowable)} accessible for the next acquisition
        </div>
      </ChartCard>
    </div>
  )
}
