import React, { useState } from 'react';
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
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';

export const PerPropertyTracking = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { getInstance } = usePropertyInstance();
  
  // Filter to only feasible properties with instanceId
  const availableProperties = timelineProperties.filter(
    p => p.status === 'feasible' && p.instanceId
  );
  
  // State for selected property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    availableProperties[0]?.instanceId || ''
  );
  
  // Get selected property data
  const selectedProperty = availableProperties.find(p => p.instanceId === selectedPropertyId);
  const propertyInstance = selectedPropertyId ? getInstance(selectedPropertyId) : null;
  
  if (availableProperties.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No properties in timeline yet.</p>
        <p className="text-sm mt-2">Add properties to see per-property tracking.</p>
      </div>
    );
  }
  
  if (!selectedProperty || !propertyInstance) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Property data not available.</p>
      </div>
    );
  }
  
  // Generate 10-year projection data for selected property
  const generatePropertyProjection = () => {
    const startYear = selectedProperty.affordableYear;
    const data = [];
    
    let propertyValue = propertyInstance.purchasePrice;
    let loanBalance = (propertyInstance.purchasePrice * propertyInstance.lvr) / 100;
    let equity = propertyValue - loanBalance;
    
    // Growth rates (High assumption)
    const growthRates = [0.12, 0.10, 0.08, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
    const rentalGrowthRates = [0.04, 0.04, 0.04, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03, 0.03];
    
    let annualRent = propertyInstance.rentPerWeek * 52;
    const loanInterest = (loanBalance * propertyInstance.interestRate) / 100;
    const propertyMgmt = annualRent * (propertyInstance.propertyManagementPercent / 100);
    const operatingExpenses = 
      propertyInstance.buildingInsuranceAnnual +
      propertyInstance.councilRatesWater +
      propertyInstance.strata +
      propertyInstance.maintenanceAllowanceAnnual;
    
    for (let i = 0; i < 10; i++) {
      const year = Math.floor(startYear) + i;
      
      // Apply growth
      propertyValue *= (1 + growthRates[i]);
      annualRent *= (1 + rentalGrowthRates[i]);
      
      // Recalculate equity
      equity = propertyValue - loanBalance;
      
      // Calculate cashflow
      const adjustedIncome = annualRent * (1 - propertyInstance.vacancyRate / 100);
      const totalExpenses = loanInterest + propertyMgmt + operatingExpenses;
      const netCashflow = adjustedIncome - totalExpenses;
      
      data.push({
        year: year.toString(),
        propertyValue: Math.round(propertyValue),
        loanBalance: Math.round(loanBalance),
        equity: Math.round(equity),
        rentalIncome: Math.round(adjustedIncome),
        expenses: Math.round(totalExpenses),
        netCashflow: Math.round(netCashflow),
      });
    }
    
    return data;
  };
  
  const projectionData = generatePropertyProjection();
  
  // Calculate metrics
  const totalInvested = selectedProperty.deposit;
  const finalEquity = projectionData[projectionData.length - 1].equity;
  const totalCashflow = projectionData.reduce((sum, d) => sum + d.netCashflow, 0);
  const avgAnnualCashflow = totalCashflow / 10;
  const cashOnCashReturn = (avgAnnualCashflow / totalInvested) * 100;
  const roic = ((finalEquity - totalInvested + totalCashflow) / totalInvested) * 100;
  
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
                {prop.propertyType} - Year {Math.floor(prop.affordableYear)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Cash-on-Cash Return</div>
          <div className="text-2xl font-semibold text-gray-900">
            {cashOnCashReturn.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">ROIC (10 years)</div>
          <div className="text-2xl font-semibold text-gray-900">
            {roic.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Equity (Year 10)</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(finalEquity)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Cashflow (10 yrs)</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(totalCashflow)}
          </div>
        </div>
      </div>
      
      {/* Equity Growth Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Equity Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectionData}>
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
          <BarChart data={projectionData}>
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

