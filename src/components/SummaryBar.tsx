import React from 'react'
import { SimulationResults } from '../hooks/useSimulationEngine'

interface SummaryBarProps {
  simulationResults: SimulationResults | null;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ simulationResults }) => {
  // Default values when no simulation results
  const defaultValues = {
    finalPortfolioValue: 0,
    numberOfProperties: 0,
    finalAnnualCashflow: 0,
    totalEquityAchieved: 0,
    totalCashRequired: 0
  };

  const summary = simulationResults?.summary || defaultValues;

  // Format large numbers
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    } else if (value === 0) {
      return '$0';
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-6">
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Final Portfolio Value</h4>
          <p className="text-[#111827] font-medium">{formatValue(summary.finalPortfolioValue)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Properties</h4>
          <p className="text-[#111827] font-medium">{summary.numberOfProperties}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Annual Cashflow</h4>
          <p className="text-[#111827] font-medium">{formatValue(summary.finalAnnualCashflow)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Total Equity</h4>
          <p className="text-[#111827] font-medium">{formatValue(summary.totalEquityAchieved)}</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Cash Required</h4>
          <p className="text-[#111827] font-medium">{formatValue(summary.totalCashRequired)}</p>
        </div>
      </div>
    </div>
  )
}