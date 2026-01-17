import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DepositTestFunnel } from './DepositTestFunnel';
import { ServiceabilityTestFunnel } from './ServiceabilityTestFunnel';
import { BorrowingCapacityTestFunnel } from './BorrowingCapacityTestFunnel';
import type { YearBreakdownData } from '@/types/property';

export type TestType = 'deposit' | 'serviceability' | 'borrowing';

interface SingleTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  testType: TestType;
  yearData: YearBreakdownData;
  year: number;
}

const testTitles: Record<TestType, string> = {
  deposit: 'Deposit Test Analysis',
  serviceability: 'Serviceability Test Analysis',
  borrowing: 'Borrowing Capacity Test Analysis',
};

export const SingleTestModal: React.FC<SingleTestModalProps> = ({
  isOpen,
  onClose,
  testType,
  yearData,
  year,
}) => {
  const renderFunnel = () => {
    switch (testType) {
      case 'deposit':
        return <DepositTestFunnel yearData={yearData} />;
      case 'serviceability':
        return <ServiceabilityTestFunnel yearData={yearData} />;
      case 'borrowing':
        return <BorrowingCapacityTestFunnel yearData={yearData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {testTitles[testType]} for Year {year}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-2">
          {renderFunnel()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
