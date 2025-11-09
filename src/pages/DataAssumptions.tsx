import React, { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { PropertyDetailModal } from '../components/PropertyDetailModal'
import { Button } from '../components/ui/button'

export const DataAssumptions = () => {
  const { propertyTypeTemplates } = useDataAssumptions()
  const { customBlocks, removeCustomBlock } = usePropertySelection()
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  
  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb]">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-[#111827] text-xl font-medium">
                Property Type Templates
              </h1>
              <p className="text-sm text-[#6b7280] mt-2">
                Set default values for each property type. When you add a property to the timeline, 
                it will inherit these defaults. You can still customize individual properties.
              </p>
            </div>

            {/* Property Type Templates */}
            <div className="space-y-3">
              {propertyTypeTemplates.map((template) => {
                const yieldPercent = (template.rentPerWeek * 52 / template.purchasePrice) * 100
                const loanAmount = (template.purchasePrice * template.lvr) / 100
                
                return (
                  <div 
                    key={template.propertyType}
                    className="border border-[#e5e7eb] rounded-lg p-4 hover:border-[#d1d5db] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-[#111827]">
                          {template.propertyType}
                        </h3>
                        <div className="text-sm text-[#6b7280] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>${(template.purchasePrice / 1000).toFixed(0)}k</span>
                          <span>•</span>
                          <span>{template.state}</span>
                          <span>•</span>
                          <span>{yieldPercent.toFixed(1)}% yield</span>
                          <span>•</span>
                          <span>${template.rentPerWeek}/wk</span>
                          <span>•</span>
                          <span>{template.growthAssumption} growth</span>
                </div>
                        <div className="text-sm text-[#6b7280] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>LVR: {template.lvr}%</span>
                          <span>•</span>
                          <span>{template.loanProduct} @ {template.interestRate}%</span>
                          <span>•</span>
                          <span>Loan: ${(loanAmount / 1000).toFixed(0)}k</span>
                          <span>•</span>
                          <span>Term: {template.loanTerm}yr</span>
              </div>
            </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template.propertyType)}
                        className="ml-4"
                      >
                        Edit Template
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Custom Property Blocks Section */}
            {customBlocks.length > 0 && (
              <div className="border-t border-[#e5e7eb] mt-8 pt-8">
                <h2 className="text-[#111827] font-medium text-base mb-4">
                  Custom Property Blocks
                </h2>
                <p className="text-sm text-[#6b7280] mb-4">
                  These are custom property types you've created. They use simplified settings.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                          Property Name
                        </th>
                        <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                          Price
                        </th>
                        <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                          Yield %
                        </th>
                        <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                          Growth %
                        </th>
                        <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                          LVR %
                        </th>
                        <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {customBlocks.map((block) => (
                        <tr key={block.id} className="border-b border-[#f3f4f6]">
                          <td className="p-3 text-sm text-[#374151]">
                            {block.title}
                          </td>
                          <td className="p-3 text-sm text-[#374151]">
                            ${block.cost.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-[#374151]">
                            {block.yieldPercent}%
                          </td>
                          <td className="p-3 text-sm text-[#374151]">
                            {block.growthPercent}%
                          </td>
                          <td className="p-3 text-sm text-[#374151]">
                            {block.lvr}%
                          </td>
                          <td className="p-3">
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
    </div>
  )
}
