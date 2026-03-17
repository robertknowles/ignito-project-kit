import React, { useMemo } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, getGrowthCurveForTier } from '../../constants/financialParams';
import { CHART_COLORS } from '../../constants/chartColors';

/**
 * Funding Sources — Property Cards
 *
 * Each property gets a card showing its total deposit cost,
 * a stacked progress bar of funding sources (cash/equity/savings),
 * and a breakdown list. Equity extraction notes shown at bottom.
 *
 * Cards stay in a single horizontal row.
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
}

export const FundingSourcesChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();

  const cards: FundingCard[] = useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');
    if (feasible.length === 0) return [];

    const endYear = BASE_YEAR + profile.timelineYears - 1;

    // Pre-compute timelines for all properties (same as Equity Unlock)
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

      // Find donor properties and their extractable equity at this purchase year
      const buyYear = Math.floor(prop.affordableYear);
      const donorEquities: { title: string; extractable: number }[] = [];

      if (equity > 0) {
        // Look up each earlier property's extractable equity from pre-computed timelines
        for (let di = 0; di < idx; di++) {
          const snapshots = donorTimelines[di].snapshots;
          const snap = snapshots.find(s => s.year === buyYear)
            ?? snapshots.filter(s => s.year < buyYear).pop();
          const extractable = snap?.extractableEquity ?? 0;
          if (extractable > 0) {
            donorEquities.push({ title: feasible[di].title, extractable });
          }
        }

        if (donorEquities.length > 0) {
          sources.push({
            label: `Equity from Property ${donorEquities.length > 1 ? 'Portfolio' : donorEquities[0].title}`,
            amount: equity,
            color: COLORS.equity,
          });
        } else {
          sources.push({ label: 'Equity Extraction', amount: equity, color: COLORS.equity });
        }
      }

      if (savings > 0) sources.push({ label: 'Accumulated Savings', amount: savings, color: COLORS.savings });

      // Equity extraction notes — show per-donor proportional contribution
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

      return {
        title: `Property ${idx + 1}`,
        propertyType: prop.title,
        buyYear,
        total,
        sources,
        equityNotes,
      };
    });
  }, [timelineProperties, profile, getInstance]);

  if (cards.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see funding sources
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <p className="text-xs text-gray-400">Where each deposit comes from</p>
      </div>

      {/* Cards row — single line */}
      <div className="flex gap-4" style={{ minWidth: 0 }}>
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="flex-1 min-w-0 border border-gray-100 rounded-lg px-4 py-4"
          >
            {/* Header: title + total */}
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600 truncate">{card.title}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  {card.propertyType} · {card.buyYear}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-600 flex-shrink-0 ml-2">
                {fmt(card.total)}
              </span>
            </div>

            {/* Stacked progress bar */}
            <div className="flex rounded-full overflow-hidden h-2 mt-2 mb-3">
              {card.sources.map((src, si) => {
                const pct = card.total > 0 ? (src.amount / card.total) * 100 : 0;
                return (
                  <div
                    key={si}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: src.color,
                    }}
                  />
                );
              })}
            </div>

            {/* Source breakdown */}
            <div className="flex flex-col gap-1.5">
              {card.sources.map((src, si) => (
                <div key={si} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: src.color }}
                    />
                    <span className="text-[11px] text-gray-400 truncate">{src.label}</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 flex-shrink-0">
                    {fmt(src.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Equity extraction notes */}
            {card.equityNotes.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-50">
                {card.equityNotes.map((note, ni) => (
                  <p key={ni} className="text-[10px] text-gray-400 leading-relaxed">{note}</p>
                ))}
              </div>
            )}
          </div>
        ))}
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
