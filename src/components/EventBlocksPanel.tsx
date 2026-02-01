import React, { useState } from 'react';
import { Plus, X, Calendar, ChevronRight } from 'lucide-react';
import { usePropertySelection, type EventBlock, type EventCategory } from '../contexts/PropertySelectionContext';
import { 
  EVENT_CATEGORIES, 
  EVENT_TYPES, 
  getEventLabel,
  type EventCategoryDefinition 
} from '../constants/eventTypes';
import { EventConfigModal } from './EventConfigModal';
import { PERIODS_PER_YEAR, BASE_YEAR } from '../constants/financialParams';

// Convert period to year for display
const periodToYear = (period: number): number => {
  return BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
};

// =============================================================================
// EVENT CARD COMPONENT - Displays a single event in the sidebar list
// =============================================================================

interface EventCardProps {
  event: EventBlock;
  onRemove: () => void;
  onEdit: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onRemove, onEdit }) => {
  const categoryDef = EVENT_CATEGORIES[event.category];
  const typeDef = EVENT_TYPES[event.eventType];
  const displayLabel = event.label || getEventLabel(event.eventType, event.payload);
  
  return (
    <div 
      className={`group flex items-start gap-2 p-2.5 bg-white border border-gray-200 rounded-xl transition-colors hover:border-gray-400 cursor-pointer`}
      onClick={onEdit}
    >
      {/* Left: Category Icon */}
      <div className={`flex-shrink-0 ${categoryDef.bgColor} p-1.5 rounded-md mt-0.5`}>
        <span className="text-sm">{typeDef.icon}</span>
      </div>
      
      {/* Center: Text Stack */}
      <div className="flex-1 min-w-0">
        {/* Title row with actions */}
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-medium text-gray-900 text-xs truncate">{displayLabel}</h4>
          {/* Remove button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Remove event"
          >
            <X size={12} />
          </button>
        </div>
        
        {/* Details - period */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 leading-tight">
          <Calendar size={10} />
          <span>{periodToYear(event.period)}</span>
          <span className={`${categoryDef.color} ${categoryDef.bgColor} px-1.5 py-0.5 rounded text-[9px]`}>
            {typeDef.shortLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CATEGORY BUTTON COMPONENT - For selecting event category
// =============================================================================

interface CategoryButtonProps {
  category: EventCategoryDefinition;
  onClick: () => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ category, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-3 ${category.bgColor} border border-gray-200 rounded-xl text-left hover:border-gray-300 transition-colors group w-full`}
    >
      <span className="text-xl">{category.icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-xs ${category.color}`}>{category.label}</div>
        <div className="text-[10px] text-gray-500 truncate">{category.description}</div>
      </div>
      <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
    </button>
  );
};

// =============================================================================
// MAIN PANEL COMPONENT
// =============================================================================

export const EventBlocksPanel: React.FC = () => {
  const { eventBlocks, removeEvent, getEventCount } = usePropertySelection();
  
  // Modal state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventBlock | null>(null);
  
  const eventCount = getEventCount();
  
  // Handle category selection
  const handleCategorySelect = (category: EventCategory) => {
    setSelectedCategory(category);
    setShowCategoryPicker(false);
  };
  
  // Handle event edit
  const handleEditEvent = (event: EventBlock) => {
    setEditingEvent(event);
    setSelectedCategory(event.category);
  };
  
  // Handle modal close
  const handleModalClose = () => {
    setSelectedCategory(null);
    setEditingEvent(null);
  };
  
  // Sort events by period for display
  const sortedEvents = [...eventBlocks].sort((a, b) => a.period - b.period);
  
  return (
    <div id="event-blocks-panel" className="flex flex-col gap-3">
      {/* Add Event Button */}
      <button
        onClick={() => setShowCategoryPicker(true)}
        className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Custom Event
        {eventCount > 0 && (
          <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
            {eventCount}
          </span>
        )}
      </button>
      
      {/* Category Picker */}
      {showCategoryPicker && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-700">What type of event?</h4>
            <button 
              onClick={() => setShowCategoryPicker(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={14} />
            </button>
          </div>
          {Object.values(EVENT_CATEGORIES).map((category) => (
            <CategoryButton 
              key={category.id}
              category={category}
              onClick={() => handleCategorySelect(category.id)}
            />
          ))}
        </div>
      )}
      
      {/* Active Events List */}
      {sortedEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wide px-1">
            Scheduled Events
          </h4>
          {sortedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onRemove={() => removeEvent(event.id)}
              onEdit={() => handleEditEvent(event)}
            />
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {eventBlocks.length === 0 && !showCategoryPicker && (
        <div className="text-center py-4 px-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-xs text-gray-500 mb-1">No events scheduled</p>
          <p className="text-[10px] text-gray-400">
            Add salary changes, inheritance, or market events to see how they affect your timeline
          </p>
        </div>
      )}
      
      {/* Event Config Modal */}
      {selectedCategory && (
        <EventConfigModal
          isOpen={true}
          onClose={handleModalClose}
          category={selectedCategory}
          editingEvent={editingEvent}
        />
      )}
    </div>
  );
};
