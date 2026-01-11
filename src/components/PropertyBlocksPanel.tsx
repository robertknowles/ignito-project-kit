import React, { useState, useMemo } from 'react'
import { Plus, Minus, Pause, X, Pencil, ChevronUp, ChevronDown, SlidersHorizontal, Copy } from 'lucide-react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { usePropertyInstance } from '../contexts/PropertyInstanceContext'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { PropertyTypeIcon } from '../utils/propertyTypeIcon'
import { CustomBlockModal } from './CustomBlockModal'
import type { CustomPropertyBlock } from './CustomBlockModal'
import { PropertyDetailModal } from './PropertyDetailModal'

// Growth rates structure for cascading display
interface CascadingGrowthRates {
  year1: string
  years2to3: string
  year4: string
  year5plus: string
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
    <div className={`flex flex-col rounded-xl transition-colors ${
      isActive 
        ? 'ring-1 ring-gray-900' 
        : ''
    }`}>
      {/* Main Card */}
      <div className={`flex items-start gap-2 p-2.5 bg-white border transition-colors ${
        isActive 
          ? 'border-gray-900' 
          : 'border-gray-200 hover:border-gray-400'
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
        <div className={`flex items-center justify-center gap-3 py-1.5 px-3 bg-gray-100 rounded-b-xl border border-t-0 ${
          isActive ? 'border-gray-900' : 'border-gray-200'
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
  // This creates a new instance and copies the data from the last instance of this property type
  const handleDuplicateProperty = (propertyId: string) => {
    const currentCount = getPropertyQuantity(propertyId)
    if (currentCount === 0) return

    // Get the last instance's data to copy
    const lastInstanceId = `${propertyId}_instance_${currentCount - 1}`
    const sourceInstance = getInstance(lastInstanceId)

    // Increment the property (creates a new instance)
    incrementProperty(propertyId)

    // After incrementing, copy the source instance data to the new instance
    if (sourceInstance) {
      const newInstanceId = `${propertyId}_instance_${currentCount}`
      // Use setTimeout to ensure the new instance is created first
      setTimeout(() => {
        updateInstance(newInstanceId, { ...sourceInstance })
      }, 50)
    }
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
    <div className="flex flex-col gap-3">
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
        onClick={() => setShowCustomBlockModal(true)}
        className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Custom Property Block
      </button>

      {/* Property Cards - Vertical Stack */}
      {sortedProperties.map((property) => (
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
          onDuplicate={!property.isCustom ? () => handleDuplicateProperty(property.id) : undefined}
        />
      ))}

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
    </div>
  )
}

