import React from 'react';
import { BarChart3, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { YearBreakdownData } from '@/types/property';
import { BreakdownInfo } from './BreakdownInfo';

interface ServiceabilityTestFunnelProps {
  yearData: YearBreakdownData;
}

export const ServiceabilityTestFunnel: React.FC<ServiceabilityTestFunnelProps> = ({ yearData }) => {
  const { 
    serviceabilityTest,
    grossRental,
    expenses,
    existingLoanInterest,
    newLoanInterest,
    baseServiceabilityCapacity,
    rentalServiceabilityContribution,
    borrowingCapacity,
    rentalRecognition,
    newDebt,
    interestRate,
    existingDebt,
    totalDebt
  } = yearData;
  
  const totalIncome = grossRental;
  const totalInterestDue = existingLoanInterest + newLoanInterest;
  const netIncome = totalIncome - expenses;
  const totalCapacity = baseServiceabilityCapacity + rentalServiceabilityContribution;
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="border rounded-lg shadow-sm p-3 space-y-2 bg-white">
      {/* PASS/FAIL Badge */}
      <div className={`text-center p-2 rounded ${serviceabilityTest.pass ? 'bg-green-300/70 border border-green-300' : 'bg-red-300/70 border border-red-300'}`}>
        <div className="flex items-center justify-center gap-2">
          {serviceabilityTest.pass ? (
            <CheckCircle className="w-4 h-4 text-green-700" />
          ) : (
            <XCircle className="w-4 h-4 text-red-700" />
          )}
          <span className={`text-base font-semibold ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {serviceabilityTest.pass ? 'PASS' : 'FAIL'}
          </span>
          <span className={`text-sm ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {serviceabilityTest.pass ? 'Surplus' : 'Shortfall'}: {formatCurrency(Math.abs(serviceabilityTest.surplus))}
          </span>
        </div>
      </div>

      {/* Funnel Title */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-800">Serviceability Test</h3>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left column: Income Sources + Loan Payments */}
        <div className="space-y-2">
          {/* Section 1: Income Sources */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium uppercase text-gray-700">
              Income Sources
            </h4>
            <div className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Gross Rental
                  <BreakdownInfo
                    title="Rental Income Source"
                    items={[
                      { label: 'Total Annual Rent', value: grossRental }
                    ]}
                    total={grossRental}
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(grossRental)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Expenses
                  <BreakdownInfo
                    title="Property Expenses Breakdown"
                    items={[
                      { label: 'Council Rates & Water', value: yearData.expenseBreakdown?.councilRatesWater || 0 },
                      { label: 'Strata Fees', value: yearData.expenseBreakdown?.strataFees || 0 },
                      { label: 'Insurance', value: yearData.expenseBreakdown?.insurance || 0 },
                      { label: 'Management Fees', value: yearData.expenseBreakdown?.managementFees || 0 },
                      { label: 'Repairs & Maintenance', value: yearData.expenseBreakdown?.repairsMaintenance || 0 },
                      { label: 'Land Tax', value: yearData.expenseBreakdown?.landTax || 0 },
                    ]}
                    total={expenses}
                  />
                </span>
                <span className="text-xs font-semibold text-red-700">−{formatCurrency(expenses)}</span>
              </div>
              <div className="pt-1 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Net Rental</span>
                  <span className={`text-xs font-bold ${netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(netIncome)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Loan Payments */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium uppercase text-gray-700">
              Loan Payments
            </h4>
            <div className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  Existing Interest
                  <BreakdownInfo
                    title="Existing Debt Service"
                    items={[
                      { label: 'Debt Before Purchase', value: existingDebt },
                      { label: `Interest Rate (${interestRate.toFixed(1)}%)`, value: existingLoanInterest }
                    ]}
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(existingLoanInterest)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 flex items-center">
                  New Interest
                  <BreakdownInfo
                    title="New Loan Calculation"
                    items={[
                      { label: 'Loan Principal', value: newDebt },
                      { label: `Interest Rate (${interestRate.toFixed(1)}%)`, value: newLoanInterest }
                    ]}
                  />
                </span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(newLoanInterest)}</span>
              </div>
              <div className="pt-1 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700 flex items-center">
                    Total Due
                    <BreakdownInfo
                      title="Total Interest Due Breakdown"
                      items={[
                        { label: 'Existing Portfolio Interest', value: existingLoanInterest },
                        { label: 'New Property Interest', value: newLoanInterest }
                      ]}
                      total={totalInterestDue}
                    />
                  </span>
                  <span className="text-sm font-bold text-orange-700">{formatCurrency(totalInterestDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Serviceability Capacity */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium uppercase text-gray-700">
            Serviceability Capacity
          </h4>
          <div className="bg-gray-50 rounded p-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Borrowing Power
                <BreakdownInfo
                  title="Salary Based Capacity"
                  items={[
                    { label: 'User Borrowing Input', value: borrowingCapacity },
                    { label: 'Serviceability Factor (10%)', value: baseServiceabilityCapacity }
                  ]}
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(baseServiceabilityCapacity)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Rental (70%)
                <BreakdownInfo
                  title="Shading Calculation"
                  items={[
                    { label: 'Gross Market Rent', value: grossRental },
                    { label: 'Bank Shading (30%)', value: -(grossRental * 0.30) },
                  ]}
                  total={rentalServiceabilityContribution}
                  totalLabel="Recognized Income"
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(rentalServiceabilityContribution)}</span>
            </div>
            <div className="pt-1 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700 flex items-center">
                  Total Capacity
                  <BreakdownInfo
                    title="Total Capacity Breakdown"
                    items={[
                      { label: `Income (${formatCurrency(borrowingCapacity)} × 10%)`, value: baseServiceabilityCapacity },
                      { label: `Rental (${formatCurrency(grossRental)} × 70%)`, value: rentalServiceabilityContribution }
                    ]}
                    total={totalCapacity}
                  />
                </span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(totalCapacity)}</span>
              </div>
              <div className="text-[10px] italic text-gray-500">
                {formatCurrency(borrowingCapacity)} × 10% + {formatCurrency(grossRental)} × 70%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: The Calculation */}
      <div className="bg-blue-50 rounded p-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="font-semibold text-blue-700">{formatCurrency(totalCapacity)}</span>
          <span className="text-gray-600">−</span>
          <span className="font-semibold text-orange-700">{formatCurrency(totalInterestDue)}</span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className={`font-bold ${serviceabilityTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(serviceabilityTest.surplus)}
          </span>
        </div>
      </div>

      {/* Section 5: The Result */}
      <div className={`rounded p-2 ${serviceabilityTest.pass ? 'bg-green-300/70' : 'bg-red-300/70'}`}>
        <div className="text-center">
          <div className={`text-sm font-semibold ${serviceabilityTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {serviceabilityTest.pass 
              ? `Serviceability test PASSED with ${formatCurrency(serviceabilityTest.surplus)} surplus`
              : `Serviceability test FAILED with ${formatCurrency(Math.abs(serviceabilityTest.surplus))} shortfall`
            }
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            {serviceabilityTest.pass 
              ? 'Your income can comfortably service the loan repayments'
              : 'Insufficient income to service the loan repayments'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

