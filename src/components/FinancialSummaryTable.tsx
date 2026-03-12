import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRoadmapData, YearData } from '../hooks/useRoadmapData';
import { useInvestmentProfile } from '../hooks/useInvestmentProfile';
import { useAffordabilityCalculator } from '../hooks/useAffordabilityCalculator';
import { MiniPurchaseCard } from './MiniPurchaseCard';
import type { TimelineProperty } from '../types/property';
import type { InvestmentProfileData } from '../contexts/InvestmentProfileContext';

// Column dimension constants (must match ChartWithRoadmap for visual consistency)
const LABEL_COLUMN_WIDTH = 80;
const MIN_YEAR_COLUMN_WIDTH = 55;
const MAX_YEAR_COLUMN_WIDTH = 130;

// Format compact currency for table cells
const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000000) {
    return `${sign}$${Math.round(absValue / 1000000)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${Math.round(absValue / 1000)}k`;
  }
  return `${sign}$${Math.round(absValue)}`;
};

interface FinancialSummaryTableProps {
  scenarioData?: {
    timelineProperties: TimelineProperty[];
    profile: InvestmentProfileData;
  };
  onPropertyClick?: (instanceId: string) => void;
}

export const FinancialSummaryTable: React.FC<FinancialSummaryTableProps> = ({
  scenarioData,
  onPropertyClick,
}) => {
  const { profile: contextProfile } = useInvestmentProfile();
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();

  const profile = scenarioData?.profile ?? contextProfile;
  const timelineProperties = scenarioData?.timelineProperties ?? contextTimelineProperties;

  const { years } = useRoadmapData(scenarioData ? { profile, timelineProperties } : undefined);

  const [isBuyFundingExpanded, setIsBuyFundingExpanded] = useState(false);
  const [isAvailableFundsExpanded, setIsAvailableFundsExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const yearCount = years.length;
  const availableWidth = containerWidth - LABEL_COLUMN_WIDTH;
  const calculatedColumnWidth = yearCount > 0 ? availableWidth / yearCount : MAX_YEAR_COLUMN_WIDTH;
  const yearColumnWidth = Math.max(MIN_YEAR_COLUMN_WIDTH, Math.min(MAX_YEAR_COLUMN_WIDTH, calculatedColumnWidth));

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${yearCount}, ${yearColumnWidth}px)`,
  }), [yearCount, yearColumnWidth]);

  const handlePropertyClick = (instanceId: string) => {
    onPropertyClick?.(instanceId);
  };

  return (
    <div ref={containerRef} className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
      {/* Title section — matches Investment Timeline card header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Financial Summary</h3>
      </div>

      <div className="px-3 py-2">
      {/* YEAR Header Row */}
      <div
        style={gridStyle}
        className="border-b border-gray-200/60"
      >
        <div className="sticky left-0 bg-white z-10 px-2 py-3.5" />
        {years.map((yearData) => (
          <div
            key={yearData.year}
            className="px-1 py-3.5 flex items-center justify-center"
          >
            <span className="text-[12px] font-medium text-gray-400 tracking-wide">
              {yearData.year}
            </span>
          </div>
        ))}
      </div>

      {/* PURCHASE Row */}
      <div style={gridStyle} className="border-b border-gray-100">
        <div
          className="sticky left-0 bg-white z-10 px-2 py-3.5 flex items-center justify-end gap-1 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => setIsBuyFundingExpanded(!isBuyFundingExpanded)}
        >
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-0.5">
            <span className={`text-[8px] transition-transform duration-200 ${isBuyFundingExpanded ? 'rotate-90' : ''}`}>▶</span>
            Buy
          </span>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                <p className="text-[10px] font-medium text-gray-700 mb-1">Scheduled property purchases</p>
                <ul className="text-[9px] text-gray-500 space-y-0.5">
                  <li>• Click property to view details</li>
                  <li>• Timing based on 3 affordability tests</li>
                </ul>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        {years.map((yearData) => (
          <div
            key={`purchase-${yearData.year}`}
            className="px-1 py-3.5 flex flex-col items-center justify-center gap-0.5"
          >
            {yearData.purchaseInYear && yearData.purchaseDetails && yearData.purchaseDetails.length > 0 ? (
              yearData.purchaseDetails.map((purchase, purchaseIndex) => (
                <MiniPurchaseCard
                  key={`${purchase.instanceId}-${purchaseIndex}`}
                  propertyTitle={purchase.propertyTitle}
                  cost={purchase.cost}
                  loanAmount={purchase.loanAmount}
                  depositRequired={purchase.totalCashRequired}
                  onClick={() => handlePropertyClick(purchase.instanceId)}
                  fundingBreakdown={purchase.fundingBreakdown}
                  showFunding={isBuyFundingExpanded}
                />
              ))
            ) : (
              <span className="text-[11px] text-gray-300">–</span>
            )}
          </div>
        ))}
      </div>

      {/* FUNDS Row */}
      <div style={gridStyle} className="border-b border-gray-100">
        <div
          className="sticky left-0 bg-white z-10 px-2 py-3.5 flex items-center justify-end gap-1 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => setIsAvailableFundsExpanded(!isAvailableFundsExpanded)}
        >
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-0.5">
            <span className={`text-[8px] transition-transform duration-200 ${isAvailableFundsExpanded ? 'rotate-90' : ''}`}>▶</span>
            Funds
          </span>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                <p className="text-[10px] font-medium text-gray-700 mb-1">= Cash + Savings + Equity Release</p>
                <ul className="text-[9px] text-gray-500 space-y-0.5">
                  <li>• Cash: Your initial deposit pool</li>
                  <li>• Savings: 25% of annual savings</li>
                  <li>• Equity: Usable equity at 80% LVR</li>
                </ul>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        {years.map((yearData) => (
          <div
            key={`avail-${yearData.year}`}
            className="px-1 py-3.5 flex flex-col items-center justify-center"
          >
            <span className="text-[13px] font-medium text-gray-700">
              {formatCompactCurrency(yearData.availableFundsRaw)}
            </span>
            {isAvailableFundsExpanded && yearData.yearBreakdownData && (
              <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                <div>Cash: {formatCompactCurrency(yearData.yearBreakdownData.baseDeposit || 0)}</div>
                <div>Sav: {formatCompactCurrency(yearData.yearBreakdownData.cumulativeSavings || 0)}</div>
                <div>Eq: {formatCompactCurrency(yearData.yearBreakdownData.equityRelease || 0)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* DEBT Row */}
      <div style={gridStyle} className="border-b border-gray-100">
        <div className="sticky left-0 bg-white z-10 px-2 py-3.5 flex items-center justify-end gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            Debt
          </span>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                <p className="text-[10px] font-medium text-gray-700 mb-1">= Existing Debt + Property Loans</p>
                <ul className="text-[9px] text-gray-500 space-y-0.5">
                  <li>• Existing: From client profile</li>
                  <li>• New loans: Price × LVR %</li>
                  <li>• Grows with each purchase</li>
                </ul>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        {years.map((yearData) => (
          <div
            key={`debt-${yearData.year}`}
            className="px-1 py-3.5 flex items-center justify-center"
          >
            <span className="text-[13px] font-medium text-gray-700">
              {formatCompactCurrency(yearData.totalDebt)}
            </span>
          </div>
        ))}
      </div>

      {/* EQUITY Row */}
      <div style={gridStyle} className="border-b border-gray-100">
        <div className="sticky left-0 bg-white z-10 px-2 py-3.5 flex items-center justify-end gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            Equity
          </span>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                <p className="text-[10px] font-medium text-gray-700 mb-1">= Portfolio Value − Total Debt</p>
                <ul className="text-[9px] text-gray-500 space-y-0.5">
                  <li>• Grows as property values increase</li>
                  <li>• Accelerates in later years</li>
                </ul>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        {years.map((yearData) => (
          <div
            key={`equity-${yearData.year}`}
            className="px-1 py-3.5 flex items-center justify-center"
          >
            <span className="text-[13px] text-gray-700 font-medium">
              {yearData.totalEquityRaw > 0 ? formatCompactCurrency(yearData.totalEquityRaw) : '–'}
            </span>
          </div>
        ))}
      </div>

      {/* MONTHLY Row */}
      <div style={gridStyle}>
        <div className="sticky left-0 bg-white z-10 px-2 py-3.5 flex items-center justify-end gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            Monthly
          </span>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] z-50 p-2">
                <p className="text-[10px] font-medium text-gray-700 mb-1">Net monthly holding cost</p>
                <ul className="text-[9px] text-gray-500 space-y-0.5">
                  <li>• = (Cashflow) ÷ 12</li>
                  <li>• <span className="font-medium">Positive</span> = surplus income</li>
                  <li>• <span className="font-medium">Negative</span> = out-of-pocket cost</li>
                </ul>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        {years.map((yearData) => {
          const monthlyCost = Math.round(yearData.annualCashflow / 12);
          const hasValue = yearData.portfolioValueRaw > 0 || yearData.annualCashflow !== 0;
          return (
            <div
              key={`monthly-${yearData.year}`}
              className="px-1 py-3.5 flex items-center justify-center"
            >
              <span className="text-[13px] font-medium text-gray-700">
                {hasValue ? formatCompactCurrency(monthlyCost) : '–'}
              </span>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
