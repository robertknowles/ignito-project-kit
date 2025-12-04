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
import { HomeIcon } from 'lucide-react'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { getPropertyTypeIcon } from '../utils/propertyTypeIcon'

export const PortfolioGrowthChart = () => {
  const { portfolioGrowthData } = useChartDataGenerator()
  const { profile } = useInvestmentProfile()
  
  // Use calculated data or show empty state
  const data = portfolioGrowthData.length > 0 ? portfolioGrowthData : [
    {
      year: '2025',
      portfolioValue: 0,
      equity: 0,
      properties: undefined,
    }
  ]
  
  // Custom tooltip to show the values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const properties = payload[0]?.payload?.properties || []
      
      return (
        <div className="bg-white p-3 border border-[#f3f4f6] shadow-sm rounded-md">
          <p className="text-xs font-medium">{`Year: ${label}`}</p>
          <p className="text-xs" style={{ color: '#87B5FA' }}>{`Portfolio Value: $${(payload[0].value / 1000000).toFixed(1)}M`}</p>
          <p className="text-xs" style={{ color: 'rgba(134, 239, 172, 0.9)' }}>{`Equity: $${(payload[1].value / 1000000).toFixed(1)}M`}</p>
          {properties.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#f3f4f6]">
              <p className="text-xs font-medium mb-1">Properties Purchased:</p>
              {properties.map((p: string, i: number) => (
                <p key={i} className="text-xs text-[#6b7280]">• {p}</p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }
  
  // Custom dot component that shows property icons with offset for multiple properties in same year
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props
    
    // Protect against invalid coordinates during initial render/resize
    if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null
    
    if (!payload.properties || payload.properties.length === 0) {
      return null
    }
    
    // Render multiple icons if multiple properties purchased this year
    return (
      <>
        {payload.properties.map((propertyTitle: string, propIndex: number) => {
          // Calculate offset for multiple properties in the same year
          const totalInYear = payload.properties.length
          let yOffset = 0
          
          if (totalInYear > 1) {
            // Spread them vertically, centered around the line
            const spacing = 25 // pixels between icons
            const totalHeight = (totalInYear - 1) * spacing
            yOffset = (propIndex * spacing) - (totalHeight / 2)
          }
          
          return (
            <foreignObject 
              key={`${payload.year}-${propIndex}`}
              x={cx - 10} 
              y={cy - 10 + yOffset} 
              width={20} 
              height={20}
            >
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-[#f3f4f6] shadow-sm">
                {getPropertyTypeIcon(propertyTitle, 18, 'text-[#6b7280]')}
              </div>
            </foreignObject>
          )
        })}
      </>
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
        x={viewBox.x + viewBox.width - 10}
        y={viewBox.y - 5}
        fill="#9ca3af"
        fontSize={12}
        fontWeight={500}
        textAnchor="end"
        fontFamily="'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      >
        Equity Goal: ${(profile.equityGoal / 1000000).toFixed(1)}M
      </text>
    )
  }

  // Custom label for goal achievement
  const GoalAchievedLabel = (props: any) => {
    if (!equityGoalYear) return null
    // Check if we have valid coordinates
    if (typeof props.cx !== 'number' || typeof props.cy !== 'number' || 
        isNaN(props.cx) || isNaN(props.cy)) {
      return null
    }
    return (
      <text
        x={props.cx}
        y={props.cy - 20}
        fill="#9ca3af"
        fontSize={12}
        fontWeight={500}
        textAnchor="middle"
        fontFamily="'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      >
        Goal Reached: {equityGoalYear}
      </text>
    )
  }

  // Custom label for end state
  const EndStateLabel = (props: any) => {
    const { viewBox } = props
    if (!viewBox || !finalDataPoint) return null
    return (
      <g>
        <text
          x={viewBox.x - 52}
          y={viewBox.y - 28}
          fill="#9ca3af"
          fontSize={12}
          fontWeight={500}
          textAnchor="middle"
          fontFamily="'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        >
          Portfolio: ${(finalDataPoint.portfolioValue / 1000000).toFixed(1)}M
        </text>
        <text
          x={viewBox.x - 52}
          y={viewBox.y - 16}
          fill="#9ca3af"
          fontSize={12}
          fontWeight={500}
          textAnchor="middle"
          fontFamily="'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
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
                fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{
                fontSize: 12,
                fontFamily: "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
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
                stroke="rgba(253, 186, 116, 0.7)"
                strokeDasharray="5 5"
                strokeWidth={2}
              >
                <Label content={<EquityGoalLabel />} />
              </ReferenceLine>
            )}

            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#87B5FA"
              strokeWidth={2}
              name="Portfolio Value"
              dot={<CustomizedDot />}
              activeDot={{
                r: 6,
                stroke: '#87B5FA',
                strokeWidth: 1,
                fill: 'white',
              }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="rgba(134, 239, 172, 0.7)"
              strokeWidth={2}
              name="Equity"
              dot={false}
              activeDot={{
                r: 6,
                stroke: 'rgba(134, 239, 172, 0.7)',
                strokeWidth: 1,
                fill: 'white',
              }}
            />

            {/* Goal Achievement Marker */}
            {equityGoalReached && equityGoalReached.equity > 0 && (
              <ReferenceDot
                x={equityGoalReached.year}
                y={equityGoalReached.equity}
                r={8}
                fill="rgba(253, 186, 116, 0.7)"
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