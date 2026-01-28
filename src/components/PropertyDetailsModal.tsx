import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
          <p className="text-sm text-gray-500 mt-1">Property Performance</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
