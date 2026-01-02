import React from 'react';

interface MiniPurchaseCardProps {
  propertyTitle: string;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  compact?: boolean; // For narrower column widths
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
  if (normalized.includes('metro house')) return 'Metro House';
  if (normalized.includes('regional house')) return 'Regional House';
  if (normalized.includes('house')) return 'House';
  if (normalized.includes('villa')) return 'Villa';
  if (normalized.includes('townhouse')) return 'Townhouse';
  if (normalized.includes('duplex')) return 'Duplex';
  if (normalized.includes('apartment')) return 'Apartment';
  if (normalized.includes('unit')) return 'Unit';
  if (normalized.includes('commercial')) return 'Commercial';
  return propertyTitle.split(' ').slice(0, 2).join(' ');
};

export const MiniPurchaseCard: React.FC<MiniPurchaseCardProps> = ({
  propertyTitle,
  cost,
  loanAmount,
  depositRequired,
  compact = false,
}) => {
  const isHouse = isHouseType(propertyTitle);
  const borderColor = isHouse ? '#22c55e' : '#3b82f6'; // Green for houses, blue for units
  
  // Calculate LVR
  const lvr = cost > 0 ? (loanAmount / cost) * 100 : 0;
  
  // Estimate yield (5% default for display)
  const estimatedYield = 5.0;
  
  // Compact mode for narrow columns
  if (compact) {
    return (
      <div 
        className="w-full bg-white rounded border border-slate-200 overflow-hidden"
        style={{ borderTopWidth: '3px', borderTopColor: borderColor }}
      >
        <div className="p-1 space-y-0">
          {/* Property Type - abbreviated */}
          <p className="text-[7px] font-semibold text-slate-800 truncate">
            {getShortName(propertyTitle).split(' ')[0]}
          </p>
          
          {/* Price */}
          <p className="text-[7px] text-slate-600">
            {formatCompact(cost)}
          </p>
          
          {/* LVR only in compact mode */}
          <p className="text-[6px] text-slate-500">
            {lvr.toFixed(0)}%
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="w-full bg-white rounded border border-slate-200 overflow-hidden"
      style={{ borderTopWidth: '4px', borderTopColor: borderColor }}
    >
      <div className="p-1 space-y-0">
        {/* Property Type */}
        <p className="text-[7px] font-semibold text-slate-800 truncate">
          {getShortName(propertyTitle)}
        </p>
        
        {/* Price */}
        <p className="text-[7px] text-slate-600">
          {formatCompact(cost)}
        </p>
        
        {/* LVR */}
        <p className="text-[7px] text-slate-500">
          LVR: {lvr.toFixed(0)}%
        </p>
        
        {/* Yield */}
        <p className="text-[7px] text-slate-500">
          Yield: {estimatedYield.toFixed(1)}%
        </p>
      </div>
    </div>
  );
};
