import React from 'react'
import type { PortfolioCardData } from '@/types/nlParse'

interface ChatPortfolioCardProps {
  data: PortfolioCardData
}

export const ChatPortfolioCard: React.FC<ChatPortfolioCardProps> = ({ data }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {data.properties.map((p, i) => (
        <div
          key={i}
          className={`flex items-start justify-between px-3 py-1.5 ${
            i < data.properties.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <span className="text-[#717680] text-[11px] min-w-[90px]">{p.label}</span>
          <span className="text-[#181D27] text-[11px] font-medium text-right">{p.description}</span>
        </div>
      ))}
    </div>
  )
}
