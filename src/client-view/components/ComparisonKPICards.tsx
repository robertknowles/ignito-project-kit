import React from 'react';
import { Target, TrendingUp, Trophy, CheckCircle, Clock, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { ComparisonMetrics } from '../../utils/comparisonCalculator';

// Format currency for display
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(0)}k`;
  }
  return `${sign}$${absValue.toLocaleString()}`;
};

// Difference indicator component
interface DifferenceIndicatorProps {
  valueA: number;
  valueB: number;
  positiveIsGood?: boolean;
  formatFn?: (v: number) => string;
}

const DifferenceIndicator: React.FC<DifferenceIndicatorProps> = ({ 
  valueA, 
  valueB, 
  positiveIsGood = true,
  formatFn = formatCurrency 
}) => {
  const diff = valueA - valueB;
  
  if (Math.abs(diff) < 1) {
    return (
      <span className="flex items-center gap-1 text-slate-400 text-[10px]">
        <Minus className="w-3 h-3" />
        Same
      </span>
    );
  }
  
  const isPositive = diff > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  const winner = isPositive ? 'A' : 'B';
  
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${isGood ? 'text-emerald-600' : 'text-rose-500'}`}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {winner} leads by {formatFn(Math.abs(diff))}
    </span>
  );
};

interface ComparisonKPICardsProps {
  comparison: ComparisonMetrics;
  equityGoal: number;
  incomeGoal: number;
  targetYear: number;
  scenarioAName?: string;
  scenarioBName?: string;
}

export function ComparisonKPICards({
  comparison,
  equityGoal,
  incomeGoal,
  targetYear,
  scenarioAName = 'Scenario A',
  scenarioBName = 'Scenario B',
}: ComparisonKPICardsProps) {
  const { scenarioA, scenarioB, differences } = comparison;

  // Calculate years ahead/behind for each goal
  const equityYearsAheadA = scenarioA.equityGoalYear !== null ? targetYear - scenarioA.equityGoalYear : null;
  const equityYearsAheadB = scenarioB.equityGoalYear !== null ? targetYear - scenarioB.equityGoalYear : null;
  const incomeYearsAheadA = scenarioA.cashflowGoalYear !== null ? targetYear - scenarioA.cashflowGoalYear : null;
  const incomeYearsAheadB = scenarioB.cashflowGoalYear !== null ? targetYear - scenarioB.cashflowGoalYear : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 lg:mb-8">
      {/* Equity Goal Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-500" />
            <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Equity Goal</span>
          </div>
        </div>
        
        <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">{formatCurrency(equityGoal)}</p>
        
        {/* Comparison rows */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {/* Scenario A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <span className="text-xs text-slate-600">{scenarioAName}</span>
            </div>
            <div className="flex items-center gap-2">
              {scenarioA.equityGoalYear !== null ? (
                <>
                  <span className="text-xs font-semibold text-emerald-600">{scenarioA.equityGoalYear}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-600">{formatCurrency(scenarioA.finalEquity)}</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
            </div>
          </div>
          
          {/* Scenario B */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-xs text-slate-600">{scenarioBName}</span>
            </div>
            <div className="flex items-center gap-2">
              {scenarioB.equityGoalYear !== null ? (
                <>
                  <span className="text-xs font-semibold text-emerald-600">{scenarioB.equityGoalYear}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-600">{formatCurrency(scenarioB.finalEquity)}</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
            </div>
          </div>
          
          {/* Difference indicator - show even when goals not achieved */}
          <div className="pt-1">
            {scenarioA.equityGoalYear && scenarioB.equityGoalYear ? (
              <DifferenceIndicator 
                valueA={scenarioB.equityGoalYear} 
                valueB={scenarioA.equityGoalYear}
                positiveIsGood={false}
                formatFn={(v) => `${Math.abs(v)} ${Math.abs(v) === 1 ? 'year' : 'years'}`}
              />
            ) : (
              <DifferenceIndicator 
                valueA={scenarioA.finalEquity} 
                valueB={scenarioB.finalEquity}
                positiveIsGood={true}
              />
            )}
          </div>
        </div>
      </div>

      {/* Passive Income Goal Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Passive Income</span>
          </div>
        </div>
        
        <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">{formatCurrency(incomeGoal)}/yr</p>
        
        {/* Comparison rows */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {/* Scenario A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <span className="text-xs text-slate-600">{scenarioAName}</span>
            </div>
            <div className="flex items-center gap-2">
              {scenarioA.cashflowGoalYear !== null ? (
                <>
                  <span className="text-xs font-semibold text-emerald-600">{scenarioA.cashflowGoalYear}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-600">{formatCurrency(scenarioA.finalCashflow)}/yr</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
            </div>
          </div>
          
          {/* Scenario B */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-xs text-slate-600">{scenarioBName}</span>
            </div>
            <div className="flex items-center gap-2">
              {scenarioB.cashflowGoalYear !== null ? (
                <>
                  <span className="text-xs font-semibold text-emerald-600">{scenarioB.cashflowGoalYear}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-600">{formatCurrency(scenarioB.finalCashflow)}/yr</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
            </div>
          </div>
          
          {/* Final cashflow comparison */}
          <div className="pt-1">
            <DifferenceIndicator 
              valueA={scenarioA.finalCashflow} 
              valueB={scenarioB.finalCashflow}
              positiveIsGood={true}
              formatFn={(v) => `${formatCurrency(v)}/yr`}
            />
          </div>
        </div>
      </div>

      {/* Portfolio Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-sky-500" />
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">Target Year</span>
        </div>
        
        <p className="text-xl sm:text-2xl font-bold text-sky-600 mb-3">{targetYear}</p>
        
        {/* Portfolio comparison */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {/* Scenario A */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <span className="text-xs text-slate-600">{scenarioAName}</span>
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">{scenarioA.totalProperties}</span> properties
            </div>
          </div>
          
          {/* Scenario B */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-xs text-slate-600">{scenarioBName}</span>
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">{scenarioB.totalProperties}</span> properties
            </div>
          </div>
          
          {/* Final equity comparison */}
          <div className="pt-1">
            <DifferenceIndicator 
              valueA={scenarioA.finalEquity} 
              valueB={scenarioB.finalEquity}
              positiveIsGood={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
