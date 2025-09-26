import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { PortfolioCalculations } from '../hooks/usePropertySelection';
import { useToast } from '@/hooks/use-toast';

interface PortfolioSummaryProps {
  calculations: PortfolioCalculations;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  calculations
}) => {
  const { toast } = useToast();

  React.useEffect(() => {
    if (calculations.eligibilityWarnings.length > 0) {
      toast({
        title: "Portfolio Warning",
        description: calculations.eligibilityWarnings[0],
        variant: "destructive",
      });
    }
  }, [calculations.eligibilityWarnings, toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isPortfolioViable = calculations.isDepositSufficient && 
                           calculations.isLoanCapacityOk && 
                           calculations.isCashflowViable;

  return (
    <div className="bg-white rounded-lg p-4 border border-[#f3f4f6]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#111827]">Portfolio Summary</h3>
        <div className="flex items-center">
          {isPortfolioViable ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <AlertTriangle size={16} className="text-red-500" />
          )}
          <span className={`ml-2 text-xs font-medium ${
            isPortfolioViable ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPortfolioViable ? 'Viable' : 'Check Required'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#6b7280]">Total Investment Cost</span>
          <span className="font-medium text-[#111827]">
            {formatCurrency(calculations.totalInvestmentCost)}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-[#6b7280]">Deposit Required</span>
          <span className={`font-medium ${
            calculations.isDepositSufficient ? 'text-[#111827]' : 'text-red-600'
          }`}>
            {formatCurrency(calculations.totalDepositRequired)}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-[#6b7280]">Loan Amount</span>
          <span className={`font-medium ${
            calculations.isLoanCapacityOk ? 'text-[#111827]' : 'text-red-600'
          }`}>
            {formatCurrency(calculations.totalLoanAmount)}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-[#6b7280]">Monthly Net Cashflow</span>
          <span className={`font-medium ${
            calculations.isCashflowViable ? 'text-green-600' : 'text-red-600'
          }`}>
            {calculations.monthlyNetCashflow >= 0 ? '+' : ''}
            {formatCurrency(calculations.monthlyNetCashflow)}/month
          </span>
        </div>
      </div>

      {/* Warning Messages */}
      {calculations.eligibilityWarnings.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="space-y-1">
              {calculations.eligibilityWarnings.map((warning, index) => (
                <p key={index} className="text-xs text-red-800">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};