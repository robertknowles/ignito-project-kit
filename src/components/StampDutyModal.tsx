import React, { useState, useMemo } from 'react'
import { Landmark, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  calculateToolkitStampDuty,
  AUS_STATES,
  type AusState,
  type PropertyUse,
  type PurchaseType,
  type StampDutyResult,
} from '@/utils/toolkitStampDutyCalculator'

interface StampDutyModalProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Reusable inputs (dashboard styling) ────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[13px] font-semibold text-neutral-900 mb-1.5 leading-snug">{children}</label>
)

const CurrencyField: React.FC<{
  label: React.ReactNode
  value: number
  onChange: (val: number) => void
}> = ({ label, value, onChange }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[13px]">$</span>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value)
          onChange(!isNaN(parsed) && parsed >= 0 ? parsed : 0)
        }}
        placeholder="0"
        className="w-full pl-7 pr-3 py-2.5 text-[13px] text-neutral-900 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
      />
    </div>
  </div>
)

const SelectField: React.FC<{
  label: React.ReactNode
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
}> = ({ label, value, onChange, options }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-9 py-2.5 text-[13px] text-neutral-900 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
    </div>
  </div>
)

const RadioField: React.FC<{
  label: string
  value: boolean
  onChange: (val: boolean) => void
}> = ({ label, value, onChange }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="flex items-center gap-6 pt-1">
      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(v)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
              value === v ? 'border-brand-primary' : 'border-neutral-300 group-hover:border-neutral-400'
            }`}
          >
            {value === v && <span className="w-2 h-2 rounded-full bg-brand-primary" />}
          </span>
          <span className="text-[13px] text-neutral-700">{l}</span>
        </button>
      ))}
    </div>
  </div>
)

// ─── Main component ─────────────────────────────────────────────────────────

export const StampDutyModal: React.FC<StampDutyModalProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<AusState>('ACT')
  const [propertyValue, setPropertyValue] = useState<number>(625000)
  const [totalIncome, setTotalIncome] = useState<number>(142000)
  const [propertyUse, setPropertyUse] = useState<PropertyUse>('primary')
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('established')
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0)
  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState<boolean>(false)
  const [isPensioner, setIsPensioner] = useState<boolean>(false)
  const [showAssumptions, setShowAssumptions] = useState(false)

  const result: StampDutyResult = useMemo(
    () =>
      calculateToolkitStampDuty({
        state,
        propertyValue,
        totalIncome,
        propertyUse,
        purchaseType,
        numberOfChildren,
        isFirstHomeBuyer,
        isPensioner,
      }),
    [state, propertyValue, totalIncome, propertyUse, purchaseType, numberOfChildren, isFirstHomeBuyer, isPensioner]
  )

  const fmt = (val: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Landmark size={18} className="text-neutral-600" />
              </div>
              Stamp Duty Calculator
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-neutral-500 mt-2 max-w-2xl">
            Estimate the amount of tax you'll have to pay on your property purchase - whether you're an investor or an
            owner-occupier.
          </p>

          {/* ── Two-column: inputs | results ── */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: inputs */}
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="State/Territory of Property"
                value={state}
                onChange={(v) => setState(v as AusState)}
                options={AUS_STATES}
              />
              <CurrencyField label="Value of the property" value={propertyValue} onChange={setPropertyValue} />
              <CurrencyField label="Total income of all purchasers (required)" value={totalIncome} onChange={setTotalIncome} />
              <SelectField
                label="Property Type"
                value={propertyUse}
                onChange={(v) => setPropertyUse(v as PropertyUse)}
                options={[
                  { value: 'primary', label: 'Primary Residence' },
                  { value: 'investment', label: 'Investment' },
                ]}
              />
              <SelectField
                label="Are you purchasing?"
                value={purchaseType}
                onChange={(v) => setPurchaseType(v as PurchaseType)}
                options={[
                  { value: 'established', label: 'An established home' },
                  { value: 'new', label: 'A newly constructed home' },
                  { value: 'vacant', label: 'Vacant Land' },
                ]}
              />
              <SelectField
                label="Number of children"
                value={String(numberOfChildren)}
                onChange={(v) => setNumberOfChildren(parseInt(v, 10))}
                options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
              />
              <RadioField label="Are you a first home buyer?" value={isFirstHomeBuyer} onChange={setIsFirstHomeBuyer} />
              <RadioField label="Are you an eligible pensioner?" value={isPensioner} onChange={setIsPensioner} />
            </div>

            {/* Right: estimated results */}
            <div className="lg:border-l lg:border-neutral-200 lg:pl-8">
              <p className="text-[13px] font-semibold text-neutral-900 mb-4">Estimated results</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">Summary</p>
              <div className="border-t border-neutral-200">
                <SummaryRow label="Stamp duty on property" value={fmt(result.stampDuty)} />
                <SummaryRow label="Mortgage registration fee" value={fmt(result.mortgageRegistrationFee)} />
                <SummaryRow label="Land transfer fee" value={fmt(result.landTransferFee)} />
                <SummaryRow label="Estimated total of government fees" value={fmt(result.totalGovernmentFees)} highlight />
                <SummaryRow label="First home owner grant" value={fmt(result.firstHomeOwnerGrant)} />
                <SummaryRow label="Estimated total of government grant" value={fmt(result.totalGovernmentGrant)} highlight />
              </div>
              <p className="text-[11px] text-neutral-400 mt-3 leading-relaxed">
                {result.concessionNote
                  ? result.concessionNote
                  : "You may be eligible for the Federal Government Home Guarantee Scheme or stamp duty concessions. For more information, please contact your local State or Territory Revenue Office."}
              </p>
            </div>
          </div>

          {/* ── Assumptions ── */}
          <div className="mt-8 border border-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              Calculator Assumptions
              {showAssumptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAssumptions && (
              <div className="px-4 pb-4 space-y-2.5 text-[11px] text-neutral-500 leading-relaxed">
                <p>
                  The results from this calculator should be used as an indication only. It is provided for illustrative
                  purposes, based on the information provided, and provides an estimate of the government fees payable.
                  Stamp duty rates and concession thresholds are subject to change.
                </p>
                <p>
                  This calculator returns stamp (transfer) duty for all Australian states and territories, plus an estimate
                  of mortgage registration and land transfer fees. Transfer fees and grant amounts vary by state/territory
                  and individual circumstances.
                </p>
                <p>
                  First-home-buyer and eligible-pensioner concessions are applied using each state's published value
                  thresholds. The ACT is charged on the residential (owner-occupier) scale and applies the Home Buyer
                  Concession Scheme where household income is under the relevant threshold. Foreign-buyer surcharges are
                  not included.
                </p>
                <p>
                  Stamp duty costs may be lowered or exempt in some states or territories depending on your individual
                  circumstances. Purchasers should consult their conveyancer/solicitor or the State Revenue Office in their
                  capital city to confirm rates before entering into any agreement. All information current as at July 2026.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const SummaryRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0">
    <span className={`text-[13px] ${highlight ? 'text-brand-primary font-medium' : 'text-neutral-600'}`}>{label}</span>
    <span className={`text-[13px] font-semibold ${highlight ? 'text-brand-primary' : 'text-neutral-900'}`}>{value}</span>
  </div>
)
