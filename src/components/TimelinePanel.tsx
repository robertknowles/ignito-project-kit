import React, { useState } from 'react';
import { Plus, X, Calendar, Home, Pause, ChevronUp, ChevronDown } from 'lucide-react';
import { usePropertySelection, type EventBlock } from '../contexts/PropertySelectionContext';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePropertyInstance } from '../contexts/PropertyInstanceContext';
import { EVENT_TYPES, EVENT_CATEGORIES, getEventLabel } from '../constants/eventTypes';
import { EventConfigModal } from './EventConfigModal';
import { AddToTimelineModal } from './AddToTimelineModal';
import { PERIODS_PER_YEAR, BASE_YEAR } from '../constants/financialParams';
import { TourStep } from '@/components/TourManager';
import type { PropertyInstanceDetails } from '../types/propertyInstance';
import { getPropertyTypeImagePath } from '../utils/propertyTypeIcon';

// Convert period to year for display
const periodToYear = (period: number): number => {
  return BASE_YEAR + Math.floor((period - 1) / PERIODS_PER_YEAR);
};

// =============================================================================
// SLIDER INPUT COMPONENT - Matching ClientDetailsCard style
// =============================================================================

// Slider styles matching ClientDetailsCard - Clean black track and handle
const sliderClassName = "w-full appearance-none cursor-pointer bg-slate-200 rounded-full h-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-900 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all";

const getSliderStyle = (value: number, min: number, max: number) => ({
  background: `linear-gradient(to right, #0f172a 0%, #0f172a ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`,
});

