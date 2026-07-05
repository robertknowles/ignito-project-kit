import React, { useState, useMemo } from 'react'
import { Home, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  calculateMortgageRepayment,
  IO_PERIOD_YEARS,
  type PaymentType,
  type RepaymentFrequency,
  type MortgageResult,
} from '@/utils/mortgageRepaymentCalculator'

interface MortgageRepaymentModalProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Reusable inputs (dashboard styling) ────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[13px] font-semibold text-neutral-900 mb-1.5">{children}</label>
)

const CurrencyField: React.FC<{
  label: string
  value: number
  onChange: (val: number) => void
  placeholder?: string
}> = ({ label, value, onChange, placeholder = '0' }) => (
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
        placeholder={placeholder}
        className="w-full pl-7 pr-3 py-2.5 text-[13px] text-neutral-900 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
      />
    </div>
  </div>
)

const NumberField: React.FC<{
  label: string
  value: number
  onChange: (val: number) => void
  suffix?: string
  step?: number
}> = ({ label, value, onChange, suffix, step = 1 }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="relative">
      <input
        type="number"
        step={step}
        value={value || ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value)
          onChange(!isNaN(parsed) && parsed >= 0 ? parsed : 0)
        }}
        placeholder="0"
        className="w-full pl-3 pr-14 py-2.5 text-[13px] text-neutral-900 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-neutral-400">
          {suffix}
        </span>
      )}
    </div>
  </div>
)

