import React from 'react'
import { BarChart3 } from 'lucide-react'

interface PlaceholderChartProps {
  label: string
  height?: number
}

/**
 * PlaceholderChart — UUI-style empty chart placeholder
 *
 * Shows a dashed border region with an icon and label indicating
 * what chart will be built here. Matches the neutral design tokens.
 */
export const PlaceholderChart: React.FC<PlaceholderChartProps> = ({ label, height = 180 }) => (
  <div
    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50"
    style={{ height }}
  >
    <BarChart3 size={24} className="text-neutral-300 mb-2" />
    <span className="text-xs font-semibold text-neutral-400">{label}</span>
    <span className="text-[10px] text-neutral-300 mt-1">Coming soon</span>
  </div>
)
