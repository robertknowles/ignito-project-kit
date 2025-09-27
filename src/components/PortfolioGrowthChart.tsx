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
export const PortfolioGrowthChart = () => {
  // Mock data for the chart
  const data = [
    {
      year: '2025',
      portfolioValue: 300000,
      equity: 70000,
      property: 'Units / Apartments',
    },
    {
      year: '2026',
      portfolioValue: 700000,
      equity: 158000,
      property: 'Units / Apartments',
    },
    {
      year: '2027',
      portfolioValue: 1100000,
      equity: 263000,
      property: 'Units / Apartments',
    },
    {
      year: '2028',
      portfolioValue: 1400000,
      equity: 350000,
      property: 'Units / Apartments',
    },
    {
      year: '2029',
      portfolioValue: 1700000,
      equity: 429000,
      property: 'Duplexes',
    },
    {
      year: '2030',
      portfolioValue: 2100000,
      equity: 520000,
      property: null,
    },
    {
      year: '2031',
      portfolioValue: 2600000,
      equity: 679000,
      property: 'Metro Houses',
    },
    {
      year: '2032',
      portfolioValue: 2900000,
      equity: 850000,
      property: null,
    },
    {
      year: '2033',
      portfolioValue: 3200000,
      equity: 1050000,
      property: null,
    },
    {
      year: '2034',
      portfolioValue: 3500000,
      equity: 1250000,
      property: null,
    },
    {
      year: '2035',
      portfolioValue: 3800000,
      equity: 1450000,
      property: null,
    },
    {
      year: '2036',
      portfolioValue: 4100000,
      equity: 1650000,
      property: null,
    },
    {
      year: '2037',
      portfolioValue: 4300000,
      equity: 1850000,
      property: null,
    },
    {
      year: '2038',
      portfolioValue: 4500000,
      equity: 2050000,
      property: null,
    },
    {
      year: '2039',
      portfolioValue: 4700000,
      equity: 2250000,
      property: null,
    },
    {
      year: '2040',
      portfolioValue: 4900000,
      equity: 2450000,
      property: null,
    },
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