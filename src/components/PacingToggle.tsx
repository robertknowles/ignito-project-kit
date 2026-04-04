/**
 * PacingToggle — 3-button segmented control for acquisition pacing.
 *
 * Controls how aggressively properties are acquired:
 * - Aggressive: buy as soon as affordable (minimum viable deposit)
 * - Balanced: 15% buffer above minimum (default)
 * - Conservative: 30% buffer, larger deposits, lower LVR per property
 */

import React from 'react'
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile'

type PacingMode = 'aggressive' | 'balanced' | 'conservative'

const MODES: { value: PacingMode; label: string }[] = [
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'conservative', label: 'Conservative' },
]

export const PacingToggle: React.FC = () => {
  const { profile, updateProfile } = useInvestmentProfile()
  const currentMode = profile.pacingMode || 'balanced'

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => updateProfile({ pacingMode: value })}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            currentMode === value
              ? 'bg-gray-800 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
