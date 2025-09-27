import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { LineChartIcon } from 'lucide-react'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'

export const CashflowChart = () => {
  const { cashflowData } = useChartDataGenerator()
  
  // Use calculated data or show empty state
  const data = cashflowData.length > 0 ? cashflowData : [
    {
      year: '2025',
      cashflow: 0,
      rentalIncome: 0,
      loanRepayments: 0,
    }
  ]
  // Custom tooltip to show the values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const formattedValue = Math.abs(value).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      return (
        <div className="bg-white p-3 border border-[#f3f4f6] shadow-sm rounded-md">
          <p className="text-xs font-medium">{`Year: ${label}`}</p>
          <p className="text-xs text-[#374151]">
            {`Net Cashflow: ${value >= 0 ? '+' : '-'}${formattedValue}`}
          </p>
        </div>
      )
    }
    return null
  }
  // Format y-axis ticks
  const formatYAxis = (value: number) => {
    if (value === 0) return '$0'
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (absValue >= 1000) {
      return `${sign}$${absValue / 1000}K`
    }
    return `${sign}$${absValue}`
  }
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <LineChartIcon size={16} className="text-[#6b7280]" />
        <h3 className="text-[#111827] font-medium text-sm">
          Cashflow Analysis
        </h3>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: 10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="year"
              tick={{
                fontSize: 11,
              }}
              stroke="#9ca3af"
              axisLine={{
                stroke: '#e5e7eb',
              }}
              tickLine={{
                stroke: '#e5e7eb',
              }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{
                fontSize: 11,
              }}
              stroke="#9ca3af"
              axisLine={{
                stroke: '#e5e7eb',
              }}
              tickLine={{
                stroke: '#e5e7eb',
              }}
              domain={[-30000, 40000]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={2} />
            <Bar dataKey="cashflow" fill="#84E1BC" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#84E1BC"
                  fillOpacity={entry.highlight ? 0.7 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-[#374151] bg-[#f9fafb] p-4 rounded-md leading-relaxed">
        <p>
          The chart shows the transition from negative to positive cashflow over
          time as properties mature and rents increase.
        </p>
      </div>
    </div>
  )
}