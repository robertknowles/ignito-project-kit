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
  /** Accent colour used for the icon + active background (Tailwind hex literals). */
  accent: string
  /** Subtle tinted bg used in the inactive chip state. */
  tint: string
}

const PRESETS: PresetMeta[] = [
  {
    id: 'eg-low',
    shortLabel: 'EG · Low',
    fullLabel: 'Equity Growth, Low Price',
    description: 'Scale through volume. Multiple growth-mode assets at lower entry.',
    icon: <TrendingUpIcon size={14} />,
    accent: '#059669', // emerald-600
    tint: '#ECFDF5', // emerald-50
  },
  {
    id: 'eg-high',
    shortLabel: 'EG · High',
    fullLabel: 'Equity Growth, High Price',
    description: 'Concentrate in fewer larger assets. Stronger land content.',
    icon: <TrendingUpIcon size={14} />,
    accent: '#047857', // emerald-700
    tint: '#D1FAE5', // emerald-100
  },
  {
    id: 'cf-low',
    shortLabel: 'CF · Low',
    fullLabel: 'Cash Flow, Low Price',
    description: 'Yield-focused, accept higher property count.',
    icon: <DollarSignIcon size={14} />,
    accent: '#D97706', // amber-600
    tint: '#FFFBEB', // amber-50
  },
  {
    id: 'cf-high',
    shortLabel: 'CF · High',
    fullLabel: 'Cash Flow, High Price',
    description: 'Strong yield at scale. Premium tenants, improves DSR.',
    icon: <DollarSignIcon size={14} />,
    accent: '#B45309', // amber-700
    tint: '#FEF3C7', // amber-100
  },
  {
    id: 'commercial-transition',
    shortLabel: 'Commercial',
    fullLabel: 'Commercial Transition',
    description: 'Phase 1: build equity in residential. Phase 2: pivot to commercial yield.',
    icon: <BuildingIcon size={14} />,
    accent: '#4F46E5', // indigo-600
    tint: '#EEF2FF', // indigo-50
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
    // Pill-shaped chips — designed to live inside the hero chat card on the
    // home page (Adobe-style "in-prompt controls"). Each preset has its own
    // accent colour so they're scannable rather than monochrome.
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(({ id, shortLabel, icon, accent, tint }) => {
          const active = currentPreset === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => updateProfile({ strategyPreset: id })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium transition-colors"
              style={
                active
                  ? {
                      backgroundColor: accent,
                      borderColor: accent,
                      color: '#FFFFFF',
                    }
                  : {
                      backgroundColor: tint,
                      borderColor: 'transparent',
                      color: accent,
                    }
              }
              title={shortLabel}
            >
              <span style={{ color: active ? '#FFFFFF' : accent }}>{icon}</span>
              {shortLabel}
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
