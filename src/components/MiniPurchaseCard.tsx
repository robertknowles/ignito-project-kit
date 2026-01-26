import React from 'react';
import { Building2, Home } from 'lucide-react';

interface MiniPurchaseCardProps {
  propertyTitle: string;
  cost: number;
  loanAmount: number;
  depositRequired: number;
  compact?: boolean; // For narrower column widths
  onClick?: () => void; // Optional click handler for property details
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
  onClick,
}) => {
  const isHouse = isHouseType(propertyTitle);
  
  return (
    <div 
      className={`bg-slate-100 rounded border border-slate-200 px-2.5 py-0.5 flex items-center justify-center gap-1 ${onClick ? 'cursor-pointer hover:bg-slate-200 hover:border-slate-300 transition-colors' : ''}`}
      onClick={onClick}
      title={onClick ? "Click for property details" : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {isHouse ? (
        <Home size={9} className="text-slate-500" />
      ) : (
        <Building2 size={9} className="text-slate-500" />
      )}
      <span className="text-[8px] font-medium text-slate-700">
        {getShortName(propertyTitle)}
      </span>
    </div>
  );
};
