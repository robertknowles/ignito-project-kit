import React, { useState, useMemo } from 'react'
import { Plus, Minus, Pause, X, Pencil, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { PropertyTypeIcon } from '../utils/propertyTypeIcon'
import { CustomBlockModal } from './CustomBlockModal'
import type { CustomPropertyBlock } from './CustomBlockModal'
import { PropertyDetailModal } from './PropertyDetailModal'

// Compact property card for sidebar - ElevenLabs style
interface PropertyBlockCardProps {
  title: string
  priceRange: string
  yieldValue: string
  count: number
  isCustom?: boolean
  onIncrement: () => void
  onDecrement: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const PropertyBlockCard: React.FC<PropertyBlockCardProps> = ({
  title,
  priceRange,
  yieldValue,
  count,
  isCustom,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
}) => {
  const isActive = count > 0
  
  return (
    <div className={`flex items-start gap-4 p-4 bg-white border rounded-xl transition-colors ${
      isActive 
        ? 'border-gray-900 ring-1 ring-gray-900' 
        : 'border-gray-200 hover:border-gray-400'
    }`}>
      {/* Left: Icon in light gray square */}
      <div className="flex-shrink-0 bg-gray-100 p-2 rounded-lg">
        <PropertyTypeIcon propertyTitle={title} size={20} className="text-gray-700" />
      </div>
      
      {/* Center: Text Stack */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm truncate">{title}</h4>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{priceRange} · {yieldValue} yield</p>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Edit button for templates */}
        {!isCustom && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded transition-colors"
            title="Edit template"
          >
            <Pencil size={14} />
          </button>
        )}
        {/* Delete button for custom blocks */}
        {isCustom && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
            title="Delete custom block"
          >
            <X size={14} />
          </button>
        )}
        
        {/* Count badge */}
        {count > 0 && (
          <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded-md min-w-[1.75rem] text-center">
            {count}
          </span>
        )}
        
        {/* Remove button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDecrement(); }}
          disabled={count === 0}
          className={`p-1.5 rounded transition-colors ${
            count === 0 
              ? 'text-gray-300 cursor-not-allowed' 
              : 'text-gray-400 hover:text-gray-900'
          }`}
        >
          <Minus size={16} />
        </button>
        
        {/* Add button */}
        <button
          onClick={(e) => { e.stopPropagation(); onIncrement(); }}
          className="p-1.5 text-gray-400 hover:text-gray-900 rounded transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
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

  const { getPropertyTypeTemplate } = useDataAssumptions()

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

      {/* Property Cards - Vertical Stack */}
      {sortedProperties.map((property) => (
        <PropertyBlockCard
          key={property.id}
          title={property.title}
          priceRange={property.priceRange}
          yieldValue={property.yield}
          count={getPropertyQuantity(property.id)}
          isCustom={property.isCustom}
          onIncrement={() => incrementProperty(property.id)}
          onDecrement={() => decrementProperty(property.id)}
          onEdit={!property.isCustom ? () => handleEditTemplate(property.title) : undefined}
          onDelete={property.isCustom ? () => removeCustomBlock(property.id) : undefined}
        />
      ))}

      {/* Pause Period Card - ElevenLabs Agent Style */}
      <div className={`flex items-start gap-4 p-4 bg-white border rounded-xl transition-colors ${
        pauseCount > 0 
          ? 'border-gray-900 ring-1 ring-gray-900' 
          : 'border-gray-200 hover:border-gray-400'
      }`}>
        {/* Left: Icon in light amber square */}
        <div className="flex-shrink-0 bg-amber-50 p-2 rounded-lg">
          <Pause size={20} className="text-amber-600" />
        </div>
        
        {/* Center: Text Stack + Duration select */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">Pause Period</h4>
          <select 
            value={selectedPauseDuration}
            onChange={(e) => setSelectedPauseDuration(parseFloat(e.target.value))}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-500 mt-1 cursor-pointer hover:border-gray-400 transition-colors"
          >
            <option value="0.5">6 months</option>
            <option value="1">1 year</option>
            <option value="1.5">1.5 years</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
          </select>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Count badge */}
          {pauseCount > 0 && (
            <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded-md min-w-[1.75rem] text-center">
              {pauseCount}
            </span>
          )}
          
          {/* Remove button */}
          <button
            onClick={() => removePause()}
            disabled={pauseCount === 0}
            className={`p-1.5 rounded transition-colors ${
              pauseCount === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-900'
            }`}
          >
            <Minus size={16} />
          </button>
          
          {/* Add button */}
          <button
            onClick={() => addPause(selectedPauseDuration)}
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Add Custom Block Button - ElevenLabs Style */}
      <button
        onClick={() => setShowCustomBlockModal(true)}
        className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Custom Property Block
      </button>

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

