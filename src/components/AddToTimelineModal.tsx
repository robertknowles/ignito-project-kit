import React, { useState } from 'react';
import { X, Home, CalendarClock, ChevronRight, MapPin, Plus, Minus, Pause, Copy } from 'lucide-react';
import { usePropertySelection, type EventCategory } from '../contexts/PropertySelectionContext';
import { useDataAssumptions } from '../contexts/DataAssumptionsContext';
import { 
  EVENT_CATEGORIES, 
  EVENT_TYPES, 
  getEventTypesForCategory,
  type EventCategoryDefinition 
} from '../constants/eventTypes';
import { EventCategoryIcon } from '../utils/eventIcons';
import { EventConfigModal } from './EventConfigModal';
import { CustomBlockModal, type CustomPropertyBlock } from './CustomBlockModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Property images mapping
const PROPERTY_IMAGES: Record<string, string> = {
  'Metro Houses': '/images/properties/metro-house.png',
  'Units / Apartments': '/images/properties/units-apartments.png',
  'Villas / Townhouses': '/images/properties/townhouses.png',
  'Houses (Regional)': '/images/properties/regional-house.png',
  'Duplexes': '/images/properties/duplex.png',
  'Small Blocks (3-4 Units)': '/images/properties/smaller-blocks-3-4.png',
  'Larger Blocks (10-20 Units)': '/images/properties/larger-blocks-10-20.png',
  'Commercial Property': '/images/properties/commercial-property.png',
};

// State colors - neutral slate-based palette
const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  'VIC': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'NSW': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'QLD': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'SA': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'WA': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'TAS': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'NT': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'ACT': { bg: 'bg-slate-100', text: 'text-slate-600' },
};

const STATE_NAMES: Record<string, string> = {
  'VIC': 'Victoria',
  'NSW': 'New South Wales',
  'QLD': 'Queensland',
  'SA': 'South Australia',
  'WA': 'Western Australia',
  'TAS': 'Tasmania',
  'NT': 'Northern Territory',
  'ACT': 'Australian Capital Territory',
};

interface AddToTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'properties' | 'events';

