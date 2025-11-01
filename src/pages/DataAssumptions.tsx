import React from 'react'
import { Navbar } from '../components/Navbar'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
import { usePropertySelection } from '../contexts/PropertySelectionContext'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'

export const DataAssumptions = () => {
  const { globalFactors, propertyAssumptions, updateGlobalFactor, updatePropertyAssumption } = useDataAssumptions()
  const { customBlocks, removeCustomBlock } = usePropertySelection()
  const { profile, updateProfile } = useInvestmentProfile()
  
  const handlePropertyChange = (index: number, field: string, value: string) => {
    updatePropertyAssumption(index, field as any, value)
  }
  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb]">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-[#111827] text-xl font-medium">
                Investment Assumptions
              </h1>
            </div>
            {/* Global Economic Factors */}
            <div className="border border-[#f3f4f6] rounded-lg p-6 mb-6">
              <h2 className="text-[#111827] font-medium text-base mb-6">
                Global Economic Factors
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs text-[#374151] mb-2">
                    Growth Rate
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                    value={globalFactors.growthRate}
                    onChange={(e) => updateGlobalFactor('growthRate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#374151] mb-2">
                    Loan-to-Value Ratio (LVR)
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                    value={globalFactors.loanToValueRatio}
                    onChange={(e) => updateGlobalFactor('loanToValueRatio', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#374151] mb-2">
                    Loan Repayments (Interest Rate)
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                    value={globalFactors.interestRate}
                    onChange={(e) => updateGlobalFactor('interestRate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Property-Specific Assumptions */}
            <div className="border border-[#f3f4f6] rounded-lg p-6">
              <h2 className="text-[#111827] font-medium text-base mb-6">
                Property-Specific Assumptions
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f3f4f6]">
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Property Type
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Average Cost
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Yield %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Growth Y1 %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Growth Y2-3 %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Growth Y4 %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Growth Y5+ %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Deposit %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyAssumptions.map((property, index) => (
                      <tr key={index} className="border-b border-[#f3f4f6]">
                        <td className="p-3 text-sm text-[#374151]">
                          {property.type}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.averageCost}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'averageCost',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.yield}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'yield',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.growthYear1}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'growthYear1',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.growthYears2to3}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'growthYears2to3',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.growthYear4}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'growthYear4',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.growthYear5plus}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'growthYear5plus',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151]"
                            value={property.deposit}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'deposit',
                                e.target.value,
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Property Blocks Section */}
            {customBlocks.length > 0 && (
              <div className="border border-[#f3f4f6] rounded-lg p-6 mt-6">
                <h2 className="text-[#111827] font-medium text-base mb-6">
                  Custom Property Blocks
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#f3f4f6]">
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
    </div>
  )
}