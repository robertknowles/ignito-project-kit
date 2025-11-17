import React from 'react'

import { Building2, Home, TrendingUp, Target } from 'lucide-react'

export function StrategyPathwayPage() {
  return (
    <div className="w-full min-h-[297mm] bg-[#f9fafb] p-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-500 mb-1">Detailed Investment Plan</p>
        <h1
          className="text-3xl font-semibold text-gray-900 mb-6"
          style={{
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          Commercial and Residential Portfolio Overview
        </h1>
        <p className="text-sm text-gray-600">2035–2045</p>
      </div>
      {/* Residential Portfolio Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-blue-500" />
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            Residential Portfolio
          </h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$1.5M borrowing capacity</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$1.4M current portfolio</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$2.0M to be acquired (4 × $500–600k properties)</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">→</span>
              <p className="text-gray-900">
                <span className="font-semibold">Target:</span> $3.4M portfolio
                growing at 7% per year
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">→</span>
              <p className="text-gray-900">$4.8M projected value in 5 years</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">→</span>
              <p className="text-gray-900">$1.4M equity ($2.0M if sold off)</p>
            </div>
          </div>
        </div>
      </div>
      {/* Savings & Cashflow Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            Savings & Cashflow
          </h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$400–600k savings built over 24–36 months (~$20k/month)</p>
          </div>
        </div>
      </div>
      {/* Commercial Scenario Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-500" />
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            Commercial Scenario
          </h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$500k + $100k equity = $1.5M commercial property</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$550k needed to complete purchase</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>6–7% yield = $12–20k positive cashflow</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">•</span>
            <p>$100–120k p.a. passive once debt-free (10–12 years)</p>
          </div>
        </div>
      </div>
      {/* Long-Term Outcome Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-600" />
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{
              fontFamily: 'Figtree, sans-serif',
            }}
          >
            Long-Term Outcome
          </h2>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-blue-500">•</span>
            <p>
              $2.0M commercial base + $400–600k savings = $7.0M total exposure @
              70% LVR
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500">•</span>
            <p>
              7% yield → $501k total income redirected into property over 10
              years
            </p>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">IGNITO</div>
        <div className="text-sm text-gray-500">Page 4</div>
      </div>
    </div>
  )
}

