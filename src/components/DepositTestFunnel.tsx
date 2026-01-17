import React from 'react';
import { DollarSign, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { YearBreakdownData } from '@/types/property';
import { BreakdownInfo } from './BreakdownInfo';

interface DepositTestFunnelProps {
  yearData: YearBreakdownData;
}

export const DepositTestFunnel: React.FC<DepositTestFunnelProps> = ({ yearData }) => {
  const { 
    depositTest, 
    baseDeposit, 
    cumulativeSavings, 
    cashflowReinvestment, 
    equityRelease,
    requiredDeposit,
    purchases 
  } = yearData;
  
  // Helper to get the rounded value that will be displayed
  const getRoundedValue = (value: number): number => {
    if (value >= 1000000) return Math.round(value / 1000000 * 10) / 10 * 1000000; // Round to 0.1M
    if (value >= 1000) return Math.round(value / 1000) * 1000; // Round to nearest k
    return Math.round(value);
  };
  
  // Calculate total available by summing the rounded display values
  const roundedBaseDeposit = getRoundedValue(baseDeposit);
  const roundedCumulativeSavings = getRoundedValue(cumulativeSavings);
  const roundedCashflowReinvestment = getRoundedValue(cashflowReinvestment);
  const roundedEquityRelease = getRoundedValue(equityRelease);
  const totalAvailable = roundedBaseDeposit + roundedCumulativeSavings + roundedCashflowReinvestment + roundedEquityRelease;
  
  // Get acquisition costs from first purchase
  const purchase = purchases && purchases.length > 0 ? purchases[0] : null;
  const stampDuty = purchase?.stampDuty || 0;
  const lmi = purchase?.lmi || 0;
  const legalFees = purchase?.legalFees || 2000;
  const inspectionFees = purchase?.inspectionFees || 650;
  const otherFees = purchase?.otherFees || 1500;
  const totalAcquisitionCosts = stampDuty + lmi + legalFees + inspectionFees + otherFees;
  
  // Calculate total required by summing the rounded display values
  // This ensures visual consistency: if we show "$53k + $32k", the total will show "$85k"
  const roundedDeposit = getRoundedValue(requiredDeposit);
  const roundedAcquisitionCosts = getRoundedValue(totalAcquisitionCosts);
  const totalRequired = roundedDeposit + roundedAcquisitionCosts;
  
  // Calculate pre-purchase metrics for Equity Release breakdown
  const prePurchaseValue = Math.max(0, yearData.portfolioValue - yearData.propertyCost);
  const maxLendable = prePurchaseValue * 0.80;
  const existingDebt = yearData.existingDebt;
  const calculatedEquity = Math.max(0, maxLendable - existingDebt);
  
  // Calculate years accumulated for Cumulative Savings breakdown
  const baseYear = 2025;
  const yearsAccumulated = Math.max(0, yearData.year - baseYear);
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="border rounded-lg shadow-sm p-3 space-y-2 bg-white">
      {/* PASS/FAIL Badge */}
      <div className={`text-center p-2 rounded ${depositTest.pass ? 'bg-green-300/70 border border-green-300' : 'bg-red-300/70 border border-red-300'}`}>
        <div className="flex items-center justify-center gap-2">
          {depositTest.pass ? (
            <CheckCircle className="w-4 h-4 text-green-700" />
          ) : (
            <XCircle className="w-4 h-4 text-red-700" />
          )}
          <span className={`text-base font-semibold ${depositTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {depositTest.pass ? 'PASS' : 'FAIL'}
          </span>
          <span className={`text-sm ${depositTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {depositTest.pass ? 'Surplus' : 'Shortfall'}: {formatCurrency(Math.abs(depositTest.surplus))}
          </span>
        </div>
      </div>

      {/* Funnel Title */}
      <div className="flex items-center gap-2 pb-1 border-b">
        <DollarSign className="w-4 h-4 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-800">Deposit Test</h3>
      </div>

      {/* Two-column layout for What We Have and What We Need */}
      <div className="grid grid-cols-2 gap-3">
        {/* Section 1: What We Have */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium uppercase text-gray-700">
            What We Have
          </h4>
          <div className="bg-gray-50 rounded p-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Base Deposit
                <BreakdownInfo
                  title="Initial Cash Pool"
                  items={[
                    { label: 'Remaining from User Input', value: baseDeposit }
                  ]}
                  total={baseDeposit}
                  totalLabel="Available Base Deposit"
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(baseDeposit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Cumulative Savings
                <BreakdownInfo
                  title="Savings Accumulation"
                  items={[
                    { label: 'Annual Savings Rate', value: yearData.annualSavingsRate },
                    { label: 'Years Accumulated', value: yearsAccumulated, isNumeric: true },
                  ]}
                  total={cumulativeSavings}
                  totalLabel="Total Accumulated"
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(cumulativeSavings)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Cashflow Reinvest
                <BreakdownInfo
                  title="Portfolio Reinvestment"
                  items={[
                    { label: 'Surplus Rental Income', value: cashflowReinvestment },
                  ]}
                  total={cashflowReinvestment}
                  totalLabel="Total Available for Reinvestment"
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(cashflowReinvestment)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Equity Release
                <BreakdownInfo
                  title="Equity Release Breakdown (Pre-Purchase)"
                  items={[
                    { label: 'Existing Portfolio Value', value: prePurchaseValue },
                    { label: 'Max Lendable Amount (80%)', value: maxLendable },
                    { label: 'Less: Existing Debt', value: -existingDebt }
                  ]}
                  total={calculatedEquity}
                  totalLabel="Net Extractable Equity"
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(equityRelease)}</span>
            </div>
            <div className="pt-1 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700 flex items-center">
                  Total Available
                  <BreakdownInfo
                    title="Total Available Funds Breakdown"
                    items={[
                      { label: 'Initial Cash Pool', value: baseDeposit },
                      { label: `Accumulated Savings (Year 1-${yearData.displayYear || 1})`, value: cumulativeSavings },
                      { label: 'Reinvested Rental Profits', value: cashflowReinvestment },
                      { label: 'Equity Released', value: equityRelease }
                    ]}
                    total={totalAvailable}
                  />
                </span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(totalAvailable)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: What We Need */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium uppercase text-gray-700">
            What We Need
          </h4>
          <div className="bg-gray-50 rounded p-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Deposit Required
                <BreakdownInfo
                  title="Deposit Required Breakdown"
                  items={[
                    { label: 'Purchase Price', value: yearData.propertyCost || 0 },
                    { label: 'Deposit %', value: yearData.propertyCost ? (requiredDeposit / yearData.propertyCost) * 100 : 0, isPercentage: true }
                  ]}
                  total={requiredDeposit}
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(requiredDeposit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Stamp Duty</span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(stampDuty)}</span>
            </div>
            {lmi > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">LMI</span>
                <span className="text-xs font-semibold text-gray-800">{formatCurrency(lmi)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center">
                Legal & Fees
                <BreakdownInfo
                  title="Legal & Fees Breakdown"
                  items={[
                    { label: 'Conveyancing / Legal', value: legalFees },
                    { label: 'Building & Pest', value: inspectionFees },
                    { label: 'Bank & Mortgage Fees', value: otherFees }
                  ]}
                  total={legalFees + inspectionFees + otherFees}
                />
              </span>
              <span className="text-xs font-semibold text-gray-800">{formatCurrency(legalFees + inspectionFees + otherFees)}</span>
            </div>
            <div className="pt-1 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Total Required</span>
                <span className="text-sm font-bold text-orange-700">{formatCurrency(totalRequired)}</span>
              </div>
              <div className="text-[10px] italic text-gray-500">
                {formatCurrency(requiredDeposit)} + {formatCurrency(totalAcquisitionCosts)} costs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: The Calculation */}
      <div className="bg-blue-50 rounded p-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="font-semibold text-blue-700">{formatCurrency(totalAvailable)}</span>
          <span className="text-gray-600">−</span>
          <span className="font-semibold text-orange-700">{formatCurrency(totalRequired)}</span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className={`font-bold ${depositTest.surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(depositTest.surplus)}
          </span>
        </div>
      </div>

      {/* Section 4: The Result */}
      <div className={`rounded p-2 ${depositTest.pass ? 'bg-green-300/70' : 'bg-red-300/70'}`}>
        <div className="text-center">
          <div className={`text-sm font-semibold ${depositTest.pass ? 'text-green-700' : 'text-red-700'}`}>
            {depositTest.pass 
              ? `Deposit test PASSED with ${formatCurrency(depositTest.surplus)} surplus`
              : `Deposit test FAILED with ${formatCurrency(Math.abs(depositTest.surplus))} shortfall`
            }
          </div>
          <div className="text-[10px] text-gray-600 mt-1">
            {depositTest.pass 
              ? 'You have sufficient cash to proceed with this purchase'
              : 'Additional funds required before this purchase can proceed'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

