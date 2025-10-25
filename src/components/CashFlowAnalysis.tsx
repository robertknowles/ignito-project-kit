import React from 'react';
import { Card } from './ui/card';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { analyzeCashFlow, DEFAULT_PROPERTY_EXPENSES } from '../utils/metricsCalculator';
import type { PropertyPurchase } from '../types/property';

export const CashFlowAnalysis = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { globalFactors, getPropertyData } = useDataAssumptions();

  // Convert feasible properties to PropertyPurchase format
  const feasibleProperties = timelineProperties.filter(prop => prop.status === 'feasible');
  const currentYear = 2025 + 15; // End of timeline for analysis
  
  const cashFlowBreakdown = feasibleProperties.map(property => {
    const propertyData = getPropertyData(property.title);
    const purchase: PropertyPurchase = {
      year: property.affordableYear,
      cost: property.cost,
      loanAmount: property.loanAmount,
      depositRequired: property.depositRequired,
      title: property.title,
      rentalYield: propertyData ? parseFloat(propertyData.yield) / 100 : 0.04,
      growthRate: propertyData ? parseFloat(propertyData.growth) / 100 : parseFloat(globalFactors.growthRate) / 100,
      interestRate: parseFloat(globalFactors.interestRate) / 100
    };

    return {
      property: property.title,
      analysis: analyzeCashFlow(purchase, currentYear, profile.growthCurve, DEFAULT_PROPERTY_EXPENSES),
      purchaseYear: property.affordableYear
    };
  });

  const totalAnalysis = cashFlowBreakdown.reduce((total, item) => ({
    rentalIncome: total.rentalIncome + item.analysis.rentalIncome,
    mortgagePayments: total.mortgagePayments + item.analysis.mortgagePayments,
    propertyExpenses: total.propertyExpenses + item.analysis.propertyExpenses,
    netCashflow: total.netCashflow + item.analysis.netCashflow,
    expenseBreakdown: {
      managementFees: total.expenseBreakdown.managementFees + item.analysis.expenseBreakdown.managementFees,
      councilRates: total.expenseBreakdown.councilRates + item.analysis.expenseBreakdown.councilRates,
      insurance: total.expenseBreakdown.insurance + item.analysis.expenseBreakdown.insurance,
      maintenance: total.expenseBreakdown.maintenance + item.analysis.expenseBreakdown.maintenance,
      vacancyAllowance: total.expenseBreakdown.vacancyAllowance + item.analysis.expenseBreakdown.vacancyAllowance,
      strataFees: total.expenseBreakdown.strataFees + item.analysis.expenseBreakdown.strataFees,
    }
  }), {
    rentalIncome: 0,
    mortgagePayments: 0,
    propertyExpenses: 0,
    netCashflow: 0,
    expenseBreakdown: {
      managementFees: 0,
      councilRates: 0,
      insurance: 0,
      maintenance: 0,
      vacancyAllowance: 0,
      strataFees: 0,
    }
  });

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0';
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}k`;
    return `$${Math.round(value).toLocaleString()}`;
  };

  if (feasibleProperties.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Cash Flow Analysis</h3>
        <p className="text-gray-500">Select properties to see detailed cash flow analysis.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Detailed Cash Flow Analysis</h3>
      
      {/* Summary Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-4">Portfolio Summary (Year {currentYear})</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Rental Income</span>
            <div className="font-semibold text-green-600">{formatCurrency(totalAnalysis.rentalIncome)}</div>
          </div>
          <div>
            <span className="text-gray-600">Mortgage Payments</span>
            <div className="font-semibold text-red-600">-{formatCurrency(totalAnalysis.mortgagePayments)}</div>
          </div>
          <div>
            <span className="text-gray-600">Property Expenses</span>
            <div className="font-semibold text-red-600">-{formatCurrency(totalAnalysis.propertyExpenses)}</div>
          </div>
          <div>
            <span className="text-gray-600">Net Cash Flow</span>
            <div className={`font-semibold ${totalAnalysis.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalAnalysis.netCashflow)}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="mb-8">
        <h4 className="font-medium mb-4">Annual Expense Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Management Fees (8%)</span>
            <div className="font-medium">{formatCurrency(totalAnalysis.expenseBreakdown.managementFees)}</div>
          </div>
          <div>
            <span className="text-gray-600">Council Rates</span>
            <div className="font-medium">{formatCurrency(totalAnalysis.expenseBreakdown.councilRates)}</div>
          </div>
          <div>
            <span className="text-gray-600">Insurance</span>
            <div className="font-medium">{formatCurrency(totalAnalysis.expenseBreakdown.insurance)}</div>
          </div>
          <div>
            <span className="text-gray-600">Maintenance (1% of value)</span>
            <div className="font-medium">{formatCurrency(totalAnalysis.expenseBreakdown.maintenance)}</div>
          </div>
          <div>
            <span className="text-gray-600">Vacancy Allowance (4%)</span>
            <div className="font-medium">{formatCurrency(totalAnalysis.expenseBreakdown.vacancyAllowance)}</div>
          </div>
          {totalAnalysis.expenseBreakdown.strataFees > 0 && (
            <div>
              <span className="text-gray-600">Strata Fees</span>
              <div className="font-medium">{formatCurrency(totalAnalysis.expenseBreakdown.strataFees)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Individual Property Analysis */}
      <div>
        <h4 className="font-medium mb-4">Individual Property Analysis</h4>
        <div className="space-y-3">
          {cashFlowBreakdown.map((item, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{item.property}</span>
                <span className="text-sm text-gray-600 ml-2">(Purchased {item.purchaseYear})</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {formatCurrency(item.analysis.rentalIncome)} - {formatCurrency(item.analysis.mortgagePayments + item.analysis.propertyExpenses)}
                </div>
                <div className={`font-medium ${item.analysis.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.analysis.netCashflow)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>* Analysis assumes interest-only loans and typical Australian property investment expenses.</p>
        <p>* Rental income and property values are projected based on growth assumptions.</p>
      </div>
    </Card>
  );
};