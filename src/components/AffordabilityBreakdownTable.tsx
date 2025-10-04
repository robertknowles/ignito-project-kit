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
    if (year.consolidation?.triggered) {
      return `🔄 SELL Prop #${year.consolidation.propertyNumber || 1}`;
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
    if (year.consolidation?.triggered) return 'CONSOLIDATED';
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
            <th className="text-left p-3 font-semibold text-sm text-gray-700">Events This Year</th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              📈 Portfolio<br/>Value / Equity
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              💰 Cash Engine<br/>Available / Net Flow
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              🏦 Core Assumptions<br/>Int. Rate / Rental Rec.
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              🔑 Key Ratios<br/>LVR / DSR
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              💰 Deposit Test<br/>(Surplus/Shortfall)
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              📊 Serviceability<br/>Test (Surplus/Shortfall)
            </th>
            <th className="text-left p-3 font-semibold text-sm text-gray-700">
              ✅ Decision
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
                    ${year.consolidation?.triggered ? 'bg-orange-50/50' : ''}
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
                      <div>{formatCurrency(availableFunds, true)}</div>
                      <div className={netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow, true)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm">
                      <div>{formatPercentage(interestRate)}</div>
                      <div className="text-gray-600">{formatPercentage(rentalRecognition)}</div>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm">
                      <div>{formatPercentage(lvr)}</div>
                      <div className="text-gray-600">{formatPercentage(dsr)}</div>
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
                        year.status === 'purchased' ? 'default' : 
                        year.consolidation?.triggered ? 'secondary' :
                        'outline'
                      }
                      className={
                        year.status === 'purchased' ? 'bg-green-500' :
                        year.consolidation?.triggered ? 'bg-orange-500' : ''
                      }
                    >
                      {getDecisionStatus(year)}
                    </Badge>
                  </td>
                </tr>
                
                {/* Expanded Detail Row */}
                {isExpanded && (
                  <tr className="bg-gray-50 border-b">
                    <td colSpan={9} className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {/* Available Funds Breakdown */}
                        <div>
                          <h4 className="font-semibold mb-2">💰 Available Funds Breakdown</h4>
                          <div className="space-y-1 text-gray-600">
                            <div>Base Deposit: {formatCurrency(year.baseDeposit || 0)}</div>
                            <div>Cumulative Savings: {formatCurrency(year.cumulativeSavings || 0)}</div>
                            <div>Cashflow Reinvestment: {formatCurrency(year.cashflowReinvestment || 0)}</div>
                            <div>Equity Release: {formatCurrency(year.equityRelease || 0)}</div>
                            <div className="pt-2 border-t font-semibold text-gray-900">
                              Total: {formatCurrency(availableFunds)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Cashflow Details */}
                        <div>
                          <h4 className="font-semibold mb-2">💵 Portfolio Cashflow</h4>
                          <div className="space-y-1 text-gray-600">
                            <div>Gross Rental: {formatCurrency(year.grossRental)}</div>
                            <div>Loan Repayments: -{formatCurrency(year.loanRepayments)}</div>
                            <div>Expenses: -{formatCurrency(year.expenses)}</div>
                            <div className="pt-2 border-t font-semibold text-gray-900">
                              Net Cashflow: {formatCurrency(netCashflow)}/year
                            </div>
                          </div>
                        </div>
                        
                        {/* Debt Position */}
                          <div>
                            <h4 className="font-semibold mb-2">💳 Debt Position</h4>
                            <div className="space-y-1 text-gray-600">
                              <div>Existing Debt: {formatCurrency(year.totalDebt - (year.status === 'purchased' ? year.requiredLoan : 0))}</div>
                              {year.status === 'purchased' && <div>New Loan Required: {formatCurrency(year.requiredLoan)}</div>}
                              <div>Borrowing Capacity Remaining: {formatCurrency(year.availableBorrowingCapacity)}</div>
                              <div className="pt-2 border-t font-semibold text-gray-900">
                                Total Debt: {formatCurrency(year.totalDebt)}
                              </div>
                            </div>
                          </div>
                        
                        {/* Consolidation Details if applicable */}
                        {year.consolidation?.triggered && (
                          <div>
                            <h4 className="font-semibold mb-2">🔄 Consolidation Details</h4>
                            <div className="space-y-1 text-gray-600">
                              <div>Properties Sold: {year.consolidation.propertiesSold || 1}</div>
                              <div>Equity Freed: {formatCurrency(year.consolidation.equityFreed || 0)}</div>
                              <div>Debt Reduced: {formatCurrency(year.consolidation.debtReduced || 0)}</div>
                              <div>New LVR: {formatPercentage(year.consolidation.newLvr || 60)}</div>
                            </div>
                          </div>
                        )}
                        
                        {/* Strategy Insights */}
                        <div>
                          <h4 className="font-semibold mb-2">📈 Strategy Insights</h4>
                          <div className="space-y-1 text-gray-600">
                            <div>Portfolio Scaling: {year.portfolioScaling || 0} properties</div>
                            <div>Self-Funding Efficiency: {formatPercentage(year.selfFundingEfficiency || 0)}</div>
                            <div>Equity Recycling Impact: {formatPercentage(year.equityRecyclingImpact || 0)}</div>
                          </div>
                        </div>
                        
                        {/* Decision Logic */}
                        <div>
                          <h4 className="font-semibold mb-2">🚦 Decision Logic</h4>
                          <div className="space-y-1 text-gray-600">
                            {year.gapRule && <div className="text-blue-600">⏸️ 12-month gap rule enforced</div>}
                            {!depositTest.pass && <div className="text-red-600">❌ Deposit test failed</div>}
                            {!serviceabilityTest.pass && <div className="text-red-600">❌ Serviceability test failed</div>}
                            {year.status === 'purchased' && <div className="text-green-600">✅ All tests passed</div>}
                            {year.consolidation?.eligible && <div className="text-orange-600">⚠️ Consolidation eligible</div>}
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
    </div>
  );
};

export default AffordabilityBreakdownTable;
