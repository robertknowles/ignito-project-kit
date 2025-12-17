import React from 'react';
import { X } from 'lucide-react';
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

interface PropertyDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPropertyId: string | null;
}

export const PropertyDetailPanel: React.FC<PropertyDetailPanelProps> = ({
  isOpen,
  onClose,
  selectedPropertyId,
}) => {
  // Get tracking data for selected property
  const { trackingData } = usePerPropertyTracking(selectedPropertyId);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  // Prepare chart data from tracking data
  const chartData = trackingData?.equityOverTime.map((equity, index) => {
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
  }) || [];

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-[450px] bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Property Analysis</h2>
            {trackingData && (
              <p className="text-sm text-gray-500 mt-0.5">
                {trackingData.propertyTitle} · {trackingData.purchasePeriod}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-73px)] p-6">
          {!trackingData ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a property to view analysis</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Key Metrics Cards - 2x3 Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Property Value at End of Timeline */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Value at Year {trackingData.yearsHeld}</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatCurrency(trackingData.currentPropertyValue)}
                  </div>
                </div>

                {/* Current Equity */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Equity</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatCurrency(trackingData.currentEquity)}
                  </div>
                </div>

                {/* Total Cash Invested */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Cash Invested</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatCurrency(trackingData.totalCashInvested)}
                  </div>
                </div>

                {/* Annualized Return (ROIC) */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">ROI (Annualized)</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {trackingData.roic.toFixed(1)}%
                  </div>
                </div>

                {/* Cash-on-Cash Return */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Cash-on-Cash</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {trackingData.cashOnCashReturn.toFixed(1)}%
                  </div>
                </div>

                {/* Years Held */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Projection</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {trackingData.yearsHeld} Years
                  </div>
                </div>
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
                {chartData.length > 0 && chartData[0].rentalIncome !== undefined ? (
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
            </div>
          )}
        </div>
      </div>
    </>
  );
};

