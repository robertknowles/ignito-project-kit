import React from 'react';
import { InfoIcon, PlusIcon, MinusIcon } from 'lucide-react';
import { PropertyTypeIcon } from '../utils/propertyTypeIcon';

interface PropertyCardProps {
  title: string;
  priceRange: string;
  yield: string;
  cashFlow: string;
  riskLevel: 'Low' | 'Medium' | 'Medium-Low' | 'High' | 'Very High';
  count?: number;
  selected?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
}
export const PropertyCard: React.FC<PropertyCardProps> = ({
  title,
  priceRange,
  yield: yieldValue,
  cashFlow,
  riskLevel,
  count = 0,
  selected,
  onIncrement,
  onDecrement,
}) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'text-[#6b7280]';
      case 'Medium-Low':
        return 'text-[#6b7280]';
      case 'Medium':
        return 'text-[#6b7280]';
      case 'High':
        return 'text-[#6b7280]';
      case 'Very High':
        return 'text-[#6b7280]';
      default:
        return 'text-[#6b7280]';
    }
  };
  const getRiskDot = (level: string) => {
    switch (level) {
      case 'Low':
        return 'bg-green-300/70';
      case 'Medium-Low':
        return 'bg-[#3b82f6] bg-opacity-60';
      case 'Medium':
        return 'bg-[#3b82f6] bg-opacity-60';
      case 'High':
        return 'bg-[#3b82f6] bg-opacity-60';
      case 'Very High':
        return 'bg-[#3b82f6] bg-opacity-60';
      default:
        return 'bg-[#6b7280]';
    }
  };
  return <div className={`bg-white rounded-lg p-3 border border-[#f3f4f6] ${selected ? 'bg-[#f9fafb]' : ''} hover:shadow-sm transition-shadow cursor-pointer h-full relative`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <PropertyTypeIcon propertyTitle={title} size={16} className="text-[#6b7280]" />
          <h4 className="text-sm font-medium text-[#111827]">{title}</h4>
        </div>
      </div>
      <div className="text-xs text-[#374151] font-normal">{priceRange}</div>
      <div className="text-xs text-[#6b7280] mt-1">
        Yield: {yieldValue} • Cash Flow: {cashFlow}
      </div>
      <div className="absolute bottom-3 right-3 flex items-center space-x-2">
        {count > 0 && (
          <span className="text-xs font-medium text-[#111827] bg-[#f3f4f6] px-2 py-1 rounded">
            {count}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIncrement?.();
          }}
          className="hover:bg-[#f3f4f6] p-1 rounded transition-colors"
        >
          <PlusIcon size={16} className="text-[#6b7280] opacity-60 hover:opacity-80" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDecrement?.();
          }}
          className="hover:bg-[#f3f4f6] p-1 rounded transition-colors"
          disabled={count === 0}
        >
          <MinusIcon size={16} className={`text-[#6b7280] ${count === 0 ? 'opacity-30' : 'opacity-60 hover:opacity-80'}`} />
        </button>
        <InfoIcon size={16} className="text-[#6b7280] opacity-60" />
      </div>
    </div>;
};