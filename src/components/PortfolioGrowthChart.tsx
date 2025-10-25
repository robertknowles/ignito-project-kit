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
  ReferenceLine,
  Label,
  ReferenceDot,
} from 'recharts'
import { BuildingIcon, HomeIcon, Building2Icon } from 'lucide-react'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'

export const PortfolioGrowthChart = () => {
  const { portfolioGrowthData } = useChartDataGenerator()
  const { profile } = useInvestmentProfile()
  
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

  // Find when equity goal is reached
  const equityGoalReached = data.find(d => d.equity >= profile.equityGoal)
  const equityGoalYear = equityGoalReached ? equityGoalReached.year : null

  // Get final data point for end state annotation
  const finalDataPoint = data[data.length - 1]

  // Custom label for equity goal line
  const EquityGoalLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox || !equityGoalYear) return null
    return (
      <text
        x={viewBox.x + 10}
        y={viewBox.y - 5}
        fill="#F59E0B"
        fontSize={12}
        fontWeight={600}
      >
        🎯 Equity Goal: ${(profile.equityGoal / 1000000).toFixed(1)}M
      </text>
    )
  }

  // Custom label for goal achievement
  const GoalAchievedLabel = (props: any) => {
    if (!equityGoalYear) return null
    return (
      <text
        x={props.cx}
        y={props.cy - 20}
        fill="#F59E0B"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        🎯 Goal Reached: {equityGoalYear}
      </text>
    )
  }

  // Custom label for end state
  const EndStateLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox || !finalDataPoint) return null
    return (
      <g>
        <rect
          x={viewBox.x - 100}
          y={viewBox.y - 45}
          width={95}
          height={40}
          fill="white"
          fillOpacity={0.95}
          stroke="#e5e7eb"
          strokeWidth={1}
          rx={4}
        />
        <text
          x={viewBox.x - 52}
          y={viewBox.y - 28}
          fill="#111827"
          fontSize={10}
          fontWeight={600}
          textAnchor="middle"
        >
          Portfolio: ${(finalDataPoint.portfolioValue / 1000000).toFixed(1)}M
        </text>
        <text
          x={viewBox.x - 52}
          y={viewBox.y - 16}
          fill="#10B981"
          fontSize={10}
          fontWeight={600}
          textAnchor="middle"
        >
          Equity: ${(finalDataPoint.equity / 1000000).toFixed(1)}M
        </text>
      </g>
    )
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
              top: 30,
              right: 120,
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
            
            {/* Equity Goal Reference Line */}
            {profile.equityGoal > 0 && (
              <ReferenceLine
                y={profile.equityGoal}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                strokeWidth={2}
              >
                <Label content={<EquityGoalLabel />} />
              </ReferenceLine>
            )}

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

            {/* Goal Achievement Marker */}
            {equityGoalReached && (
              <ReferenceDot
                x={equityGoalReached.year}
                y={equityGoalReached.equity}
                r={8}
                fill="#F59E0B"
                stroke="white"
                strokeWidth={2}
              >
                <Label content={<GoalAchievedLabel />} />
              </ReferenceDot>
            )}

            {/* End State Annotation */}
            {finalDataPoint && data.length > 1 && (
              <ReferenceLine
                segment={[
                  { x: finalDataPoint.year, y: finalDataPoint.portfolioValue },
                  { x: finalDataPoint.year, y: finalDataPoint.portfolioValue }
                ]}
                stroke="transparent"
              >
                <Label content={<EndStateLabel />} position="right" />
              </ReferenceLine>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}