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
    <div className="relative pl-14 mb-3">
      {/* Timeline dot */}
      <div className="absolute left-0 top-3 w-10 h-10 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center z-10">
        <span className="text-xs font-semibold text-slate-700">{year}</span>
      </div>
      {/* Card - amber tinted grey */}
      <div className="bg-amber-50/60 rounded-lg p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
          <h3
            className="text-xs font-semibold text-slate-800"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {title}
          </h3>
        </div>
        {/* Description */}
        <div className="bg-white/70 rounded-md p-2">
          <p className="text-[10px] text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
