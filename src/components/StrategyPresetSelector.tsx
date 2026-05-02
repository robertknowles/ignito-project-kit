/**
 * StrategyPresetSelector — replaces PacingToggle.
 *
 * Lets the BA pick one of the 5 strategy presets (Ben Handler's framework)
 * before generating a portfolio. Drives the chatbot's cell selection logic.
 *
 * Two display modes:
 *   - Full (ChatPanel empty state): 2×2 grid of goal × price-point + a
 *     full-width Commercial Transition row. Each card shows preset name +
 *     short description.
 *   - Compact (future use, e.g. dashboard header): inline segmented control
 *     with short labels.
 */

import React from 'react'
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile'
import { TrendingUpIcon, DollarSignIcon, BuildingIcon } from 'lucide-react'

type PresetId = 'eg-low' | 'eg-high' | 'cf-low' | 'cf-high' | 'commercial-transition'

interface PresetMeta {
  id: PresetId
  shortLabel: string
  fullLabel: string
  description: string
  icon: React.ReactNode
}

const PRESETS: PresetMeta[] = [
  {
    id: 'eg-low',
    shortLabel: 'EG · Low',
    fullLabel: 'Equity Growth, Low Price',
    description: 'Scale through volume. Multiple growth-mode assets at lower entry.',
    icon: <TrendingUpIcon size={14} />,
  },
  {
    id: 'eg-high',
    shortLabel: 'EG · High',
    fullLabel: 'Equity Growth, High Price',
    description: 'Concentrate in fewer larger assets. Stronger land content.',
    icon: <TrendingUpIcon size={14} />,
  },
  {
    id: 'cf-low',
    shortLabel: 'CF · Low',
    fullLabel: 'Cash Flow, Low Price',
    description: 'Yield-focused, accept higher property count.',
    icon: <DollarSignIcon size={14} />,
  },
  {
    id: 'cf-high',
    shortLabel: 'CF · High',
    fullLabel: 'Cash Flow, High Price',
    description: 'Strong yield at scale. Premium tenants, improves DSR.',
    icon: <DollarSignIcon size={14} />,
  },
  {
    id: 'commercial-transition',
    shortLabel: 'Commercial',
    fullLabel: 'Commercial Transition',
    description: 'Phase 1: build equity in residential. Phase 2: pivot to commercial yield.',
    icon: <BuildingIcon size={14} />,
  },
]

interface StrategyPresetSelectorProps {
  compact?: boolean
}

export const StrategyPresetSelector: React.FC<StrategyPresetSelectorProps> = ({ compact = false }) => {
  const { profile, updateProfile } = useInvestmentProfile()
  const currentPreset = profile.strategyPreset || 'eg-low'

  if (compact) {
    return (
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {PRESETS.map(({ id, shortLabel, icon }) => (
          <button
            key={id}
            onClick={() => updateProfile({ strategyPreset: id })}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentPreset === id
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {shortLabel}
          </button>
        ))}
      </div>
    )
  }

  // Full mode — 5 full-stretch rows, one preset per row.
  return (
    <div className="w-full space-y-2.5">
      <p className="text-[11px] text-[#717680] font-medium text-center">Strategy preset</p>
      <div className="flex flex-col gap-1.5">
        {PRESETS.map(({ id, fullLabel, description, icon }) => (
          <button
            key={id}
            onClick={() => updateProfile({ strategyPreset: id })}
            className={`w-full flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border transition-all text-left ${
              currentPreset === id
                ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-700'
                : 'bg-white text-[#535862] border-[#E9EAEB] hover:border-[#D5D7DA] hover:bg-[#F9F9F9]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {icon}
              <span className="text-[11px] font-medium leading-tight">{fullLabel}</span>
            </div>
            <span className={`text-[10px] leading-tight ${currentPreset === id ? 'text-white/60' : 'text-[#717680]'}`}>
              {description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
