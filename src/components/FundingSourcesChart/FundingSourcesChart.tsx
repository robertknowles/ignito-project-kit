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
  return `$${v}`;
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

  return (
    <div>
      {/* Cards row */}
      <div className="flex items-stretch gap-0">
        {cards.map((card, idx) => {
          const isHero = idx === heroIdx;
          const isAfter = idx > heroIdx && heroIdx >= 0;
          const isFuture = !card.isOwned;
          const showArrow = idx > 0;
          const muted = isAfter; // muted styling for "after that" cards

          return (
            <React.Fragment key={idx}>
              {/* Arrow connector */}
              {showArrow && (
                <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
                  <span className="text-[9px] font-medium text-gray-300 uppercase tracking-wider mb-1">Then</span>
                  <ArrowRight size={14} className="text-gray-300" />
                </div>
              )}

              {/* Unified card — same structure for all */}
              <div
                className={`flex-1 min-w-0 rounded-xl px-4 py-4 flex flex-col ${
                  isHero
                    ? 'border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-white'
                    : isAfter
                      ? 'border border-gray-100 bg-gray-50/40'
                      : 'border border-gray-100 bg-white'
                }`}
              >
                {/* Badge */}
                {isHero && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2">
                    Buy Next
                  </span>
                )}
                {isAfter && (
                  <span className="inline-block text-[9px] font-medium uppercase tracking-wider text-gray-300 mb-2">
                    After that
                  </span>
                )}

                {/* Title row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
                      {card.title}
                    </p>
                    <p className={`text-[10px] truncate ${muted ? 'text-gray-300' : 'text-gray-400'}`}>
                      {card.propertyType} · {isFuture ? `Target ${card.buyYear}` : card.buyYear}
                    </p>
                  </div>
                  {isFuture && (
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-lg font-bold ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
                        {card.yearsAway}
                      </p>
                      <p className={`text-[10px] ${muted ? 'text-gray-300' : 'text-gray-400'}`}>yrs away</p>
                    </div>
                  )}
                </div>

                {/* Source breakdown */}
                <div className="flex flex-col gap-1.5">
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

                {/* Readiness bar — hero card only */}
                {isHero && (
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400">Equity building toward deposit</span>
                      <span className="text-[10px] font-semibold" style={{ color: CHART_COLORS.primary }}>
                        {card.readinessPct}% ready
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${card.readinessPct}%`,
                          backgroundColor: CHART_COLORS.barPositive,
                        }}
                      />
                    </div>
                  </div>
                )}


                {/* Equity extraction notes */}
                {card.equityNotes.length > 0 && (
                  <div className={`mt-auto pt-2 border-t ${isHero ? 'border-blue-50' : 'border-gray-50'}`}>
                    {card.equityNotes.map((note, ni) => (
                      <p key={ni} className={`text-[10px] leading-relaxed ${muted ? 'text-gray-300' : 'text-gray-400'}`}>
                        {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
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
