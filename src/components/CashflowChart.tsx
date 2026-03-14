import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Cell,
  Label,
} from 'recharts'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { CHART_COLORS, CHART_STYLE } from '../constants/chartColors'
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

interface CashflowChartProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ scenarioData }) => {
  const { cashflowData } = useChartDataGenerator(scenarioData)
  const { profile: contextProfile } = useInvestmentProfile()
  const profile = scenarioData?.profile ?? contextProfile

  // Use calculated data or show empty state
  const data = cashflowData.length > 0 ? cashflowData : [
    {
      year: '2025',
      cashflow: 0,
      rentalIncome: 0,
      expenses: 0,
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
        <div className="bg-white p-3 border border-gray-100 shadow-sm rounded-lg">
          <p className="text-xs font-medium text-gray-900">{`Year: ${label}`}</p>
          <p className="text-xs text-gray-600">
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

  // Find when passive income goal is reached
  const incomeGoalReached = data.find(d => d.cashflow >= profile.cashflowGoal)

  // Calculate Y-axis domain with nice round intervals
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    const values = data.map(d => d.cashflow);
    const dataMin = Math.min(...values, 0);
    const dataMax = Math.max(...values, profile.cashflowGoal || 0);

    // Determine a nice interval based on the range
    const range = dataMax - dataMin;
    let interval: number;

    if (range <= 50000) {
      interval = 10000; // 10K intervals for small ranges
    } else if (range <= 100000) {
      interval = 20000; // 20K intervals
    } else if (range <= 200000) {
      interval = 50000; // 50K intervals
    } else {
      interval = 100000; // 100K intervals for large ranges
    }

    // Round min down and max up to nearest interval
    const niceMin = Math.floor(dataMin / interval) * interval;
    const niceMax = Math.ceil(dataMax / interval) * interval;

    // Generate tick values
    const ticks: number[] = [];
    for (let tick = niceMin; tick <= niceMax; tick += interval) {
      ticks.push(tick);
    }

    return {
      yAxisDomain: [niceMin, niceMax],
      yAxisTicks: ticks,
    };
  }, [data, profile.cashflowGoal]);

  // Custom label for income goal achievement (empty - we only show the yellow dot)
  const GoalAchievedLabel = () => {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 24,
          left: 0,
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
          width={80}
          domain={yAxisDomain}
          ticks={yAxisTicks}
        />
        <Tooltip content={<CustomTooltip />} />

        <Bar dataKey="cashflow" fill={CHART_COLORS.barPositive} radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.cashflow >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative}
              fillOpacity={entry.highlight ? 0.7 : 1}
            />
          ))}
        </Bar>

        {/* Income Goal Achievement Marker - Gold dot when cashflow goal is reached */}
        {incomeGoalReached && (
          <ReferenceDot
            x={incomeGoalReached.year}
            y={incomeGoalReached.cashflow}
            r={8}
            fill={CHART_COLORS.goalMarker}
            stroke={CHART_COLORS.goal}
            strokeWidth={2}
          >
            <Label content={<GoalAchievedLabel />} position="top" />
          </ReferenceDot>
        )}

      </BarChart>
    </ResponsiveContainer>
  )
}