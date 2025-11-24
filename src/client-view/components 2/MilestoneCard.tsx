import React from 'react'
import { CheckCircle2 } from 'lucide-react'

interface MilestoneCardProps {
  year: number
  title: string
  description: string
  isLast?: boolean
}

export function MilestoneCard({
  year,
  title,
  description,
  isLast = false,
}: MilestoneCardProps) {
  return (
    <div className="relative pl-14 mb-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-4 w-10 h-10 rounded-full bg-white border-3 border-amber-500 flex items-center justify-center shadow-md z-10">
        <span className="text-xs font-semibold text-gray-900">{year}</span>
      </div>
      {/* Card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-amber-600" />
          <h3
            className="text-base font-semibold text-[#0A0F1C]"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            {title}
          </h3>
        </div>
        {/* Description */}
        <div className="bg-white/60 rounded-md p-3">
          <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

