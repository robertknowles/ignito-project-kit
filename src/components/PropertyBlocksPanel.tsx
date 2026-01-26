import React, { useState, useMemo } from 'react'
import { Plus, Minus, Pause, X, Pencil, ChevronUp, ChevronDown, SlidersHorizontal, Copy } from 'lucide-react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { PropertyTypeIcon } from '../utils/propertyTypeIcon'
import { CustomBlockModal } from './CustomBlockModal'
import type { CustomPropertyBlock } from './CustomBlockModal'
import { PropertyDetailModal } from './PropertyDetailModal'
import { TourStep } from '@/components/TourManager'

// Growth rates structure for cascading display
interface CascadingGrowthRates {
  year1: string
  years2to3: string
  year4: string
  year5plus: string
}

// Property images mapping - add more as needed
const PROPERTY_IMAGES: Record<string, string> = {
  'Metro Houses': '/images/properties/metro-house.png',
}

// NEW DESIGN: Large image property card (trial for Metro Houses)
// Matches the reference design with image on left (~40%), footer only on RHS
interface PropertyBlockCardV2Props {
  title: string
  priceRange: string
  yieldValue: string
  growthRates?: CascadingGrowthRates
  count: number
  imageUrl: string
  onIncrement: () => void
  onDecrement: () => void
  onEdit?: () => void
  onDuplicate?: () => void
}

