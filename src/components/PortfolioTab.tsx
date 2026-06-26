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

const formatCompact = (v: number): string => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString()}`
  return `${sign}$${Math.round(abs)}`
}

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
}> = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : (value || '')}
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
      className={numInput}
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
    key: 'growth', header: 'Growth',
    render: (p, onChange) => <SelectCell value={p.growthAssumption ?? 'Medium'} options={GROWTH_OPTIONS} onChange={v => onChange(p.id, { growthAssumption: v as 'High' | 'Medium' | 'Low' })} />,
  },
  {
    key: 'entity', header: 'Entity',
    render: (p, onChange) => <SelectCell value={p.entity ?? 'individual'} options={[{value:'individual',label:'Indiv.'},{value:'trust',label:'Trust'},{value:'company',label:'Co.'},{value:'smsf',label:'SMSF'}]} onChange={v => onChange(p.id, { entity: v as any })} />,
  },
  {
    key: 'isNewBuild', header: 'Type',
    render: (p, onChange) => <SelectCell value={p.isNewBuild ? 'new' : 'established'} options={[{value:'established',label:'Estab.'},{value:'new',label:'New build'}]} onChange={v => onChange(p.id, { isNewBuild: v === 'new' })} />,
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
    render: (p, onChange) => {
      const computed = p.currentValue > 0 ? parseFloat((p.loan / p.currentValue * 100).toFixed(0)) : 0
      const display = p.lvrOverride ?? computed
      return <NumCell value={display} onChange={v => onChange(p.id, { lvrOverride: v || null })} />
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
    key: 'ioTerm', header: 'IO Term',
    render: (p, onChange) => <NumCell value={p.ioTermYears ?? 5} onChange={v => onChange(p.id, { ioTermYears: v })} />,
  },
  {
    key: 'rent', header: 'Rent/wk ($)',
    render: (p, onChange) => <NumCell value={p.rentPerWeek} onChange={v => onChange(p.id, { rentPerWeek: v })} />,
  },
  {
    key: 'yield', header: 'Yield (%)',
    render: (p, onChange) => {
      const computed = p.purchasePrice > 0 ? parseFloat(calcGrossYield(p.rentPerWeek, p.purchasePrice).toFixed(1)) : 0
      const display = p.yieldOverride ?? computed
      return <NumCell value={display} onChange={v => onChange(p.id, { yieldOverride: v || null })} />
    },
  },
  // Annual holding cost + one-off purchase costs, rolled up to match the
  // purchases table. Editing stores an override; components stay untouched.
  {
    key: 'holdingCost', header: 'Holding $/yr',
    render: (p, onChange) => {
      const mgmtDollar = (p.propertyMgmtPercent / 100) * calcAnnualRent(p.rentPerWeek)
      const computed = Math.round(mgmtDollar + p.insurance + p.councilWater + (p.strata ?? 0) + p.maintenance)
      const display = p.holdingCostOverride ?? computed
      return <NumCell value={display} onChange={v => onChange(p.id, { holdingCostOverride: v || null })} />
    },
  },
  {
    key: 'purchaseCosts', header: 'Purchase Costs',
    render: (p, onChange) => {
      const computed = Math.round(p.baFee + p.buildingPest + p.legals)
      const display = p.purchaseCostsOverride ?? computed
      return <NumCell value={display} onChange={v => onChange(p.id, { purchaseCostsOverride: v || null })} />
    },
  },
  {
    key: 'saleYear', header: 'Sell',
    render: (p, onChange) => <SaleYearTogglePortfolio value={p.saleYear} onChange={v => onChange(p.id, { saleYear: v })} />,
  },
  {
    key: 'allowEquityRelease', header: 'Refinance',
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
    const totalEquity = properties.reduce((s, p) => s + (p.currentValue - p.loan), 0)
    const totalCashflow = properties.reduce((s, p) => s + deriveMetrics(p).netCashflow, 0)
    const releasableEquity = properties.reduce((s, p) => s + deriveMetrics(p).releasableEquity, 0)
    return { combinedValue, totalEquity, totalCashflow, releasableEquity }
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
        <table className="w-full text-xs" style={{ minWidth: 1400, tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-neutral-200">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-neutral-500 py-2 px-3 whitespace-nowrap ${
                    i < COLUMNS.length - 1 ? 'border-r border-neutral-100' : ''
                  }`}
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
              <tr key={p.id} className="border-b border-neutral-200 last:border-b-0">
                {COLUMNS.map((col, i) => (
                  <td
                    key={col.key}
                    className={`py-1 px-3 ${
                      i < COLUMNS.length - 1 ? 'border-r border-neutral-100' : ''
                    }`}
                  >
                    {col.key === 'saleYear'
                      ? <SaleYearTogglePortfolio value={p.saleYear} onChange={v => handleUpdate(p.id, { saleYear: v })} estimate={cgtById[p.id]} />
                      : col.render(p, handleUpdate)}
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
