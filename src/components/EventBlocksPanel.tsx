import React, { useState } from 'react';
import { Plus, X, Calendar, ChevronRight } from 'lucide-react';
import { usePropertySelection, type EventBlock, type EventCategory } from '../contexts/PropertySelectionContext';
import { 
  EVENT_CATEGORIES, 
  EVENT_TYPES, 
  getEventLabel,
  type EventCategoryDefinition 
} from '../constants/eventTypes';
import { EventCategoryIcon, EventTypeIcon } from '../utils/eventIcons';
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
  const typeDef = EVENT_TYPES[event.eventType];
  const displayLabel = event.label || getEventLabel(event.eventType, event.payload);
  
  return (
    <div 
      className="group flex items-start gap-2.5 p-2.5 bg-white border border-gray-200 rounded-xl transition-colors hover:bg-gray-50 hover:border-gray-300 cursor-pointer"
      onClick={onEdit}
    >
      {/* Left: Category Icon */}
      <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 mt-0.5">
        <EventTypeIcon eventType={event.eventType} size={16} className="text-gray-500" />
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
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 leading-tight mt-0.5">
          <Calendar size={10} className="text-gray-400" />
          <span>{periodToYear(event.period)}</span>
          <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[9px] font-medium">
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
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl text-left hover:bg-gray-50 hover:border-gray-300 transition-colors group w-full"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
        <EventCategoryIcon category={category.id} size={20} className="text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900">{category.label}</div>
        <div className="text-[10px] text-gray-500">{category.description}</div>
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
        className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[10px] uppercase font-semibold text-gray-500 tracking-wide">Select event type</h4>
            <button 
              onClick={() => setShowCategoryPicker(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
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
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1">
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
          <p className="text-xs text-gray-600 mb-1">No events scheduled</p>
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
