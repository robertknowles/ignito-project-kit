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
    <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-[#111827] text-xl font-medium">
                Investment Assumptions
              </h1>
              <button className="text-sm text-[#3b82f6] px-4 py-2 border border-[#f3f4f6] rounded-md hover:bg-[#f9fafb] transition-colors">
                Configure property and economic assumptions
              </button>
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

            {/* Property Growth Curve */}
            <div className="border border-[#f3f4f6] rounded-lg p-6 mb-6">
              <h2 className="text-[#111827] font-medium text-base mb-4">
                Property Growth Curve
              </h2>
              <p className="text-sm text-[#6b7280] mb-6">
                Customize property value growth rates for different holding periods.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Year 1 */}
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-2">
                    Year 1 Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    value={profile.growthCurve.year1}
                    onChange={(e) => updateProfile({
                      growthCurve: {
                        ...profile.growthCurve,
                        year1: parseFloat(e.target.value) || 0,
                      }
                    })}
                    step="0.5"
                    min="0"
                    max="30"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Years 2-3 */}
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-2">
                    Years 2-3 Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    value={profile.growthCurve.years2to3}
                    onChange={(e) => updateProfile({
                      growthCurve: {
                        ...profile.growthCurve,
                        years2to3: parseFloat(e.target.value) || 0,
                      }
                    })}
                    step="0.5"
                    min="0"
                    max="30"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Year 4 */}
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-2">
                    Year 4 Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    value={profile.growthCurve.year4}
                    onChange={(e) => updateProfile({
                      growthCurve: {
                        ...profile.growthCurve,
                        year4: parseFloat(e.target.value) || 0,
                      }
                    })}
                    step="0.5"
                    min="0"
                    max="30"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Year 5+ */}
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-2">
                    Year 5+ Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    value={profile.growthCurve.year5plus}
                    onChange={(e) => updateProfile({
                      growthCurve: {
                        ...profile.growthCurve,
                        year5plus: parseFloat(e.target.value) || 0,
                      }
                    })}
                    step="0.5"
                    min="0"
                    max="30"
                    className="w-full p-2 border border-[#f3f4f6] rounded-md text-[#374151] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Visual preview */}
              <div className="p-4 bg-[#f9fafb] rounded-md">
                <p className="text-xs font-medium text-[#374151] mb-3">Growth Curve Preview:</p>
                <div className="flex items-end gap-2 h-32">
                  <div className="flex-1 bg-[#3b82f6] rounded-t flex flex-col justify-end items-center pb-2" style={{ height: `${(profile.growthCurve.year1 / 15) * 100}%` }}>
                    <div className="text-xs font-medium text-white">{profile.growthCurve.year1}%</div>
                  </div>
                  <div className="flex-1 bg-[#60a5fa] rounded-t flex flex-col justify-end items-center pb-2" style={{ height: `${(profile.growthCurve.years2to3 / 15) * 100}%` }}>
                    <div className="text-xs font-medium text-white">{profile.growthCurve.years2to3}%</div>
                  </div>
                  <div className="flex-1 bg-[#60a5fa] rounded-t flex flex-col justify-end items-center pb-2" style={{ height: `${(profile.growthCurve.years2to3 / 15) * 100}%` }}>
                    <div className="text-xs font-medium text-white">{profile.growthCurve.years2to3}%</div>
                  </div>
                  <div className="flex-1 bg-[#93c5fd] rounded-t flex flex-col justify-end items-center pb-2" style={{ height: `${(profile.growthCurve.year4 / 15) * 100}%` }}>
                    <div className="text-xs font-medium text-[#374151]">{profile.growthCurve.year4}%</div>
                  </div>
                  <div className="flex-1 bg-[#bfdbfe] rounded-t flex flex-col justify-end items-center pb-2" style={{ height: `${(profile.growthCurve.year5plus / 15) * 100}%` }}>
                    <div className="text-xs font-medium text-[#374151]">{profile.growthCurve.year5plus}%</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-[#6b7280]">
                  <div className="flex-1 text-center">Y1</div>
                  <div className="flex-1 text-center">Y2</div>
                  <div className="flex-1 text-center">Y3</div>
                  <div className="flex-1 text-center">Y4</div>
                  <div className="flex-1 text-center">Y5+</div>
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
                        Growth %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Deposit %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280]">
                        Loan Type
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
                            value={property.growth}
                            onChange={(e) =>
                              handlePropertyChange(
                                index,
                                'growth',
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
                        <td className="p-3">
                          <div className="flex rounded-md overflow-hidden border border-[#e5e7eb] w-fit">
                            <button
                              onClick={() =>
                                handlePropertyChange(
                                  index,
                                  'loanType',
                                  'IO',
                                )
                              }
                              className={`px-3 py-1.5 text-xs transition-colors ${
                                (property.loanType || 'IO') === 'IO' 
                                  ? 'bg-[#3b82f6] text-white' 
                                  : 'bg-white text-[#6b7280] hover:bg-[#f3f4f6]'
                              }`}
                            >
                              IO
                            </button>
                            <button
                              onClick={() =>
                                handlePropertyChange(
                                  index,
                                  'loanType',
                                  'PI',
                                )
                              }
                              className={`px-3 py-1.5 text-xs transition-colors ${
                                property.loanType === 'PI' 
                                  ? 'bg-[#3b82f6] text-white' 
                                  : 'bg-white text-[#6b7280] hover:bg-[#f3f4f6]'
                              }`}
                            >
                              P&I
                            </button>
                          </div>
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
                          Loan Type
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
                          <td className="p-3 text-sm text-[#374151]">
                            {block.loanType === 'IO' ? 'Interest Only' : 'Principal & Interest'}
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