import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BreakdownItem {
  label: string;
  value: number;
  isPercentage?: boolean;
  isNumeric?: boolean; // For plain numbers without currency formatting
}

interface BreakdownInfoProps {
  items: BreakdownItem[];
  total?: number;
  title?: string;
  totalLabel?: string;
}

export const BreakdownInfo: React.FC<BreakdownInfoProps> = ({ items, total, title, totalLabel = 'Total' }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="ml-1 inline-flex items-center justify-center hover:bg-gray-100 rounded-full p-0.5 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {title && (
          <div className="font-semibold text-sm text-gray-800 mb-2 pb-2 border-b">
            {title}
          </div>
        )}
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium text-gray-800">
                {item.isPercentage 
                  ? `${item.value.toFixed(1)}%` 
                  : item.isNumeric 
                    ? item.value.toLocaleString()
                    : formatCurrency(item.value)}
              </span>
            </div>
          ))}
          {total !== undefined && (
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-800">{totalLabel}</span>
                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

