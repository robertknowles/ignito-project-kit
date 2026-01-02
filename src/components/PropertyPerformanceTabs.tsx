import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { usePerPropertyTracking } from '../hooks/usePerPropertyTracking';

// Format currency for display
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

// Format percentage for display
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// KPI Card component
interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subValue }) => (
  <div className="bg-slate-50 rounded-lg border border-slate-200/40 p-3">
    <p className="text-[9px] uppercase text-slate-400 tracking-wide mb-1">{label}</p>
    <p className="text-sm font-semibold text-slate-900">{value}</p>
    {subValue && (
      <p className="text-[10px] text-slate-500 mt-0.5">{subValue}</p>
    )}
  </div>
);

// Custom tooltip for sparkline
const SparklineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-200 shadow-sm rounded-md text-xs">
        <p className="font-medium text-slate-700">Year {label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Property content component (renders when a property is selected)
interface PropertyContentProps {
  propertyInstanceId: string;
}

const PropertyContent: React.FC<PropertyContentProps> = ({ propertyInstanceId }) => {
  const { trackingData } = usePerPropertyTracking(propertyInstanceId);

  if (!trackingData) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Loading property data...
      </div>
    );
  }

  // Calculate final projection (last year equity)
  const finalProjection = trackingData.equityOverTime.length > 0
    ? trackingData.equityOverTime[trackingData.equityOverTime.length - 1].equity
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI Metrics Grid - 3x2 layout */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label="Value"
          value={formatCurrency(trackingData.currentPropertyValue)}
          subValue={`Year ${trackingData.yearsHeld}`}
        />
        <KPICard
          label="Equity"
          value={formatCurrency(trackingData.currentEquity)}
        />
        <KPICard
          label="ROI"
          value={formatPercentage(trackingData.roic)}
          subValue="Annualized"
        />
        <KPICard
          label="Cash Invested"
          value={formatCurrency(trackingData.totalCashInvested)}
        />
        <KPICard
          label="Cash-on-Cash"
          value={formatPercentage(trackingData.cashOnCashReturn)}
          subValue="Year 1"
        />
        <KPICard
          label="Projection"
          value={formatCurrency(finalProjection)}
          subValue={`Yr ${trackingData.yearsHeld} Equity`}
        />
      </div>

      {/* Equity Sparkline Chart */}
      <div className="mt-4">
        <p className="text-[9px] uppercase text-slate-400 tracking-wide mb-2">
          Growth Trajectory
        </p>
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trackingData.equityOverTime}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<SparklineTooltip />} />
              <Line
                type="monotone"
                dataKey="propertyValue"
                name="Value"
                stroke="#5eead4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#5eead4', stroke: 'white', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="equity"
                name="Equity"
                stroke="#87B5FA"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#87B5FA', stroke: 'white', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Main PropertyPerformanceTabs component
export const PropertyPerformanceTabs: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Filter to only feasible properties
  const feasibleProperties = useMemo(() => {
    return timelineProperties.filter(p => p.status === 'feasible');
  }, [timelineProperties]);

  // Set default selected property when properties load
  React.useEffect(() => {
    if (feasibleProperties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(feasibleProperties[0].instanceId);
    }
  }, [feasibleProperties, selectedPropertyId]);

  // Empty state
  if (feasibleProperties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-400 text-sm mb-2">No properties in timeline</p>
        <p className="text-slate-300 text-xs">
          Add properties to your strategy to see performance metrics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Property Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200/40 pb-1 overflow-x-auto">
        {feasibleProperties.map((property) => {
          const isActive = selectedPropertyId === property.instanceId;
          // Extract short name (e.g., "Sydney Unit" -> "sydney unit")
          const shortName = property.title.toLowerCase();
          
          return (
            <button
              key={property.instanceId}
              onClick={() => setSelectedPropertyId(property.instanceId)}
              className={`relative px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {shortName}
              {/* Active indicator - blue underline */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: '#87B5FA' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Property Content */}
      {selectedPropertyId && (
        <PropertyContent propertyInstanceId={selectedPropertyId} />
      )}
    </div>
  );
};
