import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { ChartCard } from './ui/ChartCard'
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile'
import type { InvestmentProfileData } from '@/hooks/useInvestmentProfile'
import { track, EVENTS } from '@/lib/analytics'
import { usePropertySelection } from '@/contexts/PropertySelectionContext'
import type { EventCategory, EventType } from '@/contexts/PropertySelectionContext'
import { getEventLabel, EVENT_TYPES } from '@/constants/eventTypes'
import { EventTypeIcon } from '@/utils/eventIcons'
import { EventConfigModal } from './EventConfigModal'
import { PERIODS_PER_YEAR, BASE_YEAR } from '@/constants/financialParams'
import { parseShorthandNumber } from '@/utils/parseShorthandNumber'

const fmtNum = (v: number) => Math.round(v).toLocaleString('en-AU')

const periodToYear = (period: number): number =>
  BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR)

// ── Read-only row ───────────────────────────────────────────────────────────

// PropPath Client Inputs record rows — label #535862 / value #181D27 right-
// aligned, #F2F2F2 dividers, no vertical rule. The one derived row (Usable
// equity) gets weight 600 + a #FAFAFA band.
const KVRow: React.FC<{
  label: string
  value: string | number
  bold?: boolean
}> = ({ label, value, bold }) => (
  <tr className={`border-b border-[#F2F2F2] last:border-b-0 ${bold ? 'bg-[#FAFAFA]' : ''}`}>
    <td className={`py-[10px] pl-[18px] pr-3 text-[13px] ${bold ? 'font-semibold' : 'font-normal'} text-[#535862] whitespace-nowrap`}>{label}</td>
    <td className={`py-[10px] pr-[18px] pl-3 text-[13px] text-right ${bold ? 'font-semibold' : 'font-normal'} text-[#181D27]`}>{value}</td>
  </tr>
)

// ── Editable number row ─────────────────────────────────────────────────────

const EditableNumRow: React.FC<{
  label: string
  value: number
  field: keyof InvestmentProfileData
  decimals?: number
  prefix?: string
  suffix?: string
  /** If true, stores as decimal (÷100) but displays as percentage */
  isDecimalPercent?: boolean
}> = ({ label, value, field, decimals, prefix, suffix, isDecimalPercent }) => {
  const { updateProfile } = useInvestmentProfile()
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  const displayVal = isDecimalPercent
    ? (value * 100).toFixed(decimals ?? 1)
    : decimals !== undefined
      ? value.toFixed(decimals)
      : fmtNum(value)

  const display = `${prefix ?? ''}${displayVal}${suffix ?? ''}`

  return (
    <tr className="border-b border-[#F2F2F2] last:border-b-0">
      <td className="py-[10px] pl-[18px] pr-3 text-[13px] font-normal text-[#535862] whitespace-nowrap">{label}</td>
      <td className="py-[5px] pr-[14px] pl-2">
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : display}
          onFocus={() => {
            setFocused(true)
            setDraft(isDecimalPercent ? (value * 100).toFixed(decimals ?? 1) : String(value))
          }}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false)
            const n = parseShorthandNumber(draft)
            if (n !== null) {
              const stored = isDecimalPercent ? n / 100 : n
              if (stored !== value) {
                updateProfile({ [field]: stored } as Partial<InvestmentProfileData>)
                track(EVENTS.tableCellEdited, { table: 'client_inputs', field: String(field) })
              }
            }
          }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-full bg-transparent outline-none rounded px-1 py-[5px] text-[13px] text-right text-[#181D27] hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 transition-colors"
        />
      </td>
    </tr>
  )
}

// ── Editable select row ─────────────────────────────────────────────────────

const EditableSelectRow: React.FC<{
  label: string
  value: string
  field: keyof InvestmentProfileData
  options: { value: string; label: string }[]
}> = ({ label, value, field, options }) => {
  const { updateProfile } = useInvestmentProfile()

  return (
    <tr className="border-b border-[#F2F2F2] last:border-b-0">
      <td className="py-[10px] pl-[18px] pr-3 text-[13px] font-normal text-[#535862] whitespace-nowrap">{label}</td>
      <td className="py-[5px] pr-[14px] pl-2">
        <select
          value={value}
          onChange={e => {
            updateProfile({ [field]: e.target.value } as Partial<InvestmentProfileData>)
            track(EVENTS.tableCellEdited, { table: 'client_inputs', field: String(field) })
          }}
          className="w-full bg-transparent outline-none rounded px-1 py-[5px] text-[13px] text-right text-[#181D27] hover:bg-[#F4F4F5] focus:bg-white focus:ring-1 focus:ring-violet-300 transition-colors cursor-pointer"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
    </tr>
  )
}

