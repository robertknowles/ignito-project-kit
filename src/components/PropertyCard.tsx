import React from 'react';
import { InfoIcon, PlusIcon, MinusIcon } from 'lucide-react';
interface PropertyCardProps {
  id: string;
  title: string;
  priceRange: string;
  yield: string;
  cashFlow: string;
  riskLevel: string;
  quantity?: number;
  selected?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}
export const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  title,
  priceRange,
  yield: yieldValue,
  cashFlow,
  riskLevel,
  quantity = 0,
  selected,
  onAdd,
  onRemove
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
        return 'bg-[#10b981] bg-opacity-50';
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
        <h4 className="text-sm font-medium text-[#111827]">{title}</h4>
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full ${getRiskDot(riskLevel)}`}></span>
          <span className={`ml-2 text-xs ${getRiskColor(riskLevel)} font-normal`}>
            {riskLevel}
          </span>
        </div>
      </div>
      <div className="text-xs text-[#374151] font-normal">{priceRange}</div>
      <div className="text-xs text-[#6b7280] mt-1">
        Yield: {yieldValue} • Cash Flow: {cashFlow}
      </div>
      
      {/* Quantity Display */}
      {quantity > 0 && (
        <div className="mt-2 mb-1">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {quantity} selected
          </span>
        </div>
      )}
      
      {/* Interactive Controls */}
      <div className="absolute bottom-3 right-3 flex items-center space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          disabled={quantity === 0}
          className={`p-1 rounded-full transition-colors ${
            quantity === 0 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-[#6b7280] hover:text-red-600 hover:bg-red-50'
          }`}
        >
          <MinusIcon size={16} />
        </button>
        
        <span className="text-xs font-medium text-[#374151] min-w-[20px] text-center">
          {quantity}
        </span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd?.();
          }}
          className="p-1 rounded-full text-[#6b7280] hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <PlusIcon size={16} />
        </button>
        
        <InfoIcon size={16} className="text-[#6b7280] opacity-60 ml-1" />
      </div>
    </div>;
};