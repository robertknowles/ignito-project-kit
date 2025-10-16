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
          {data.map((year, index) => {
            const isExpanded = expandedYears.has(year.year || year.displayYear);
            const yearNumber = year.year || year.displayYear || 2025 + index;
            
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
              <React.Fragment key={yearNumber}>
                <tr 
                  className={`
                    border-b hover:bg-gray-50 cursor-pointer transition-colors
                    ${year.status === 'purchased' ? 'bg-green-50/50' : ''}
                  `}
                  onClick={() => toggleYear(yearNumber)}
                >
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {yearNumber}
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
                    <td colSpan={10} className="py-1 px-4">
                      <div className="space-y-4 text-xs">
                        
                        {/* ROW 1: Annual Cashflow & Funding */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Annual Cashflow Performance */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">💵 Annual Cashflow Performance</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3">├─ Gross Rental Income: {formatCurrency(year.grossRental || 0, true)}</div>
                              <div className="pl-3">├─ Loan Interest: -{formatCurrency(year.loanRepayments || 0, true)}</div>
                              <div className="pl-3">├─ Expenses (30% + 3% inflation): -{formatCurrency(year.expenses || 0, true)}</div>
                              <div className={`pl-3 ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                └─ Net Cashflow: {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow, true)}/year {netCashflow < 0 ? '(reduces funding capacity)' : ''}
                              </div>
                            </div>
                          </div>
                          
                          {/* Annual Funding Capacity */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">💰 Annual Funding Capacity</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3">├─ Base Annual Savings: {formatCurrency(year.annualSavingsRate || 0, true)}</div>
                              <div className="pl-3">├─ Cashflow Impact: {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow, true)}</div>
                              <div className="pl-3 font-medium">└─ Net Annual Capacity: {formatCurrency(year.totalAnnualCapacity || 0, true)}</div>
                            </div>
                          </div>
                          
                          {/* This Purchase Funding */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">🏠 This Purchase Funding</h4>
                            <div className="space-y-1 text-gray-600">
                              {(() => {
                                // Calculate how deposit is sourced from available funds
                                const depositFromBase = Math.min(year.requiredDeposit || 0, year.baseDeposit || 0);
                                const depositFromSavings = Math.max(0, Math.min((year.requiredDeposit || 0) - depositFromBase, year.cumulativeSavings || 0));
                                const depositFromEquity = Math.max(0, (year.requiredDeposit || 0) - depositFromBase - depositFromSavings);
                                
                                return (
                                  <>
                                    <div className="font-medium">Total Funds Used: {formatCurrency((year.requiredDeposit || 0) + 40000, true)}</div>
                                    <div className="pl-3">├─ Deposit Required: {formatCurrency(year.requiredDeposit || 0, true)}</div>
                                    <div className="pl-6">├─ From Base Deposit: {formatCurrency(depositFromBase, true)}</div>
                                    <div className="pl-6">├─ From Annual Savings: {formatCurrency(depositFromSavings, true)}</div>
                                    <div className="pl-6">└─ From Equity Release: {formatCurrency(depositFromEquity, true)}</div>
                                    <div className="pl-3">├─ Safety Buffer: £40k</div>
                                    <div className="pl-6">├─ From Base Deposit: £40k</div>
                                    <div className="pl-6">├─ From Annual Savings: £0</div>
                                    <div className="pl-6">└─ From Equity Release: £0</div>
                                    <div className="pl-3 font-medium flex items-center gap-1">
                                      └─ Total Sourced: {formatCurrency((year.requiredDeposit || 0) + 40000, true)} 
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Remaining After Purchase */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">💰 Remaining After Purchase</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3">├─ Base Deposit: {formatCurrency(Math.max(0, (year.baseDeposit || 0) - (year.requiredDeposit || 0) - 40000), true)} (was {formatCurrency((year.baseDeposit || 0) + (year.requiredDeposit || 0) + 40000, true)}, used {formatCurrency((year.requiredDeposit || 0) + 40000, true)})</div>
                              <div className="pl-3">├─ Accumulated Savings: {formatCurrency(year.cumulativeSavings || 0, true)} (unused)</div>
                              <div className="pl-3">├─ Equity Release: {formatCurrency(year.equityRelease || 0, true)} (unused)</div>
                              <div className="pl-3 font-medium">└─ Total Remaining: {formatCurrency((depositTest.available || 0) - (year.requiredDeposit || 0) - 40000, true)}</div>
                              <div className={`pt-1 font-medium ${depositTest.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Purchase Result: {formatCurrency(depositTest.surplus || 0, true)} surplus ({formatCurrency(depositTest.available || 0, true)} available - {formatCurrency((year.requiredDeposit || 0) + 40000, true)} used)
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* ROW 2: Portfolio & Debt Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {/* Portfolio Equity Growth */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">🏠 Portfolio Equity Growth</h4>
                            <div className="space-y-1 text-gray-600">
                              <div>Current Portfolio Value: {formatCurrency(portfolioValue, true)}</div>
                              <div>Total Equity: {formatCurrency(equity, true)}</div>
                              <div>Available for Extraction (88% LVR): {formatCurrency(year.extractableEquity || 0, true)}</div>
                              
                              {year.allPortfolioProperties && year.allPortfolioProperties.length > 0 && (
                                <>
                                  <div className="pt-1 font-medium text-gray-700">Property Breakdown:</div>
                                  {year.allPortfolioProperties.map((property: any, idx: number) => {
                                    // Calculate years owned to determine growth rate
                                    const yearsOwned = (yearNumber - property.purchaseYear);
                                    const growthRate = yearsOwned <= 2 ? 10 : 6;
                                    const growthLabel = yearsOwned <= 2 ? '(early years)' : '(steady state)';
                                    
                                    return (
                                      <div key={idx} className="pl-3 text-[11px]">
                                        Property #{idx + 1} ({property.purchaseYear}): {formatCurrency(property.currentValue, true)} value → {formatCurrency(property.equity, true)} equity → {formatCurrency(property.extractableEquity, true)} extractable (88% LVR) → {growthRate}% growth {growthLabel}
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* LVR Status */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">📊 LVR Status</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3">Current LVR: {formatPercentage(lvr)}</div>
                              <div className="pl-3">Trigger Level: 80.0%</div>
                              <div className="pl-3">Borrowing Capacity Remaining: {formatCurrency(year.availableBorrowingCapacity || 0, true)}</div>
                            </div>
                          </div>
                          
                          {/* Debt Position */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">💳 Debt Position</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3">├─ Existing Debt: {formatCurrency(year.existingDebt || 0, true)}</div>
                              <div className="pl-3">├─ New Loan Required: {formatCurrency(year.newDebt || 0, true)}</div>
                              <div className="pl-3">├─ Total Debt After: {formatCurrency(year.totalDebt || 0, true)}</div>
                              <div className="pl-3">└─ Borrowing Capacity Remaining: {formatCurrency(year.availableBorrowingCapacity || 0, true)}</div>
                            </div>
                          </div>
                          
                          {/* Borrowing Capacity Test */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">🔍 Borrowing Capacity Test</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3 flex items-center gap-1">
                                {year.borrowingCapacityTest?.pass ? 
                                  <CheckCircle className="w-3 h-3 text-green-500" /> : 
                                  <XCircle className="w-3 h-3 text-red-500" />
                                }
                                <span className={`text-xs ${year.borrowingCapacityTest?.pass ? 'text-green-600' : 'text-red-600'}`}>
                                  {year.borrowingCapacityTest?.pass ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="pl-3">├─ Borrowing Capacity Limit: {formatCurrency(year.borrowingCapacityTest?.available || 0, true)}</div>
                              <div className="pl-3">├─ Total Debt After Purchase: {formatCurrency(year.borrowingCapacityTest?.required || 0, true)}</div>
                              <div className="pl-3">└─ Remaining Capacity: {formatCurrency(year.borrowingCapacityTest?.surplus || 0, true)}</div>
                            </div>
                          </div>
                          
                          {/* Serviceability Test */}
                          <div>
                            <h4 className="font-semibold mb-0.5 text-sm">⚖️ Serviceability Test</h4>
                            <div className="space-y-1 text-gray-600">
                              <div className="pl-3 flex items-center gap-1">
                                {serviceabilityTest.pass ? 
                                  <CheckCircle className="w-3 h-3 text-green-500" /> : 
                                  <XCircle className="w-3 h-3 text-red-500" />
                                }
                                <span className={`text-xs ${serviceabilityTest.pass ? 'text-green-600' : 'text-red-600'}`}>
                                  {serviceabilityTest.pass ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="pl-3">├─ Existing Loan Interest: {formatCurrency(year.existingLoanInterest || 0, true)}</div>
                              <div className="pl-3">├─ New Loan Interest: {formatCurrency(year.newLoanInterest || 0, true)}</div>
                              <div className="pl-3">├─ Total Loan Interest: {formatCurrency((year.existingLoanInterest || 0) + (year.newLoanInterest || 0), true)}</div>
                              <div className="pl-3 font-medium text-gray-700">Max Allowable (Enhanced):</div>
                              <div className="pl-6">├─ Base Capacity (10%): {formatCurrency(year.baseServiceabilityCapacity || 0, true)}</div>
                              <div className="pl-6">├─ Rental Contribution (70%): {formatCurrency(year.rentalServiceabilityContribution || 0, true)}</div>
                              <div className="pl-6">├─ Gross Rental Income: {formatCurrency(year.grossRental || 0, true)}</div>
                              <div className="pl-6">└─ Total Max Allowable: {formatCurrency(serviceabilityTest.available || 0, true)}</div>
                              <div className="pl-3">└─ Surplus/Shortfall: {formatCurrency(serviceabilityTest.surplus || 0, true)}</div>
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
      
      {/* Key Assumptions - Static Values */}
      <div className="mt-6 bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-1 text-sm">🔑 Key Assumptions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="space-y-2">
            <div className="pl-4">├─ Interest Rate: 6.0%</div>
            <div className="pl-4">├─ Expense Ratio: 30% of rental income + 3% annual inflation</div>
          </div>
          <div className="space-y-2">
            <div className="pl-4">├─ Deposit Buffer: £40,000</div>
            <div className="pl-4">├─ LVR Limits: 80%</div>
          </div>
          <div className="space-y-2">
            <div className="pl-4">├─ Serviceability: 10% of borrowing capacity</div>
            <div className="pl-4">└─ Loan Type: Interest-only</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffordabilityBreakdownTable;
