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
    fullLabel: 'Equity Growth, Low Price Point',
    description: 'Scale through volume. Multiple growth-mode assets at lower entry per property.',
    icon: <TrendingUpIcon size={14} />,
  },
  {
    id: 'eg-high',
    shortLabel: 'EG · High',
    fullLabel: 'Equity Growth, High Price Point',
    description: 'Concentrate in fewer larger assets. Stronger land content, larger equity per asset.',
    icon: <TrendingUpIcon size={14} />,
  },
  {
    id: 'cf-low',
    shortLabel: 'CF · Low',
    fullLabel: 'Cash Flow, Low Price Point',
    description: 'Minimise cash flow gap. Yield-focused, accept a higher property count.',
    icon: <DollarSignIcon size={14} />,
  },
  {
    id: 'cf-high',
    shortLabel: 'CF · High',
    fullLabel: 'Cash Flow, High Price Point',
    description: 'Strong yield at scale. Premium tenants, improves DSR over the horizon.',
    icon: <DollarSignIcon size={14} />,
  },
  {
    id: 'commercial-transition',
    shortLabel: 'Commercial',
    fullLabel: 'Commercial Transition',
    description: 'Two-phase. Phase 1: build equity in residential. Phase 2: pivot to commercial yield.',
    icon: <BuildingIcon size={14} />,
  },
]

interface StrategyPresetSelectorProps {
  /**
   * - 'compact' (legacy segmented control)
   * - 'inline-chips' (rounded pill chips, fits inside the hero chat card on AgentHome)
   * - undefined / false → full stack of stretched rows (legacy behaviour)
   */
  compact?: boolean
  variant?: 'inline-chips'
}

export const StrategyPresetSelector: React.FC<StrategyPresetSelectorProps> = ({ compact = false, variant }) => {
  const { profile, updateProfile } = useInvestmentProfile()
  const currentPreset = profile.strategyPreset || 'eg-low'

  if (variant === 'inline-chips') {
    // Compact pill chips inside the home-page hero chat card. Slightly fuller
    // labels than the segmented control's short codes (e.g. "Equity Growth ·
    // Low" rather than "EG · Low"), neutral palette, flex-wraps to 2 rows
    // gracefully on narrower viewports.
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(({ id, fullLabel, icon }) => {
          const active = currentPreset === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => updateProfile({ strategyPreset: id })}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium transition-colors ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-[#535862] border-[#E9EAEB] hover:border-[#D5D7DA] hover:bg-[#F9FAFB]'
              }`}
              title={fullLabel}
            >
              <span className={active ? 'text-white' : 'text-[#717680]'}>{icon}</span>
              {fullLabel}
            </button>
          )
        })}
      </div>
    )
  }

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

  // Full mode — 5 full-stretch rows, one preset per row (used inside ChatPanel
  // empty state on the dashboard).
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
