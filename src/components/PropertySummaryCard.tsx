/**
 * PropertySummaryCard - compact ~220px summary card for the dashboard
 * property card row. Shows icon, type bucket + state tag, year, price,
 * caret, and a hover-revealed X to remove.
 *
 * Click anywhere on the card body (not the X) to expand the detail panel.
 */

import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { PropertyTypeIcon } from '../utils/propertyTypeIcon';
import { getCategoryLabel, type CellId } from '../utils/propertyCells';

/**
 * Resolve any propertyType identifier (cell ID, legacy key, display label) to
 * the client-facing category label ("Equity Growth Property" etc.). The
 * granular metro/regional house/unit type is internal and never surfaced.
 */
const resolveCellLabel = (propertyType: string): string => getCategoryLabel(propertyType);

const AUS_STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
};

interface PropertySummaryCardProps {
  instanceId: string;
  propertyType: string;
  instanceData: PropertyInstanceDetails;
  /** Calculated purchase year (e.g. 2029) - undefined if not yet placed */
  purchaseYear?: number;
  /** True when the property cannot be afforded inside the planning timeline */
  isUnplaceable?: boolean;
  /** Whether this card's detail panel is currently open */
  isExpanded: boolean;
  /** 1-based position in the property order (for "Property 1", "Property 2" labels) */
  cardIndex?: number;
  onClick: () => void;
  onRemove: () => void;
  /** Inline cell-type change - fires AI re-plan via chatBus (parent supplies). */
  onTypeChange?: (newCellId: CellId) => void;
  /** Inline state change - direct field write. */
  onStateChange?: (newState: string) => void;
}

export const PropertySummaryCard: React.FC<PropertySummaryCardProps> = ({
  propertyType,
  instanceData,
  purchaseYear,
  isUnplaceable,
  isExpanded,
  cardIndex,
  onClick,
  onRemove,
  onTypeChange,
  onStateChange,
}) => {
  const cellLabel = resolveCellLabel(propertyType);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="flex-shrink-0 group" style={{ width: 220 }}>
      {/* Year - sits above the card like a chart-axis label */}
      <div
        className={`text-[11px] font-medium mb-1.5 px-1 ${
          isUnplaceable ? 'text-amber-600' : 'text-gray-400'
        }`}
        title={isUnplaceable ? "This property doesn't fit in the current timeline - extend the timeline or adjust the strategy." : undefined}
      >
        {isUnplaceable ? "Doesn't fit - extend timeline" : (purchaseYear ?? '-')}
      </div>

      <div
        onClick={onClick}
        className={`relative rounded-xl border bg-white cursor-pointer transition-all ${
          isExpanded
            ? 'border-gray-900 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        {/* X - hover-revealed remove */}
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
              {/* Property type is internal - show the read-only category only. */}
              <div className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
                {cellLabel}
              </div>

              {/* Inline-edit State - click chip to swap */}
              {onStateChange ? (
                <label
                  className="relative inline-block cursor-pointer mt-0.5 group/state"
                  onClick={stop}
                  title="Change state"
                >
                  <span className="text-[10px] text-gray-500 group-hover/state:text-gray-700 group-hover/state:underline decoration-dotted underline-offset-2">
                    {instanceData.state}
                  </span>
                  <select
                    value={instanceData.state}
                    onChange={(e) => onStateChange(e.target.value)}
                    onClick={stop}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    aria-label="Property state"
                  >
                    {AUS_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {instanceData.state}
                </div>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-gray-400 flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>

          {/* Price */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-[14px] font-semibold text-gray-900">
              {formatCompactCurrency(instanceData.purchasePrice)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
