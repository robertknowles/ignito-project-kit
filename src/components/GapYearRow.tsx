import React, { useState } from 'react';
import { DepositTestFunnel } from './DepositTestFunnel';
import { ServiceabilityTestFunnel } from './ServiceabilityTestFunnel';
import { BorrowingCapacityTestFunnel } from './BorrowingCapacityTestFunnel';
import type { YearBreakdownData } from '@/types/property';

interface GapYearRowProps {
  yearData: YearBreakdownData;
}

export const GapYearRow: React.FC<GapYearRowProps> = ({ yearData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="border-t border-gray-100 py-2">
      {/* Compact Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
        Year {Math.floor(yearData.year)} | 
        Portfolio: {formatCurrency(yearData.portfolioValue)} | 
        Equity: {formatCurrency(yearData.totalEquity)} | 
        LVR: {yearData.lvr.toFixed(1)}% | 
        Available: {formatCurrency(yearData.availableDeposit)} | 
        Deposit: <span className={yearData.depositTest.pass ? '' : 'text-red-700'} style={yearData.depositTest.pass ? { color: '#87B5FA' } : {}}>
          {yearData.depositTest.pass ? 'PASS' : 'FAIL'}
        </span> | 
        Serviceability: <span className={yearData.serviceabilityTest.pass ? '' : 'text-red-700'} style={yearData.serviceabilityTest.pass ? { color: '#87B5FA' } : {}}>
          {yearData.serviceabilityTest.pass ? 'PASS' : 'FAIL'}
        </span> | 
        Borrowing: <span className={yearData.borrowingCapacityTest.pass ? '' : 'text-red-700'} style={yearData.borrowingCapacityTest.pass ? { color: '#87B5FA' } : {}}>
          {yearData.borrowingCapacityTest.pass ? 'PASS' : 'FAIL'}
        </span>
      </button>
      
      {/* Expanded: Three Funnels */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-50 p-4 rounded">
          <DepositTestFunnel yearData={yearData} />
          <ServiceabilityTestFunnel yearData={yearData} />
          <BorrowingCapacityTestFunnel yearData={yearData} />
        </div>
      )}
    </div>
  );
};

