import React, { useState, useMemo, useCallback } from 'react'
import { Plus, X, Home } from 'lucide-react'
import { ChartCard } from './ui/ChartCard'
import { useScenarioSave } from '../contexts/ScenarioSaveContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import type { ExistingProperty } from '../types/existingProperty'
import { createDefaultExistingProperty } from '../types/existingProperty'
import {
  BarChart as RechartsBarChart, Bar, XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

const UUI = {
  brand700: '#6941C6',
  brand600: '#7F56D9',
  brand500: '#9E77ED',
  brand300: '#D6BBFB',
  brand200: '#E9D7FE',
  neutral500: '#737373',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
} as const

const fmt = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const formatCompact = (v: number): string => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString()}`
  return `${sign}$${Math.round(abs)}`
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

// ── Inline cell components (matching PropertyCardRow style) ─────────────────

const cellInput = 'w-full bg-transparent text-xs text-neutral-600 py-1 px-1 border-0 outline-none rounded hover:bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-colors'
const numInput = `${cellInput} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const PRODUCT_OPTIONS = [
  { value: 'IO', label: 'IO' },
  { value: 'PI', label: 'P&I' },
]
const GROWTH_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Med' },
  { value: 'Low', label: 'Low' },
]

const NumCell: React.FC<{
  value: number
  onChange: (v: number) => void
}> = ({ value, onChange }) => (
  <input
    type="number"
    value={value || ''}
    onChange={e => onChange(Number(e.target.value))}
    className={numInput}
  />
)

const SelectCell: React.FC<{
  value: string
  options: { value: string; label: string }[] | string[]
  onChange: (v: string) => void
}> = ({ value, options, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`${cellInput} cursor-pointer`}
  >
    {options.map(opt => {
      const v = typeof opt === 'string' ? opt : opt.value
      const l = typeof opt === 'string' ? opt : opt.label
      return <option key={v} value={v}>{l}</option>
    })}
  </select>
)

const TextCell: React.FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
}> = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className={cellInput}
  />
)

const ReadonlyCell: React.FC<{ text: string }> = ({ text }) => (
  <span className="text-xs text-neutral-600">{text}</span>
)

// ── Column definitions ──────────────────────────────────────────────────────

interface Column {
  key: string
  header: string
  render: (p: ExistingProperty, onChange: (id: string, updates: Partial<ExistingProperty>) => void) => React.ReactNode
}

