import React from 'react';
import { Building2, Home } from 'lucide-react';

interface MiniPurchaseCardProps {
  propertyTitle: string;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  compact?: boolean; // For narrower column widths
  onDetailsClick?: () => void;
}

// Determine if property is a house type (for color coding)
const isHouseType = (propertyTitle: string): boolean => {
  const normalized = propertyTitle.toLowerCase();
  return normalized.includes('house') || 
         normalized.includes('villa') || 
         normalized.includes('townhouse') ||
         normalized.includes('duplex');
};

// Format compact currency
const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
};

// Get short property type name
const getShortName = (propertyTitle: string): string => {
  const normalized = propertyTitle.toLowerCase();
  if (normalized.includes('house')) return 'House';
  if (normalized.includes('villa')) return 'Villa';
  if (normalized.includes('townhouse')) return 'Townhouse';
  if (normalized.includes('duplex')) return 'Duplex';
  if (normalized.includes('apartment')) return 'Apt';
  if (normalized.includes('unit')) return 'Unit';
  if (normalized.includes('commercial')) return 'Commercial';
  return propertyTitle.split(' ')[0];
};

export const MiniPurchaseCard: React.FC<MiniPurchaseCardProps> = ({
  propertyTitle,
  cost,
  loanAmount,
  onDetailsClick,
}) => {
  const isHouse = isHouseType(propertyTitle);
  
  // Calculate LVR
  const lvr = cost > 0 ? (loanAmount / cost) * 100 : 0;
  
  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header with grey background */}
      <div className="bg-slate-50 px-1.5 h-6 flex items-center gap-1.5 border-b border-slate-100">
        {isHouse ? (
          <Home size={12} className="text-slate-400" />
        ) : (
          <Building2 size={12} className="text-slate-400" />
        )}
        <span className="text-[10px] font-semibold text-slate-800">
          {getShortName(propertyTitle)}
        </span>
      </div>
      
      {/* Details link with white background */}
      <div className="bg-white px-1.5 h-6 flex items-center justify-center border-t border-slate-100">
        <button 
          onClick={onDetailsClick}
          className="text-[9px] text-blue-500 hover:text-blue-600 font-medium text-center"
        >
          Details
        </button>
      </div>
    </div>
  );
};
