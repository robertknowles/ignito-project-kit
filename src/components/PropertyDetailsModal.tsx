import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { usePerPropertyTracking } from '../hooks/usePerPropertyTracking';
import type { TimelineProperty } from '../types/property';

interface PropertyDetailsModalProps {
  property: TimelineProperty | null;
  isOpen: boolean;
  onClose: () => void;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format compact currency
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Format Y-axis
const formatYAxis = (value: number) => {
  if (value === 0) return '$0';
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${Math.round(absValue / 1000)}K`;
  }
  return `${sign}$${absValue}`;
};

// KPI Card component
interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subValue }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{label}</div>
    <div className="text-xl font-semibold text-gray-900">{value}</div>
    {subValue && (
      <div className="text-xs text-gray-400 mt-1">{subValue}</div>
    )}
  </div>
);

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  
  // Get tracking data for the property
  const { trackingData } = usePerPropertyTracking(property?.instanceId || null);
  
  // Prepare chart data from tracking data
  const chartData = useMemo(() => {
    if (!trackingData) return [];
    
    return trackingData.equityOverTime.map((equity, index) => {
      const cashflow = trackingData.cashflowOverTime[index];
      return {
        year: (trackingData.purchaseYear + equity.year - 1).toString(),
        propertyValue: equity.propertyValue,
        loanBalance: equity.loanBalance,
        equity: equity.equity,
        rentalIncome: cashflow?.grossIncome || 0,
        expenses: cashflow?.totalExpenses || 0,
        netCashflow: cashflow?.netCashflow || 0,
      };
    });
  }, [trackingData]);
  
  if (!property) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span className="text-xl font-semibold">{property.title}</span>
              <span className="text-gray-500 ml-2 text-base font-normal">
                · {property.displayPeriod}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="details">Property Details</TabsTrigger>
            <TabsTrigger value="timeline">Year-by-Year Impact</TabsTrigger>
            <TabsTrigger value="performance">Performance Charts</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            {/* Tab 1: Property Details */}
            <TabsContent value="details" className="mt-0">
              <div className="space-y-6 p-1">
                {/* Purchase Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Purchase Details</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <KPICard
                      label="Purchase Price"
                      value={formatCompactCurrency(property.cost)}
                    />
                    <KPICard
                      label="Deposit Required"
                      value={formatCompactCurrency(property.depositRequired)}
                      subValue={`${((property.depositRequired / property.cost) * 100).toFixed(0)}% of price`}
                    />
                    <KPICard
                      label="Loan Amount"
                      value={formatCompactCurrency(property.loanAmount)}
                      subValue={property.loanType === 'IO' ? 'Interest Only' : 'Principal & Interest'}
                    />
                  </div>
                </div>
                
                {/* Acquisition Costs */}
                {property.acquisitionCosts && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Acquisition Costs</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <KPICard
                        label="Stamp Duty"
                        value={formatCompactCurrency(property.acquisitionCosts.stampDuty)}
                      />
                      <KPICard
                        label="LMI"
                        value={formatCompactCurrency(property.acquisitionCosts.lmi)}
                      />
                      <KPICard
                        label="Other Fees"
                        value={formatCompactCurrency(
                          property.acquisitionCosts.legalFees + 
                          property.acquisitionCosts.inspectionFees + 
                          property.acquisitionCosts.otherFees
                        )}
                        subValue="Legal, inspection, etc."
                      />
                    </div>
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Cash Required</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCompactCurrency(property.totalCashRequired)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Portfolio Impact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Portfolio Impact (After Purchase)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <KPICard
                      label="Portfolio Value"
                      value={formatCompactCurrency(property.portfolioValueAfter)}
                    />
                    <KPICard
                      label="Total Equity"
                      value={formatCompactCurrency(property.totalEquityAfter)}
                    />
                    <KPICard
                      label="Total Debt"
                      value={formatCompactCurrency(property.totalDebtAfter)}
                    />
                  </div>
                </div>
                
                {/* Cashflow Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Annual Cashflow</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <KPICard
                      label="Gross Rental"
                      value={formatCompactCurrency(property.grossRentalIncome)}
                    />
                    <KPICard
                      label="Loan Interest"
                      value={`-${formatCompactCurrency(property.loanInterest)}`}
                    />
                    <KPICard
                      label="Expenses"
                      value={`-${formatCompactCurrency(property.expenses)}`}
                    />
                    <KPICard
                      label="Net Cashflow"
                      value={formatCompactCurrency(property.netCashflow)}
                      subValue={property.netCashflow >= 0 ? 'Cash positive' : 'Negatively geared'}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Tab 2: Year-by-Year Impact (Decision Engine) */}
            <TabsContent value="timeline" className="mt-0">
              <div className="space-y-6 p-1">
                {/* Affordability Tests */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Affordability Tests</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Deposit Test */}
                    <div className={`p-4 rounded-lg border-2 ${
                      property.depositTestPass 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Deposit Test</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          property.depositTestPass 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {property.depositTestPass ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Available:</span>
                          <span className="font-medium">{formatCompactCurrency(property.availableFundsUsed)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Required:</span>
                          <span className="font-medium">{formatCompactCurrency(property.depositRequired)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span>Surplus:</span>
                          <span className={`font-medium ${property.depositTestSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {property.depositTestSurplus >= 0 ? '+' : ''}{formatCompactCurrency(property.depositTestSurplus)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Borrowing Capacity Test */}
                    <div className={`p-4 rounded-lg border-2 ${
                      property.borrowingCapacityRemaining >= 0 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Borrowing Test</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          property.borrowingCapacityRemaining >= 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {property.borrowingCapacityRemaining >= 0 ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Loan Required:</span>
                          <span className="font-medium">{formatCompactCurrency(property.borrowingCapacityUsed)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span>Remaining:</span>
                          <span className={`font-medium ${property.borrowingCapacityRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCompactCurrency(property.borrowingCapacityRemaining)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Serviceability Test */}
                    <div className={`p-4 rounded-lg border-2 ${
                      property.serviceabilityTestPass 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Serviceability</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          property.serviceabilityTestPass 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {property.serviceabilityTestPass ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span>Surplus:</span>
                          <span className={`font-medium ${property.serviceabilityTestSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {property.serviceabilityTestSurplus >= 0 ? '+' : ''}{formatCompactCurrency(property.serviceabilityTestSurplus)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Available Funds Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Funds Breakdown</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Deposit</span>
                        <span className="font-medium">{formatCompactCurrency(property.baseDeposit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cumulative Savings</span>
                        <span className="font-medium">{formatCompactCurrency(property.cumulativeSavings)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cashflow Reinvestment</span>
                        <span className="font-medium">{formatCompactCurrency(property.cashflowReinvestment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equity Release</span>
                        <span className="font-medium">{formatCompactCurrency(property.equityRelease)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                        <span className="font-semibold text-gray-900">Total Available</span>
                        <span className="font-semibold text-gray-900">{formatCompactCurrency(property.availableFundsUsed)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expense Breakdown */}
                {property.expenseBreakdown && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Annual Expense Breakdown</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Council Rates & Water</span>
                          <span className="font-medium">{formatCompactCurrency(property.expenseBreakdown.councilRatesWater)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Strata Fees</span>
                          <span className="font-medium">{formatCompactCurrency(property.expenseBreakdown.strataFees)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Insurance</span>
                          <span className="font-medium">{formatCompactCurrency(property.expenseBreakdown.insurance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Management Fees</span>
                          <span className="font-medium">{formatCompactCurrency(property.expenseBreakdown.managementFees)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Repairs & Maintenance</span>
                          <span className="font-medium">{formatCompactCurrency(property.expenseBreakdown.repairsMaintenance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Land Tax</span>
                          <span className="font-medium">{formatCompactCurrency(property.expenseBreakdown.landTax)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                          <span className="font-semibold text-gray-900">Total Expenses</span>
                          <span className="font-semibold text-gray-900">{formatCompactCurrency(property.expenses)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab 3: Performance Charts */}
            <TabsContent value="performance" className="mt-0">
              <div className="space-y-6 p-1">
                {!trackingData ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>Loading performance data...</p>
                  </div>
                ) : (
                  <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <KPICard
                        label={`Value at Year ${trackingData.yearsHeld}`}
                        value={formatCompactCurrency(trackingData.currentPropertyValue)}
                      />
                      <KPICard
                        label="Equity"
                        value={formatCompactCurrency(trackingData.currentEquity)}
                      />
                      <KPICard
                        label="Projection"
                        value={`${trackingData.yearsHeld} Years`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <KPICard
                        label="Cash Invested"
                        value={formatCompactCurrency(trackingData.totalCashInvested)}
                      />
                      <KPICard
                        label="ROI (Annualized)"
                        value={`${trackingData.roic.toFixed(1)}%`}
                      />
                      <KPICard
                        label="Cash-on-Cash"
                        value={`${trackingData.cashOnCashReturn.toFixed(1)}%`}
                      />
                    </div>
                    
                    {/* Equity Growth Chart */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Equity Growth Over Time</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="year" 
                            stroke="#6b7280"
                            style={{ fontSize: '11px' }}
                            tick={{ fill: '#6b7280' }}
                          />
                          <YAxis 
                            stroke="#6b7280"
                            style={{ fontSize: '11px' }}
                            tickFormatter={formatYAxis}
                            tick={{ fill: '#6b7280' }}
                            width={60}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '11px' }}
                            iconSize={8}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="propertyValue" 
                            stroke="#87B5FA" 
                            strokeWidth={2}
                            name="Property Value"
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="equity" 
                            stroke="#86efac" 
                            strokeWidth={2}
                            name="Equity"
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="loanBalance" 
                            stroke="#fca5a5" 
                            strokeWidth={2}
                            name="Loan Balance"
                            dot={false}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Property Cashflow Analysis Chart */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Property Cashflow Analysis</h3>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="year" 
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              tick={{ fill: '#6b7280' }}
                            />
                            <YAxis 
                              stroke="#6b7280"
                              style={{ fontSize: '11px' }}
                              tickFormatter={formatYAxis}
                              tick={{ fill: '#6b7280' }}
                              width={60}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                name
                              ]}
                            />
                            <Legend 
                              wrapperStyle={{ fontSize: '11px' }}
                              iconSize={8}
                            />
                            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
                            <Bar 
                              dataKey="rentalIncome" 
                              fill="#86efac" 
                              name="Rental Income"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="expenses" 
                              fill="#fca5a5" 
                              name="Expenses"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="netCashflow" 
                              fill="#87B5FA" 
                              name="Net Cashflow"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                          <p>Cashflow data unavailable</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Summary Insights */}
                    <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">{trackingData.yearsHeld}-Year Summary</h3>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">Equity Growth:</span>{' '}
                          {formatCurrency(trackingData.currentEquity - trackingData.totalCashInvested)} 
                          {' '}({((trackingData.currentEquity / trackingData.totalCashInvested - 1) * 100).toFixed(0)}% increase)
                        </p>
                        <p>
                          <span className="font-medium">Total Return:</span>{' '}
                          {formatCurrency(trackingData.currentEquity + 
                            trackingData.cashflowOverTime.reduce((sum, cf) => sum + cf.netCashflow, 0) - 
                            trackingData.totalCashInvested)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
