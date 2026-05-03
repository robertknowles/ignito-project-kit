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
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { getPropertyTypeIcon } from '../utils/propertyTypeIcon'
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors'
import { BASE_YEAR } from '../constants/financialParams'

export const PortfolioGrowthChart = () => {
  const { portfolioGrowthData } = useChartDataGenerator()
  const { profile } = useInvestmentProfile()
  
  // Use calculated data or show empty state
  const data = portfolioGrowthData.length > 0 ? portfolioGrowthData : [
    {
      year: String(BASE_YEAR),
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
        <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
          <p className="text-xs font-medium text-gray-900">{`Year: ${label}`}</p>
          <p className="text-xs" style={{ color: CHART_COLORS.primary }}>{`Portfolio Value: $${(payload[0].value / 1000000).toFixed(1)}M`}</p>
          <p className="text-xs" style={{ color: CHART_COLORS.secondary }}>{`Equity: $${(payload[1].value / 1000000).toFixed(1)}M`}</p>
          {properties.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-medium mb-1">Properties Purchased:</p>
              {properties.map((p: string, i: number) => (
                <p key={i} className="text-xs text-gray-500">• {p}</p>
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
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                {getPropertyTypeIcon(propertyTitle, 18, 'text-gray-500')}
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
        fill={CHART_COLORS.annotationText}
        fontSize={12}
        fontWeight={500}
        textAnchor="end"
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
        fill={CHART_COLORS.annotationText}
        fontSize={12}
        fontWeight={500}
        textAnchor="middle"
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
          fill={CHART_COLORS.annotationText}
          fontSize={12}
          fontWeight={500}
          textAnchor="middle"
          >
          Portfolio: ${(finalDataPoint.portfolioValue / 1000000).toFixed(1)}M
        </text>
        <text
          x={viewBox.x - 52}
          y={viewBox.y - 16}
          fill={CHART_COLORS.annotationText}
          fontSize={12}
          fontWeight={500}
          textAnchor="middle"
          >
          Equity: ${(finalDataPoint.equity / 1000000).toFixed(1)}M
        </text>
      </g>
    )
  }

  return (
    <div>
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 30,
              right: 120,
              left: 14,
              bottom: 5,
            }}
          >
            <CartesianGrid {...CHART_STYLE.grid} />
            <XAxis
              dataKey="year"
              {...CHART_STYLE.xAxis}
            />
            <YAxis
              tickFormatter={formatYAxis}
              {...CHART_STYLE.yAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
            
            {/* Equity Goal Reference Line */}
            {profile.equityGoal > 0 && (
              <ReferenceLine
                y={profile.equityGoal}
                stroke={CHART_COLORS.goal}
                strokeDasharray="5 5"
                strokeWidth={2}
              >
                <Label content={<EquityGoalLabel />} />
              </ReferenceLine>
            )}

            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              name="Portfolio Value"
              dot={<CustomizedDot />}
              activeDot={{
                r: 6,
                stroke: CHART_COLORS.primary,
                strokeWidth: 1,
                fill: 'white',
              }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              name="Equity"
              dot={false}
              activeDot={{
                r: 6,
                stroke: CHART_COLORS.secondary,
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
                fill={CHART_COLORS.goalMarker}
                stroke={CHART_COLORS.goalMarkerStroke}
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