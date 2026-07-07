import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, X, Home, CalendarDays } from 'lucide-react'
import { ChartCard } from './ui/ChartCard'
import { useScenarioSave } from '../contexts/ScenarioSaveContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useChangeReceipt } from '../contexts/ChangeReceiptContext'
import type { ExistingProperty } from '../types/existingProperty'
import { createDefaultExistingProperty } from '../types/existingProperty'
import { calcGrossYield, calcAnnualRent, calcReleasableEquity } from '../utils/sharedFinancialCalcs'
import { usePortfolioProjection } from '../hooks/usePortfolioProjection'
import { parseShorthandNumber } from '../utils/parseShorthandNumber'
import {
  BarChart as RechartsBarChart, Bar, XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

const UUI = {
  brand700: '#6D28D9',
  brand600: '#7C3AED',
  brand500: '#8B5CF6',
  brand300: '#DDD6FE',
  brand200: '#EDE9FE',
  neutral500: '#717680',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
} as const

const fmt = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

// KPI values compact like the prototype: $1.77M / $550k / +$6.4k/yr / $196k
const fmtKpi = (v: number): string => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${abs < 10_000 ? (abs / 1_000).toFixed(1) : Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

const formatCompact = (v: number): string => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString()}`
  return `${sign}$${Math.round(abs)}`
}

// Full, un-abbreviated currency for the portfolio KPI bar: $1,200,000 (not $1.2M)
const fmtFull = (v: number): string => {
  const sign = v < 0 ? '-' : ''
  return `${sign}$${Math.round(Math.abs(v)).toLocaleString('en-AU')}`
}

// LVR cap used for releasable-equity headroom (mirrors calcReleasableEquity).
const RELEASABLE_LVR = 80

const deriveMetrics = (p: ExistingProperty) => {
  const equity = p.currentValue - p.loan
  const annualRent = calcAnnualRent(p.rentPerWeek)
  const interest = p.loan * (p.interestRate / 100)
  const mgmt = annualRent * (p.propertyMgmtPercent / 100)
  const holdingCosts = p.holdingCostOverride ?? (mgmt + p.councilWater + p.insurance + (p.strata ?? 0) + p.maintenance)
  const totalExpenses = interest + holdingCosts
  const netCashflow = annualRent - totalExpenses
  const capitalGrowth = p.currentValue - p.purchasePrice
  const growthPercent = p.purchasePrice > 0 ? (capitalGrowth / p.purchasePrice) * 100 : 0
  const yearsHeld = new Date().getFullYear() - p.boughtYear
  const lvr = p.currentValue > 0 ? (p.loan / p.currentValue) * 100 : 0
  const releasableEquity = calcReleasableEquity(p.currentValue, p.loan, 0.8)
  const purchaseCosts = p.purchaseCostsOverride ?? (p.legals + p.buildingPest + p.baFee)
  const totalCapitalIn = p.stampDuty + p.cashDeposit + purchaseCosts
  const roc = totalCapitalIn > 0 ? (equity / totalCapitalIn) * 100 : 0
  return { equity, annualRent, interest, mgmt, totalExpenses, netCashflow, capitalGrowth, growthPercent, yearsHeld, lvr, releasableEquity, totalCapitalIn, roc }
}

// ── Inline cell components (matching PropertyCardRow style) ─────────────────

const cellInput = 'w-full bg-transparent text-xs text-[#535862] py-1 px-1 border-0 outline-none rounded hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 transition-colors'
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
  /** Comma-group the displayed number when not editing (money columns) */
  grouped?: boolean
  /** Right-align (all numerics except Year, per the prototype) */
  right?: boolean
}> = ({ value, onChange, grouped, right }) => {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  const display = value ? (grouped ? value.toLocaleString('en-AU') : value) : ''
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : display}
      onFocus={() => { setFocused(true); setDraft(value ? String(value) : '') }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false)
        if (draft.trim() === '') {
          if (value) onChange(0)
          return
        }
        const n = parseShorthandNumber(draft)
        if (n !== null && n !== value) onChange(n)
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className={`${numInput} ${right ? 'text-center' : ''}`}
    />
  )
}

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

const CheckboxCell: React.FC<{
  checked: boolean
  onChange: (v: boolean) => void
}> = ({ checked, onChange }) => (
  <div className="flex justify-center">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-300 cursor-pointer"
    />
  </div>
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

// ── Sale year toggle ────────────────────────────────────────────────────────

const SaleYearTogglePortfolio: React.FC<{
  value: number | null | undefined
  onChange: (v: number | null) => void
  estimate?: { cgt: number; netProceeds: number } | null
}> = ({ value, onChange, estimate }) => {
  const isOn = !!value && value > 0
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = () => {
    if (isOn) {
      onChange(null)
      setOpen(false)
    } else {
      setDraft(String(new Date().getFullYear() + 10))
      setOpen(true)
    }
  }

  const handleConfirm = () => {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n > 2000) {
      onChange(n)
      // Keep the popover open so the freshly-computed "Est. CGT · Net proceeds"
      // estimate is visible immediately on setting the sale year (it only exists
      // once a sale year is set). User dismisses by clicking away.
    }
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        className={`relative w-7 h-4 rounded-full transition-colors ${isOn ? 'bg-violet-500' : 'bg-neutral-200'}`}
        style={{ flexShrink: 0 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-3' : ''}`}
        />
      </button>
      {isOn && (
        <button
          type="button"
          onClick={() => { setDraft(String(value)); setOpen(true) }}
          className="text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          {value}
        </button>
      )}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 flex flex-col gap-1.5" style={{ minWidth: 180 }}>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-neutral-400 flex-shrink-0" />
            <input
              type="number"
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') setOpen(false) }}
              className="w-16 text-xs border border-neutral-200 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-violet-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="Year"
            />
            <button
              type="button"
              onClick={handleConfirm}
              className="text-xs font-medium text-white bg-violet-500 hover:bg-violet-600 rounded px-2 py-1 transition-colors cursor-pointer border-none"
            >
              Set
            </button>
          </div>
          {isOn && estimate && (
            <div className="text-[10px] text-neutral-500 leading-snug border-t border-neutral-100 pt-1.5">
              Est. CGT <span className="text-neutral-700 font-medium">{fmt(estimate.cgt)}</span> · Net proceeds <span className="text-neutral-700 font-medium">{fmt(estimate.netProceeds)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Column definitions ──────────────────────────────────────────────────────

interface Column {
  key: string
  header: string
  render: (p: ExistingProperty, onChange: (id: string, updates: Partial<ExistingProperty>) => void) => React.ReactNode
  /** Right-align header + cell content (numeric columns, per the prototype) */
  align?: 'right'
  /** Fixed column width (tableLayout: fixed) */
  width?: number
}

const COLUMNS: Column[] = [
  {
    key: 'address', width: 140, header: 'Address',
    render: (p, onChange) => <TextCell value={p.address} onChange={v => onChange(p.id, { address: v })} placeholder="Enter address" />,
  },
  {
    key: 'year', width: 72, header: 'Year',
    render: (p, onChange) => <NumCell value={p.boughtYear} onChange={v => onChange(p.id, { boughtYear: v })} />,
  },
  {
    key: 'growth', width: 84, header: 'Growth',
    render: (p, onChange) => <SelectCell value={p.growthAssumption ?? 'Medium'} options={GROWTH_OPTIONS} onChange={v => onChange(p.id, { growthAssumption: v as 'High' | 'Medium' | 'Low' })} />,
  },
  {
    key: 'entity', width: 84, header: 'Entity',
    render: (p, onChange) => <SelectCell value={p.entity ?? 'individual'} options={[{value:'individual',label:'Indiv.'},{value:'trust',label:'Trust'},{value:'company',label:'Co.'},{value:'smsf',label:'SMSF'}]} onChange={v => onChange(p.id, { entity: v as any })} />,
  },
  {
    key: 'isNewBuild', width: 92, header: 'Type',
    render: (p, onChange) => <SelectCell value={p.isNewBuild ? 'new' : 'established'} options={[{value:'established',label:'Estab.'},{value:'new',label:'New build'}]} onChange={v => onChange(p.id, { isNewBuild: v === 'new' })} />,
  },
  {
    key: 'state', width: 80, header: 'State',
    render: (p, onChange) => <SelectCell value={p.state} options={STATE_OPTIONS} onChange={v => onChange(p.id, { state: v })} />,
  },
  {
    key: 'purchase', width: 94, header: 'Purchase ($)', align: 'right',
    render: (p, onChange) => <NumCell right grouped value={p.purchasePrice} onChange={v => onChange(p.id, { purchasePrice: v })} />,
  },
  {
    key: 'current', width: 94, header: 'Current ($)', align: 'right',
    render: (p, onChange) => <NumCell right grouped value={p.currentValue} onChange={v => onChange(p.id, { currentValue: v })} />,
  },
  {
    key: 'loan', width: 94, header: 'Loan ($)', align: 'right',
    render: (p, onChange) => <NumCell right grouped value={p.loan} onChange={v => onChange(p.id, { loan: v })} />,
  },
  {
    key: 'lvr', width: 64, header: 'LVR (%)', align: 'right',
    render: (p, onChange) => {
      const computed = p.currentValue > 0 ? parseFloat((p.loan / p.currentValue * 100).toFixed(0)) : 0
      const display = p.lvrOverride ?? computed
      return <NumCell right value={display} onChange={v => onChange(p.id, { lvrOverride: v || null })} />
    },
  },
  {
    key: 'rate', width: 70, header: 'Rate (%)', align: 'right',
    render: (p, onChange) => <NumCell right value={p.interestRate} onChange={v => onChange(p.id, { interestRate: v })} />,
  },
  {
    key: 'product', width: 66, header: 'Product',
    render: (p, onChange) => <SelectCell value={p.loanType} options={PRODUCT_OPTIONS} onChange={v => onChange(p.id, { loanType: v as 'IO' | 'PI' })} />,
  },
  {
    key: 'ioTerm', width: 64, header: 'IO Term', align: 'right',
    render: (p, onChange) => <NumCell right value={p.ioTermYears ?? 5} onChange={v => onChange(p.id, { ioTermYears: v })} />,
  },
  {
    key: 'rent', width: 78, header: 'Rent/wk ($)', align: 'right',
    render: (p, onChange) => <NumCell right value={p.rentPerWeek} onChange={v => onChange(p.id, { rentPerWeek: v })} />,
  },
  {
    key: 'yield', width: 66, header: 'Yield (%)', align: 'right',
    render: (p, onChange) => {
      const computed = p.purchasePrice > 0 ? parseFloat(calcGrossYield(p.rentPerWeek, p.purchasePrice).toFixed(1)) : 0
      const display = p.yieldOverride ?? computed
      return <NumCell right value={display} onChange={v => onChange(p.id, { yieldOverride: v || null })} />
    },
  },
  // Annual holding cost + one-off purchase costs, rolled up to match the
  // purchases table. Editing stores an override; components stay untouched.
  {
    key: 'holdingCost', width: 86, header: 'Holding $/yr', align: 'right',
    render: (p, onChange) => {
      const mgmtDollar = (p.propertyMgmtPercent / 100) * calcAnnualRent(p.rentPerWeek)
      const computed = Math.round(mgmtDollar + p.insurance + p.councilWater + (p.strata ?? 0) + p.maintenance)
      const display = p.holdingCostOverride ?? computed
      return <NumCell right grouped value={display} onChange={v => onChange(p.id, { holdingCostOverride: v || null })} />
    },
  },
  {
    key: 'purchaseCosts', width: 92, header: 'Purchase Costs', align: 'right',
    render: (p, onChange) => {
      const computed = Math.round(p.baFee + p.buildingPest + p.legals)
      const display = p.purchaseCostsOverride ?? computed
      return <NumCell right grouped value={display} onChange={v => onChange(p.id, { purchaseCostsOverride: v || null })} />
    },
  },
  {
    key: 'saleYear', width: 90, header: 'Sell',
    render: (p, onChange) => <SaleYearTogglePortfolio value={p.saleYear} onChange={v => onChange(p.id, { saleYear: v })} />,
  },
  {
    key: 'allowEquityRelease', width: 72, header: 'Refinance',
    render: (p, onChange) => <CheckboxCell checked={p.allowEquityRelease !== false} onChange={v => onChange(p.id, { allowEquityRelease: v })} />,
  },
]

// ── Component ───────────────────────────────────────────────────────────────

interface PortfolioTabProps {}

export const PortfolioTab: React.FC<PortfolioTabProps> = () => {
  const { existingProperties, setExistingProperties } = useScenarioSave()
  const { updateProfile } = useInvestmentProfile()
  const { notifyEdit } = useChangeReceipt()
  const { salesCgtBreakdown } = usePortfolioProjection()
  const properties = existingProperties

  const syncAggregates = useCallback((props: ExistingProperty[]) => {
    const totalDebt = props.reduce((s, p) => s + p.loan, 0)
    const totalValue = props.reduce((s, p) => s + p.currentValue, 0)
    const existingAnnualRent = props.reduce((s, p) => s + (p.rentPerWeek || 0) * 52, 0)
    updateProfile({ currentDebt: totalDebt, portfolioValue: totalValue, existingAnnualRent })
  }, [updateProfile])

  // Subject for the change log's cause line — address if the BA entered one
  const changeLogSubject = (p: ExistingProperty) =>
    p.address?.trim() || `${p.state} property (${p.boughtYear})`

  const handleAdd = useCallback(() => {
    notifyEdit('existing-portfolio', 'Existing property added')
    const newProp = createDefaultExistingProperty()
    const next = [...existingProperties, newProp]
    setExistingProperties(next)
    syncAggregates(next)
  }, [existingProperties, setExistingProperties, syncAggregates, notifyEdit])

  const handleRemove = useCallback((id: string) => {
    const prop = existingProperties.find(p => p.id === id)
    notifyEdit('existing-portfolio', prop ? `${changeLogSubject(prop)} removed` : 'Existing property removed')
    const next = existingProperties.filter(p => p.id !== id)
    setExistingProperties(next)
    syncAggregates(next)
  }, [existingProperties, setExistingProperties, syncAggregates, notifyEdit])

  const handleUpdate = useCallback((id: string, updates: Partial<ExistingProperty>) => {
    const prop = existingProperties.find(p => p.id === id)
    const key = Object.keys(updates)[0] as keyof ExistingProperty | undefined
    notifyEdit('existing-portfolio', prop && key ? {
      subject: changeLogSubject(prop),
      fieldLabel: COLUMNS.find(c => c.key === key)?.header ?? key,
      from: prop[key],
      to: updates[key],
    } : undefined)
    const next = existingProperties.map(p => p.id === id ? { ...p, ...updates } : p)
    setExistingProperties(next)
    if ('loan' in updates || 'currentValue' in updates || 'rentPerWeek' in updates) {
      syncAggregates(next)
    }
  }, [existingProperties, setExistingProperties, syncAggregates, notifyEdit])

  const portfolioMetrics = useMemo(() => {
    const combinedValue = properties.reduce((s, p) => s + p.currentValue, 0)
    const totalLoan = properties.reduce((s, p) => s + p.loan, 0)
    const totalEquity = properties.reduce((s, p) => s + (p.currentValue - p.loan), 0)
    const totalCashflow = properties.reduce((s, p) => s + deriveMetrics(p).netCashflow, 0)
    const releasableEquity = properties.reduce((s, p) => s + deriveMetrics(p).releasableEquity, 0)
    const portfolioLvr = combinedValue > 0 ? (totalLoan / combinedValue) * 100 : 0
    return { combinedValue, totalLoan, totalEquity, totalCashflow, releasableEquity, portfolioLvr }
  }, [properties])

  // CGT + net proceeds per sale (2027 basis), sourced from the projection engine.
  // Keyed by property id so the Sell control can show the estimate inline.
  const cgtById = useMemo(() => {
    const m: Record<string, { cgt: number; netProceeds: number }> = {}
    salesCgtBreakdown.forEach(r => { m[r.id] = { cgt: r.cgt, netProceeds: r.netProceeds } })
    return m
  }, [salesCgtBreakdown])

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
    { name: 'New debt @ 80%', value: borrowableEquityData.totalNewDebt, fill: '#8B5CF6' },
    { name: 'Current debt', value: -borrowableEquityData.currentDebt, fill: '#D9D2F2' },
    { name: 'Borrowable equity', value: borrowableEquityData.borrowable, fill: '#8B5CF6' },
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

  // Single segmented KPI bar (§3.10 / prototype) — one card, divided into 6.
  // Full (un-abbreviated) figures per request: $1,200,000 rather than $1.2M.
  const kpiCards = (
    <div className="grid grid-cols-6 bg-white rounded-xl border border-[#E9EAEB] divide-x divide-[#E9EAEB]">
      <div className="px-[18px] py-4">
        <span className="text-xs text-[#717680]">Portfolio value</span>
        <div className="mt-2">
          <span className="text-[18px] font-semibold whitespace-nowrap text-[#181D27] tracking-[-0.02em] leading-none">{fmtFull(portfolioMetrics.combinedValue)}</span>
        </div>
      </div>
      <div className="px-[18px] py-4">
        <span className="text-xs text-[#717680]">Loan balance</span>
        <div className="mt-2">
          <span className="text-[18px] font-semibold whitespace-nowrap text-[#181D27] tracking-[-0.02em] leading-none">{fmtFull(portfolioMetrics.totalLoan)}</span>
        </div>
      </div>
      <div className="px-[18px] py-4">
        <span className="text-xs text-[#717680]">Portfolio LVR</span>
        <div className="mt-2">
          <span className="text-[18px] font-semibold whitespace-nowrap text-[#181D27] tracking-[-0.02em] leading-none">{portfolioMetrics.portfolioLvr.toFixed(1)}%</span>
        </div>
      </div>
      <div className="px-[18px] py-4">
        <span className="text-xs text-[#717680]">Cashflow</span>
        <div className="mt-2">
          <span className="text-[18px] font-semibold whitespace-nowrap text-[#181D27] tracking-[-0.02em] leading-none">
            {portfolioMetrics.totalCashflow >= 0 ? '+' : ''}{fmtFull(portfolioMetrics.totalCashflow)}/yr
          </span>
        </div>
      </div>
      <div className="px-[18px] py-4">
        <span className="text-xs text-[#717680]">Equity</span>
        <div className="mt-2">
          <span className="text-[18px] font-semibold whitespace-nowrap text-[#181D27] tracking-[-0.02em] leading-none">{fmtFull(portfolioMetrics.totalEquity)}</span>
        </div>
      </div>
      <div className="px-[18px] py-4">
        <span className="text-xs text-[#717680]">Releasable equity @ {RELEASABLE_LVR}% LVR</span>
        <div className="mt-2">
          <span className="text-[18px] font-semibold whitespace-nowrap text-[#181D27] tracking-[-0.02em] leading-none">{fmtFull(portfolioMetrics.releasableEquity)}</span>
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
      <div className="px-5 pb-5">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: 1620, tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-[#E9EAEB]">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  className={`text-[11px] font-medium text-[#717680] py-2.5 px-3 whitespace-nowrap ${col.align === 'right' ? 'text-center' : 'text-left'} ${i > 0 ? 'border-l border-[#F2F4F7]' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  title={col.key === 'saleYear' ? 'CGT rate varies by entity: Individual/Trust use marginal rate with CGT discount, Company uses flat rate (no discount), SMSF uses 15% with 33.3% discount. Configurable in Assumptions.' : col.key === 'allowEquityRelease' ? 'When checked, this property\'s equity can be released to fund new purchases. Uncheck to exclude.' : col.key === 'isNewBuild' ? 'New build vs established. New builds can elect the 50% CGT discount; established properties use cost-base indexation plus a 30% minimum tax. Affects the CGT estimate at sale.' : undefined}
                >
                  {col.header}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {properties.map(p => (
              <tr key={p.id} className="border-b border-[#F2F2F2] last:border-b-0 hover:bg-[#FAFAFA] transition-colors">
                {COLUMNS.map((col, i) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 align-middle ${i > 0 ? 'border-l border-[#F2F4F7]' : ''}`}
                  >
                    {col.key === 'saleYear'
                      ? <SaleYearTogglePortfolio value={p.saleYear} onChange={v => handleUpdate(p.id, { saleYear: v })} estimate={cgtById[p.id]} />
                      : col.render(p, handleUpdate)}
                  </td>
                ))}
                <td className="py-1 px-1">
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="p-1 text-[#C4B5FD] hover:text-[#7C3AED] transition-colors bg-transparent border-none cursor-pointer"
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
      </div>
    </ChartCard>
  )

  return (
    <div className="flex flex-col gap-6">
      {kpiCards}
      {propertiesTable}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="Capital Composition" legendBelow legend={[
          { color: '#D9D2F2', label: 'Loan balance', variant: 'square' },
          { color: '#8B5CF6', label: 'Equity', variant: 'square' },
        ]}>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={capitalCompData} barGap={10} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 400, fill: '#A1A1AA' }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke="#E4E7EC" />
              <Bar dataKey="loanBalance" name="Loan balance" fill="#D9D2F2" radius={[2, 2, 0, 0]} barSize={28} isAnimationActive={false} />
              <Bar dataKey="equity" name="Equity" fill="#8B5CF6" radius={[2, 2, 0, 0]} barSize={28} isAnimationActive={false} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Income vs Expenses" legendBelow legend={[
          { color: '#8B5CF6', label: 'Rental income', variant: 'square' },
          { color: '#D9D2F2', label: 'Expenses + repayments', variant: 'square' },
        ]}>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={incomeExpenseData} barGap={10} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 400, fill: '#A1A1AA' }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip formatter={(v: number) => fmt(Math.abs(v as number))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke="#D5D5DB" />
              <Bar dataKey="rentalIncome" name="Rental income" fill="#8B5CF6" radius={[2, 2, 0, 0]} barSize={28} isAnimationActive={false} />
              <Bar dataKey="expenses" name="Expenses + repayments" fill="#D9D2F2" radius={[0, 0, 2, 2]} barSize={28} isAnimationActive={false} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Borrowable Equity" legendBelow legend={[
          { color: '#8B5CF6', label: 'New debt @ 80%', variant: 'square' },
          { color: '#D9D2F2', label: 'Current debt', variant: 'square' },
        ]}>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={waterfallData} barSize={48} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 400, fill: '#A1A1AA' }} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip formatter={(v: number) => fmt(Math.abs(v as number))} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke="#D5D5DB" />
              <Bar dataKey="value" radius={[2, 2, 2, 2]} isAnimationActive={false}>
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