const SelectField: React.FC<{
  label: string
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

// ─── Main component ─────────────────────────────────────────────────────────

export const MortgageRepaymentModal: React.FC<MortgageRepaymentModalProps> = ({ isOpen, onClose }) => {
  const [loanAmount, setLoanAmount] = useState<number>(450000)
  const [loanTermYears, setLoanTermYears] = useState<number>(30)
  const [interestRate, setInterestRate] = useState<number>(3.66)
  const [paymentType, setPaymentType] = useState<PaymentType>('principal-interest')
  const [frequency, setFrequency] = useState<RepaymentFrequency>('monthly')
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(0)
  const [lumpSum, setLumpSum] = useState<number>(0)
  const [extraStartsAfterYears, setExtraStartsAfterYears] = useState<number>(0)
  const [showAssumptions, setShowAssumptions] = useState(false)

  const result: MortgageResult = useMemo(
    () =>
      calculateMortgageRepayment({
        loanAmount,
        loanTermYears,
        interestRate,
        paymentType,
        frequency,
        extraMonthlyPayment,
        lumpSum,
        extraStartsAfterYears,
      }),
    [loanAmount, loanTermYears, interestRate, paymentType, frequency, extraMonthlyPayment, lumpSum, extraStartsAfterYears]
  )

  const fmt0 = (val: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0)
  const fmt2 = (val: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)

  const frequencyNoun: Record<RepaymentFrequency, string> = {
    weekly: 'weekly',
    fortnightly: 'fortnightly',
    monthly: 'monthly',
  }

  const paymentTypeLabel = paymentType === 'principal-interest' ? 'Principal & Interest' : 'Interest Only'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Home size={18} className="text-neutral-600" />
              </div>
              Mortgage Repayment Calculator
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-neutral-500 mt-2 max-w-2xl">
            Calculate the cost of your home loan repayments to find out how much you can afford to borrow. Compare how
            different interest rates, loan terms and repayment frequency can impact the cost of your loan.
          </p>

          {/* ── Two-column: inputs | results ── */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: loan details */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary mb-4">Loan Details</p>
              <div className="grid grid-cols-2 gap-4">
                <CurrencyField label="Loan Amount" value={loanAmount} onChange={setLoanAmount} />
                <NumberField label="Loan Term" value={loanTermYears} onChange={setLoanTermYears} suffix="years" />
                <NumberField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" step={0.01} />
                <SelectField
                  label="Payment Type"
                  value={paymentType}
                  onChange={(v) => setPaymentType(v as PaymentType)}
                  options={[
                    { value: 'principal-interest', label: 'Principal & Interest' },
                    { value: 'interest-only', label: 'Interest Only' },
                  ]}
                />
                <div className="col-span-2">
                  <SelectField
                    label="Repayment Frequency"
                    value={frequency}
                    onChange={(v) => setFrequency(v as RepaymentFrequency)}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'fortnightly', label: 'Fortnightly' },
                      { value: 'weekly', label: 'Weekly' },
                    ]}
                  />
                </div>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary mt-6 mb-4">Add Extra Payment</p>
              <div className="grid grid-cols-2 gap-4">
                <CurrencyField label="Add Extra to your Monthly Loan Repayment" value={extraMonthlyPayment} onChange={setExtraMonthlyPayment} />
                <CurrencyField label="Add a Lump Sum Amount of" value={lumpSum} onChange={setLumpSum} />
                <div className="col-span-2">
                  <NumberField label="Starts after How many years" value={extraStartsAfterYears} onChange={setExtraStartsAfterYears} suffix="years" />
                </div>
              </div>
            </div>

            {/* Right: estimated results */}
            <div className="lg:border-l lg:border-neutral-200 lg:pl-8">
              <p className="text-[13px] font-semibold text-neutral-900 mb-4">Estimated results</p>

              <p className="text-[13px] text-neutral-500 mb-1">Your estimated repayment</p>
              <p className="text-3xl font-semibold text-brand-primary">
                {fmt0(result.periodicRepayment)}
                <span className="text-base font-normal text-brand-primary/70 ml-1">{frequencyNoun[frequency]}</span>
              </p>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <div>
                  <p className="text-[13px] text-neutral-500 mb-1">Total principal paid</p>
                  <p className="text-2xl font-semibold text-brand-primary">{fmt0(result.totalPrincipalPaid)}</p>
                </div>
                <div>
                  <p className="text-[13px] text-neutral-500 mb-1">Total interest paid</p>
                  <p className="text-2xl font-semibold text-brand-primary">{fmt0(result.totalInterestPaid)}</p>
                </div>
              </div>

              {/* Summary */}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mt-6 mb-1">Summary</p>
              <div className="border-t border-neutral-200">
                <SummaryRow label="Loan amount" value={fmt0(loanAmount)} />
                <SummaryRow label="Loan term" value={`${loanTermYears} years`} />
                <SummaryRow label="Interest rate" value={`${interestRate} %`} />
                <SummaryRow label="Payment type" value={paymentTypeLabel} />
                <SummaryRow label="Repayment frequency" value={frequencyNoun[frequency].charAt(0).toUpperCase() + frequencyNoun[frequency].slice(1)} />
                <SummaryRow label="Total extra payment" value={fmt0(result.totalExtraPayment)} highlight />
                <SummaryRow label="Total principal paid" value={fmt0(result.totalPrincipalPaid)} highlight />
                <SummaryRow label="Total interest paid" value={fmt0(result.totalInterestPaid)} highlight />
                <SummaryRow label="Estimated repayments" value={`${fmt0(result.periodicRepayment)} ${frequencyNoun[frequency]}`} highlight />
              </div>
            </div>
          </div>

          {/* ── Amortisation schedule ── */}
          <div className="mt-8 border-t border-neutral-200 pt-6">
            <p className="text-[13px] font-semibold text-neutral-900 text-center mb-4">Amortisation Schedule</p>
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-neutral-500">Years</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-neutral-500">Principal</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-neutral-500">Interest</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-neutral-500">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.year} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-2.5 text-[13px] text-neutral-700">{row.year}</td>
                      <td className="px-4 py-2.5 text-[13px] text-neutral-700 text-right">{fmt2(row.principal)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-neutral-700 text-right">{fmt2(row.interest)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-neutral-700 text-right">{fmt2(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Calculator assumptions ── */}
          <div className="mt-6 border border-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              Calculator Assumptions
              {showAssumptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAssumptions && (
              <div className="px-4 pb-4 space-y-3 text-[11px] text-neutral-500 leading-relaxed">
                <p>
                  The figures provided should be used as an estimate only, and should not be relied on as a true
                  indication of your home loan repayments, or a quote or indication of pre-qualification for any home
                  loan product. The figures are based upon the information you put into the calculator.
                </p>
                <div>
                  <p className="font-semibold text-neutral-700 mb-1">Interest rates</p>
                  <p>We assume the rate you enter applies to your loan for the full loan term — even if you choose a variable rate, or an interest-only rate which in practice applies for a limited period only.</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral-700 mb-1">Interest and repayments</p>
                  <p>
                    The displayed total interest is calculated on the entered interest rate over the loan term. Your annual
                    interest charge is divided equally across the payments in each year, and interest is charged at the same
                    frequency as repayments. Weekly and fortnightly repayments are assumed to be a quarter and a half of the
                    monthly repayment respectively. When selecting interest-only repayments, the loan is assumed to revert to
                    principal &amp; interest after {IO_PERIOD_YEARS} years. Any extra repayment is taken to be made at the same
                    time as your regular repayment.
                  </p>
                </div>
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
