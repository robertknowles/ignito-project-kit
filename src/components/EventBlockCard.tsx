import React from 'react';
import { X } from 'lucide-react';
import type { EventBlock } from '../contexts/PropertySelectionContext';
import { 
  EVENT_TYPES, 
  getEventLabel,
  getEventEffectDescriptions 
} from '../constants/eventTypes';
import { EventTypeIcon } from '../utils/eventIcons';
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
  const typeDef = EVENT_TYPES[event.eventType];
  const displayLabel = event.label || getEventLabel(event.eventType, event.payload);
  const effectDescriptions = getEventEffectDescriptions(event.eventType, event.payload);

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm ${onEdit ? 'cursor-pointer hover:border-gray-300 hover:shadow-md transition-all' : ''}`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Event Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-slate-50 border border-gray-100 rounded-xl flex items-center justify-center">
            <EventTypeIcon eventType={event.eventType} size={24} className="text-slate-500" />
          </div>

          {/* Event Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base font-semibold text-slate-900">{displayLabel}</h3>
              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {typeDef.shortLabel}
              </span>
            </div>

            <p className="text-sm text-slate-500 mb-3">
              Scheduled for <span className="font-medium text-slate-700">{periodToYear(event.period)}</span>
            </p>

            {/* Effects List */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide mb-2">
                This event will affect
              </p>
              <ul className="space-y-1.5">
                {effectDescriptions.map((desc, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
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
          className="flex-shrink-0 ml-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            <div className="bg-white border border-gray-100 rounded-lg p-2">
              <span className="text-slate-500">Previous:</span>
              <span className="font-medium text-slate-700 ml-1">
                ${payload.previousSalary.toLocaleString()}
              </span>
            </div>
          )}
          <div className="bg-white border border-gray-100 rounded-lg p-2">
            <span className="text-slate-500">New Salary:</span>
            <span className="font-medium text-slate-700 ml-1">
              ${payload.newSalary.toLocaleString()}
            </span>
          </div>
        </div>
      ) : null;

    case 'partner_income_change':
      return payload.newPartnerSalary ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">Partner Income:</span>
          <span className="font-medium text-slate-700 ml-1">
            ${payload.newPartnerSalary.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'bonus_windfall':
      return payload.bonusAmount ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">Bonus:</span>
          <span className="font-semibold text-green-600 ml-1">
            +${payload.bonusAmount.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'inheritance':
      return payload.cashAmount ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">Amount:</span>
          <span className="font-semibold text-green-600 ml-1">
            +${payload.cashAmount.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'major_expense':
      return payload.cashAmount ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">Expense:</span>
          <span className="font-semibold text-red-600 ml-1">
            -${payload.cashAmount.toLocaleString()}
          </span>
        </div>
      ) : null;

    case 'dependent_change':
      return payload.dependentChange ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">Change:</span>
          <span className={`font-semibold ml-1 ${payload.dependentChange > 0 ? 'text-slate-700' : 'text-slate-600'}`}>
            {payload.dependentChange > 0 ? '+' : ''}{payload.dependentChange} dependent{Math.abs(payload.dependentChange) !== 1 ? 's' : ''}
          </span>
        </div>
      ) : null;

    case 'interest_rate_change':
      return payload.rateChange !== undefined ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">Rate Change:</span>
          <span className={`font-semibold ml-1 ${payload.rateChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {payload.rateChange > 0 ? '+' : ''}{payload.rateChange}%
          </span>
        </div>
      ) : null;

    case 'market_correction':
      return (
        <div className="mt-3 flex gap-2 text-xs">
          {payload.growthAdjustment !== undefined && (
            <div className="bg-white border border-gray-100 rounded-lg p-2">
              <span className="text-slate-500">Growth Adj:</span>
              <span className="font-semibold text-red-600 ml-1">
                {payload.growthAdjustment}%
              </span>
            </div>
          )}
          {payload.durationPeriods && (
            <div className="bg-white border border-gray-100 rounded-lg p-2">
              <span className="text-slate-500">Duration:</span>
              <span className="font-medium text-slate-700 ml-1">
                {payload.durationPeriods / 2} year{payload.durationPeriods > 2 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      );

    case 'refinance':
      return payload.newInterestRate ? (
        <div className="mt-3 bg-white border border-gray-100 rounded-lg p-2 text-xs inline-block">
          <span className="text-slate-500">New Rate:</span>
          <span className="font-medium text-slate-700 ml-1">
            {payload.newInterestRate}%
          </span>
        </div>
      ) : null;

    default:
      return null;
  }
};
