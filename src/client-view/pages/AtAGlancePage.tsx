import React from 'react'

import { PortfolioChart } from '../components/PortfolioChart'
import { CashflowChart } from '../components/CashflowChart'
import { Target, TrendingUp } from 'lucide-react'

interface AtAGlancePageProps {
  investmentProfile: any;
  propertySelections: any[];
}

export function AtAGlancePage({ investmentProfile, propertySelections }: AtAGlancePageProps) {
  // Format currency helper
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Extract investment goals with defaults
  const equityGoal = investmentProfile?.equityGoal || 1000000;
  const incomeGoal = investmentProfile?.cashflowGoal || 50000;
  const targetYear = investmentProfile?.targetYear || 2040;

  // TODO: In next prompts, we'll calculate these from actual data
  // For now, using placeholder logic
  const equityGoalYear = 2031;
  const incomeGoalYear = 2036;
  const equityYearsAhead = targetYear - equityGoalYear;
  const incomeYearsAhead = targetYear - incomeGoalYear;
  return (
    <div className="w-full min-h-[297mm] bg-[#f9fafb] p-16">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-gray-500 mb-2">Year-End Financial Report</p>
        <h1
          className="text-4xl font-semibold text-gray-900"
          style={{
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          Investment Strategy At A Glance
        </h1>
      </div>
      {/* Goals Section */}
      <div className="grid grid-cols-2 gap-4 mb-12">
        {/* Investment Goals Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-500" />
            <h2
              className="text-lg font-semibold text-gray-900"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Investment Goals
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Equity Goal
              </p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(equityGoal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Passive Income Goal
              </p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(incomeGoal)}/year</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Target Year
              </p>
              <p className="text-xl font-semibold text-blue-600">{targetYear}</p>
            </div>
          </div>
        </div>
        {/* Goal Achieved Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h2
              className="text-lg font-semibold text-gray-900"
              style={{
                fontFamily: 'Figtree, sans-serif',
              }}
            >
              Goal Achieved
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Equity Goal
              </p>
              <p className="text-xl font-semibold text-green-600">{equityGoalYear}</p>
              <p className="text-xs text-gray-600 mt-1">
                {equityYearsAhead > 0 
                  ? `${equityYearsAhead} years ahead of target`
                  : equityYearsAhead < 0
                  ? `${Math.abs(equityYearsAhead)} years behind target`
                  : 'On target'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Cashflow Goal
              </p>
              <p className="text-xl font-semibold text-green-600">{incomeGoalYear}</p>
              <p className="text-xs text-gray-600 mt-1">
                {incomeYearsAhead > 0
                  ? `${incomeYearsAhead} years ahead of target`
                  : incomeYearsAhead < 0
                  ? `${Math.abs(incomeYearsAhead)} years behind target`
                  : 'On target'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Charts */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <PortfolioChart />
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <CashflowChart />
        </div>
      </div>
      {/* Footer */}
      <div className="mt-12 flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">IGNITO</div>
        <div className="text-sm text-gray-500">Page 2</div>
      </div>
    </div>
  )
}

