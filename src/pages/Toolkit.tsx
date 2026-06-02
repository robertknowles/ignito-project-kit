import React, { useState } from 'react'
import { DollarSign } from 'lucide-react'
import { AppSidebar, SIDEBAR_WIDTH } from '@/components/AppSidebar'
import { BorrowingPowerModal } from '@/components/BorrowingPowerModal'

const Toolkit: React.FC = () => {
  const [showBorrowingPower, setShowBorrowingPower] = useState(false)

  return (
    <div className="flex min-h-screen bg-white">
      <AppSidebar />
      <main className="flex-1 px-8 py-8" style={{ marginLeft: SIDEBAR_WIDTH }}>
        <h1 className="text-xl font-semibold text-neutral-900 mb-6">Toolkit</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
          {/* Borrowing Power Calculator */}
          <button
            onClick={() => setShowBorrowingPower(true)}
            className="flex flex-col items-start gap-3 p-5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
              <DollarSign size={20} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Borrowing Power</p>
              <p className="text-xs text-neutral-500 mt-1">Estimate max borrowing capacity based on income, expenses and debts.</p>
            </div>
          </button>
        </div>

        <BorrowingPowerModal isOpen={showBorrowingPower} onClose={() => setShowBorrowingPower(false)} />
      </main>
    </div>
  )
}

export default Toolkit
