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

export const ChatSummaryCard: React.FC<ChatSummaryCardProps> = ({ data }) => {
  const rows = [
    { label: 'Clients', value: data.clients },
    { label: 'Income', value: data.income },
    { label: 'Savings', value: data.savings },
    { label: 'Available Deposit', value: data.availableDeposit },
    ...data.properties.map((p) => ({
      label: p.label,
      value: p.description,
    })),
    { label: 'Ownership', value: data.ownership },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex items-start justify-between px-3.5 py-2.5 text-sm ${
            i < rows.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <span className="text-[#717680] text-xs min-w-[100px]">{row.label}</span>
          <span className="text-[#181D27] text-xs font-medium text-right">{row.value}</span>
        </div>
      ))}
    </div>
  )
}
