import React from 'react';
import { Building2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { YearBreakdownData } from '@/types/property';
import { BreakdownInfo } from './BreakdownInfo';

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
    newDebt,
    existingDebt,
    equityBoost,
    effectiveCapacity,
    equityFactor
  } = yearData;
  
  const propertyCount = allPortfolioProperties?.length || 0;
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="border rounded-lg shadow-sm p-3 space-y-2 bg-white">
      {/* PASS/FAIL Badge */}
      <div className={`text-center p-2 rounded ${borrowingCapacityTest.pass ? 'bg-green-300/70 border border-green-300' : 'bg-red-300/70 border border-red-300'}`}>
        <div className="flex items-center justify-center gap-2">
          {borrowingCapacityTest.pass ? (
            <CheckCircle className="w-4 h-4 text-green-700" />
          ) : (
            <XCircle className="w-4 h-4 text-red-700" />
          )}
          <span className={`text-base font-semibold ${borrowingCapacityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {borrowingCapacityTest.pass ? 'PASS' : 'FAIL'}
          </span>
          <span className={`text-sm ${borrowingCapacityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {borrowingCapacityTest.pass ? 'Surplus' : 'Shortfall'}: {formatCurrency(Math.abs(borrowingCapacityTest.surplus))}
          </span>
        </div>
      </div>

      {/* Funnel Title */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <Building2 className="w-4 h-4 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-800">Borrowing Capacity Test</h3>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left column: Portfolio Overview + LVR */}
        <div className="space-y-2">
          {/* Section 1: Portfolio Overview */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium uppercase text-gray-700">
              Portfolio Overview
            </h4>
            <div className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Properties</span>
                <span className="text-xs font-semibold text-gray-800">{propertyCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Portfolio Value
                  <BreakdownInfo
                    title="Portfolio Composition"
                    items={
                      allPortfolioProperties && allPortfolioProperties.length > 0
                        ? allPortfolioProperties.map(property => ({
                            label: property.propertyType,
                            value: property.currentValue
                          }))
                        : [{ label: 'No properties', value: 0 }]
                    }
                    total={portfolioValue}
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(portfolioValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Total Equity
                  <BreakdownInfo
                    title="Equity Position"
                    items={[
                      { label: 'Portfolio Value', value: portfolioValue },
                      { label: 'Less: Total Debt', value: -totalDebt }
                    ]}
                    total={portfolioValue - totalDebt}
                    totalLabel="Net Equity"
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(totalEquity)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Extractable (80%)
                  <BreakdownInfo
                    title="Usable Equity Calculation"
                    items={[
                      { label: 'Portfolio Value', value: portfolioValue },
                      { label: 'Lending Limit (80%)', value: portfolioValue * 0.80 },
                      { label: 'Less: Current Debt', value: -totalDebt }
                    ]}
                    total={extractableEquity}
                    totalLabel="Available to Extract"
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(extractableEquity)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: LVR & Debt Position */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium uppercase text-gray-700">
              LVR & Debt
            </h4>
            <div className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Portfolio LVR
                  <BreakdownInfo
                    title="LVR Calculation"
                    items={[
                      { label: 'Total Portfolio Debt', value: totalDebt },
                      { label: 'Total Portfolio Value', value: portfolioValue },
                      { label: 'LVR (Debt ÷ Value)', value: lvr, isPercentage: true }
                    ]}
                  />
                </span>
                <span className={`text-xs font-semibold ${lvr > 80 ? 'text-red-700' : 'text-gray-800'}`}>
                  {lvr.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Existing Debt
                  <BreakdownInfo
                    title="Pre-Purchase Debt"
                    items={[
                      { label: 'Total Debt After Purchase', value: totalDebt },
                      { label: 'Less: New Property Loan', value: -newDebt }
                    ]}
                    total={existingDebt}
                    totalLabel="Existing Debt"
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(existingDebt || (totalDebt - newDebt))}</span>
              </div>
              <div className="pt-1 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">New Loan</span>
                  <span className="text-sm font-bold text-orange-700">{formatCurrency(newDebt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Borrowing Capacity */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium uppercase text-gray-700">
            Borrowing Capacity
          </h4>
          <div className="bg-gray-50 rounded p-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Base Capacity
                <BreakdownInfo
                  title="User Profile Setting"
                  items={[
                    { label: 'Max Borrowing Power', value: borrowingCapacity }
                  ]}
                  total={borrowingCapacity}
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(borrowingCapacity)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Equity Boost
                <BreakdownInfo
                  title="Borrowing Power Boost"
                  items={[
                    { label: 'Extractable Equity', value: extractableEquity },
                    { label: `Lender Factor (${(equityFactor * 100).toFixed(0)}%)`, value: equityBoost }
                  ]}
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(equityBoost)}</span>
            </div>
            <div className="pt-1 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700 flex items-center">
                  Total Capacity
                  <BreakdownInfo
                    title="Effective Capacity"
                    items={[
                      { label: 'Base Capacity (Income)', value: borrowingCapacity },
                      { label: 'Equity Boost', value: equityBoost }
                    ]}
                    total={effectiveCapacity}
                    totalLabel="Total Lending Limit"
                  />
                </span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(effectiveCapacity)}</span>
              </div>
              <div className="text-[10px] italic text-gray-500">
                {formatCurrency(borrowingCapacity)} + ({formatCurrency(extractableEquity)} × 75%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: The Calculation */}
      <div className="bg-blue-50 rounded p-2">
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Capacity</span>
            <span className="font-semibold text-blue-700">{formatCurrency(effectiveCapacity)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">− Existing Debt</span>
            <span className="font-semibold text-gray-700">−{formatCurrency(existingDebt || (totalDebt - newDebt))}</span>
          </div>
          <div className="flex items-center justify-between pb-1 border-b border-gray-300">
            <span className="text-gray-600">− New Loan</span>
            <span className="font-semibold text-orange-700">−{formatCurrency(newDebt)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-medium text-gray-700">= Remaining</span>
            <span className={`font-bold text-sm ${borrowingCapacityTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(borrowingCapacityTest.surplus)}
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: The Result */}
      <div className={`rounded p-2 ${borrowingCapacityTest.pass ? 'bg-green-300/70' : 'bg-red-300/70'}`}>
        <div className="text-center">
          <div className={`text-sm font-semibold ${borrowingCapacityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {borrowingCapacityTest.pass 
              ? `Borrowing capacity PASSED with ${formatCurrency(borrowingCapacityTest.surplus)} remaining`
              : `Borrowing capacity FAILED with ${formatCurrency(Math.abs(borrowingCapacityTest.surplus))} shortfall`
            }
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            {borrowingCapacityTest.pass 
              ? 'You have sufficient borrowing capacity for this purchase'
              : 'The new loan amount exceeds your available borrowing capacity'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

