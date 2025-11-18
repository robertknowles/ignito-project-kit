import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DepositTestFunnel } from './DepositTestFunnel';
import { ServiceabilityTestFunnel } from './ServiceabilityTestFunnel';
import { BorrowingCapacityTestFunnel } from './BorrowingCapacityTestFunnel';
import type { YearBreakdownData } from '@/types/property';

interface DecisionEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearData: YearBreakdownData;
  year: number;
}

export const DecisionEngineModal: React.FC<DecisionEngineModalProps> = ({
  isOpen,
  onClose,
  yearData,
  year,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Decision Engine Analysis for Year {year}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-6">
            This analysis shows how the property purchase in {year} passed the three critical affordability tests:
            deposit availability, serviceability requirements, and borrowing capacity limits.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DepositTestFunnel yearData={yearData} />
            <ServiceabilityTestFunnel yearData={yearData} />
            <BorrowingCapacityTestFunnel yearData={yearData} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


