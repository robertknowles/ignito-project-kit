import React, { useState, useMemo } from 'react'
import { Home, Building2, User, Users, Users2, Minus, Plus, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  calculateBorrowingPower,
  type LoanPurpose,
  type RepaymentType,
  type BorrowingPowerResult,
  INCOME_SHADING_RATE,
  CREDIT_CARD_FACTOR,
  ASSESSMENT_BUFFER,
  DEFAULT_CARDED_RATE,
  DEFAULT_LOAN_TERM,
} from '@/utils/borrowingPowerCalculator'

interface BorrowingPowerModalProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Reusable sub-components ────────────────────────────────────────────────

/** Selection card with icon (purpose, applicants) */
const SelectionCard: React.FC<{
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  className?: string
}> = ({ selected, onClick, icon, label, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
      selected
        ? 'border-gray-900 bg-gray-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
    } ${className}`}
  >
    <div className="text-gray-600">{icon}</div>
    <span className={`text-xs font-medium ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
      {label}
    </span>
  </button>
)

/** Toggle pill button (repayment type) */
const PillToggle: React.FC<{
  selected: boolean
  onClick: () => void
  label: string
}> = ({ selected, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer ${
      selected
        ? 'bg-gray-900 text-white border-gray-900'
        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
    }`}
  >
    {label}
  </button>
)

/** Currency input with $ prefix */
const CurrencyInput: React.FC<{
  label: string
  sublabel?: string
  value: number
  onChange: (val: number) => void
  suffix?: string
}> = ({ label, sublabel, value, onChange, suffix }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
    {sublabel && <p className="text-xs text-gray-400 mb-1.5">{sublabel}</p>}
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value)
          onChange(!isNaN(parsed) && parsed >= 0 ? parsed : 0)
        }}
        className="w-full pl-7 pr-20 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
        placeholder="0"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
          {suffix}
        </span>
      )}
    </div>
  </div>
)

// ─── Main component ─────────────────────────────────────────────────────────

export const BorrowingPowerModal: React.FC<BorrowingPowerModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Setup
  const [purpose, setPurpose] = useState<LoanPurpose>('owner-occupied')
  const [applicants, setApplicants] = useState<number>(1)
  const [dependants, setDependants] = useState<number>(0)
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('pi')

  // Income
  const [baseIncome, setBaseIncome] = useState<number>(0)
  const [additionalIncome, setAdditionalIncome] = useState<number>(0)
  const [baseIncome2, setBaseIncome2] = useState<number>(0)
  const [additionalIncome2, setAdditionalIncome2] = useState<number>(0)

  // Expenses
  const [livingExpenses, setLivingExpenses] = useState<number>(0)
  const [creditCardLimit, setCreditCardLimit] = useState<number>(0)
  const [homeLoanRepayments, setHomeLoanRepayments] = useState<number>(0)
  const [otherLoanRepayments, setOtherLoanRepayments] = useState<number>(0)

  // How it works toggle
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  // Calculate result
  const result: BorrowingPowerResult = useMemo(() => {
    return calculateBorrowingPower({
      purpose,
      applicants,
      dependants,
      repaymentType,
      baseIncome,
      additionalIncome,
      baseIncome2,
      additionalIncome2,
      livingExpenses,
      creditCardLimit,
      homeLoanRepayments,
      otherLoanRepayments,
    })
  }, [
    purpose, applicants, dependants, repaymentType,
    baseIncome, additionalIncome, baseIncome2, additionalIncome2,
    livingExpenses, creditCardLimit, homeLoanRepayments, otherLoanRepayments,
  ])

  const fmt = (val: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)

  const pct = (val: number) => `${(val * 100).toFixed(1)}%`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <DollarSign size={18} className="text-gray-600" />
            </div>
            Borrowing Power Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1 space-y-6">
          {/* ── Section 1: Setup ── */}
          <div className="space-y-4">
            {/* Purpose */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">What's the purpose of your loan?</p>
              <div className="grid grid-cols-2 gap-3">
                <SelectionCard
                  selected={purpose === 'owner-occupied'}
                  onClick={() => setPurpose('owner-occupied')}
                  icon={<Home size={24} />}
                  label="A place to live"
                />
                <SelectionCard
                  selected={purpose === 'investment'}
                  onClick={() => setPurpose('investment')}
                  icon={<Building2 size={24} />}
                  label="Investment"
                />
              </div>
            </div>

            {/* Applicants */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">How many applicants are on the loan?</p>
              <div className="grid grid-cols-3 gap-3">
                <SelectionCard
                  selected={applicants === 1}
                  onClick={() => setApplicants(1)}
                  icon={<User size={24} />}
                  label="1"
                />
                <SelectionCard
                  selected={applicants === 2}
                  onClick={() => setApplicants(2)}
                  icon={<Users size={24} />}
                  label="2"
                />
                <SelectionCard
                  selected={applicants >= 3}
                  onClick={() => setApplicants(3)}
                  icon={<Users2 size={24} />}
                  label="3+"
                />
              </div>
            </div>

            {/* Dependants */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">How many dependants do you financially support?</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDependants(Math.max(0, dependants - 1))}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:opacity-30"
                  disabled={dependants === 0}
                >
                  <Minus size={16} />
                </button>
                <div className="w-24 text-center py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-900">
                  {dependants}
                </div>
                <button
                  type="button"
                  onClick={() => setDependants(dependants + 1)}
                  className="w-9 h-9 rounded-full border border-gray-900 flex items-center justify-center text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Repayment Type */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Which type of repayment would you prefer?</p>
              <div className="flex gap-2">
                <PillToggle
                  selected={repaymentType === 'pi'}
                  onClick={() => setRepaymentType('pi')}
                  label="Principal and interest"
                />
                <PillToggle
                  selected={repaymentType === 'io'}
                  onClick={() => setRepaymentType('io')}
                  label="Interest only"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Section 2: Your income ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                <DollarSign size={14} className="text-gray-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Your income</h3>
            </div>

            {applicants >= 2 && (
              <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">Applicant 1</p>
            )}

            <CurrencyInput
              label="Your base income"
              value={baseIncome}
              onChange={setBaseIncome}
              suffix="Yearly"
            />
            <CurrencyInput
              label="Additional income"
              sublabel="Including rental income, bonuses and commissions"
              value={additionalIncome}
              onChange={setAdditionalIncome}
              suffix="Yearly"
            />

            {applicants >= 2 && (
              <>
                <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide pt-2">Applicant 2</p>
                <CurrencyInput
                  label="Base income"
                  value={baseIncome2}
                  onChange={setBaseIncome2}
                  suffix="Yearly"
                />
                <CurrencyInput
                  label="Additional income"
                  sublabel="Including rental income, bonuses and commissions"
                  value={additionalIncome2}
                  onChange={setAdditionalIncome2}
                  suffix="Yearly"
                />
              </>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Section 3: Your expenses ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                <DollarSign size={14} className="text-gray-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Your expenses</h3>
            </div>

            <CurrencyInput
              label="Living expenses"
              value={livingExpenses}
              onChange={setLivingExpenses}
              suffix="Monthly"
            />
            <CurrencyInput
              label="Total credit cards limit"
              value={creditCardLimit}
              onChange={setCreditCardLimit}
            />
            <CurrencyInput
              label="Existing home loan repayments"
              value={homeLoanRepayments}
              onChange={setHomeLoanRepayments}
              suffix="Monthly"
            />
            <CurrencyInput
              label="Existing repayment for other loans"
              sublabel="Including car loans, student loans, personal loans"
              value={otherLoanRepayments}
              onChange={setOtherLoanRepayments}
              suffix="Monthly"
            />
          </div>

          {/* ── Section 4: Result ── */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
              You could borrow up to
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {fmt(result.maxBorrowing)}
            </p>

            {result.maxBorrowing > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Monthly repayment</p>
                  <p className="font-semibold text-gray-700">{fmt(result.monthlyRepayment)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total interest</p>
                  <p className="font-semibold text-gray-700">{fmt(result.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Assessment rate</p>
                  <p className="font-semibold text-gray-700">{pct(result.assessmentRate)}</p>
                </div>
              </div>
            )}

            {result.maxBorrowing === 0 && baseIncome > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Your expenses and commitments exceed your assessable income. Try reducing debts or increasing income.
              </p>
            )}
          </div>

          {/* ── Section 5: How it works ── */}
          <div className="border border-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              How this calculator works
              {showHowItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHowItWorks && (
              <div className="px-4 pb-4 space-y-3 text-[11px] text-gray-500 leading-relaxed">
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Assessment rate</p>
                  <p>
                    Lenders don't assess you at the actual interest rate. They add a {pct(ASSESSMENT_BUFFER)} buffer
                    to the current rate ({pct(DEFAULT_CARDED_RATE)}) to stress-test your ability to repay if rates
                    rise. Your serviceability is assessed at {pct(result.assessmentRate)}.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-1">Income shading</p>
                  <p>
                    Base PAYG income is taken at 100%. Additional income (bonuses, commissions, overtime,
                    rental income) is "shaded" — only {(INCOME_SHADING_RATE * 100).toFixed(0)}% is counted
                    because these income streams are considered less reliable.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-1">Credit cards</p>
                  <p>
                    Lenders use {(CREDIT_CARD_FACTOR * 100).toFixed(1)}% of your total credit card limit
                    (not balance) as an annual commitment. A $10,000 limit counts as ${Math.round(10000 * CREDIT_CARD_FACTOR).toLocaleString()}/year
                    in commitments — even if the card balance is zero. Reducing unused limits directly increases
                    borrowing power.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-1">Living expenses (HEM benchmark)</p>
                  <p>
                    Your declared living expenses are compared against the Household Expenditure Measure (HEM)
                    benchmark for your situation ({applicants === 1 ? 'single' : 'couple'}, {dependants} dependant{dependants !== 1 ? 's' : ''}: {fmt(result.hemBenchmark)}/year).
                    The higher of the two is used. This prevents under-declaration from inflating borrowing power.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-1">Income tax</p>
                  <p>
                    Lenders assess your ability to repay from after-tax income, not gross. Your gross assessable
                    income of {fmt(result.totalAssessableIncome)} has estimated PAYG tax + Medicare of {fmt(result.annualTax)},
                    leaving {fmt(result.afterTaxIncome)} after tax.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-1">The calculation</p>
                  <p>
                    After-tax income ({fmt(result.afterTaxIncome)}) minus living expenses ({fmt(result.annualLivingExpenses)})
                    minus existing commitments ({fmt(result.annualExistingCommitments)}) = net surplus ({fmt(result.netSurplus)}/year).
                    The max loan is the amount whose annual repayment at the assessment rate equals this surplus.
                    Loan term: {DEFAULT_LOAN_TERM} years {repaymentType === 'pi' ? 'principal & interest' : 'interest only'}.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="italic text-[10px] text-gray-400">
                    This calculator provides estimates only based on general lender assessment methodology.
                    Actual borrowing capacity varies by lender, individual circumstances, credit history,
                    and property type. Always speak to a licensed mortgage broker before relying on these figures.
                    PropPath provides factual modelling, not financial or credit advice.
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
