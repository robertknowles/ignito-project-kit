import React from 'react'

import { Trophy } from 'lucide-react'

export function GoalAchievedCard() {
  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div className="absolute left-0 top-5 w-10 h-10 rounded-full bg-white border-3 border-green-500 flex items-center justify-center shadow-md z-10">
        <Trophy className="w-5 h-5 text-green-500" />
      </div>
      {/* Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-md p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3
              className="text-base font-semibold text-[#0A0F1C]"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Portfolio Goal Achieved — Year 2045
            </h3>
          </div>
        </div>
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Portfolio Value
            </p>
            <p className="text-base font-semibold text-gray-900">$7.0M</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Total Equity
            </p>
            <p className="text-base font-semibold text-gray-900">$2.0M</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Passive Income
            </p>
            <p className="text-base font-semibold text-green-600">
              $100k–120k p.a.
            </p>
          </div>
        </div>
        {/* Tagline */}
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <p className="text-xs text-gray-700 leading-relaxed text-center">
            Financial independence achieved through diversified residential and
            commercial assets.
          </p>
        </div>
      </div>
    </div>
  )
}