// Property Card for the modal
interface PropertyCardProps {
  id: string;
  title: string;
  priceRange: string;
  yieldValue: string;
  state?: string;
  imageUrl?: string;
  onAdd: () => void;
  onDuplicate?: () => void;
  isCustom?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  title,
  priceRange,
  yieldValue,
  state = 'VIC',
  imageUrl,
  onAdd,
  onDuplicate,
  isCustom,
}) => {
  const stateColors = STATE_COLORS[state] || { bg: 'bg-slate-100', text: 'text-slate-600' };
  const stateName = STATE_NAMES[state] || state;
  
  return (
    <div 
      className="group flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
    >
      {/* Image thumbnail */}
      {imageUrl && (
        <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-50 border border-gray-100 flex-shrink-0">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900 text-sm truncate">{title}</h4>
          <span className={`flex items-center gap-0.5 text-[9px] font-medium ${stateColors.text} ${stateColors.bg} px-1.5 py-0.5 rounded flex-shrink-0`}>
            <MapPin size={9} />
            {stateName}
          </span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5">
          {priceRange} · Yield: {yieldValue}
        </p>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Duplicate button - only for non-custom templates */}
        {!isCustom && onDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors"
            title="Duplicate & Customize"
          >
            <Copy size={14} />
          </button>
        )}
        {/* Add button */}
        <button
          onClick={onAdd}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

// Event Category Button
interface EventCategoryButtonProps {
  category: EventCategoryDefinition;
  onClick: () => void;
}

const EventCategoryButton: React.FC<EventCategoryButtonProps> = ({ category, onClick }) => {
  const eventTypes = getEventTypesForCategory(category.id);
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl text-left hover:bg-gray-50 hover:border-gray-300 transition-colors group w-full"
    >
      <div className="flex-shrink-0 w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center border border-gray-100">
        <EventCategoryIcon category={category.id} size={22} className="text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-slate-900">{category.label}</div>
        <div className="text-[11px] text-slate-500">{category.description}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {eventTypes.map(et => et.shortLabel).join(' · ')}
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
    </button>
  );
};

export const AddToTimelineModal: React.FC<AddToTimelineModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [selectedEventCategory, setSelectedEventCategory] = useState<EventCategory | null>(null);
  const [selectedPauseDuration, setSelectedPauseDuration] = useState(1);
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false);
  const [duplicatingFromTemplate, setDuplicatingFromTemplate] = useState<string | null>(null);
  
  const {
    propertyTypes,
    incrementProperty,
    addPause,
    addCustomBlock,
  } = usePropertySelection();
  
  const { getPropertyTypeTemplate } = useDataAssumptions();
  
  // Handle adding a property and closing the modal
  const handleAddProperty = (propertyId: string) => {
    incrementProperty(propertyId);
    onClose();
  };
  
  // Handle adding a pause and closing the modal
  const handleAddPause = () => {
    addPause(selectedPauseDuration);
    onClose();
  };
  
  // Handle saving a custom block
  const handleSaveCustomBlock = (block: CustomPropertyBlock) => {
    addCustomBlock(block);
    setShowCustomBlockModal(false);
    setDuplicatingFromTemplate(null);
    onClose();
  };
  
  // Handle duplicating a template - opens CustomBlockModal pre-filled with template data
  const handleDuplicateTemplate = (propertyTitle: string) => {
    setDuplicatingFromTemplate(propertyTitle);
    setShowCustomBlockModal(true);
  };
  
  // Handle selecting an event category
  const handleEventCategorySelect = (category: EventCategory) => {
    setSelectedEventCategory(category);
  };
  
  // Handle closing the event config modal
  const handleEventConfigClose = () => {
    setSelectedEventCategory(null);
    onClose();
  };
  
  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('properties');
      setSelectedEventCategory(null);
      setShowCustomBlockModal(false);
      setDuplicatingFromTemplate(null);
    }
  }, [isOpen]);
  
  // Get property image with normalization
  const getPropertyImage = (propertyTitle: string): string | undefined => {
    if (PROPERTY_IMAGES[propertyTitle]) {
      return PROPERTY_IMAGES[propertyTitle];
    }
    const normalizeForMatch = (name: string) => name.toLowerCase().replace(' focus', '').trim();
    const normalizedInput = normalizeForMatch(propertyTitle);
    const matchingKey = Object.keys(PROPERTY_IMAGES).find(
      key => normalizeForMatch(key) === normalizedInput
    );
    return matchingKey ? PROPERTY_IMAGES[matchingKey] : undefined;
  };
  
  return (
    <>
      <Dialog open={isOpen && !selectedEventCategory} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add to Timeline</DialogTitle>
          </DialogHeader>
          
          {/* Tab Switcher */}
          <div className="flex gap-2 border-b border-gray-100 pb-3">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'properties'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Home size={16} />
              Properties
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'events'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarClock size={16} />
              Events
            </button>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto py-2">
            {activeTab === 'properties' && (
              <div className="space-y-2">
                {/* Add Custom Property Button - Always at top */}
                <button
                  onClick={() => setShowCustomBlockModal(true)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-left hover:bg-slate-100 hover:border-slate-400 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors">
                    <Plus size={20} className="text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 text-sm">Add Custom Property</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Create your own property with custom settings
                    </p>
                  </div>
                </button>
                
                {/* Standard Property Templates */}
                <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-1">Property Templates</h4>
                {propertyTypes.filter(p => !p.isCustom).map((property) => {
                  const template = getPropertyTypeTemplate(property.title);
                  const displayPrice = template?.purchasePrice 
                    ? `$${template.purchasePrice.toLocaleString()}`
                    : property.priceRange;
                  const displayYield = template?.purchasePrice && template?.rentPerWeek
                    ? `${((template.rentPerWeek * 52 / template.purchasePrice) * 100).toFixed(1)}%`
                    : property.yield;
                    
                  return (
                    <PropertyCard
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      priceRange={displayPrice}
                      yieldValue={displayYield}
                      state={template?.state}
                      imageUrl={getPropertyImage(property.title)}
                      onAdd={() => handleAddProperty(property.id)}
                      onDuplicate={() => handleDuplicateTemplate(property.title)}
                      isCustom={false}
                    />
                  );
                })}
                
                {/* Custom Property Blocks */}
                {propertyTypes.filter(p => p.isCustom).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Custom Blocks</h4>
                    {propertyTypes.filter(p => p.isCustom).map((property) => (
                      <PropertyCard
                        key={property.id}
                        id={property.id}
                        title={property.title}
                        priceRange={property.priceRange}
                        yieldValue={property.yield}
                        onAdd={() => handleAddProperty(property.id)}
                        isCustom={true}
                      />
                    ))}
                  </div>
                )}
                
                {/* Pause Period Option */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Other</h4>
                  <div 
                    className="group flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all"
                    onClick={handleAddPause}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <Pause size={20} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 text-sm">Pause Period</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Skip a period before the next purchase
                      </p>
                    </div>
                    <select 
                      value={selectedPauseDuration}
                      onChange={(e) => { e.stopPropagation(); setSelectedPauseDuration(parseFloat(e.target.value)); }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
                    >
                      <option value="0.5">6 months</option>
                      <option value="1">1 year</option>
                      <option value="1.5">1.5 years</option>
                      <option value="2">2 years</option>
                      <option value="3">3 years</option>
                    </select>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'events' && (
              <div className="space-y-2.5">
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide">
                  Add life events that affect your investment timeline
                </p>
                {Object.values(EVENT_CATEGORIES).map((category) => (
                  <EventCategoryButton
                    key={category.id}
                    category={category}
                    onClick={() => handleEventCategorySelect(category.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Event Config Modal - opens when a category is selected */}
      {selectedEventCategory && (
        <EventConfigModal
          isOpen={true}
          onClose={handleEventConfigClose}
          category={selectedEventCategory}
          editingEvent={null}
        />
      )}
      
      {/* Custom Block Modal - for adding custom properties or duplicating templates */}
      <CustomBlockModal
        isOpen={showCustomBlockModal}
        onClose={() => {
          setShowCustomBlockModal(false);
          setDuplicatingFromTemplate(null);
        }}
        onSave={handleSaveCustomBlock}
        sourceTemplate={duplicatingFromTemplate ? getPropertyTypeTemplate(duplicatingFromTemplate) : undefined}
      />
    </>
  );
};
