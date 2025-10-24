import React, { useState, memo } from 'react';
import { 
  ChevronDown, ChevronRight, CheckCircle, XCircle, 
  AlertCircle, Clock, Activity, TrendingUp, Unlock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  data: any[]; // Your year data
  isCalculating?: boolean;
  hasChanges?: boolean;
}

export const AffordabilityBreakdownTable: React.FC<Props> = ({ data, isCalculating = false }) => {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  
  // Handle loading state
  if (isCalculating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Calculating breakdown...</p>
        </div>
      </div>
    );
  }
  
  // Handle empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 font-medium mb-2">No Properties Selected</p>
          <p className="text-sm text-gray-500">Select properties from the Building Blocks to see the decision engine analysis</p>
        </div>
      </div>
    );
  }
  
  // Aggregate periods into years - take the last period of each year (H2) but merge purchases
  const yearlyData = data
    .filter((row, index, array) => {
      const currentYear = Math.floor(row.year);
      const nextYear = array[index + 1] ? Math.floor(array[index + 1].year) : null;
      return currentYear !== nextYear; // Keep only the last period of each year
    })
    .map((row) => {
      // Find all periods from the same year and merge their purchases
      const currentYear = Math.floor(row.year);
      const samePeriods = data.filter(r => Math.floor(r.year) === currentYear);
      const allPurchases = samePeriods.flatMap(p => p.purchases || []);
      
      return {
        ...row,
        purchases: allPurchases
      };
    });
  
  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(year)) {
        newExpanded.delete(year);
      } else {
        newExpanded.add(year);
      }
      return newExpanded;
    });
  };
  
  const formatCurrency = (value: number, compact = false) => {
    if (compact) {
      if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
    }
    return `£${value.toLocaleString()}`;
  };
  
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  
  // Determine event description
  const getEventDescription = (year: any) => {
    if (year.status === 'purchased') {
      return `✅ BUY Prop #${year.propertyNumber || 1}`;
    }
    if (year.equityRelease > 0) {
      return `🔄 Equity Release`;
    }
    if (year.gapRule) {
      return '-';
    }
    if (year.status === 'blocked') {
      return '-';
    }
    return 'Initial State';
  };
  
  // Determine decision status
  const getDecisionStatus = (year: any) => {
    if (year.status === 'purchased') return 'PURCHASED';
    if (year.gapRule) return 'Waiting...';
    if (!year.depositTest?.pass || !year.serviceabilityTest?.pass) return 'Blocked';
    return '-';
  };
  
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse bg-white">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="text-left p-3 font-semibold text-sm text-gray-700">Year</th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">Events</th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Portfolio Value/Equity
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Available Funds
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Net Cashflow
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              LVR
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Rental Recognition
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Deposit Test
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Serviceability Test
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              Decision
            </th>
          </tr>
        </thead>
        <tbody>
          {yearlyData.map((year, index) => {
            const displayYear = Math.floor(year.year);
            const isExpanded = expandedYears.has(displayYear);
            
            // Use values directly from calculator (no fallbacks needed)
            const portfolioValue = year.portfolioValue;
            const equity = year.totalEquity;
            const availableFunds = year.availableDeposit;
            const netCashflow = year.annualCashFlow;
            const interestRate = year.interestRate;
            const rentalRecognition = year.rentalRecognition;
            const lvr = year.lvr;
            const dsr = year.dsr;
            
            // Test results (from calculator)
            const depositTest = year.depositTest;
            const serviceabilityTest = year.serviceabilityTest;
            
            return (
              <React.Fragment key={displayYear}>
                <tr 
                  className={`
                    border-b hover:bg-gray-50 cursor-pointer transition-colors
                    ${year.status === 'purchased' ? 'bg-green-50/50' : ''}
                  `}
                  onClick={() => toggleYear(displayYear)}
                >
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span>{displayYear}</span>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <span className="text-sm font-medium">
                      {getEventDescription(year)}
                    </span>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm">
                      <div>{formatCurrency(portfolioValue, true)}</div>
                      <div className="text-gray-600">{formatCurrency(equity, true)}</div>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm">
                      {formatCurrency(availableFunds, true)}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className={`text-sm ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow, true)}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm">
                      {formatPercentage(lvr)}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm">
                      {formatPercentage(rentalRecognition)}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {depositTest.pass ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className={`text-sm ${depositTest.pass ? 'text-green-600' : 'text-red-600'}`}>
                        {depositTest.pass ? '+' : ''}{formatCurrency(depositTest.surplus, true)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {serviceabilityTest.pass ? 
                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                        <XCircle className="w-4 h-4 text-red-500" />
                      }
                      <span className={`text-sm ${serviceabilityTest.pass ? 'text-green-600' : 'text-red-600'}`}>
                        {serviceabilityTest.pass ? '+' : ''}{formatCurrency(serviceabilityTest.surplus, true)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <Badge 
                      variant={
                        year.status === 'purchased' ? 'default' : 'outline'
                      }
                      className={
                        year.status === 'purchased' ? 'bg-green-500' : ''
                      }
                    >
                      {getDecisionStatus(year)}
                    </Badge>
                  </td>
                </tr>
                
                {/* Expanded Detail Row */}
                {isExpanded && (
                  <tr className="bg-gray-50 border-b">
                    <td colSpan={10} className="py-3 px-4">
                      <div className="space-y-3 text-xs">
                        
                        {/* ROW 1: Annual Cashflow & Funding (4 sections) - Reordered */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Section 1: This Purchase Funding (moved to first position) */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">🏠 This Purchase Funding</h4>
                            </div>
                            {(() => {
                              const depositFromBase = Math.min(year.requiredDeposit || 0, year.baseDeposit || 0);
                              const depositFromSavings = Math.max(0, Math.min((year.requiredDeposit || 0) - depositFromBase, year.cumulativeSavings || 0));
                              const depositFromEquity = Math.max(0, (year.requiredDeposit || 0) - depositFromBase - depositFromSavings);
                              
                              return (
                                <div className="divide-y divide-gray-100">
                                  <div className="flex justify-between px-3 py-1 bg-[#f9fafb]">
                                    <span className="font-medium text-[#374151]">Total Funds Used</span>
                                    <span className="font-bold text-right text-[#111827]">{formatCurrency((year.requiredDeposit || 0) + 40000, true)}</span>
                                  </div>
                                  <div className="px-3 py-1 bg-white">
                                    <div className="flex justify-between mb-0.5">
                                      <span className="font-medium text-[#374151]">Deposit Required</span>
                                      <span className="font-medium text-right text-[#111827]">{formatCurrency(year.requiredDeposit || 0, true)}</span>
                                    </div>
                                    <div className="flex justify-between pl-3 py-0.5">
                                      <span className="text-[#6b7280] text-[10px]">From Base</span>
                                      <span className="text-[10px] text-right text-[#374151]">{formatCurrency(depositFromBase, true)}</span>
                                    </div>
                                    <div className="flex justify-between pl-3 py-0.5">
                                      <span className="text-[#6b7280] text-[10px]">From Savings</span>
                                      <span className="text-[10px] text-right text-[#374151]">{formatCurrency(depositFromSavings, true)}</span>
                                    </div>
                                    <div className="flex justify-between pl-3 py-0.5">
                                      <span className="text-[#6b7280] text-[10px]">From Equity</span>
                                      <span className="text-[10px] text-right text-[#374151]">{formatCurrency(depositFromEquity, true)}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between px-3 py-1 bg-white">
                                    <span className="text-[#374151]">Safety Buffer</span>
                                    <span className="font-medium text-right text-[#111827]">£40k</span>
                                  </div>
                                  <div className="flex justify-between px-3 py-1 bg-green-50">
                                    <span className="font-medium text-[#374151] flex items-center gap-1">
                                      Total Sourced
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    </span>
                                    <span className="font-bold text-right text-[#111827]">{formatCurrency((year.requiredDeposit || 0) + 40000, true)}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Section 2: Annual Funding Capacity (stays at position 2) */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">💰 Annual Funding Capacity</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Base Annual Savings</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.annualSavingsRate || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Cashflow Impact</span>
                                <span className={`font-medium text-right ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow, true)}
                                </span>
                              </div>
                              <div className="flex justify-between px-3 py-1.5 bg-[#f9fafb]">
                                <span className="font-medium text-[#374151]">Net Annual Capacity</span>
                                <span className="font-bold text-right text-[#111827]">{formatCurrency(year.totalAnnualCapacity || 0, true)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Section 3: Annual Cashflow Performance (moved to position 3) */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">💵 Annual Cashflow Performance</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Gross Rental Income</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.grossRental || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Loan Interest</span>
                                <span className="font-medium text-right text-red-600">-{formatCurrency(year.loanRepayments || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Expenses (30% + 3%)</span>
                                <span className="font-medium text-right text-red-600">-{formatCurrency(year.expenses || 0, true)}</span>
                              </div>
                              <div className={`flex justify-between px-3 py-1.5 bg-[#f9fafb] ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="font-medium">Net Cashflow</span>
                                <span className="font-bold text-right">{netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow, true)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Section 4: Remaining After Purchase (stays at position 4) */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">💰 Remaining After Purchase</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Base Deposit</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(Math.max(0, (year.baseDeposit || 0) - (year.requiredDeposit || 0) - 40000), true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Accumulated Savings</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.cumulativeSavings || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Equity Release</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.equityRelease || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-[#f9fafb]">
                                <span className="font-medium text-[#374151]">Total Remaining</span>
                                <span className="font-bold text-right text-[#111827]">{formatCurrency((depositTest.available || 0) - (year.requiredDeposit || 0) - 40000, true)}</span>
                              </div>
                              <div className={`px-3 py-1.5 ${depositTest.surplus >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                <div className="flex justify-between">
                                  <span className={`font-medium ${depositTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>Purchase Result</span>
                                  <span className={`font-bold text-right ${depositTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatCurrency(depositTest.surplus || 0, true)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* ROW 2: Portfolio & Debt Analysis (5 sections) */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          {/* Section 5: Portfolio Equity Growth */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">🏠 Portfolio Equity Growth</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Portfolio Value</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(portfolioValue, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Total Equity</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(equity, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Extractable (88% LVR)</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.extractableEquity || 0, true)}</span>
                              </div>
                              {year.allPortfolioProperties && year.allPortfolioProperties.length > 0 && (
                                <div className="px-3 py-1 bg-[#f9fafb]">
                                  <div className="font-medium text-[#374151] mb-1 text-[10px]">Property Breakdown:</div>
                                  {year.allPortfolioProperties.map((property: any, idx: number) => {
                                    const yearsOwned = (displayYear - property.purchaseYear);
                                    const growthRate = yearsOwned <= 2 ? 10 : 6;
                                    
                                    return (
                                      <div key={idx} className="text-[9px] text-[#6b7280] leading-tight mb-0.5">
                                        <div className="flex justify-between">
                                          <span>Prop #{idx + 1} ({property.displayPeriod})</span>
                                          <span>{growthRate}%</span>
                                        </div>
                                        <div className="flex justify-between pl-2">
                                          <span>Value/Equity/Extract</span>
                                          <span>{formatCurrency(property.currentValue, true)}/{formatCurrency(property.equity, true)}/{formatCurrency(property.extractableEquity, true)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Section 6: LVR Status */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">📊 LVR Status</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Current LVR</span>
                                <span className="font-medium text-right text-[#111827]">{formatPercentage(lvr)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Trigger Level</span>
                                <span className="font-medium text-right text-[#111827]">80.0%</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-[#f9fafb]">
                                <span className="font-medium text-[#374151]">Capacity Remaining</span>
                                <span className="font-bold text-right text-[#111827]">{formatCurrency(year.availableBorrowingCapacity || 0, true)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Section 7: Debt Position */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">💳 Debt Position</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Existing Debt</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.existingDebt || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">New Loan Required</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.newDebt || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Total Debt After</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.totalDebt || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-[#f9fafb]">
                                <span className="font-medium text-[#374151]">Capacity Remaining</span>
                                <span className="font-bold text-right text-[#111827]">{formatCurrency(year.availableBorrowingCapacity || 0, true)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Section 8: Borrowing Capacity Test */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">🔍 Borrowing Capacity Test</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className={`flex justify-between px-3 py-1 ${year.borrowingCapacityTest?.pass ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className="flex items-center gap-1">
                                  {year.borrowingCapacityTest?.pass ? 
                                    <CheckCircle className="w-3 h-3 text-green-500" /> : 
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  }
                                  <span className={`font-medium ${year.borrowingCapacityTest?.pass ? 'text-green-700' : 'text-red-700'}`}>
                                    {year.borrowingCapacityTest?.pass ? 'PASS' : 'FAIL'}
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Capacity Limit</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.borrowingCapacityTest?.available || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Debt After Purchase</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.borrowingCapacityTest?.required || 0, true)}</span>
                              </div>
                              <div className={`flex justify-between px-3 py-1 ${year.borrowingCapacityTest?.surplus >= 0 ? 'bg-[#f9fafb]' : 'bg-red-50'}`}>
                                <span className="font-medium text-[#374151]">Remaining Capacity</span>
                                <span className={`font-bold text-right ${year.borrowingCapacityTest?.surplus >= 0 ? 'text-[#111827]' : 'text-red-700'}`}>
                                  {formatCurrency(year.borrowingCapacityTest?.surplus || 0, true)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Section 9: Serviceability Test */}
                          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-md overflow-hidden">
                            <div className="bg-[#f3f4f6] px-3 py-1.5 border-b border-[#e5e7eb]">
                              <h4 className="font-semibold text-[11px] text-[#374151]">⚖️ Serviceability Test</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                              <div className={`flex justify-between px-3 py-1 ${serviceabilityTest.pass ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span className="flex items-center gap-1">
                                  {serviceabilityTest.pass ? 
                                    <CheckCircle className="w-3 h-3 text-green-500" /> : 
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  }
                                  <span className={`font-medium ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
                                    {serviceabilityTest.pass ? 'PASS' : 'FAIL'}
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">Existing Interest</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.existingLoanInterest || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-white">
                                <span className="text-[#374151]">New Interest</span>
                                <span className="font-medium text-right text-[#111827]">{formatCurrency(year.newLoanInterest || 0, true)}</span>
                              </div>
                              <div className="flex justify-between px-3 py-1 bg-[#f9fafb]">
                                <span className="font-medium text-[#374151]">Total Interest</span>
                                <span className="font-bold text-right text-[#111827]">{formatCurrency((year.existingLoanInterest || 0) + (year.newLoanInterest || 0), true)}</span>
                              </div>
                              <div className="px-3 py-1 bg-white">
                                <div className="text-[10px] font-medium text-[#374151] mb-0.5">Max Allowable:</div>
                                <div className="flex justify-between pl-2 py-0.5">
                                  <span className="text-[#6b7280] text-[10px]">Base (10%)</span>
                                  <span className="text-[10px] text-right text-[#374151]">{formatCurrency(year.baseServiceabilityCapacity || 0, true)}</span>
                                </div>
                                <div className="flex justify-between pl-2 py-0.5">
                                  <span className="text-[#6b7280] text-[10px]">Rental (70%)</span>
                                  <span className="text-[10px] text-right text-[#374151]">{formatCurrency(year.rentalServiceabilityContribution || 0, true)}</span>
                                </div>
                                <div className="flex justify-between pl-2 py-0.5">
                                  <span className="text-[#6b7280] text-[10px]">Gross Rental</span>
                                  <span className="text-[10px] text-right text-[#374151]">{formatCurrency(year.grossRental || 0, true)}</span>
                                </div>
                                <div className="flex justify-between font-medium text-[#374151] pt-0.5">
                                  <span className="text-[10px]">Total Max</span>
                                  <span className="text-[10px] text-right">{formatCurrency(serviceabilityTest.available || 0, true)}</span>
                                </div>
                              </div>
                              <div className={`flex justify-between px-3 py-1 ${serviceabilityTest.surplus >= 0 ? 'bg-[#f9fafb]' : 'bg-red-50'}`}>
                                <span className="font-medium text-[#374151]">Surplus/Shortfall</span>
                                <span className={`font-bold text-right ${serviceabilityTest.surplus >= 0 ? 'text-[#111827]' : 'text-red-700'}`}>
                                  {formatCurrency(serviceabilityTest.surplus || 0, true)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {/* Key Assumptions - Clean Table Format */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <h4 className="font-semibold text-sm">🔑 Key Assumptions</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Interest Rate</span>
              <span className="font-medium">6.0%</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Expense Ratio</span>
              <span className="font-medium">30% + 3%</span>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Deposit Buffer</span>
              <span className="font-medium">£40,000</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">LVR Limits</span>
              <span className="font-medium">80%</span>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Serviceability</span>
              <span className="font-medium">10% + 70% rental</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Loan Type</span>
              <span className="font-medium">Interest-only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffordabilityBreakdownTable;
