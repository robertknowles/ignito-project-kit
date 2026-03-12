import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { LeftRail } from '../components/LeftRail'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { PropertyDetailModal } from '../components/PropertyDetailModal'
import { TitleDeedCard } from '../components/TitleDeedCard'
import { CustomBlockModal } from '../components/CustomBlockModal'
import type { CustomPropertyBlock } from '../components/CustomBlockModal'

export const DataAssumptions = () => {
  const { propertyTypeTemplates } = useDataAssumptions()
  const { customBlocks, removeCustomBlock, addCustomBlock } = usePropertySelection()
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false)

  const handleSaveCustomBlock = (block: CustomPropertyBlock) => {
    addCustomBlock(block)
  }
  
  return (
    <div className="main-app flex h-screen w-full bg-[#f9fafb]">
      <LeftRail />
      <div className="flex-1 ml-16 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="page-title">
                Property Library
              </h1>
              <p className="body-secondary mt-2">
                Set default values for each property type. When you add a property to the timeline,
                it will inherit these defaults. You can still customize individual properties.
              </p>
            </div>

            {/* Add Custom Block Button - First block */}
            <button
              onClick={() => setShowCustomBlockModal(true)}
              className="w-full mb-6 py-4 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Custom Property Block
            </button>

            {/* Property Type Templates - Title Deed Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {propertyTypeTemplates.map((template) => (
                <TitleDeedCard
                  key={template.propertyType}
                  template={template}
                  onEdit={() => setEditingTemplate(template.propertyType)}
                />
              ))}
            </div>

            {/* Custom Property Blocks Section */}
            {customBlocks.length > 0 && (
              <div className="border-t border-[#e5e7eb] mt-8 pt-8">
                <h2 className="section-heading mb-4">
                  Custom Property Blocks
                </h2>
                <p className="body-secondary mb-4">
                  These are custom property types you've created. They use simplified settings.
                </p>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="table-header text-left">Property Name</th>
                        <th className="table-header text-left">Price</th>
                        <th className="table-header text-left">Yield %</th>
                        <th className="table-header text-left">Growth %</th>
                        <th className="table-header text-left">LVR %</th>
                        <th className="table-header text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customBlocks.map((block) => (
                        <tr key={block.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                          <td className="table-cell">
                            {block.title}
                          </td>
                          <td className="table-cell">
                            ${block.cost.toLocaleString()}
                          </td>
                          <td className="table-cell">
                            {block.yieldPercent}%
                          </td>
                          <td className="table-cell">
                            {block.growthPercent}%
                          </td>
                          <td className="table-cell">
                            {block.lvr}%
                          </td>
                          <td className="table-cell">
                            <button
                              onClick={() => removeCustomBlock(block.id)}
                              className="text-red-500 hover:text-red-700 text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reuse PropertyDetailModal for editing templates */}
      {editingTemplate && (
        <PropertyDetailModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          instanceId={`template_${editingTemplate}`}
          propertyType={editingTemplate}
          isTemplate={true}
        />
      )}

      {/* Custom Block Modal */}
      <CustomBlockModal
        isOpen={showCustomBlockModal}
        onClose={() => setShowCustomBlockModal(false)}
        onSave={handleSaveCustomBlock}
      />
    </div>
  )
}
