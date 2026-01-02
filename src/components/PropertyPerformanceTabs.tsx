import React, { useState, useMemo } from 'react';
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
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePerPropertyTracking } from '../hooks/usePerPropertyTracking';

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Format currency with full precision for summary
const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage for display
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// KPI Card component - styled like PropertyDetailPanel
interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subValue }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
    <p className="text-[8px] uppercase text-gray-500 tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value}</p>
    {subValue && (
      <p className="text-[9px] text-gray-400 mt-0.5">{subValue}</p>
    )}
  </div>
);

// Format Y-axis for charts
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

// Property content component (renders when a property is selected)
interface PropertyContentProps {
  propertyInstanceId: string;
}

const PropertyContent: React.FC<PropertyContentProps> = ({ propertyInstanceId }) => {
  const { trackingData } = usePerPropertyTracking(propertyInstanceId);
  const [activeTab, setActiveTab] = useState<'growth' | 'cashflow'>('growth');

  if (!trackingData) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Loading property data...
      </div>
    );
  }

  // Prepare chart data from tracking data
  const chartData = trackingData.equityOverTime.map((equity, index) => {
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

  return (
    <div className="space-y-3">
      {/* Sub-tabs: Portfolio Growth / Cashflow */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('growth')}
          className={`relative px-3 py-1.5 text-[10px] font-medium transition-colors ${
            activeTab === 'growth'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Portfolio Growth
          {activeTab === 'growth' && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{ backgroundColor: '#87B5FA' }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`relative px-3 py-1.5 text-[10px] font-medium transition-colors ${
            activeTab === 'cashflow'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Cashflow
          {activeTab === 'cashflow' && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{ backgroundColor: '#87B5FA' }}
            />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'growth' ? (
        <div className="space-y-3">
          {/* Portfolio Growth Metrics - 3 cards side by side */}
          <div className="grid grid-cols-3 gap-2">
            <KPICard
              label={`Value at Year ${trackingData.yearsHeld}`}
              value={formatCurrency(trackingData.currentPropertyValue)}
            />
            <KPICard
              label="Equity"
              value={formatCurrency(trackingData.currentEquity)}
            />
            <KPICard
              label="Projection"
              value={`${trackingData.yearsHeld} Years`}
            />
          </div>

          {/* Equity Growth Chart */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <h3 className="text-[10px] font-medium text-gray-900 mb-2">Equity Growth Over Time</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="year" 
                  stroke="#6b7280"
                  style={{ fontSize: '9px' }}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '9px' }}
                  tickFormatter={formatYAxis}
                  tick={{ fill: '#6b7280' }}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '10px',
                    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => formatCurrencyFull(value)}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '9px' }}
                  iconSize={6}
                />
                <Line 
                  type="monotone" 
                  dataKey="propertyValue" 
                  stroke="#87B5FA" 
                  strokeWidth={1.5}
                  name="Property Value"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#86efac" 
                  strokeWidth={1.5}
                  name="Equity"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="loanBalance" 
                  stroke="#fca5a5" 
                  strokeWidth={1.5}
                  name="Loan Balance"
                  dot={false}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Insights */}
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-3">
            <h3 className="text-[10px] font-medium text-gray-900 mb-1.5">{trackingData.yearsHeld}-Year Summary</h3>
            <div className="space-y-1 text-[10px] text-gray-700">
              <p>
                <span className="font-medium">Equity Growth:</span>{' '}
                {formatCurrencyFull(trackingData.currentEquity - trackingData.totalCashInvested)} 
                {' '}({((trackingData.currentEquity / trackingData.totalCashInvested - 1) * 100).toFixed(0)}% increase)
              </p>
              <p>
                <span className="font-medium">Total Return:</span>{' '}
                {formatCurrencyFull(trackingData.currentEquity + 
                  trackingData.cashflowOverTime.reduce((sum, cf) => sum + cf.netCashflow, 0) - 
                  trackingData.totalCashInvested)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Cashflow Metrics - 3 cards side by side */}
          <div className="grid grid-cols-3 gap-2">
            <KPICard
              label="Cash Invested"
              value={formatCurrency(trackingData.totalCashInvested)}
            />
            <KPICard
              label="ROI (Annualized)"
              value={formatPercentage(trackingData.roic)}
            />
            <KPICard
              label="Cash-on-Cash"
              value={formatPercentage(trackingData.cashOnCashReturn)}
            />
          </div>

          {/* Property Cashflow Analysis Chart */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <h3 className="text-[10px] font-medium text-gray-900 mb-2">Property Cashflow Analysis</h3>
            {chartData.length > 0 && chartData[0].rentalIncome !== undefined ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="year" 
                    stroke="#6b7280"
                    style={{ fontSize: '9px' }}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '9px' }}
                    tickFormatter={formatYAxis}
                    tick={{ fill: '#6b7280' }}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '10px',
                      boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrencyFull(value),
                      name
                    ]}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '9px' }}
                    iconSize={6}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
                  <Bar 
                    dataKey="rentalIncome" 
                    fill="#86efac" 
                    name="Rental Income"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="expenses" 
                    fill="#fca5a5" 
                    name="Expenses"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="netCashflow" 
                    fill="#87B5FA" 
                    name="Net Cashflow"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-gray-400 text-xs">
                <p>Cashflow data unavailable</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main PropertyPerformanceTabs component
export const PropertyPerformanceTabs: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Filter to only feasible properties
  const feasibleProperties = useMemo(() => {
    return timelineProperties.filter(p => p.status === 'feasible');
  }, [timelineProperties]);

  // Set default selected property when properties load
  React.useEffect(() => {
    if (feasibleProperties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(feasibleProperties[0].instanceId);
    }
  }, [feasibleProperties, selectedPropertyId]);

  // Empty state
  if (feasibleProperties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-gray-400 text-sm mb-2">No properties in timeline</p>
        <p className="text-gray-300 text-xs">
          Add properties to your strategy to see performance metrics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Property Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-1 overflow-x-auto">
        {feasibleProperties.map((property) => {
          const isActive = selectedPropertyId === property.instanceId;
          // Capitalise property title with purchase year
          const displayName = `${property.title} (${property.displayPeriod})`;
          
          return (
            <button
              key={property.instanceId}
              onClick={() => setSelectedPropertyId(property.instanceId)}
              className={`relative px-2.5 py-1.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {displayName}
              {/* Active indicator - blue underline */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: '#87B5FA' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Property Content */}
      {selectedPropertyId && (
        <PropertyContent propertyInstanceId={selectedPropertyId} />
      )}
    </div>
  );
};
