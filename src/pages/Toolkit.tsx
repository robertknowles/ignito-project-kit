import React, { useState } from 'react'
import { DollarSign, Home, Landmark, FileText } from 'lucide-react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'
import { BorrowingPowerModal } from '@/components/BorrowingPowerModal'
import { MortgageRepaymentModal } from '@/components/MortgageRepaymentModal'
import { StampDutyModal } from '@/components/StampDutyModal'
import { PurchaseBriefCalc } from '@/components/PurchaseBriefCalc'

interface ToolCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  beta?: boolean
}

const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, onClick, beta = true }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-start gap-3 p-5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-left cursor-pointer"
  >
    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        {beta && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-neutral-100 text-neutral-500">BETA</span>
        )}
      </div>
      <p className="text-xs text-neutral-500 mt-1">{description}</p>
    </div>
  </button>
)

const Toolkit: React.FC = () => {
  const [showBorrowingPower, setShowBorrowingPower] = useState(false)
  const [showMortgageRepayment, setShowMortgageRepayment] = useState(false)
  const [showStampDuty, setShowStampDuty] = useState(false)
  const [showPurchaseBriefCalc, setShowPurchaseBriefCalc] = useState(false)

  return (
    <div className="flex min-h-screen bg-white">
      <AppSidebar />
      <main className="flex-1 px-8 py-8" style={{ marginLeft: `var(--app-sidebar-width, ${SIDEBAR_WIDTH}px)`, transition: 'margin-left 200ms ease-in-out' }}>
        {showPurchaseBriefCalc ? (
          <PurchaseBriefCalc onBack={() => setShowPurchaseBriefCalc(false)} />
        ) : (
          <>
            <h1 className="page-title mb-6">Toolkit</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
              <ToolCard
                icon={<FileText size={20} className="text-neutral-600" />}
                title="Purchase Brief"
                description="Model a single property purchase in isolation - projections, cashflow and funding."
                onClick={() => setShowPurchaseBriefCalc(true)}
                beta={false}
              />
            </div>

            <hr className="my-6 border-neutral-200 max-w-3xl" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
              <ToolCard
                icon={<DollarSign size={20} className="text-neutral-600" />}
                title="Borrowing Power"
                description="Estimate max borrowing capacity based on income, expenses and debts."
                onClick={() => setShowBorrowingPower(true)}
              />
              <ToolCard
                icon={<Home size={20} className="text-neutral-600" />}
                title="Mortgage Repayment"
                description="Model home loan repayments, extra payments and the full amortisation schedule."
                onClick={() => setShowMortgageRepayment(true)}
              />
              <ToolCard
                icon={<Landmark size={20} className="text-neutral-600" />}
                title="Stamp Duty"
                description="Estimate stamp duty, government fees and first home buyer grants by state."
                onClick={() => setShowStampDuty(true)}
              />
            </div>

            <BorrowingPowerModal isOpen={showBorrowingPower} onClose={() => setShowBorrowingPower(false)} />
            <MortgageRepaymentModal isOpen={showMortgageRepayment} onClose={() => setShowMortgageRepayment(false)} />
            <StampDutyModal isOpen={showStampDuty} onClose={() => setShowStampDuty(false)} />
          </>
        )}
      </main>
    </div>
  )
}

export default Toolkit
