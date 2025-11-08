import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePerPropertyTracking } from '../hooks/usePerPropertyTracking';
import { Loader2 } from 'lucide-react';

export const PerPropertyTracking = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  
  // Filter to only feasible properties with instanceId
  const availableProperties = timelineProperties.filter(
    p => p.status === 'feasible' && p.instanceId
  );
  
  // State for selected property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    availableProperties[0]?.instanceId || ''
  );
  const [isLoading, setIsLoading] = useState(true);
  
  // Get tracking data for selected property
  const { trackingData } = usePerPropertyTracking(selectedPropertyId);
  
  // Simulate loading when property changes
  useEffect(() => {
    setIsLoading(true);
    // Simulate calculation time
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [selectedPropertyId]);
  
  if (availableProperties.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No properties in timeline yet.</p>
        <p className="text-sm mt-2">Add properties to see per-property tracking.</p>
      </div>
    );
  }
  
  if (!trackingData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Property data not available.</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-600">Loading property data...</span>
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
      rentalIncome: cashflow.grossIncome,
      expenses: cashflow.totalExpenses,
      netCashflow: cashflow.netCashflow,
    };
  });
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
  
  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Select Property:</label>
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableProperties.map((prop) => (
              <SelectItem key={prop.instanceId} value={prop.instanceId!}>
                {prop.title} - {prop.displayPeriod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Current Property Value</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(trackingData.currentPropertyValue)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Current Equity</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(trackingData.currentEquity)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Cash Invested</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(trackingData.totalCashInvested)}
          </div>
        </div>
      </div>
      
      {/* Additional Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Annualized Return % (ROIC)</div>
          <div className="text-2xl font-semibold text-gray-900">
            {trackingData.roic.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Cash-on-Cash Return %</div>
          <div className="text-2xl font-semibold text-gray-900">
            {trackingData.cashOnCashReturn.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Years Held</div>
          <div className="text-2xl font-semibold text-gray-900">
            {trackingData.yearsHeld}
          </div>
        </div>
      </div>
      
      {/* Equity Growth Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Equity Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="year" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #f3f4f6',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="propertyValue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Property Value"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="equity" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Equity"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="loanBalance" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Loan Balance"
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Cashflow Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Cashflow Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="year" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #f3f4f6',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="rentalIncome" fill="#10b981" name="Rental Income" />
            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            <Bar dataKey="netCashflow" fill="#3b82f6" name="Net Cashflow" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


