import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BuildingIcon, HomeIcon, Building2Icon } from 'lucide-react'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'

export const PortfolioGrowthChart = () => {
  const { portfolioGrowthData } = useChartDataGenerator()
  
  // Use calculated data or show empty state
  const data = portfolioGrowthData.length > 0 ? portfolioGrowthData : [
    {
      year: '2025',
      portfolioValue: 0,
      equity: 0,
      property: undefined,
    }
  ]
  // Custom tooltip to show the values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-[#f3f4f6] shadow-sm rounded-md">
          <p className="text-xs font-medium">{`Year: ${label}`}</p>
          <p className="text-xs text-[#93c5fd]">{`Portfolio Value: $${(payload[0].value / 1000000).toFixed(1)}M`}</p>
          <p className="text-xs text-[#86efac]">{`Equity: $${(payload[1].value / 1000000).toFixed(1)}M`}</p>
        </div>
      )
    }
    return null
  }
  // Custom dot component that shows property icons
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload.property) {
      return null
    }
    const getPropertyIcon = () => {
      switch (payload.property) {
        case 'Metro Houses':
          return <HomeIcon size={18} className="text-[#6b7280]" />
        case 'Duplexes':
          return <Building2Icon size={18} className="text-[#6b7280]" />
        case 'Units / Apartments':
        default:
          return <BuildingIcon size={18} className="text-[#6b7280]" />
      }
    }
    return (
      <foreignObject x={cx - 10} y={cy - 10} width={20} height={20}>
        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-[#f3f4f6]">
          {getPropertyIcon()}
        </div>
      </foreignObject>
    )
  }
  // Format y-axis ticks
  const formatYAxis = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <HomeIcon size={16} className="text-[#6b7280]" />
        <h3 className="text-[#111827] font-medium text-sm">
          Portfolio Value & Equity Growth
        </h3>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
                fontSize: 12,
              }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{
                fontSize: 12,
              }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              formatter={(value) => (
                <span className="text-xs text-[#374151]">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#93c5fd"
              strokeWidth={2}
              name="Portfolio Value"
              dot={<CustomizedDot />}
              activeDot={{
                r: 6,
                stroke: '#93c5fd',
                strokeWidth: 1,
                fill: 'white',
              }}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#86efac"
              strokeWidth={2}
              name="Equity"
              dot={false}
              activeDot={{
                r: 6,
                stroke: '#86efac',
                strokeWidth: 1,
                fill: 'white',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}