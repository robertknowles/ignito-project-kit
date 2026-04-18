/**
 * ChatSummaryCard — Step 1.12 of NL-PIVOT-PLAN.csv
 *
 * A bordered key-value card shown after initial extraction. Displays what
 * was understood: client names, income, savings, deposit, property details,
 * ownership. The "visual receipt" — not a blocker, just confirmation.
 */

import React from 'react'
import type { SummaryCardData } from '@/types/nlParse'

interface ChatSummaryCardProps {
  data: SummaryCardData
}

const NOT_PROVIDED = 'Not provided'

export const ChatSummaryCard: React.FC<ChatSummaryCardProps> = ({ data }) => {
  const missing = new Set(data.missingFields ?? [])
  const rows = [
    { key: 'income', label: 'Income', value: data.income },
    { key: 'borrowingCapacity', label: 'Borrowing Capacity', value: data.borrowingCapacity },
    { key: 'savings', label: 'Savings', value: data.savings },
    { key: 'availableDeposit', label: 'Available Deposit', value: data.availableDeposit },
    { key: 'existingPropertyDebt', label: 'Existing Property Debt', value: data.existingPropertyDebt },
    { key: 'existingPropertyEquity', label: 'Existing Property Equity', value: data.existingPropertyEquity },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {rows.map((row, i) => {
        const isMissing = missing.has(row.key)
        const isPlaceholder = row.value === NOT_PROVIDED
        return (
          <div
            key={row.key}
            className={`flex items-start justify-between px-3 py-1.5 ${
              i < rows.length - 1 ? 'border-b border-gray-100' : ''
            } ${isMissing ? 'bg-amber-50' : ''}`}
          >
            <span className="text-[#717680] text-[11px] min-w-[90px]">{row.label}</span>
            <span
              className={`text-[11px] text-right ${
                isPlaceholder
                  ? 'text-amber-700 italic font-normal'
                  : 'text-[#181D27] font-medium'
              }`}
            >
              {row.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
