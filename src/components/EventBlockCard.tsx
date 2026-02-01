import React from 'react';
import { X } from 'lucide-react';
import type { EventBlock } from '../contexts/PropertySelectionContext';
import { 
  EVENT_CATEGORIES, 
  EVENT_TYPES, 
  getEventLabel,
  getEventEffectDescriptions 
} from '../constants/eventTypes';
import { PERIODS_PER_YEAR, BASE_YEAR } from '../constants/financialParams';

// Convert period to year for display
const periodToYear = (period: number): number => {
  return BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
};

interface EventBlockCardProps {
  event: EventBlock;
  onRemove: () => void;
  onEdit?: () => void;
}

export const EventBlockCard: React.FC<EventBlockCardProps> = ({
  event,
  onRemove,
  onEdit,
}) => {
  const categoryDef = EVENT_CATEGORIES[event.category];
  const typeDef = EVENT_TYPES[event.eventType];
  const displayLabel = event.label || getEventLabel(event.eventType, event.payload);
  const effectDescriptions = getEventEffectDescriptions(event.eventType, event.payload);

  return (
    <div 
      className={`${categoryDef.bgColor} border-2 border-gray-200 rounded-lg p-6 mb-4 ${onEdit ? 'cursor-pointer hover:border-gray-300' : ''}`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Event Icon */}
          <div className={`flex-shrink-0 w-12 h-12 ${categoryDef.bgColor} border border-gray-200 rounded-lg flex items-center justify-center text-2xl`}>
            {typeDef.icon}
          </div>

          {/* Event Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{displayLabel}</h3>
              <span className={`text-xs font-medium ${categoryDef.color} ${categoryDef.bgColor} px-2 py-0.5 rounded-full border border-current/20`}>
                {categoryDef.label}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Scheduled for <span className="font-medium">{periodToYear(event.period)}</span>
            </p>

            {/* Effects List */}
            <div className={`${categoryDef.bgColor} border border-gray-200 rounded-md p-3`}>
              <p className="text-xs text-gray-600 font-medium mb-1.5">
                This event will affect:
              </p>
              <ul className="space-y-1">
                {effectDescriptions.map((desc, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Event-specific details */}
            {renderEventDetails(event)}
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove event"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

// Render event-specific details based on event type
const renderEventDetails = (event: EventBlock) => {
  const { eventType, payload } = event;

  switch (eventType) {
    case 'salary_change':
      return payload.newSalary ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {payload.previousSalary && (
            <div className="bg-white/50 rounded p-2">
              <span className="text-gray-500">Previous:</span>
              <span className="font-medium text-gray-700 ml-1">
                ${payload.previousSalary.toLocaleString()}
              </span>
            </div>
          )}
          <div className="bg-white/50 rounded p-2">
            <span className="text-gray-500">New Salary:</span>
            <span className="font-medium text-gray-700 ml-1">
              ${payload.newSalary.toLocaleString()}
            </span>
          </div>
        </div>
      ) : null;

    case 'partner_income_change':
      return payload.newPartnerSalary ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">Partner Income:</span>
          <span className="font-medium text-gray-700 ml-1">
            ${payload.newPartnerSalary.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'bonus_windfall':
      return payload.bonusAmount ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">Bonus:</span>
          <span className="font-medium text-green-600 ml-1">
            +${payload.bonusAmount.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'inheritance':
      return payload.cashAmount ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">Amount:</span>
          <span className="font-medium text-green-600 ml-1">
            +${payload.cashAmount.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'major_expense':
      return payload.cashAmount ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">Expense:</span>
          <span className="font-medium text-red-600 ml-1">
            -${payload.cashAmount.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'dependent_change':
      return payload.dependentChange ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">Change:</span>
          <span className={`font-medium ml-1 ${payload.dependentChange > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
            {payload.dependentChange > 0 ? '+' : ''}{payload.dependentChange} dependent{Math.abs(payload.dependentChange) !== 1 ? 's' : ''}
          </span>
        </div>
      ) : null;

    case 'interest_rate_change':
      return payload.rateChange !== undefined ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">Rate Change:</span>
          <span className={`font-medium ml-1 ${payload.rateChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {payload.rateChange > 0 ? '+' : ''}{payload.rateChange}%
          </span>
        </div>
      ) : null;

    case 'market_correction':
      return (
        <div className="mt-3 flex gap-2 text-xs">
          {payload.growthAdjustment !== undefined && (
            <div className="bg-white/50 rounded p-2">
              <span className="text-gray-500">Growth Adj:</span>
              <span className="font-medium text-red-600 ml-1">
                {payload.growthAdjustment}%
              </span>
            </div>
          )}
          {payload.durationPeriods && (
            <div className="bg-white/50 rounded p-2">
              <span className="text-gray-500">Duration:</span>
              <span className="font-medium text-gray-700 ml-1">
                {payload.durationPeriods / 2} year{payload.durationPeriods > 2 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      );

    case 'refinance':
      return payload.newInterestRate ? (
        <div className="mt-3 bg-white/50 rounded p-2 text-xs inline-block">
          <span className="text-gray-500">New Rate:</span>
          <span className="font-medium text-gray-700 ml-1">
            {payload.newInterestRate}%
          </span>
        </div>
      ) : null;

    default:
      return null;
  }
};
