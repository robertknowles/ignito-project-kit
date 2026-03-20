import React, { useMemo } from 'react'
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
  Label,
} from 'recharts'
import { useChartDataGenerator } from '../hooks/useChartDataGenerator'
import { useInvestmentProfile } from '../hooks/useInvestmentProfile'
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator'
import { useFinancialFreedomProjection } from '../hooks/useFinancialFreedomProjection'
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
  const { cashflowData, portfolioGrowthData } = useChartDataGenerator(scenarioData)
  const { profile: contextProfile } = useInvestmentProfile()
  const { timelineProperties } = useAffordabilityCalculator()
  const profile = scenarioData?.profile ?? contextProfile

  // Get milestone data from financial freedom projection
  const projection = useFinancialFreedomProjection({
    portfolioGrowthData,
    cashflowData,
    profile,
    timelineProperties: scenarioData?.timelineProperties ?? timelineProperties,
  });

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
          <p className="text-xs font-medium text-gray-600">{`Year: ${label}`}</p>
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

  // Calculate Y-axis domain with nice round intervals
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    const values = data.map(d => d.cashflow);
    const dataMin = Math.min(...values, 0);
    const dataMax = Math.max(...values);

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
  }, [data]);

  // Group milestones by year and only include years within chart range
  const chartYears = new Set(data.map(d => String(d.year)));
  const groupedMilestones = useMemo(() => {
    const visible = projection.milestones.filter(
      m => m.type !== 'transition' && chartYears.has(String(m.year))
    );
    const byYear = new Map<number, string[]>();
    for (const m of visible) {
      const labels = byYear.get(m.year) || [];
      labels.push(m.label);
      byYear.set(m.year, labels);
    }
    return Array.from(byYear.entries()).map(([year, labels]) => ({
      year,
      label: labels.join(' · '),
    }));
  }, [projection.milestones, chartYears]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          barGap={2}
          margin={{
            top: 30,
            right: 20,
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
            width={70}
            domain={yAxisDomain}
            ticks={yAxisTicks}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Milestone vertical markers — grouped by year */}
          {groupedMilestones.map(m => (
            <ReferenceLine
              key={m.year}
              x={String(m.year)}
              {...CHART_STYLE.milestoneLine}
            >
              <Label
                value={m.label}
                position="top"
                fill={CHART_COLORS.labelText}
                fontSize={10}
                fontFamily="Inter, system-ui, sans-serif"
                offset={8}
              />
            </ReferenceLine>
          ))}

          <Bar dataKey="cashflow" fill={CHART_COLORS.barPositive} radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.cashflow >= 0 ? CHART_COLORS.barPositive : CHART_COLORS.barNegative}
                fillOpacity={0.7}
              />
            ))}
          </Bar>

        </BarChart>
      </ResponsiveContainer>

      {/* Milestone labels below chart — shows all including off-chart ones */}
      {projection.milestones.length > 0 && (
        <div className="mt-1 flex gap-x-5 gap-y-1 flex-wrap" style={{ paddingLeft: 70 }}>
          {projection.milestones
            .filter(m => m.type !== 'transition')
            .map(m => (
            <span key={m.label} className="text-[11px] text-gray-400">
              <span className="font-medium text-gray-500">{m.year}</span>: {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
