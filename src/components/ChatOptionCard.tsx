/**
 * ChatOptionCard — Step 1.11 of NL-PIVOT-PLAN.csv
 *
 * A compact clickable list item shown when the engine pushes back on a
 * modification. Shows icon, bold title, one-line description, right arrow.
 */

import React from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ZapIcon,
  RefreshCwIcon,
  PlusIcon,
  MinusIcon,
  ChevronRightIcon,
} from 'lucide-react'
import type { ChatOptionCardData } from '@/types/nlParse'

const iconMap: Record<ChatOptionCardData['icon'], React.ElementType> = {
  'arrow-down': ArrowDownIcon,
  'arrow-up': ArrowUpIcon,
  'zap': ZapIcon,
  'refresh': RefreshCwIcon,
  'plus': PlusIcon,
  'minus': MinusIcon,
}

const iconColorMap: Record<ChatOptionCardData['icon'], string> = {
  'arrow-down': 'text-blue-600 bg-blue-50',
  'arrow-up': 'text-emerald-600 bg-emerald-50',
  'zap': 'text-amber-600 bg-amber-50',
  'refresh': 'text-purple-600 bg-purple-50',
  'plus': 'text-emerald-600 bg-emerald-50',
  'minus': 'text-red-600 bg-red-50',
}

interface ChatOptionCardProps {
  card: ChatOptionCardData
  onSelect: (card: ChatOptionCardData) => void
}

export const ChatOptionCard: React.FC<ChatOptionCardProps> = ({ card, onSelect }) => {
  const Icon = iconMap[card.icon]
  const colorClass = iconColorMap[card.icon]

  return (
    <button
      onClick={() => onSelect(card)}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{card.label}</div>
        <div className="text-xs text-gray-500 truncate">{card.description}</div>
      </div>
      <ChevronRightIcon
        size={14}
        className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors"
      />
    </button>
  )
}