const PropertyBlockCardV2: React.FC<PropertyBlockCardV2Props> = ({
  title,
  priceRange,
  yieldValue,
  growthRates,
  count,
  imageUrl,
  onIncrement,
  onDecrement,
  onEdit,
  onDuplicate,
}) => {
  const isActive = count > 0
  
  // Format compact growth rate string (Y1→Y2-3→Y4→Y5+)
  const growthRateDisplay = growthRates 
    ? `${growthRates.year1} → ${growthRates.years2to3} → ${growthRates.year4} → ${growthRates.year5plus}%`
    : null
  
  return (
    <div className={`group rounded-xl transition-all bg-white border overflow-hidden ${
      isActive 
        ? 'ring-1 ring-gray-900 border-gray-900' 
        : 'border-gray-200 group-hover:border-gray-300'
    }`}>
      {/* Main Card - Horizontal layout */}
      <div className="flex">
        {/* Left: Large Property Image (~40%) - extends full height */}
        <div className="w-[40%] relative flex-shrink-0 bg-white flex items-center justify-center border-r border-gray-200">
          {/* Property image - zoomed in */}
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
            style={{ 
              minHeight: '110px'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        
        {/* Right: Content + Footer stacked (~60%) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content area */}
          <div className="p-2 flex-1">
            {/* Top row: Title + Count badge */}
            <div className="flex items-start justify-between gap-1">
              <h4 className="font-semibold text-gray-900 text-xs leading-tight">{title}</h4>
              {count > 0 && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded min-w-[1.25rem] text-center">
                  {count}
                </span>
              )}
            </div>
            
            {/* Details */}
            <div className="mt-1">
              <p className="text-gray-600 text-[10px] leading-tight">
                {priceRange} · Yield: {yieldValue}
              </p>
              {growthRateDisplay && (
                <p className="text-gray-400 text-[9px] mt-0.5 leading-tight" title="Growth rate: Y1 → Y2-3 → Y4 → Y5+">
                  Growth: {growthRateDisplay}
                </p>
              )}
            </div>
          </div>
          
          {/* Footer: Edit & Duplicate - Only on RHS */}
          {(onEdit || onDuplicate) && (
            <div className="flex items-center justify-between py-1.5 px-2 bg-gray-100 border-t border-gray-200">
              {/* Left: Edit & Duplicate */}
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Pencil size={10} />
                    <span className="text-[9px]">Edit</span>
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Copy size={10} />
                    <span className="text-[9px]">Duplicate</span>
                  </button>
                )}
              </div>
              
              {/* Right: +/- controls */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onDecrement(); }}
                  disabled={count === 0}
                  className={`p-0.5 rounded transition-colors ${
                    count === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Minus size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onIncrement(); }}
                  className="p-0.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact property card for sidebar - ElevenLabs style
interface PropertyBlockCardProps {
  title: string
  priceRange: string
  yieldValue: string
  growthRates?: CascadingGrowthRates
  count: number
  isCustom?: boolean
  onIncrement: () => void
  onDecrement: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
}

const PropertyBlockCard: React.FC<PropertyBlockCardProps> = ({
  title,
  priceRange,
  yieldValue,
  growthRates,
  count,
  isCustom,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const isActive = count > 0
  
  // Format compact growth rate string (Y1→Y2-3→Y4→Y5+)
  const growthRateDisplay = growthRates 
    ? `${growthRates.year1}→${growthRates.years2to3}→${growthRates.year4}→${growthRates.year5plus}%`
    : null
  
  return (
    <div className={`group flex flex-col rounded-xl transition-colors ${
      isActive 
        ? 'ring-1 ring-gray-900' 
        : ''
    }`}>
      {/* Main Card */}
      <div className={`flex items-start gap-2 p-2.5 bg-white border transition-colors ${
        isActive 
          ? 'border-gray-900' 
          : 'border-gray-200 group-hover:border-gray-400'
      } ${!isCustom && onEdit ? 'rounded-t-xl border-b-0' : 'rounded-xl'}`}>
        {/* Left: Icon in light gray square */}
        <div className="flex-shrink-0 bg-gray-100 p-1.5 rounded-md mt-0.5">
          <PropertyTypeIcon propertyTitle={title} size={16} className="text-gray-700" />
        </div>
        
        {/* Center: Text Stack - Full width, actions below on same row */}
        <div className="flex-1 min-w-0">
          {/* Title row with actions */}
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-medium text-gray-900 text-xs truncate">{title}</h4>
            {/* Actions - inline with title */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Delete button for custom blocks */}
              {isCustom && onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Delete custom block"
                >
                  <X size={10} />
                </button>
              )}
              
              {/* Count badge */}
              {count > 0 && (
                <span className="text-[9px] font-semibold text-gray-900 bg-gray-100 px-1 py-0.5 rounded min-w-[1rem] text-center">
                  {count}
                </span>
              )}
              
              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); onDecrement(); }}
                disabled={count === 0}
                className={`p-0.5 rounded transition-colors ${
                  count === 0 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                <Minus size={12} />
              </button>
              
              {/* Add button */}
              <button
                onClick={(e) => { e.stopPropagation(); onIncrement(); }}
                className="p-0.5 text-gray-400 hover:text-gray-900 rounded transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          
          {/* Details - price and yield */}
          <p className="text-gray-500 text-[10px] leading-tight">
            {priceRange} · Yield: {yieldValue}
          </p>
          
          {/* Growth rates on separate line */}
          {growthRateDisplay && (
            <p className="text-gray-400 text-[9px] leading-tight" title="Growth rate: Y1 → Y2-3 → Y4 → Y5+">
              Growth: {growthRateDisplay}
            </p>
          )}
        </div>
      </div>
      
      {/* Edit Template & Duplicate Extension - Grey box below the block */}
      {!isCustom && (onEdit || onDuplicate) && (
        <div className={`flex items-center justify-center gap-3 py-1.5 px-3 bg-gray-100 rounded-b-xl border border-t-0 transition-colors ${
          isActive ? 'border-gray-900' : 'border-gray-200 group-hover:border-gray-400'
        }`}>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
            >
              <Pencil size={10} className="text-gray-500" />
              <span className="text-[10px] text-gray-500">Edit Template</span>
            </button>
          )}
          {onDuplicate && count > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="flex items-center gap-1.5 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
              title="Duplicate this property block with a new instance"
            >
              <Copy size={10} className="text-gray-500" />
              <span className="text-[10px] text-gray-500">Duplicate</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Extract cost from priceRange string (e.g., "$250k-$450k" -> 250000)
const extractMinCost = (priceRange: string): number => {
  const match = priceRange.match(/\$?([\d.]+)([kKmM])?/)
  if (!match) return 0
  let value = parseFloat(match[1])
  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') value *= 1000
  if (suffix === 'm') value *= 1000000
  return value
}

export const PropertyBlocksPanel: React.FC = () => {
  const {
    propertyTypes,
    incrementProperty,
    decrementProperty,
    getPropertyQuantity,
    pauseBlocks,
    addPause,
    removePause,
    getPauseCount,
    customBlocks,
    addCustomBlock,
    removeCustomBlock,
  } = usePropertySelection()

  const { getInstance, updateInstance } = usePropertyInstance()
  const { getPropertyTypeTemplate, propertyAssumptions } = useDataAssumptions()

  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: 'default' | 'cost'; direction: 'asc' | 'desc' }>({ key: 'default', direction: 'asc' })
  const [selectedPauseDuration, setSelectedPauseDuration] = useState(1)
  
  // State for duplicating a property - stores the property type and source instance data
  const [duplicatingProperty, setDuplicatingProperty] = useState<{
    propertyId: string;
    propertyType: string;
    sourceInstanceId: string;
  } | null>(null)

  // Sort properties based on sortConfig
  const sortedProperties = useMemo(() => {
    if (sortConfig.key === 'default') {
      return propertyTypes
    }
    return [...propertyTypes].sort((a, b) => {
      const costA = extractMinCost(a.priceRange)
      const costB = extractMinCost(b.priceRange)
      return sortConfig.direction === 'asc' ? costA - costB : costB - costA
    })
  }, [propertyTypes, sortConfig])

  const handleSaveCustomBlock = (block: CustomPropertyBlock) => {
    addCustomBlock(block)
  }

  const handleEditTemplate = (propertyTitle: string) => {
    setEditingTemplate(propertyTitle)
  }

  // Handle duplicating a property block
  // Opens a modal pre-filled with the source property's data so user can edit before adding
  const handleDuplicateProperty = (propertyId: string, propertyTitle: string) => {
    const currentCount = getPropertyQuantity(propertyId)
    if (currentCount === 0) return

    // Get the last instance's data to use as source for duplication
    const lastInstanceId = `${propertyId}_instance_${currentCount - 1}`
    
    // Open the duplicate modal with the source instance info
    setDuplicatingProperty({
      propertyId,
      propertyType: propertyTitle,
      sourceInstanceId: lastInstanceId,
    })
  }

  // Handle saving the duplicated property from the modal
  const handleSaveDuplicate = () => {
    if (!duplicatingProperty) return
    
    const { propertyId } = duplicatingProperty
    
    // Increment the property count (the modal will have already updated the instance data)
    incrementProperty(propertyId)
    
    // Close the modal
    setDuplicatingProperty(null)
  }

  // Helper to get cascading growth rates for a property
  const getGrowthRatesForProperty = (propertyTitle: string, isCustom?: boolean): CascadingGrowthRates | undefined => {
    if (isCustom) {
      // Custom blocks have a single growth rate, show it for all periods
      const customBlock = customBlocks.find(b => b.title === propertyTitle)
      if (customBlock) {
        const rate = customBlock.growthPercent.toString()
        return { year1: rate, years2to3: rate, year4: rate, year5plus: rate }
      }
      return undefined
    }
    
    // Find the property assumption by type
    const assumption = propertyAssumptions.find(a => a.type === propertyTitle)
    if (assumption) {
      return {
        year1: assumption.growthYear1,
        years2to3: assumption.growthYears2to3,
        year4: assumption.growthYear4,
        year5plus: assumption.growthYear5plus,
      }
    }
    return undefined
  }

  const pauseCount = getPauseCount()

  return (
    <TourStep
      id="property-blocks"
      title="Property Building Blocks"
      content="These are your property templates - pre-configured investment types with different price points, yields, and growth profiles. Think of them as 'Lego blocks' for building a strategy. Click + to add properties to your timeline."
      order={7}
      position="right"
    >
    <div id="property-blocks-panel" className="flex flex-col gap-3">
      {/* Sort Controls */}
      <div className="flex gap-2 mb-1">
        <button 
          onClick={() => setSortConfig({ key: 'default', direction: 'asc' })}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border ${
            sortConfig.key === 'default' 
              ? 'bg-gray-900 text-white border-gray-900' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <span>All</span>
        </button>
        <button 
          onClick={() => setSortConfig(prev => ({
            key: 'cost',
            direction: prev.key === 'cost' && prev.direction === 'asc' ? 'desc' : 'asc'
          }))}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border ${
            sortConfig.key === 'cost' 
              ? 'bg-gray-900 text-white border-gray-900' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
          }`}
        >
          <SlidersHorizontal size={12} />
          <span>By Cost</span>
          {sortConfig.key === 'cost' && (
            sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          )}
        </button>
      </div>

      {/* Add Custom Block Button - Always at top, below filters */}
      <button
        id="add-custom-block"
        onClick={() => setShowCustomBlockModal(true)}
        className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Custom Property Block
      </button>

      {/* Property Cards - Vertical Stack */}
      {sortedProperties.map((property) => {
        // Use new V2 design for properties with images (currently just Metro Houses)
        const imageUrl = PROPERTY_IMAGES[property.title]
        
        if (imageUrl && !property.isCustom) {
          return (
            <PropertyBlockCardV2
              key={property.id}
              title={property.title}
              priceRange={property.priceRange}
              yieldValue={property.yield}
              growthRates={getGrowthRatesForProperty(property.title, property.isCustom)}
              count={getPropertyQuantity(property.id)}
              imageUrl={imageUrl}
              onIncrement={() => incrementProperty(property.id)}
              onDecrement={() => decrementProperty(property.id)}
              onEdit={() => handleEditTemplate(property.title)}
              onDuplicate={() => handleDuplicateProperty(property.id, property.title)}
            />
          )
        }
        
        // Original card design for other properties
        return (
          <PropertyBlockCard
            key={property.id}
            title={property.title}
            priceRange={property.priceRange}
            yieldValue={property.yield}
            growthRates={getGrowthRatesForProperty(property.title, property.isCustom)}
            count={getPropertyQuantity(property.id)}
            isCustom={property.isCustom}
            onIncrement={() => incrementProperty(property.id)}
            onDecrement={() => decrementProperty(property.id)}
            onEdit={!property.isCustom ? () => handleEditTemplate(property.title) : undefined}
            onDelete={property.isCustom ? () => removeCustomBlock(property.id) : undefined}
            onDuplicate={!property.isCustom ? () => handleDuplicateProperty(property.id, property.title) : undefined}
          />
        )
      })}

      {/* Pause Period Card - Compact Style */}
      <div className={`flex items-center gap-2 p-2.5 bg-white border rounded-xl transition-colors ${
        pauseCount > 0 
          ? 'border-gray-900 ring-1 ring-gray-900' 
          : 'border-gray-200 hover:border-gray-400'
      }`}>
        {/* Left: Icon in light amber square */}
        <div className="flex-shrink-0 bg-amber-50 p-1.5 rounded-md">
          <Pause size={16} className="text-amber-600" />
        </div>
        
        {/* Center: Text Stack + Duration select */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-xs">Pause Period</h4>
          <select 
            value={selectedPauseDuration}
            onChange={(e) => setSelectedPauseDuration(parseFloat(e.target.value))}
            className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-500 mt-0.5 cursor-pointer hover:border-gray-400 transition-colors"
          >
            <option value="0.5">6 months</option>
            <option value="1">1 year</option>
            <option value="1.5">1.5 years</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
          </select>
        </div>
        
        {/* Right: Actions - Compact */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Count badge */}
          {pauseCount > 0 && (
            <span className="text-[10px] font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded min-w-[1.25rem] text-center">
              {pauseCount}
            </span>
          )}
          
          {/* Remove button */}
          <button
            onClick={() => removePause()}
            disabled={pauseCount === 0}
            className={`p-1 rounded transition-colors ${
              pauseCount === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-900'
            }`}
          >
            <Minus size={14} />
          </button>
          
          {/* Add button */}
          <button
            onClick={() => addPause(selectedPauseDuration)}
            className="p-1 text-gray-400 hover:text-gray-900 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Custom Block Modal */}
      <CustomBlockModal
        isOpen={showCustomBlockModal}
        onClose={() => setShowCustomBlockModal(false)}
        onSave={handleSaveCustomBlock}
      />
      
      {/* Property Template Edit Modal */}
      {editingTemplate && (
        <PropertyDetailModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          instanceId={`template_${editingTemplate}`}
          propertyType={editingTemplate}
          isTemplate={true}
        />
      )}
      
      {/* Property Duplicate Modal */}
      {duplicatingProperty && (
        <PropertyDetailModal
          isOpen={!!duplicatingProperty}
          onClose={() => setDuplicatingProperty(null)}
          instanceId={`${duplicatingProperty.propertyId}_instance_${getPropertyQuantity(duplicatingProperty.propertyId)}`}
          propertyType={duplicatingProperty.propertyType}
          isDuplicating={true}
          sourceInstanceId={duplicatingProperty.sourceInstanceId}
          onDuplicateSave={handleSaveDuplicate}
        />
      )}
    </div>
    </TourStep>
  )
}

