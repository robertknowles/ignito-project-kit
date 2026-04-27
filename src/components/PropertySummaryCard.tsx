/**
 * PropertySummaryCard — compact ~220px summary card for the dashboard
 * property card row. Shows icon, type bucket + state tag, year, price,
 * monthly cashflow chip, caret, and a hover-revealed X to remove.
 *
 * Click anywhere on the card body (not the X) to expand the detail panel.
 */

import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { PropertyTypeIcon } from '../utils/propertyTypeIcon';
import { getBucketForPropertyType } from '../utils/propertyTypeBuckets';

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
};

const formatMonthlyCashflow = (value: number): string => {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const formatted =
    abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs}`;
  return rounded < 0 ? `-${formatted}/mo` : `${formatted}/mo`;
};

interface PropertySummaryCardProps {
  instanceId: string;
  propertyType: string;
  instanceData: PropertyInstanceDetails;
  /** Calculated purchase year (e.g. 2029) — undefined if not yet placed */
  purchaseYear?: number;
  /** Estimated monthly net cashflow */
  monthlyCashflow: number;
  /** Whether this card's detail panel is currently open */
  isExpanded: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export const PropertySummaryCard: React.FC<PropertySummaryCardProps> = ({
  propertyType,
  instanceData,
  purchaseYear,
  monthlyCashflow,
  isExpanded,
  onClick,
  onRemove,
}) => {
  const bucket = getBucketForPropertyType(propertyType);
  const cashflowPositive = monthlyCashflow >= 0;

  return (
    <div className="flex-shrink-0 group" style={{ width: 220 }}>
      {/* Year — sits above the card like a chart-axis label */}
      <div className="text-[11px] font-medium text-gray-400 mb-1.5 px-1">
        {purchaseYear ?? '—'}
      </div>

      <div
        onClick={onClick}
        className={`relative rounded-xl border bg-white cursor-pointer transition-all ${
          isExpanded
            ? 'border-gray-900 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        {/* X — hover-revealed remove */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm z-10"
          aria-label="Remove property"
          title="Remove property"
        >
          <X size={11} />
        </button>

        <div className="p-3">
          {/* Header row: icon + name + state tag */}
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-shrink-0 mt-0.5">
              <PropertyTypeIcon propertyTitle={propertyType} size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
                {bucket}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {instanceData.state}
              </div>
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>

          {/* Price + cashflow chip */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="text-[14px] font-semibold text-gray-900">
              {formatCompactCurrency(instanceData.purchasePrice)}
            </div>
            <div
              className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                cashflowPositive
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {formatMonthlyCashflow(monthlyCashflow)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
