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
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 hover:border-gray-400 transition-colors">
      <div className="flex items-center gap-3">
        {/* Left: Icon in gray circle */}
        <div className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
          <PropertyTypeIcon propertyTitle={title} size={18} className="text-gray-500" />
        </div>
        
        {/* Center: Text content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{title}</h4>
          <p className="text-xs text-gray-500 truncate">{priceRange} · {yieldValue} yield</p>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Edit/Delete buttons for templates/custom */}
          {!isCustom && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
              title="Edit template"
            >
              <Pencil size={12} />
            </button>
          )}
          {isCustom && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete custom block"
            >
              <X size={12} />
            </button>
          )}
          
          {/* Count badge */}
          {count > 0 && (
            <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded min-w-[1.5rem] text-center">
              {count}
            </span>
          )}
          
          {/* Add/Remove buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); onDecrement(); }}
            disabled={count === 0}
            className={`p-1 rounded transition-colors ${
              count === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onIncrement(); }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
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
              ? 'bg-blue-50 text-blue-600 border-blue-200' 
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
              ? 'bg-blue-50 text-blue-600 border-blue-200' 
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

      {/* Pause Period Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 hover:border-gray-400 transition-colors">
        <div className="flex items-center gap-3">
          {/* Left: Icon */}
          <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <Pause size={18} className="text-amber-500" />
          </div>
          
          {/* Center: Label + Duration select */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900">Pause Period</h4>
            <select 
              value={selectedPauseDuration}
              onChange={(e) => setSelectedPauseDuration(parseFloat(e.target.value))}
              className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 mt-0.5"
            >
              <option value="0.5">6 months</option>
              <option value="1">1 year</option>
              <option value="1.5">1.5 years</option>
              <option value="2">2 years</option>
              <option value="3">3 years</option>
            </select>
          </div>
          
          {/* Right: Count + Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {pauseCount > 0 && (
              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded min-w-[1.5rem] text-center">
                {pauseCount}
              </span>
            )}
            <button
              onClick={() => removePause()}
              disabled={pauseCount === 0}
              className={`p-1 rounded transition-colors ${
                pauseCount === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => addPause(selectedPauseDuration)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom Block Button */}
      <button
        onClick={() => setShowCustomBlockModal(true)}
        className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={14} />
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
