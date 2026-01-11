import React, { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  calculateBorrowingCapacity,
  type RepaymentFrequency,
  type BorrowingCapacityResult,
} from '@/utils/calculateBorrowingCapacity';

interface BorrowingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BorrowingCalculatorModal: React.FC<BorrowingCalculatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Form state
  const [affordableRepayment, setAffordableRepayment] = useState<number>(2000);
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>('monthly');
  const [interestRate, setInterestRate] = useState<number>(6.04);
  const [loanTermYears, setLoanTermYears] = useState<number>(25);
  const [feesPerPeriod, setFeesPerPeriod] = useState<number>(10);
  const [feesFrequency, setFeesFrequency] = useState<RepaymentFrequency>('monthly');

  // Calculate result whenever inputs change
  const result: BorrowingCapacityResult = useMemo(() => {
    return calculateBorrowingCapacity({
      affordableRepayment,
      interestRate,
      loanTermYears,
      repaymentFrequency,
      feesPerPeriod,
      feesFrequency,
    });
  }, [affordableRepayment, interestRate, loanTermYears, repaymentFrequency, feesPerPeriod, feesFrequency]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleNumberInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<number>>,
    allowDecimals: boolean = false
  ) => {
    const parsed = allowDecimals ? parseFloat(value) : parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setter(parsed);
    } else if (value === '') {
      setter(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <Calculator className="w-5 h-5" />
            How much can I borrow?
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {/* Required field indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            required field
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-4">Mortgage details</h3>

          <div className="space-y-4">
            {/* Row 1: Affordable repayment, Frequency, Interest rate */}
            <div className="grid grid-cols-3 gap-3">
              {/* Affordable repayment */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Affordable repayment:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={affordableRepayment || ''}
                    onChange={(e) => handleNumberInput(e.target.value, setAffordableRepayment)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
              </div>

              {/* Repayment frequency */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Repayment frequency:
                </label>
                <Select
                  value={repaymentFrequency}
                  onValueChange={(value) => setRepaymentFrequency(value as RepaymentFrequency)}
                >
                  <SelectTrigger className="w-full h-[38px] text-sm border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interest rate */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Interest rate:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate || ''}
                    onChange={(e) => handleNumberInput(e.target.value, setInterestRate, true)}
                    className="w-full pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
              </div>
            </div>

            {/* Row 2: Length of loan, Fees, Fees frequency */}
            <div className="grid grid-cols-3 gap-3">
              {/* Length of loan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Length of loan:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={loanTermYears || ''}
                    onChange={(e) => handleNumberInput(e.target.value, setLoanTermYears)}
                    className="w-full pl-3 pr-14 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="25"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">years</span>
                </div>
              </div>

              {/* Fees */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Fees:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={feesPerPeriod || ''}
                    onChange={(e) => handleNumberInput(e.target.value, setFeesPerPeriod)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Fees frequency */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Fees frequency:
                </label>
                <Select
                  value={feesFrequency}
                  onValueChange={(value) => setFeesFrequency(value as RepaymentFrequency)}
                >
                  <SelectTrigger className="w-full h-[38px] text-sm border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Result Display */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
                Estimated Borrowing Capacity
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(result.borrowingCapacity)}
              </p>
              
              {/* Additional breakdown */}
              <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Total Repayments</p>
                  <p className="font-semibold text-gray-700">{formatCurrency(result.totalRepayments)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Interest</p>
                  <p className="font-semibold text-gray-700">{formatCurrency(result.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Fees</p>
                  <p className="font-semibold text-gray-700">{formatCurrency(result.totalFees)}</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
              This calculator provides estimates only and should not be relied upon for financial decisions. 
              Actual borrowing capacity may vary based on individual circumstances and lender criteria.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