// ── Options ─────────────────────────────────────────────────────────────────

const STRATEGY_OPTIONS = [
  { value: 'eg-low', label: 'Equity growth (low entry)' },
  { value: 'eg-high', label: 'Equity growth (high entry)' },
  { value: 'cf-low', label: 'Cashflow (low entry)' },
  { value: 'cf-high', label: 'Cashflow (high entry)' },
  { value: 'commercial-transition', label: 'Commercial transition' },
  { value: 'eg-to-cf', label: 'Growth to cash flow' },
]

const PACING_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
]

const LVR_STRATEGY_OPTIONS = [
  { value: 'client_comfort', label: 'Client comfort' },
  { value: 'prudent_80', label: 'Prudent 80%' },
  { value: 'custom', label: 'Custom' },
]

// ── Main component ──────────────────────────────────────────────────────────

export const ClientInputsTab: React.FC = () => {
  const { profile, calculatedValues } = useInvestmentProfile()
  const { eventBlocks, removeEvent } = usePropertySelection()
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventCategory, setEventCategory] = useState<EventCategory>('income')
  const [eventInitialType, setEventInitialType] = useState<EventType | undefined>(undefined)
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)

  const DEFAULT_EVENT_SLOTS: { eventType: EventType; category: EventCategory }[] = [
    { eventType: 'salary_change', category: 'income' },
    { eventType: 'borrowing_capacity_change', category: 'income' },
    { eventType: 'interest_rate_change', category: 'market' },
  ]

  // Safe accessors — older scenarios may not have all fields
  const p = {
    depositPool: profile.depositPool ?? 0,
    borrowingCapacity: profile.borrowingCapacity ?? 0,
    baseSalary: profile.baseSalary ?? 0,
    annualSavings: profile.annualSavings ?? 0,
    portfolioValue: profile.portfolioValue ?? 0,
    currentDebt: profile.currentDebt ?? 0,
    existingAnnualRent: profile.existingAnnualRent ?? 0,
    timelineYears: profile.timelineYears ?? 20,
    equityGoal: profile.equityGoal ?? 1000000,
    cashflowGoal: profile.cashflowGoal ?? 50000,
    strategyPreset: profile.strategyPreset ?? 'eg-low',
    pacingMode: profile.pacingMode ?? 'aggressive',
    interestRate: profile.interestRate ?? 0.0625,
    vacancyRate: profile.vacancyRate ?? 0.04,
    rentEscalationRate: profile.rentEscalationRate ?? 0.05,
    inflationRate: profile.inflationRate ?? 0.03,
    wageGrowthRate: profile.wageGrowthRate ?? 0.025,
    equityReleaseFactor: profile.equityReleaseFactor ?? 0.70,
    equityFactor: profile.equityFactor ?? 0.80,
    existingPortfolioGrowthRate: profile.existingPortfolioGrowthRate ?? 0.05,
    sellingCostsPercent: profile.sellingCostsPercent ?? 3,
    lvrStrategy: profile.lvrStrategy ?? 'client_comfort',
    maxPurchasesPerYear: profile.maxPurchasesPerYear ?? 3,
    depositBuffer: profile.depositBuffer ?? 5000,
    ioToPiTransitionYears: profile.ioToPiTransitionYears ?? 5,
    targetPassiveIncome: profile.targetPassiveIncome ?? 80000,
  }

  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      {/* Client Details */}
      <ChartCard title="Client details" flush>
        <table className="w-full text-xs">
          <tbody>
            <EditableNumRow label="Deposit / cash ($)" value={p.depositPool} field="depositPool" prefix="$" />
            <EditableNumRow label="Borrowing capacity ($)" value={p.borrowingCapacity} field="borrowingCapacity" prefix="$" />
            <EditableNumRow label="Base salary ($)" value={p.baseSalary} field="baseSalary" prefix="$" />
            <EditableNumRow label="Annual savings ($)" value={p.annualSavings} field="annualSavings" prefix="$" />
            <EditableNumRow label="Portfolio value ($)" value={p.portfolioValue} field="portfolioValue" prefix="$" />
            <EditableNumRow label="Current debt ($)" value={p.currentDebt} field="currentDebt" prefix="$" />
            <EditableNumRow label="Existing rent ($/yr)" value={p.existingAnnualRent} field="existingAnnualRent" prefix="$" />
            <KVRow label="Usable equity ($)" value={`$${fmtNum(calculatedValues?.currentUsableEquity ?? 0)}`} bold />
            <EditableNumRow label="Timeline (yrs)" value={p.timelineYears} field="timelineYears" />
            <EditableNumRow label="Equity goal ($)" value={p.equityGoal} field="equityGoal" prefix="$" />
            <EditableNumRow label="Cashflow goal ($/yr)" value={p.cashflowGoal} field="cashflowGoal" prefix="$" />
            <EditableSelectRow label="Strategy" value={p.strategyPreset} field="strategyPreset" options={STRATEGY_OPTIONS} />
            <EditableSelectRow label="Pacing" value={p.pacingMode} field="pacingMode" options={PACING_OPTIONS} />
          </tbody>
        </table>
      </ChartCard>

      {/* Events */}
      <ChartCard
        title="Events"
        flush
        action={
          <div className="relative">
            <button
              onClick={() => setCategoryPickerOpen(!categoryPickerOpen)}
              className="flex items-center gap-1 px-2 text-[13px] font-medium text-[#7C3AED] hover:bg-[#F5F3FF] rounded transition-colors cursor-pointer"
              style={{ height: 20, lineHeight: '20px' }}
            >
              <Plus size={14} />
              Add event
            </button>
            {categoryPickerOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                {([
                  { key: 'income' as EventCategory, label: 'Income' },
                  { key: 'life' as EventCategory, label: 'Life' },
                  { key: 'portfolio' as EventCategory, label: 'Portfolio' },
                  { key: 'market' as EventCategory, label: 'Market' },
                ]).map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => { setEventCategory(cat.key); setCategoryPickerOpen(false); setEventInitialType(undefined); setEventModalOpen(true) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      >
        <table className="w-full text-xs">
          <tbody>
            {/* Configured events */}
            {eventBlocks
              .slice()
              .sort((a, b) => a.period - b.period)
              .map(event => (
              <tr
                key={event.id}
                className="border-b border-[#F2F2F2] last:border-b-0 hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                onClick={() => setEventModalOpen(true)}
              >
                <td className="py-2 pl-[18px] pr-0" style={{ width: 44 }}>
                  <span className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] bg-[#EDE9FE] text-[#7C3AED]">
                    <EventTypeIcon eventType={event.eventType} size={13} />
                  </span>
                </td>
                <td className="py-3 px-3.5 text-[13px] font-medium text-[#181D27]">
                  {event.label || getEventLabel(event.eventType, event.payload)}
                </td>
                <td className="py-3 px-3 text-xs text-[#717680] whitespace-nowrap text-right">
                  {periodToYear(event.period)}
                </td>
                <td className="py-2 pl-1 pr-2" style={{ width: 28 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeEvent(event.id) }}
                    className="p-1 text-neutral-300 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                    title="Remove event"
                  >
                    <X size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {/* Default event slots — always visible for types not yet added */}
            {DEFAULT_EVENT_SLOTS
              .filter(slot => !eventBlocks.some(e => e.eventType === slot.eventType))
              .map(slot => {
                const typeDef = EVENT_TYPES[slot.eventType]
                return (
                  <tr
                    key={slot.eventType}
                    className="border-b border-[#F2F2F2] last:border-b-0 hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                    onClick={() => {
                      setEventCategory(slot.category)
                      setEventInitialType(slot.eventType)
                      setEventModalOpen(true)
                    }}
                  >
                    <td className="py-2 pl-[18px] pr-0" style={{ width: 44 }}>
                      <span className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] bg-[#F2F2F3] text-[#717680]">
                        <EventTypeIcon eventType={slot.eventType} size={13} />
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-[13px] font-medium text-[#A1A1AA]">
                      {typeDef.label}
                    </td>
                    <td className="py-3 px-3 text-xs text-[#A1A1AA] whitespace-nowrap text-right">
                      Click to configure
                    </td>
                    <td className="py-2 pl-1 pr-2" style={{ width: 28 }} />
                  </tr>
                )
              })}
          </tbody>
        </table>
      </ChartCard>

      {eventModalOpen && (
        <EventConfigModal
          isOpen={eventModalOpen}
          onClose={() => { setEventModalOpen(false); setEventInitialType(undefined) }}
          category={eventCategory}
          initialEventType={eventInitialType}
        />
      )}
    </div>
  )
}
