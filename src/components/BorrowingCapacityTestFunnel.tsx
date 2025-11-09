import React from 'react';
import { Building2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { YearBreakdownData } from '@/types/property';

interface BorrowingCapacityTestFunnelProps {
  yearData: YearBreakdownData;
}

export const BorrowingCapacityTestFunnel: React.FC<BorrowingCapacityTestFunnelProps> = ({ yearData }) => {
  const { 
    borrowingCapacityTest,
    allPortfolioProperties,
    portfolioValue,
    totalEquity,
    extractableEquity,
    totalDebt,
    borrowingCapacity,
    lvr,
    newDebt
  } = yearData;
  
  const propertyCount = allPortfolioProperties?.length || 0;
  const equityBoost = extractableEquity * 0.88; // Simplified equity factor
  const effectiveCapacity = borrowingCapacity + equityBoost;
  const totalDebtAfter = totalDebt + newDebt;
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="border rounded-lg shadow-sm p-4 space-y-4 bg-white">
      {/* PASS/FAIL Badge */}
      <div className={`text-center p-3 rounded ${borrowingCapacityTest.pass ? 'bg-green-300/70 border border-green-300' : 'bg-red-300/70 border border-red-300'}`}>
        <div className="flex items-center justify-center gap-2">
          {borrowingCapacityTest.pass ? (
            <CheckCircle className="w-5 h-5 text-green-700" />
          ) : (
            <XCircle className="w-5 h-5 text-red-700" />
          )}
          <span className={`text-lg font-semibold ${borrowingCapacityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {borrowingCapacityTest.pass ? 'PASS' : 'FAIL'}
          </span>
        </div>
        <div className={`text-sm mt-1 ${borrowingCapacityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
          {borrowingCapacityTest.pass ? 'Surplus' : 'Shortfall'}: {formatCurrency(Math.abs(borrowingCapacityTest.surplus))}
        </div>
      </div>

      {/* Funnel Title */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <Building2 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Borrowing Capacity Test</h3>
      </div>

      {/* Section 1: Portfolio Overview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          Portfolio Overview
        </h4>
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Properties Owned</span>
            <span className="text-base font-semibold text-gray-800">{propertyCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Portfolio Value</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(portfolioValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Equity</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(totalEquity)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Extractable Equity (80% LVR)</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(extractableEquity)}</span>
          </div>
          {allPortfolioProperties && allPortfolioProperties.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-1">Property Breakdown:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {allPortfolioProperties.map((property, idx) => (
                  <div key={idx} className="text-xs text-gray-600 flex justify-between">
                    <span>#{idx + 1} {property.propertyType} ({property.displayPeriod})</span>
                    <span className="font-medium">{formatCurrency(property.currentValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: LVR & Debt Position */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          LVR & Debt Position
        </h4>
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Portfolio LVR</span>
            <span className={`text-base font-semibold ${lvr > 80 ? 'text-red-700' : 'text-gray-800'}`}>
              {lvr.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Existing Debt</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(totalDebt)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">New Loan Required</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(newDebt)}</span>
          </div>
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Debt After</span>
              <span className="text-base font-bold text-orange-700">{formatCurrency(totalDebtAfter)}</span>
            </div>
            <div className="text-xs italic text-gray-500 mt-1">
              {formatCurrency(totalDebt)} + {formatCurrency(newDebt)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Borrowing Capacity */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          Borrowing Capacity
        </h4>
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Base Capacity</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(borrowingCapacity)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Equity Boost (88% usable)</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(equityBoost)}</span>
          </div>
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Capacity</span>
              <span className="text-base font-bold text-blue-600">{formatCurrency(effectiveCapacity)}</span>
            </div>
            <div className="text-xs italic text-gray-500 mt-1">
              {formatCurrency(borrowingCapacity)} + ({formatCurrency(extractableEquity)} × 88%)
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: The Calculation */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          The Calculation
        </h4>
        <div className="bg-blue-50 rounded p-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-semibold text-blue-700">{formatCurrency(effectiveCapacity)}</span>
            <span className="text-gray-600">−</span>
            <span className="font-semibold text-orange-700">{formatCurrency(totalDebtAfter)}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className={`font-bold ${borrowingCapacityTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(borrowingCapacityTest.surplus)}
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: The Result */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          The Result
        </h4>
        <div className={`rounded p-3 ${borrowingCapacityTest.pass ? 'bg-green-300/70' : 'bg-red-300/70'}`}>
          <div className="text-center">
            <div className={`text-base font-semibold ${borrowingCapacityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
              {borrowingCapacityTest.pass 
                ? `Borrowing capacity test PASSED with ${formatCurrency(borrowingCapacityTest.surplus)} remaining`
                : `Borrowing capacity test FAILED with ${formatCurrency(Math.abs(borrowingCapacityTest.surplus))} shortfall`
              }
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {borrowingCapacityTest.pass 
                ? 'You have sufficient borrowing capacity for this purchase'
                : 'Your total debt would exceed your borrowing capacity'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

