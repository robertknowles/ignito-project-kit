import React from 'react';

interface PropertyCardProps {
  title: string;
  priceRange: string;
  yield: string;
  cashFlow: string;
  riskLevel: string;
  selected?: boolean;
}

export function PropertyCard({ 
  title, 
  priceRange, 
  yield: yieldValue, 
  cashFlow, 
  riskLevel, 
  selected = false 
}: PropertyCardProps) {
  return (
    <div className={`p-4 rounded-lg border transition-colors cursor-pointer ${
      selected 
        ? 'border-[#3b82f6] bg-[#eff6ff] border-opacity-60' 
        : 'border-[#f3f4f6] bg-white hover:bg-[#f9fafb]'
    }`}>
      <h3 className="text-sm font-medium text-[#111827] mb-2">{title}</h3>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-xs text-[#6b7280]">Price:</span>
          <span className="text-xs text-[#374151]">{priceRange}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[#6b7280]">Yield:</span>
          <span className="text-xs text-[#374151]">{yieldValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[#6b7280]">Cash Flow:</span>
          <span className="text-xs text-[#374151]">{cashFlow}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[#6b7280]">Risk:</span>
          <span className="text-xs text-[#374151]">{riskLevel}</span>
        </div>
      </div>
    </div>
  );
}