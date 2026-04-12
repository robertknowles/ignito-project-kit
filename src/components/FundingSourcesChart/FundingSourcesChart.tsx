import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { projectPropertyTimeline } from '../../utils/metricsCalculator';
import { DEFAULT_INTEREST_RATE, BASE_YEAR, getGrowthCurveForTier } from '../../constants/financialParams';
import { PROPERTY_COLORS } from '../../constants/chartColors';

/**
 * Funding Sources — Expandable table rows
 *
 * Each property is a collapsible row showing: colour dot, property name,
 * readiness indicator, and total funding needed. Expanded state shows
 * funding source breakdown (cash, equity extraction with donor details).
 */

const fmt = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
};

interface FundingRow {
  title: string;
  buyYear: number;
  total: number;
  isOwned: boolean;
  isBuyNext: boolean;
  readinessPct: number;
  yearsAway: number;
  color: string;
  sources: { type: string; amount: number; from: string | null; refinanceYear: number | null }[];
}

export const FundingSourcesChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();

  const currentYear = new Date().getFullYear();

  const rows: FundingRow[] = useMemo(() => {
    const feasible = timelineProperties.filter(p => p.status === 'feasible');
    if (feasible.length === 0) return [];

    const endYear = BASE_YEAR + profile.timelineYears - 1;

    const donorTimelines = feasible.map(prop => {
      const propInstance = getInstance(prop.instanceId);
      const growthCurve = getGrowthCurveForTier(propInstance?.growthAssumption, profile.growthCurve);
      return projectPropertyTimeline(prop, endYear, growthCurve, DEFAULT_INTEREST_RATE);
    });

    let foundBuyNext = false;

    return feasible.map((prop, idx) => {
      const fb = prop.fundingBreakdown;
      const cash = fb.cash || 0;
      const equity = fb.equity || 0;
      const savings = fb.savings || 0;
      const total = cash + equity + savings;

      const buyYear = Math.floor(prop.affordableYear);
      const isOwned = buyYear <= currentYear;
      const isBuyNext = !isOwned && !foundBuyNext;
      if (isBuyNext) foundBuyNext = true;

      // Build funding sources with donor details
      const sources: FundingRow['sources'] = [];
      if (cash > 0) {
        sources.push({ type: 'Cash Deposit', amount: cash, from: null, refinanceYear: null });
      }

      if (equity > 0) {
        // Find donor properties
        const donorEquities: { title: string; extractable: number; currentExtractable: number }[] = [];
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
          const totalExtractable = donorEquities.reduce((s, d) => s + d.extractable, 0);
          donorEquities.forEach(d => {
            const share = totalExtractable > 0
              ? Math.round((d.extractable / totalExtractable) * equity)
              : Math.round(equity / donorEquities.length);
            sources.push({
              type: 'Equity Extraction',
              amount: share,
              from: d.title,
              refinanceYear: buyYear,
            });
          });
        } else {
          sources.push({ type: 'Equity Extraction', amount: equity, from: null, refinanceYear: buyYear });
        }
      }

      if (savings > 0) {
        sources.push({ type: 'Accumulated Savings', amount: savings, from: null, refinanceYear: null });
      }

      // Calculate readiness
      let readyNow = cash;
      if (equity > 0) {
        for (let di = 0; di < idx; di++) {
          const snapshots = donorTimelines[di].snapshots;
          const currentSnap = snapshots.find(s => s.year === currentYear)
            ?? snapshots.filter(s => s.year <= currentYear).pop();
          readyNow += Math.min(equity, currentSnap?.extractableEquity ?? 0);
        }
      }
      const readinessPct = total > 0 ? Math.min(100, Math.round((readyNow / total) * 100)) : 0;

      return {
        title: prop.title,
        buyYear,
        total,
        isOwned,
        isBuyNext,
        readinessPct,
        yearsAway: Math.max(0, buyYear - currentYear),
        color: PROPERTY_COLORS[idx % PROPERTY_COLORS.length],
        sources,
      };
    });
  }, [timelineProperties, profile, getInstance, currentYear]);

  // Default expanded: first "Buy Next" property
  const buyNextIdx = rows.findIndex(r => r.isBuyNext);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(buyNextIdx >= 0 ? buyNextIdx : null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[#717680] py-8 text-center">
        Add properties to see funding sources
      </p>
    );
  }

  const toggleRow = (idx: number) => {
    setExpandedIdx(prev => prev === idx ? null : idx);
  };

  return (
    <div>
      {rows.map((row, idx) => {
        const isOpen = expandedIdx === idx;
        const isLast = idx === rows.length - 1;

        return (
          <div key={idx}>
            {/* Collapsed row */}
            <button
              className="w-full flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
              style={{
                padding: '14px 0',
                borderBottom: !isLast ? '1px solid #E9EAEB' : undefined,
              }}
              onClick={() => toggleRow(idx)}
            >
              {/* Chevron */}
              <div className="flex-shrink-0 w-4 text-[#717680]">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>

              {/* Colour dot */}
              <div
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: row.color }}
              />

              {/* Property name + status */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#181D27]">{row.title}</span>
                  {row.isBuyNext && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{ color: '#2563EB', backgroundColor: '#EFF6FF' }}
                    >
                      Buy Next
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#717680]" style={{ marginTop: 1 }}>
                  {row.isOwned ? `Bought ${row.buyYear}` : `Target ${row.buyYear}`}
                </span>
              </div>

              {/* Readiness */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 80 }}>
                {row.isOwned ? (
                  <span className="text-xs text-[#717680]">Owned</span>
                ) : row.isBuyNext ? (
                  <div>
                    <span className="text-[13px] font-semibold text-blue-600">{row.readinessPct}% ready</span>
                    <div className="h-[3px] rounded-full overflow-hidden mt-0.5" style={{ width: 60, backgroundColor: '#E9EAEB' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.readinessPct}%`, backgroundColor: '#2563EB' }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-[13px] text-[#717680]">{row.yearsAway} yrs away</span>
                )}
              </div>

              {/* Funding needed */}
              <div className="flex-shrink-0 text-right" style={{ minWidth: 70 }}>
                <span className="text-sm font-medium text-[#535862]">{fmt(row.total)}</span>
                <div className="text-[11px] text-[#717680]">to fund</div>
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ paddingLeft: 36, paddingBottom: 12 }}>
                <p
                  className="text-[#717680] mb-2"
                  style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Funding sources
                </p>
                {row.sources.map((src, si) => (
                  <div key={si}>
                    <div
                      className="flex items-center justify-between"
                      style={{
                        padding: '8px 0',
                        fontSize: 13,
                        borderBottom: si < row.sources.length - 1 ? '1px solid #F9FAFB' : undefined,
                      }}
                    >
                      <span className="text-[#414651]" style={{ fontWeight: 450 }}>{src.type}</span>
                      <span className="font-semibold text-[#181D27]">{fmt(src.amount)}</span>
                    </div>
                    {src.from && (
                      <p
                        className="text-[#717680]"
                        style={{ fontSize: 12, marginLeft: 14, marginTop: 3, marginBottom: 4 }}
                      >
                        from {src.from} · refinanced {src.refinanceYear}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
