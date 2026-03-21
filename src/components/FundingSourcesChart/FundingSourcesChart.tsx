import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, getGrowthCurveForTier } from '../../constants/financialParams';
import { CHART_COLORS } from '../../constants/chartColors';

/**
 * Funding Sources — Property Cards with "Next Purchase" hero treatment.
 *
 * Every card shares the same structure/size. The first future property
 * is distinguished by a blue border highlight and "BUY NEXT" badge,
 * plus a readiness progress bar showing how much of the deposit is
 * fundable TODAY (current year). All other future properties show as
 * "AFTER THAT" with slightly muted tones but the same layout.
 */

const COLORS = {
  cash: CHART_COLORS.barPositive,       // primary blue
  equity: CHART_COLORS.barNegative,     // lighter blue
  savings: 'rgba(156, 163, 175, 0.40)', // soft grey
};

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
};

interface FundingCard {
  title: string;
  propertyType: string;
  buyYear: number;
  total: number;
  sources: { label: string; amount: number; color: string }[];
  equityNotes: string[];
  readinessPct: number;
  yearsAway: number;
  isOwned: boolean;
}

export const FundingSourcesChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();

  const currentYear = new Date().getFullYear();

  const cards: FundingCard[] = useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');
    if (feasible.length === 0) return [];

    const endYear = BASE_YEAR + profile.timelineYears - 1;

    const donorTimelines = feasible.map(prop => {
      const propInstance = getInstance(prop.instanceId);
      const growthCurve = getGrowthCurveForTier(propInstance?.growthAssumption, profile.growthCurve);
      return projectPropertyTimeline(prop, endYear, growthCurve, DEFAULT_INTEREST_RATE);
    });

    return feasible.map((prop, idx) => {
      const fb = prop.fundingBreakdown;
      const cash = fb.cash || 0;
      const equity = fb.equity || 0;
      const savings = fb.savings || 0;
      const total = cash + equity + savings;

      const sources: FundingCard['sources'] = [];
      if (cash > 0) sources.push({ label: 'Cash Deposit', amount: cash, color: COLORS.cash });

      const buyYear = Math.floor(prop.affordableYear);
      const donorEquities: { title: string; extractable: number; currentExtractable: number }[] = [];

      if (equity > 0) {
        for (let di = 0; di < idx; di++) {
          const snapshots = donorTimelines[di].snapshots;
          const snap = snapshots.find(s => s.year === buyYear)
            ?? snapshots.filter(s => s.year < buyYear).pop();
          const extractable = snap?.extractableEquity ?? 0;
          const currentSnap = snapshots.find(s => s.year === currentYear)
            ?? snapshots.filter(s => s.year <= currentYear).pop();
          const currentExtractable = currentSnap?.extractableEquity ?? 0;

          if (extractable > 0) {
            donorEquities.push({ title: feasible[di].title, extractable, currentExtractable });
          }
        }

        if (donorEquities.length > 0) {
          sources.push({
            label: `Equity from ${donorEquities.length > 1 ? 'Portfolio' : donorEquities[0].title}`,
            amount: equity,
            color: COLORS.equity,
          });
        } else {
          sources.push({ label: 'Equity Extraction', amount: equity, color: COLORS.equity });
        }
      }

      if (savings > 0) sources.push({ label: 'Accumulated Savings', amount: savings, color: COLORS.savings });

      const equityNotes: string[] = [];
      if (equity > 0 && donorEquities.length > 0) {
        const totalExtractable = donorEquities.reduce((s, d) => s + d.extractable, 0);
        donorEquities.forEach(d => {
          const share = totalExtractable > 0
            ? Math.round((d.extractable / totalExtractable) * equity)
            : Math.round(equity / donorEquities.length);
          equityNotes.push(
            `↑ ${fmt(share)} from ${d.title} – refinanced ${buyYear}`
          );
        });
      }

      let readyNow = cash;
      if (equity > 0 && donorEquities.length > 0) {
        const currentTotalExtractable = donorEquities.reduce((s, d) => s + d.currentExtractable, 0);
        readyNow += Math.min(equity, currentTotalExtractable);
      }
      if (savings > 0 && buyYear > BASE_YEAR) {
        const elapsed = Math.max(0, currentYear - BASE_YEAR);
        const totalSpan = buyYear - BASE_YEAR;
        readyNow += Math.min(savings, savings * (elapsed / totalSpan));
      }
      const readinessPct = total > 0 ? Math.min(100, Math.round((readyNow / total) * 100)) : 0;

      const isOwned = buyYear <= currentYear;

      return {
        title: `Property ${idx + 1}`,
        propertyType: prop.title,
        buyYear,
        total,
        sources,
        equityNotes,
        readinessPct,
        yearsAway: Math.max(0, buyYear - currentYear),
        isOwned,
      };
    });
  }, [timelineProperties, profile, getInstance, currentYear]);

  if (cards.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see funding sources
      </p>
    );
  }

  const heroIdx = cards.findIndex(c => !c.isOwned);

  // Min row height so Equity Unlock bars can roughly align
  const ROW_MIN_HEIGHT = 88;

  return (
    <div>
      {/* Vertical timeline */}
      <div className="relative">
        {cards.map((card, idx) => {
          const isHero = idx === heroIdx;
          const isAfter = idx > heroIdx && heroIdx >= 0;
          const isFuture = !card.isOwned;
          const muted = isAfter;
          const isLast = idx === cards.length - 1;

          return (
            <div key={idx} className="flex gap-3 pb-2" style={{ minHeight: ROW_MIN_HEIGHT }}>
              {/* Timeline spine */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                {/* Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-3 ${
                    isHero
                      ? 'bg-blue-400 ring-4 ring-blue-100'
                      : card.isOwned
                        ? 'bg-gray-400'
                        : 'bg-gray-300'
                  }`}
                />
                {/* Line */}
                {!isLast && (
                  <div className="w-px flex-1 bg-gray-200 mt-1" />
                )}
              </div>

              {/* Card content */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Bordered card — fixed height fills the row */}
                <div className={`rounded-lg px-4 py-2.5 flex-1 flex flex-col ${
                  isHero
                    ? 'border border-blue-200 bg-blue-50/30'
                    : 'border border-gray-100 bg-white'
                }`}>
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-tight ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
                        {card.title}
                        <span className={`font-normal ml-1 ${muted ? 'text-gray-300' : 'text-gray-400'}`}>
                          · {card.propertyType}
                        </span>
                      </p>
                      <p className={`text-[10px] ${
                        isHero ? 'text-blue-500 font-medium' : muted ? 'text-gray-300' : 'text-gray-400'
                      }`}>
                        {card.isOwned ? `Bought ${card.buyYear}` : `Target ${card.buyYear}`}
                        {isHero && ' · Buy Next'}
                      </p>
                    </div>
                    {isFuture && isHero ? (
                      <div className="flex-shrink-0 ml-2 text-right" style={{ minWidth: 80 }}>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] font-semibold" style={{ color: CHART_COLORS.primary }}>
                            {card.readinessPct}% ready
                          </span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden bg-gray-100 mt-0.5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${card.readinessPct}%`,
                              backgroundColor: CHART_COLORS.barPositive,
                            }}
                          />
                        </div>
                      </div>
                    ) : isFuture ? (
                      <span className={`text-xs font-medium flex-shrink-0 ml-2 ${muted ? 'text-gray-300' : 'text-gray-500'}`}>
                        {card.yearsAway} yrs
                      </span>
                    ) : null}
                  </div>

                  {/* Source breakdown — compact */}
                  <div className="flex flex-col gap-0.5">
                    {card.sources.map((src, si) => (
                      <div key={si} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: src.color, opacity: muted ? 0.5 : 1 }}
                          />
                          <span className={`text-[11px] truncate ${muted ? 'text-gray-300' : 'text-gray-400'}`}>
                            {src.label}
                          </span>
                        </div>
                        <span className={`text-[11px] font-medium flex-shrink-0 ${muted ? 'text-gray-300' : 'text-gray-500'}`}>
                          {fmt(src.amount)}
                        </span>
                      </div>
                    ))}
                  </div>


                  {/* Equity notes — compact */}
                  {card.equityNotes.length > 0 && (
                    <div className="mt-1">
                      {card.equityNotes.map((note, ni) => (
                        <p key={ni} className={`text-[9px] leading-snug ${muted ? 'text-gray-300' : 'text-gray-400'}`}>
                          {note}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.cash }} />
          <span className="text-[11px] text-gray-400">Cash Deposit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.equity }} />
          <span className="text-[11px] text-gray-400">Equity Extraction</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.savings }} />
          <span className="text-[11px] text-gray-400">Accumulated Savings</span>
        </div>
      </div>
    </div>
  );
};