const COLUMNS: Column[] = [
  {
    key: 'address', header: 'Address',
    render: (p, onChange) => <TextCell value={p.address} onChange={v => onChange(p.id, { address: v })} placeholder="Enter address" />,
  },
  {
    key: 'year', header: 'Year',
    render: (p, onChange) => <NumCell value={p.boughtYear} onChange={v => onChange(p.id, { boughtYear: v })} />,
  },
  {
    key: 'state', header: 'State',
    render: (p, onChange) => <SelectCell value={p.state} options={STATE_OPTIONS} onChange={v => onChange(p.id, { state: v })} />,
  },
  {
    key: 'purchase', header: 'Purchase ($)',
    render: (p, onChange) => <NumCell value={p.purchasePrice} onChange={v => onChange(p.id, { purchasePrice: v })} />,
  },
  {
    key: 'current', header: 'Current ($)',
    render: (p, onChange) => <NumCell value={p.currentValue} onChange={v => onChange(p.id, { currentValue: v })} />,
  },
  {
    key: 'loan', header: 'Loan ($)',
    render: (p, onChange) => <NumCell value={p.loan} onChange={v => onChange(p.id, { loan: v })} />,
  },
  {
    key: 'lvr', header: 'LVR (%)',
    render: (p) => {
      const lvr = p.currentValue > 0 ? (p.loan / p.currentValue * 100) : 0
      return <ReadonlyCell text={lvr > 0 ? `${lvr.toFixed(0)}` : '—'} />
    },
  },
  {
    key: 'rate', header: 'Rate (%)',
    render: (p, onChange) => <NumCell value={p.interestRate} onChange={v => onChange(p.id, { interestRate: v })} />,
  },
  {
    key: 'product', header: 'Product',
    render: (p, onChange) => <SelectCell value={p.loanType} options={PRODUCT_OPTIONS} onChange={v => onChange(p.id, { loanType: v as 'IO' | 'PI' })} />,
  },
  {
    key: 'rent', header: 'Rent/wk ($)',
    render: (p, onChange) => <NumCell value={p.rentPerWeek} onChange={v => onChange(p.id, { rentPerWeek: v })} />,
  },
  {
    key: 'yield', header: 'Yield (%)',
    render: (p) => {
      const y = p.purchasePrice > 0 ? ((p.rentPerWeek * 52) / p.purchasePrice * 100).toFixed(1) : '0.0'
      return <ReadonlyCell text={`${y}%`} />
    },
  },
  {
    key: 'mgmt', header: 'Mgmt (%)',
    render: (p, onChange) => <NumCell value={p.propertyMgmtPercent} onChange={v => onChange(p.id, { propertyMgmtPercent: v })} />,
  },
  {
    key: 'council', header: 'Council ($)',
    render: (p, onChange) => <NumCell value={p.councilWater} onChange={v => onChange(p.id, { councilWater: v })} />,
  },
  {
    key: 'ins', header: 'Ins ($)',
    render: (p, onChange) => <NumCell value={p.insurance} onChange={v => onChange(p.id, { insurance: v })} />,
  },
  {
    key: 'maint', header: 'Maint ($)',
    render: (p, onChange) => <NumCell value={p.maintenance} onChange={v => onChange(p.id, { maintenance: v })} />,
  },
  {
    key: 'engage', header: 'Engage ($)',
    render: (p, onChange) => <NumCell value={p.baFee} onChange={v => onChange(p.id, { baFee: v })} />,
  },
  {
    key: 'inspect', header: 'Inspect ($)',
    render: (p, onChange) => <NumCell value={p.buildingPest} onChange={v => onChange(p.id, { buildingPest: v })} />,
  },
  {
    key: 'convey', header: 'Convey ($)',
    render: (p, onChange) => <NumCell value={p.legals} onChange={v => onChange(p.id, { legals: v })} />,
  },
  {
    key: 'growth', header: 'Growth',
    render: (p, onChange) => <SelectCell value={p.growthAssumption ?? 'Medium'} options={GROWTH_OPTIONS} onChange={v => onChange(p.id, { growthAssumption: v as 'High' | 'Medium' | 'Low' })} />,
  },
  {
    key: 'saleYear', header: 'Sale Yr',
    render: (p, onChange) => <NumCell value={p.saleYear ?? 0} onChange={v => onChange(p.id, { saleYear: v || null })} />,
  },
]

// ── Component ───────────────────────────────────────────────────────────────

interface PortfolioTabProps {}

