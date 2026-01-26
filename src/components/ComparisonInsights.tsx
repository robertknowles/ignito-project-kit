import React from 'react';
import { TrendingUp, TrendingDown, Minus, Trophy, AlertCircle, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComparisonMetrics } from '@/utils/comparisonCalculator';

interface ComparisonInsightsProps {
  comparison: ComparisonMetrics;
}

// Format currency for display
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
};

// Difference indicator component
interface DifferenceIndicatorProps {
  value: number;
  showArrow?: boolean;
  positiveIsGood?: boolean;
}

const DifferenceIndicator: React.FC<DifferenceIndicatorProps> = ({ 
  value, 
  showArrow = true,
  positiveIsGood = true 
}) => {
  if (Math.abs(value) < 0.5) {
    return (
      <span className="flex items-center gap-1 text-gray-500 text-xs">
        <Minus className="w-3 h-3" />
        Same
      </span>
    );
  }
  
  const isPositive = value > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {showArrow && (
        isPositive 
          ? <TrendingUp className="w-3 h-3" /> 
          : <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? '+' : ''}{formatCurrency(value)}
    </span>
  );
};

// Metric card component
interface MetricCardProps {
  label: string;
  valueA: number | string;
  valueB: number | string;
  difference?: number;
  differenceLabel?: string;
  positiveIsGood?: boolean;
  formatValue?: (v: number | string) => string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  valueA, 
  valueB, 
  difference,
  positiveIsGood = true,
  formatValue = (v) => typeof v === 'number' ? formatCurrency(v) : v
}) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{label}</div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-[10px] text-gray-400 mb-0.5">Scenario A</div>
        <div className="text-sm font-semibold text-gray-900">{formatValue(valueA)}</div>
      </div>
      <div>
        <div className="text-[10px] text-gray-400 mb-0.5">Scenario B</div>
        <div className="text-sm font-semibold text-gray-900">{formatValue(valueB)}</div>
      </div>
    </div>
    {difference !== undefined && (
      <div className="mt-2 pt-2 border-t border-gray-200">
        <DifferenceIndicator value={difference} positiveIsGood={positiveIsGood} />
      </div>
    )}
  </div>
);

export const ComparisonInsights: React.FC<ComparisonInsightsProps> = ({ comparison }) => {
  const { scenarioA, scenarioB, differences, winner, winnerReason, insights } = comparison;
  
  // Determine winner badge style
  const getWinnerBadgeStyle = () => {
    if (winner === 'tie') {
      return 'bg-gray-100 text-gray-700 border-gray-300';
    }
    return 'bg-amber-50 text-amber-700 border-amber-300';
  };
  
  const getWinnerText = () => {
    if (winner === 'tie') {
      return 'Scenarios are comparable';
    }
    return `Scenario ${winner} recommended`;
  };
  
  return (
    <Card className="p-6 bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200">
      {/* Header with Winner Badge */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Scenario Comparison
        </h2>
        
        <Badge 
          variant="outline" 
          className={`px-3 py-1 text-sm font-medium ${getWinnerBadgeStyle()}`}
        >
          {getWinnerText()}
          {winner !== 'tie' && (
            <span className="ml-1 text-xs font-normal">
              ({winnerReason})
            </span>
          )}
        </Badge>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Equity"
          valueA={scenarioA.finalEquity}
          valueB={scenarioB.finalEquity}
          difference={differences.equityDiff}
          positiveIsGood={true}
        />
        <MetricCard
          label="Annual Cashflow"
          valueA={scenarioA.finalCashflow}
          valueB={scenarioB.finalCashflow}
          difference={differences.cashflowDiff}
          positiveIsGood={true}
        />
        <MetricCard
          label="Properties"
          valueA={scenarioA.totalProperties}
          valueB={scenarioB.totalProperties}
          difference={differences.propertiesDiff}
          positiveIsGood={true}
          formatValue={(v) => v.toString()}
        />
        <MetricCard
          label="Portfolio Value"
          valueA={scenarioA.portfolioValue}
          valueB={scenarioB.portfolioValue}
          difference={differences.portfolioValueDiff}
          positiveIsGood={true}
        />
      </div>
      
      {/* Additional Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Debt"
          valueA={scenarioA.totalDebt}
          valueB={scenarioB.totalDebt}
          difference={differences.debtDiff}
          positiveIsGood={false}
        />
        <MetricCard
          label="Average LVR"
          valueA={`${scenarioA.averageLVR.toFixed(0)}%`}
          valueB={`${scenarioB.averageLVR.toFixed(0)}%`}
          formatValue={(v) => v.toString()}
        />
        <MetricCard
          label="Risk Level"
          valueA={scenarioA.riskLevel}
          valueB={scenarioB.riskLevel}
          formatValue={(v) => v.toString()}
        />
        <MetricCard
          label="Timeline"
          valueA={`${scenarioA.timelineYears} yrs`}
          valueB={`${scenarioB.timelineYears} yrs`}
          difference={differences.timelineDiff}
          positiveIsGood={false}
          formatValue={(v) => v.toString()}
        />
      </div>
      
      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Key Insights
          </h3>
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