// Format compact currency
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${value}`;
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: 'currency' | 'percent' | 'years' | 'number';
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = 'currency',
}) => {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return formatCompactCurrency(val);
      case 'percent':
        return formatPercent(val);
      case 'years':
        return `${val} yrs`;
      case 'number':
      default:
        return val.toString();
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide truncate">
          {label}
        </span>
        <span className="text-[11px] font-semibold text-slate-700 ml-1">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        className={sliderClassName}
        style={getSliderStyle(value, min, max)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};

// =============================================================================
// PROPERTY EXPANDED DETAILS - Shows all fields when expanded
// =============================================================================

interface PropertyExpandedDetailsProps {
  instanceId: string;
  instanceData: PropertyInstanceDetails | null;
  onFieldChange: (field: keyof PropertyInstanceDetails, value: any) => void;
}

const PropertyExpandedDetails: React.FC<PropertyExpandedDetailsProps> = ({
  instanceId,
  instanceData,
  onFieldChange,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'costs' | 'assumptions' | 'expenses'>('details');
  
  if (!instanceData) {
    return (
      <div className="p-3 text-center text-xs text-slate-500">
        Loading property details...
      </div>
    );
  }
  
  const tabs = [
    { id: 'details' as const, label: 'DETAILS' },
    { id: 'costs' as const, label: 'BUYING COSTS' },
    { id: 'assumptions' as const, label: 'ASSUMPTIONS' },
    { id: 'expenses' as const, label: 'EXPENSES' },
  ];
  
  return (
    <div className="bg-white">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[9px] font-medium tracking-wide transition-colors ${
              activeTab === tab.id
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content - Scrollable */}
      <div className="max-h-[280px] overflow-y-auto px-3 py-2">
        {activeTab === 'details' && (
          <div className="space-y-3">
            <SliderInput
              label="Purchase Price"
              value={instanceData.purchasePrice}
              onChange={(v) => onFieldChange('purchasePrice', v)}
              min={100000}
              max={2000000}
              step={10000}
              format="currency"
            />
            <SliderInput
              label="Weekly Rent"
              value={instanceData.rentPerWeek}
              onChange={(v) => onFieldChange('rentPerWeek', v)}
              min={100}
              max={2000}
              step={10}
              format="currency"
            />
            <SliderInput
              label="Deposit"
              value={100 - instanceData.lvr}
              onChange={(v) => onFieldChange('lvr', 100 - v)}
              min={5}
              max={40}
              step={1}
              format="percent"
            />
            <SliderInput
              label="Cash Contribution"
              value={instanceData.loanOffsetAccount}
              onChange={(v) => onFieldChange('loanOffsetAccount', v)}
              min={0}
              max={200000}
              step={5000}
              format="currency"
            />
          </div>
        )}
        
        {activeTab === 'costs' && (
          <div className="space-y-3">
            <SliderInput
              label="Stamp Duty Override"
              value={instanceData.stampDutyOverride ?? 0}
              onChange={(v) => onFieldChange('stampDutyOverride', v || null)}
              min={0}
              max={100000}
              step={1000}
              format="currency"
            />
            <SliderInput
              label="Conveyancing"
              value={instanceData.conveyancing}
              onChange={(v) => onFieldChange('conveyancing', v)}
              min={500}
              max={5000}
              step={100}
              format="currency"
            />
            <SliderInput
              label="Building & Pest"
              value={instanceData.buildingPestInspection}
              onChange={(v) => onFieldChange('buildingPestInspection', v)}
              min={0}
              max={2000}
              step={50}
              format="currency"
            />
            <SliderInput
              label="Mortgage Fees"
              value={instanceData.mortgageFees}
              onChange={(v) => onFieldChange('mortgageFees', v)}
              min={0}
              max={5000}
              step={100}
              format="currency"
            />
            <SliderInput
              label="Engagement Fee"
              value={instanceData.engagementFee}
              onChange={(v) => onFieldChange('engagementFee', v)}
              min={0}
              max={20000}
              step={500}
              format="currency"
            />
          </div>
        )}
        
        {activeTab === 'assumptions' && (
          <div className="space-y-3">
            <SliderInput
              label="Interest Rate"
              value={instanceData.interestRate}
              onChange={(v) => onFieldChange('interestRate', v)}
              min={3}
              max={10}
              step={0.1}
              format="percent"
            />
            <SliderInput
              label="Loan Term"
              value={instanceData.loanTerm}
              onChange={(v) => onFieldChange('loanTerm', v)}
              min={10}
              max={30}
              step={1}
              format="years"
            />
            {/* Dropdown fields */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide">
                  Loan Product
                </span>
                <select
                  value={instanceData.loanProduct}
                  onChange={(e) => onFieldChange('loanProduct', e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="IO">Interest Only</option>
                  <option value="PI">Principal & Interest</option>
                </select>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide">
                  Growth
                </span>
                <select
                  value={instanceData.growthAssumption}
                  onChange={(e) => onFieldChange('growthAssumption', e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] uppercase font-medium text-slate-400 tracking-wide">
                  State
                </span>
                <select
                  value={instanceData.state}
                  onChange={(e) => onFieldChange('state', e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            <SliderInput
              label="Vacancy Rate"
              value={instanceData.vacancyRate}
              onChange={(v) => onFieldChange('vacancyRate', v)}
              min={0}
              max={10}
              step={0.5}
              format="percent"
            />
            <SliderInput
              label="Property Mgmt"
              value={instanceData.propertyManagementPercent}
              onChange={(v) => onFieldChange('propertyManagementPercent', v)}
              min={0}
              max={15}
              step={0.5}
              format="percent"
            />
            <SliderInput
              label="Council & Water"
              value={instanceData.councilRatesWater}
              onChange={(v) => onFieldChange('councilRatesWater', v)}
              min={0}
              max={10000}
              step={100}
              format="currency"
            />
            <SliderInput
              label="Insurance"
              value={instanceData.buildingInsuranceAnnual}
              onChange={(v) => onFieldChange('buildingInsuranceAnnual', v)}
              min={0}
              max={5000}
              step={100}
              format="currency"
            />
            <SliderInput
              label="Strata"
              value={instanceData.strata}
              onChange={(v) => onFieldChange('strata', v)}
              min={0}
              max={15000}
              step={100}
              format="currency"
            />
            <SliderInput
              label="Maintenance"
              value={instanceData.maintenanceAllowanceAnnual}
              onChange={(v) => onFieldChange('maintenanceAllowanceAnnual', v)}
              min={0}
              max={10000}
              step={100}
              format="currency"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TIMELINE ITEM CARD - Displays a property or event in the timeline list
// =============================================================================

interface TimelineItemCardProps {
  type: 'property' | 'event' | 'pause';
  title: string;
  subtitle?: string;
  period?: number;
  icon?: React.ReactNode;
  imageUrl?: string;
  bgColor?: string;
  onRemove: () => void;
  onEdit?: () => void;
  // Property-specific props for expansion
  instanceId?: string;
  instanceData?: PropertyInstanceDetails | null;
  onFieldChange?: (field: keyof PropertyInstanceDetails, value: any) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// State colors matching AddToTimelineModal
const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  'VIC': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'NSW': { bg: 'bg-sky-100', text: 'text-sky-700' },
  'QLD': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'SA': { bg: 'bg-red-100', text: 'text-red-700' },
  'WA': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'TAS': { bg: 'bg-green-100', text: 'text-green-700' },
  'NT': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'ACT': { bg: 'bg-purple-100', text: 'text-purple-700' },
};

const TimelineItemCard: React.FC<TimelineItemCardProps> = ({
  type,
  title,
  subtitle,
  period,
  icon,
  imageUrl,
  bgColor = 'bg-gray-100',
  onRemove,
  onEdit,
  instanceId,
  instanceData,
  onFieldChange,
  isExpanded,
  onToggleExpand,
}) => {
  const isProperty = type === 'property';
  
  // Format price for display
  const priceDisplay = instanceData?.purchasePrice 
    ? `$${(instanceData.purchasePrice / 1000).toFixed(0)}k`
    : null;
  
  // Calculate yield
  const yieldDisplay = instanceData?.purchasePrice && instanceData?.rentPerWeek
    ? `${((instanceData.rentPerWeek * 52 / instanceData.purchasePrice) * 100).toFixed(1)}%`
    : null;
  
  // Get state info
  const stateDisplay = instanceData?.state;
  const stateColors = stateDisplay ? STATE_COLORS[stateDisplay] || { bg: 'bg-gray-100', text: 'text-gray-700' } : null;
  
  return (
    <div className={`bg-white border border-gray-200 rounded-xl transition-colors overflow-hidden ${isExpanded ? '' : 'hover:border-gray-400'}`}>
      {/* Header Row */}
      <div 
        className={`group flex items-center gap-2 cursor-pointer ${isProperty && isExpanded ? 'border-b border-gray-100' : ''} ${isProperty && imageUrl ? 'pr-2' : 'p-2.5'}`}
        onClick={isProperty ? onToggleExpand : onEdit}
      >
        {/* Property Image - fills entire left side, no gaps */}
        {isProperty && imageUrl ? (
          <div className="w-16 self-stretch flex-shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover scale-110"
            />
          </div>
        ) : (
          <div className={`flex-shrink-0 ${bgColor} p-1.5 rounded-md`}>
            {icon}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0 py-2 flex items-center justify-between gap-2">
          {/* Left: title and subtitle */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm truncate">{title}</h4>
            <p className="text-gray-500 text-xs mt-0.5">
              {subtitle ? `${subtitle}` : ''} · {priceDisplay || '$0'}
            </p>
          </div>
          {/* Right: expand and delete buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isProperty && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Details for Properties */}
      {isProperty && isExpanded && instanceId && onFieldChange && (
        <PropertyExpandedDetails
          instanceId={instanceId}
          instanceData={instanceData ?? null}
          onFieldChange={onFieldChange}
        />
      )}
    </div>
  );
};

// =============================================================================
// MAIN TIMELINE PANEL COMPONENT
// =============================================================================

interface TimelinePanelProps {
  defaultFirstPropertyExpanded?: boolean;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ defaultFirstPropertyExpanded = true }) => {
  const {
    propertyTypes,
    getPropertyQuantity,
    decrementProperty,
    eventBlocks,
    removeEvent,
    pauseBlocks,
    removePause,
  } = usePropertySelection();
  
  // Get timeline properties with purchase years
  const { timelineProperties } = useAffordabilityCalculator();
  
  // Get property instance data
  const { getInstance, updateInstance } = usePropertyInstance();
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventBlock | null>(null);
  
  // Expanded card state - track which cards are expanded (all start expanded)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Build timeline items list from properties, events, and pauses
  // Sort by period/order
  const buildTimelineList = () => {
    const items: Array<{
      id: string;
      type: 'property' | 'event' | 'pause';
      title: string;
      subtitle?: string;
      period?: number;
      propertyId?: string;
      instanceIndex?: number;
      event?: EventBlock;
      pauseDuration?: number;
      pauseIndex?: number;
    }> = [];
    
    // Add properties - each instance separately, with purchase year from timeline
    propertyTypes.forEach(property => {
      const count = getPropertyQuantity(property.id);
      for (let i = 0; i < count; i++) {
        const instanceId = `${property.id}_instance_${i}`;
        // Find the matching timeline property to get the purchase year
        const timelineProp = timelineProperties.find(tp => tp.instanceId === instanceId);
        const purchaseYear = timelineProp?.affordableYear 
          ? Math.floor(timelineProp.affordableYear) 
          : undefined;
        
        items.push({
          id: instanceId,
          type: 'property',
          title: property.title,
          subtitle: purchaseYear ? String(purchaseYear) : undefined,
          propertyId: property.id,
          instanceIndex: i,
        });
      }
    });
    
    // Add events
    eventBlocks.forEach(event => {
      const typeDef = EVENT_TYPES[event.eventType];
      items.push({
        id: event.id,
        type: 'event',
        title: event.label || getEventLabel(event.eventType, event.payload),
        subtitle: typeDef.shortLabel,
        period: event.period,
        event,
      });
    });
    
    // Add pauses
    pauseBlocks.forEach((pause, index) => {
      items.push({
        id: `pause_${index}`,
        type: 'pause',
        title: `Pause ${pause.duration === 0.5 ? '6 months' : pause.duration === 1 ? '1 year' : `${pause.duration} years`}`,
        pauseDuration: pause.duration,
        pauseIndex: index,
      });
    });
    
    return items;
  };
  
  const timelineList = buildTimelineList();
  const totalItems = timelineList.length;
  
  // Handle removing items
  const handleRemoveProperty = (propertyId: string) => {
    decrementProperty(propertyId);
  };
  
  const handleRemoveEvent = (eventId: string) => {
    removeEvent(eventId);
  };
  
  const handleRemovePause = (pauseIndex: number) => {
    removePause(pauseIndex);
  };
  
  // Handle editing
  const handleEditEvent = (event: EventBlock) => {
    setEditingEvent(event);
  };
  
  // Handle toggling card expansion - allow multiple to be expanded
  const handleToggleExpand = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  // Check if a card is expanded (default to expanded for properties)
  const isCardExpanded = (itemId: string, type: string) => {
    // Properties start expanded by default
    if (type === 'property' && !expandedCards.has(`collapsed_${itemId}`)) {
      return !expandedCards.has(`collapsed_${itemId}`);
    }
    return expandedCards.has(itemId);
  };
  
  // Toggle with inverted logic for default-expanded items
  const handleToggleExpandProperty = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      const collapsedKey = `collapsed_${itemId}`;
      if (newSet.has(collapsedKey)) {
        newSet.delete(collapsedKey);
      } else {
        newSet.add(collapsedKey);
      }
      return newSet;
    });
  };
  
  // Handle field changes for property instances
  const handlePropertyFieldChange = (instanceId: string, field: keyof PropertyInstanceDetails, value: any) => {
    updateInstance(instanceId, { [field]: value });
  };
  
  // Get image URL for property type
  const getPropertyImageUrl = (propertyTitle: string) => 
    getPropertyTypeImagePath(propertyTitle);
  
  return (
    <TourStep
      id="timeline-panel"
      title="Your Investment Timeline"
      content="This is your timeline - showing all properties and events you've added. Click '+ Add to Timeline' to add properties or life events. Drag items to reorder them."
      order={6}
      position="right"
    >
      <div id="timeline-panel" className="flex flex-col gap-3 h-full">
        {/* Add to Timeline Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 bg-white"
        >
          <Plus size={16} />
          Add to Timeline
          {totalItems > 0 && (
            <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
              {totalItems}
            </span>
          )}
        </button>
        
        {/* Timeline Items List */}
        {timelineList.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2">
            <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-wide px-1">
              Timeline Items
            </h4>
            
            {timelineList.map((item, index) => {
              if (item.type === 'property') {
                const instanceData = getInstance(item.id);
                // First property starts expanded (if defaultFirstPropertyExpanded is true and has properties), others start collapsed
                const isFirstProperty = index === 0;
                const isExpanded = isFirstProperty 
                  ? (defaultFirstPropertyExpanded && !expandedCards.has(`collapsed_${item.id}`))
                  : expandedCards.has(`expanded_${item.id}`);
                return (
                  <TimelineItemCard
                    key={item.id}
                    type="property"
                    title={item.title}
                    subtitle={item.subtitle}
                    imageUrl={getPropertyImageUrl(item.title)}
                    bgColor="bg-gray-100"
                    onRemove={() => handleRemoveProperty(item.propertyId!)}
                    instanceId={item.id}
                    instanceData={instanceData}
                    onFieldChange={(field, value) => handlePropertyFieldChange(item.id, field, value)}
                    isExpanded={isExpanded}
                    onToggleExpand={() => isFirstProperty ? handleToggleExpandProperty(item.id) : handleToggleExpand(`expanded_${item.id}`)}
                  />
                );
              }
              
              if (item.type === 'event') {
                const categoryDef = EVENT_CATEGORIES[item.event!.category];
                return (
                  <TimelineItemCard
                    key={item.id}
                    type="event"
                    title={item.title}
                    subtitle={item.subtitle}
                    period={item.period}
                    icon={<span className="text-sm">{EVENT_TYPES[item.event!.eventType].icon}</span>}
                    bgColor={categoryDef.bgColor}
                    onRemove={() => handleRemoveEvent(item.id)}
                    onEdit={() => handleEditEvent(item.event!)}
                  />
                );
              }
              
              if (item.type === 'pause') {
                return (
                  <TimelineItemCard
                    key={item.id}
                    type="pause"
                    title={item.title}
                    icon={<Pause size={14} className="text-amber-600" />}
                    bgColor="bg-amber-50"
                    onRemove={() => handleRemovePause(item.pauseIndex!)}
                  />
                );
              }
              
              return null;
            })}
          </div>
        )}
        
        {/* Empty State */}
        {timelineList.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Home size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 font-medium">No items yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add properties and events to build your investment timeline
              </p>
            </div>
          </div>
        )}
        
        {/* Add to Timeline Modal */}
        <AddToTimelineModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
        
        {/* Event Edit Modal */}
        {editingEvent && (
          <EventConfigModal
            isOpen={true}
            onClose={() => setEditingEvent(null)}
            category={editingEvent.category}
            editingEvent={editingEvent}
          />
        )}
      </div>
    </TourStep>
  );
};
