import React from 'react'
import { Navbar } from '../components/Navbar'
import { useDataAssumptions } from '../contexts/DataAssumptionsContext'
export const DataAssumptions = () => {
  const { globalFactors, propertyAssumptions, updateGlobalFactor, updatePropertyAssumption } = useDataAssumptions()
  
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
            {/* Property-Specific Assumptions */}
            <div className="border border-[#f3f4f6] rounded-lg p-6">
              <h2 className="text-[#111827] font-medium text-base mb-6">
                Property-Specific Assumptions
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f3f4f6]">
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280] w-1/5">
                        Property Type
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280] w-1/5">
                        Average Cost
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280] w-1/5">
                        Yield %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280] w-1/5">
                        Growth %
                      </th>
                      <th className="text-left p-3 text-xs font-normal text-[#6b7280] w-1/5">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}