export const PortfolioTab: React.FC<PortfolioTabProps> = () => {
  const { existingProperties, setExistingProperties } = useScenarioSave()
  const { updateProfile } = useInvestmentProfile()
  const properties = existingProperties

  const syncAggregates = useCallback((props: ExistingProperty[]) => {
    const totalDebt = props.reduce((s, p) => s + p.loan, 0)
    const totalValue = props.reduce((s, p) => s + p.currentValue, 0)
    const existingAnnualRent = props.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0)
    updateProfile({ currentDebt: totalDebt, portfolioValue: totalValue, existingAnnualRent })
  }, [updateProfile])

  const handleAdd = useCallback(() => {
    const newProp = createDefaultExistingProperty()
    const next = [...existingProperties, newProp]
    setExistingProperties(next)
    syncAggregates(next)
  }, [existingProperties, setExistingProperties, syncAggregates])

  const handleRemove = useCallback((id: string) => {
    const next = existingProperties.filter(p => p.id !== id)
    setExistingProperties(next)
    syncAggregates(next)
  }, [existingProperties, setExistingProperties, syncAggregates])

  const handleUpdate = useCallback((id: string, updates: Partial<ExistingProperty>) => {
    const next = existingProperties.map(p => p.id === id ? { ...p, ...updates } : p)
    setExistingProperties(next)
    if ('loan' in updates || 'currentValue' in updates || 'rentPerWeek' in updates) {
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
    { name: 'New debt @ 80%', value: borrowableEquityData.totalNewDebt, fill: UUI.brand600 },
    { name: 'Current debt', value: -borrowableEquityData.currentDebt, fill: UUI.brand300 },
    { name: 'Borrowable equity', value: borrowableEquityData.borrowable, fill: UUI.brand500 },
  ], [borrowableEquityData])

  if (properties.length === 0) {
    return (
      <div className="border border-[#E9EAEB] rounded-xl">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-12 h-12 rounded-lg border border-[#E9EAEB] shadow-xs flex items-center justify-center mb-4">
            <Home size={24} className="text-[#717680]" />
          </div>
          <h3 className="text-base font-semibold text-[#181D27] mb-1">
            No existing properties
          </h3>
          <p className="text-sm text-[#717680] text-center mb-6 max-w-xs">
            Add your current properties to build a complete portfolio plan.
          </p>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-[#535862] hover:text-[#181D27] transition-colors"
          >
            <Plus size={16} />
            Add existing property
          </button>
        </div>
      </div>
    )
  }

  const kpiCards = (
    <div className="grid grid-cols-4 gap-3">
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Combined Value</span>
        </div>
        <div className="mt-0.5">
          <span className="text-lg font-medium text-[#181D27] tracking-tight">{formatCompact(portfolioMetrics.combinedValue)}</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Total Equity</span>
        </div>
        <div className="mt-0.5">
          <span className="text-lg font-medium text-[#181D27] tracking-tight">{formatCompact(portfolioMetrics.totalEquity)}</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Annual Cashflow</span>
        </div>
        <div className="mt-0.5">
          <span className={`text-lg font-medium tracking-tight ${portfolioMetrics.totalCashflow >= 0 ? 'text-[#181D27]' : 'text-gray-500'}`}>
            {portfolioMetrics.totalCashflow >= 0 ? '+' : ''}{formatCompact(portfolioMetrics.totalCashflow)}
          </span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-[#E9EAEB] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#717680]">Releasable Equity</span>
        </div>
        <div className="mt-0.5">
          <span className="text-lg font-medium text-[#181D27] tracking-tight">{formatCompact(portfolioMetrics.releasableEquity)}</span>
        </div>
      </div>
    </div>
  )

  const propertiesTable = (
    <ChartCard title="Existing Properties" flush action={
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <Plus size={14} />
        Add property
      </button>
    }>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: 1600, tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-neutral-200">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap ${
                    i < COLUMNS.length - 1 ? 'border-r border-neutral-100' : ''
                  }`}
                  title={col.key === 'saleYear' ? 'CGT applied at 22.5% of capital gain (personal entity, >12mo hold, 50% discount). Entity-aware rates coming.' : undefined}
                >
                  {col.header}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {properties.map(p => (
              <tr key={p.id} className="border-b border-neutral-200 last:border-b-0">
                {COLUMNS.map((col, i) => (
                  <td
                    key={col.key}
                    className={`py-1 px-3 ${
                      i < COLUMNS.length - 1 ? 'border-r border-neutral-100' : ''
                    }`}
                  >
                    {col.render(p, handleUpdate)}
                  </td>
                ))}
                <td className="py-1 px-1">
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="p-1 text-neutral-300 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                    title="Remove property"
                  >
                    <X size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )

  return (
    <div className="flex flex-col gap-6">
      {kpiCards}
      {propertiesTable}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="Capital Composition" legend={[
          { color: UUI.brand200, label: 'Loan balance' },
          { color: UUI.brand600, label: 'Equity' },
        ]}>
          <ResponsiveContainer width="100%" height={180}>
            <RechartsBarChart data={capitalCompData} barGap={4} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={UUI.neutral100} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: UUI.neutral500 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="loanBalance" name="Loan balance" fill={UUI.brand200} radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false} />
              <Bar dataKey="equity" name="Equity" fill={UUI.brand600} radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Income vs Expenses" legend={[
          { color: UUI.brand600, label: 'Rental income' },
          { color: UUI.brand300, label: 'Expenses + repayments' },
        ]}>
          <ResponsiveContainer width="100%" height={180}>
            <RechartsBarChart data={incomeExpenseData} barGap={4} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={UUI.neutral100} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: UUI.neutral500 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip formatter={(v: number) => fmt(Math.abs(v as number))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke={UUI.neutral200} />
              <Bar dataKey="rentalIncome" name="Rental income" fill={UUI.brand600} radius={[4, 4, 0, 0]} barSize={24} isAnimationActive={false} />
              <Bar dataKey="expenses" name="Expenses + repayments" fill={UUI.brand300} radius={[0, 0, 4, 4]} barSize={24} isAnimationActive={false} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Borrowable Equity" legend={[
          { color: UUI.brand600, label: 'New debt @ 80%' },
          { color: UUI.brand300, label: 'Current debt' },
          { color: UUI.brand500, label: 'Borrowable' },
        ]}>
          <ResponsiveContainer width="100%" height={180}>
            <RechartsBarChart data={waterfallData} barSize={48} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={UUI.neutral100} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: UUI.neutral500 }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip formatter={(v: number) => fmt(Math.abs(v as number))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke={UUI.neutral200} />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                {waterfallData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-neutral-500 mt-1">
            {formatCompact(borrowableEquityData.borrowable)} accessible for the next acquisition
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
