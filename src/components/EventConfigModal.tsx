import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight } from 'lucide-react';
import { usePropertySelection, type EventBlock, type EventCategory, type EventType, type EventPayload } from '../contexts/PropertySelectionContext';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { 
  EVENT_CATEGORIES, 
  EVENT_TYPES, 
  getEventTypesForCategory,
  getEventEffectDescriptions,
  getDefaultPayload,
  type EventTypeDefinition 
} from '../constants/eventTypes';
import { 
  PERIODS_PER_YEAR, 
  BASE_YEAR,
} from '../constants/financialParams';

// =============================================================================
// MODAL PROPS
// =============================================================================

interface EventConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: EventCategory;
  editingEvent?: EventBlock | null;
}

// =============================================================================
// EVENT TYPE SELECTOR
// =============================================================================

interface EventTypeSelectorProps {
  category: EventCategory;
  onSelect: (eventType: EventType) => void;
}

const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({ category, onSelect }) => {
  const eventTypes = getEventTypesForCategory(category);
  const categoryDef = EVENT_CATEGORIES[category];
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <span>{categoryDef.icon}</span>
        <span>{categoryDef.label}</span>
      </h3>
      
      <div className="space-y-2">
        {eventTypes.map((eventType) => (
          <button
            key={eventType.id}
            onClick={() => onSelect(eventType.id)}
            className="w-full flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
          >
            <span className="text-lg mt-0.5">{eventType.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900">{eventType.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{eventType.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {eventType.effects.map((effect, idx) => (
                  <span 
                    key={idx}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      effect.direction === 'increase' ? 'bg-green-100 text-green-700' :
                      effect.direction === 'decrease' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {effect.field} {effect.direction === 'increase' ? '↑' : effect.direction === 'decrease' ? '↓' : '↕'}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// EVENT FORM
// =============================================================================

interface EventFormProps {
  eventType: EventTypeDefinition;
  payload: EventPayload;
  period: number;
  onPayloadChange: (payload: EventPayload) => void;
  onPeriodChange: (period: number) => void;
  onBack: () => void;
  onSave: () => void;
  isEditing: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  eventType,
  payload,
  period,
  onPayloadChange,
  onPeriodChange,
  onBack,
  onSave,
  isEditing,
}) => {
  const { profile } = useInvestmentProfile();
  const categoryDef = EVENT_CATEGORIES[eventType.category];
  
  // Generate year options (from now until timeline end)
  const currentYear = new Date().getFullYear();
  const endYear = BASE_YEAR + 15; // Default timeline length
  const yearOptions = [];
  for (let year = currentYear; year <= endYear; year++) {
    yearOptions.push(year);
  }
  
  // Convert period to year (use H1 by default)
  const periodYear = BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
  
  const handleYearChange = (year: number) => {
    // Always use H1 (period 1) of the selected year
    const newPeriod = (year - BASE_YEAR) * PERIODS_PER_YEAR + 1;
    onPeriodChange(newPeriod);
  };
  
  // Get effect descriptions for preview
  const effectDescriptions = getEventEffectDescriptions(eventType.id, payload);
  
  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 text-sm";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onBack}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <span className="text-lg">{eventType.icon}</span>
        <h3 className="text-sm font-medium text-gray-900">{eventType.label}</h3>
      </div>
      
      {/* When - Year Selection */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <label className={labelClass}>When does this happen?</label>
        <select
          value={periodYear}
          onChange={(e) => handleYearChange(parseInt(e.target.value))}
          className={`${inputClass} mt-1`}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      
      {/* Dynamic Form Fields based on event type */}
      <div className="space-y-3">
        {/* Salary Change */}
        {eventType.id === 'salary_change' && (
          <>
            <div>
              <label className={labelClass}>Current Salary</label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                ${profile.baseSalary.toLocaleString()}
              </div>
            </div>
            <div>
              <label className={labelClass}>New Salary ($)</label>
              <input
                type="number"
                value={payload.newSalary || ''}
                onChange={(e) => onPayloadChange({ ...payload, newSalary: parseInt(e.target.value) || 0, previousSalary: profile.baseSalary })}
                placeholder="e.g., 120000"
                step="5000"
                className={inputClass}
              />
            </div>
          </>
        )}
        
        {/* Partner Income Change */}
        {eventType.id === 'partner_income_change' && (
          <div>
            <label className={labelClass}>Partner's New Annual Income ($)</label>
            <input
              type="number"
              value={payload.newPartnerSalary || ''}
              onChange={(e) => onPayloadChange({ ...payload, newPartnerSalary: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 80000"
              step="5000"
              className={inputClass}
            />
          </div>
        )}
        
        {/* Bonus/Windfall */}
        {eventType.id === 'bonus_windfall' && (
          <div>
            <label className={labelClass}>Bonus Amount ($)</label>
            <input
              type="number"
              value={payload.bonusAmount || ''}
              onChange={(e) => onPayloadChange({ ...payload, bonusAmount: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 50000"
              step="1000"
              className={inputClass}
            />
          </div>
        )}
        
        {/* Inheritance */}
        {eventType.id === 'inheritance' && (
          <div>
            <label className={labelClass}>Inheritance Amount ($)</label>
            <input
              type="number"
              value={payload.cashAmount || ''}
              onChange={(e) => onPayloadChange({ ...payload, cashAmount: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 100000"
              step="5000"
              className={inputClass}
            />
          </div>
        )}
        
        {/* Major Expense */}
        {eventType.id === 'major_expense' && (
          <div>
            <label className={labelClass}>Expense Amount ($)</label>
            <input
              type="number"
              value={payload.cashAmount || ''}
              onChange={(e) => onPayloadChange({ ...payload, cashAmount: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 30000"
              step="1000"
              className={inputClass}
            />
            <p className="text-[10px] text-gray-500 mt-1">
              This will reduce your available cash for property purchases
            </p>
          </div>
        )}
        
        {/* Dependent Change */}
        {eventType.id === 'dependent_change' && (
          <div>
            <label className={labelClass}>Change in Dependents</label>
            <select
              value={payload.dependentChange || 1}
              onChange={(e) => onPayloadChange({ ...payload, dependentChange: parseInt(e.target.value) })}
              className={inputClass}
            >
              <option value={-2}>Remove 2 dependents</option>
              <option value={-1}>Remove 1 dependent</option>
              <option value={1}>Add 1 dependent</option>
              <option value={2}>Add 2 dependents</option>
              <option value={3}>Add 3 dependents</option>
            </select>
          </div>
        )}
        
        {/* Interest Rate Change */}
        {eventType.id === 'interest_rate_change' && (
          <div>
            <label className={labelClass}>Rate Change (percentage points)</label>
            <input
              type="number"
              value={payload.rateChange || ''}
              onChange={(e) => onPayloadChange({ ...payload, rateChange: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., 0.5 or -0.25"
              step="0.25"
              className={inputClass}
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Positive = rates increase, Negative = rates decrease
            </p>
          </div>
        )}
        
        {/* Market Correction */}
        {eventType.id === 'market_correction' && (
          <>
            <div>
              <label className={labelClass}>Growth Rate Adjustment (%)</label>
              <input
                type="number"
                value={payload.growthAdjustment || ''}
                onChange={(e) => onPayloadChange({ ...payload, growthAdjustment: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., -3"
                step="1"
                className={inputClass}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Negative value reduces growth (e.g., -3 means 3% less growth)
              </p>
            </div>
            <div>
              <label className={labelClass}>Duration (periods)</label>
              <select
                value={payload.durationPeriods || 4}
                onChange={(e) => onPayloadChange({ ...payload, durationPeriods: parseInt(e.target.value) })}
                className={inputClass}
              >
                <option value={2}>1 year (2 periods)</option>
                <option value={4}>2 years (4 periods)</option>
                <option value={6}>3 years (6 periods)</option>
                <option value={8}>4 years (8 periods)</option>
                <option value={10}>5 years (10 periods)</option>
              </select>
            </div>
          </>
        )}
        
        {/* Refinance */}
        {eventType.id === 'refinance' && (
          <div>
            <label className={labelClass}>New Interest Rate (%)</label>
            <input
              type="number"
              value={payload.newInterestRate || ''}
              onChange={(e) => onPayloadChange({ ...payload, newInterestRate: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., 5.5"
              step="0.1"
              className={inputClass}
            />
          </div>
        )}
        
        {/* Sell Property - Placeholder for now */}
        {eventType.id === 'sell_property' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              Property sale events will be linked to specific properties in your timeline.
              This feature is coming soon.
            </p>
          </div>
        )}
        
        {/* Renovate - Placeholder for now */}
        {eventType.id === 'renovate' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              Renovation events will be linked to specific properties in your timeline.
              This feature is coming soon.
            </p>
          </div>
        )}
      </div>
      
      {/* Effects Preview */}
      <div className={`${categoryDef.bgColor} border ${categoryDef.color.replace('text-', 'border-').replace('600', '200')} p-3 rounded-lg`}>
        <p className="text-xs font-medium text-gray-700 mb-2">This will affect:</p>
        <ul className="space-y-1">
          {effectDescriptions.map((desc, idx) => (
            <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        {isEditing ? 'Update Event' : 'Add Event'}
      </button>
    </div>
  );
};

// =============================================================================
// MAIN MODAL COMPONENT
// =============================================================================

export const EventConfigModal: React.FC<EventConfigModalProps> = ({
  isOpen,
  onClose,
  category,
  editingEvent,
}) => {
  const { addEvent, updateEvent, eventBlocks, propertyOrder } = usePropertySelection();
  
  // State
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(
    editingEvent?.eventType || null
  );
  const [payload, setPayload] = useState<EventPayload>(
    editingEvent?.payload || {}
  );
  const [period, setPeriod] = useState<number>(
    editingEvent?.period || 1
  );
  
  // Reset state when modal opens with a new event
  useEffect(() => {
    if (editingEvent) {
      setSelectedEventType(editingEvent.eventType);
      setPayload(editingEvent.payload);
      setPeriod(editingEvent.period);
    } else {
      setSelectedEventType(null);
      setPayload({});
      // Default to current year H1
      const currentYear = new Date().getFullYear();
      const defaultPeriod = (currentYear - BASE_YEAR) * PERIODS_PER_YEAR + 1;
      setPeriod(Math.max(1, defaultPeriod));
    }
  }, [editingEvent]);
  
  // Handle event type selection
  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setPayload(getDefaultPayload(eventType));
  };
  
  // Handle save
  const handleSave = () => {
    if (!selectedEventType) return;
    
    // Calculate order based on current timeline items
    const totalItems = propertyOrder.length + eventBlocks.length;
    
    if (editingEvent) {
      // Update existing event
      updateEvent(editingEvent.id, {
        eventType: selectedEventType,
        category,
        period,
        payload,
      });
    } else {
      // Add new event
      addEvent({
        type: 'event',
        eventType: selectedEventType,
        category,
        period,
        order: totalItems,
        payload,
      });
    }
    
    onClose();
  };
  
  if (!isOpen) return null;
  
  const eventTypeDef = selectedEventType ? EVENT_TYPES[selectedEventType] : null;
  
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingEvent ? 'Edit Event' : 'Add Event'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content - scrollable */}
        <div className="overflow-y-auto flex-1 pr-1">
          {!selectedEventType ? (
            // Step 1: Select event type
            <EventTypeSelector 
              category={category}
              onSelect={handleEventTypeSelect}
            />
          ) : eventTypeDef ? (
            // Step 2: Configure event
            <EventForm
              eventType={eventTypeDef}
              payload={payload}
              period={period}
              onPayloadChange={setPayload}
              onPeriodChange={setPeriod}
              onBack={() => setSelectedEventType(null)}
              onSave={handleSave}
              isEditing={!!editingEvent}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
