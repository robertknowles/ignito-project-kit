import React from 'react'
export const SummaryBar = () => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-6">
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Final Portfolio Value</h4>
          <p className="text-[#111827] font-medium">$2.6M</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Properties</h4>
          <p className="text-[#111827] font-medium">5</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Annual Cashflow</h4>
          <p className="text-[#111827] font-medium">$42,000</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Total Equity</h4>
          <p className="text-[#111827] font-medium">$679,000</p>
        </div>
        <div className="text-center">
          <h4 className="text-xs text-[#6b7280] mb-2">Cash Required</h4>
          <p className="text-[#111827] font-medium">$135k</p>
        </div>
      </div>
    </div>
  )
}