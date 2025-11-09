import React from 'react';
import { BarChart3, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { YearBreakdownData } from '@/types/property';

interface ServiceabilityTestFunnelProps {
  yearData: YearBreakdownData;
}

export const ServiceabilityTestFunnel: React.FC<ServiceabilityTestFunnelProps> = ({ yearData }) => {
  const { 
    serviceabilityTest,
    grossRental,
    expenses,
    loanRepayments,
    existingLoanInterest,
    newLoanInterest,
    baseServiceabilityCapacity,
    rentalServiceabilityContribution,
    borrowingCapacity,
    rentalRecognition
  } = yearData;
  
  const totalIncome = grossRental;
  const totalPayments = loanRepayments + existingLoanInterest + newLoanInterest;
  const netIncome = totalIncome - expenses;
  const totalCapacity = baseServiceabilityCapacity + rentalServiceabilityContribution;
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="border rounded-lg shadow-sm p-4 space-y-4 bg-white">
      {/* PASS/FAIL Badge */}
      <div className={`text-center p-3 rounded ${serviceabilityTest.pass ? 'bg-green-300/70 border border-green-300' : 'bg-red-300/70 border border-red-300'}`}>
        <div className="flex items-center justify-center gap-2">
          {serviceabilityTest.pass ? (
            <CheckCircle className="w-5 h-5 text-green-700" />
          ) : (
            <XCircle className="w-5 h-5 text-red-700" />
          )}
          <span className={`text-lg font-semibold ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {serviceabilityTest.pass ? 'PASS' : 'FAIL'}
          </span>
        </div>
        <div className={`text-sm mt-1 ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
          {serviceabilityTest.pass ? 'Surplus' : 'Shortfall'}: {formatCurrency(Math.abs(serviceabilityTest.surplus))}
        </div>
      </div>

      {/* Funnel Title */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Serviceability Test</h3>
      </div>

      {/* Section 1: Income Sources */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          Income Sources
        </h4>
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Gross Rental Income</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(grossRental)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Property Expenses</span>
            <span className="text-base font-semibold text-red-700">−{formatCurrency(expenses)}</span>
          </div>
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Net Rental Income</span>
              <span className={`text-base font-bold ${netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(netIncome)}
              </span>
            </div>
            <div className="text-xs italic text-gray-500 mt-1">
              {formatCurrency(grossRental)} − {formatCurrency(expenses)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Loan Payments */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          Loan Payments
        </h4>
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Existing Loan Interest</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(existingLoanInterest)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">New Loan Interest</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(newLoanInterest)}</span>
          </div>
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Interest Due</span>
              <span className="text-base font-bold text-orange-700">{formatCurrency(totalPayments)}</span>
            </div>
            <div className="text-xs italic text-gray-500 mt-1">
              {formatCurrency(existingLoanInterest)} + {formatCurrency(newLoanInterest)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Serviceability Capacity */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          Serviceability Capacity
        </h4>
        <div className="bg-gray-50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Base Capacity (10%)</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(baseServiceabilityCapacity)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Rental Contribution ({rentalRecognition.toFixed(0)}%)</span>
            <span className="text-base font-semibold text-gray-800">{formatCurrency(rentalServiceabilityContribution)}</span>
          </div>
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Capacity</span>
              <span className="text-base font-bold text-blue-600">{formatCurrency(totalCapacity)}</span>
            </div>
            <div className="text-xs italic text-gray-500 mt-1">
              {formatCurrency(borrowingCapacity)} × 10% + {formatCurrency(grossRental)} × {rentalRecognition.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: The Calculation */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          The Calculation
        </h4>
        <div className="bg-blue-50 rounded p-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-semibold text-blue-700">{formatCurrency(totalCapacity)}</span>
            <span className="text-gray-600">−</span>
            <span className="font-semibold text-orange-700">{formatCurrency(totalPayments)}</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className={`font-bold ${serviceabilityTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(serviceabilityTest.surplus)}
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: The Result */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium uppercase text-gray-700">
          The Result
        </h4>
        <div className={`rounded p-3 ${serviceabilityTest.pass ? 'bg-green-300/70' : 'bg-red-300/70'}`}>
          <div className="text-center">
            <div className={`text-base font-semibold ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
              {serviceabilityTest.pass 
                ? `Serviceability test PASSED with ${formatCurrency(serviceabilityTest.surplus)} surplus`
                : `Serviceability test FAILED with ${formatCurrency(Math.abs(serviceabilityTest.surplus))} shortfall`
              }
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {serviceabilityTest.pass 
                ? 'Your income can comfortably service the loan repayments'
                : 'Insufficient income to service the loan repayments'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

