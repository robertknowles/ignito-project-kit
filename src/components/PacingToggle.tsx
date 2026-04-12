/**
 * PacingToggle — Acquisition pacing control with growth rate context.
 *
 * Two modes:
 * - Full (ChatPanel empty state): Cards with spacing + growth info
 * - Compact (Dashboard header): Inline segmented control
 */

import React from 'react'
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile'
import { RocketIcon, ScaleIcon, ShieldIcon } from 'lucide-react'

type PacingMode = 'aggressive' | 'balanced' | 'conservative'

const MODES: {
  value: PacingMode
  label: string
  icon: React.ReactNode
  spacing: string
  growth: string
}[] = [
  {
    value: 'aggressive',
    label: 'Aggressive',
    icon: <RocketIcon size={12} />,
    spacing: '~2 yr gaps',
    growth: 'High growth areas',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    icon: <ScaleIcon size={12} />,
    spacing: '~3 yr gaps',
    growth: 'Mixed growth',
  },
  {
    value: 'conservative',
    label: 'Conservative',
    icon: <ShieldIcon size={12} />,
    spacing: '~4-5 yr gaps',
    growth: 'Steady growth',
  },
]

interface PacingToggleProps {
  compact?: boolean
}

export const PacingToggle: React.FC<PacingToggleProps> = ({ compact = false }) => {
  const { profile, updateProfile } = useInvestmentProfile()
  const currentMode = profile.pacingMode || 'balanced'

  // Compact mode — inline segmented control for dashboard header
  if (compact) {
    return (
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {MODES.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => updateProfile({ pacingMode: value })}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentMode === value
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    )
  }

  // Full mode — cards with growth context for chat panel empty state
  return (
    <div className="w-full space-y-2.5">
      <p className="text-[11px] text-[#717680] font-medium text-center">Acquisition strategy</p>
      <div className="flex gap-1.5">
        {MODES.map(({ value, label, icon, spacing, growth }) => (
          <button
            key={value}
            onClick={() => updateProfile({ pacingMode: value })}
            className={`flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all text-center ${
              currentMode === value
                ? 'bg-[#181D27] text-white border-[#181D27]'
                : 'bg-white text-[#535862] border-[#E9EAEB] hover:border-[#D5D7DA] hover:bg-[#F9F9F9]'
            }`}
          >
            <div className="flex items-center gap-1">
              {icon}
              <span className="text-[11px] font-medium">{label}</span>
            </div>
            <span className={`text-[10px] leading-tight ${currentMode === value ? 'text-white/50' : 'text-[#717680]'}`}>
              {spacing}
            </span>
            <span className={`text-[10px] leading-tight ${currentMode === value ? 'text-white/40' : 'text-[#A4A7AE]'}`}>
              {growth}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
