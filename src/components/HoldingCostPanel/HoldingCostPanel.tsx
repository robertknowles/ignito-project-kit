import React, { useState, useMemo } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useHoldingCostTimeline } from './useHoldingCostTimeline';
import { CHART_COLORS } from '../../constants/chartColors';
import { ChevronDown } from 'lucide-react';

const fmtMo = (v: number) => `$${Math.abs(Math.round(v)).toLocaleString()}`;

const COLORS = {
  rent: 'rgba(59, 108, 244, 0.40)',      // rent coverage — matches refinanceable
  costs: 'rgba(163, 193, 250, 0.30)',     // costs bg — matches building equity
};

const LABEL_WIDTH = 100;
const FINAL_WIDTH = 80;

/**
 * Monthly Holding Cost Panel — Gantt-style rows matching Equity Unlock
 *
 * Each property gets a row with label on left, rent-vs-cost bar in middle,
 * and net cost on right. Expandable breakdown on click.
 */
export const HoldingCostPanel: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();
  const { properties, startYear, endYear } = useHoldingCostTimeline(timelineProperties, profile, getInstance);

  const latestBuyYear = properties.length > 0
    ? Math.max(...properties.map(p => p.buyYear))
    : endYear;
  const [snapshotYear, setSnapshotYear] = useState(() =>
    Math.min(latestBuyYear, endYear)
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Portfolio totals
  const totals = useMemo(() => {
    let totalNet = 0;
    let totalRent = 0;
    let totalCosts = 0;
    let activeCount = 0;

    properties.forEach(prop => {
      const snap = prop.snapshots.find(s => s.year === snapshotYear);
      if (!snap) return;
      activeCount++;
      totalNet += snap.monthlyNetCost;
      totalRent += snap.monthlyRent;
      const costs = snap.monthlyMortgage + snap.monthlyManagement + snap.monthlyCouncil +
        snap.monthlyInsurance + snap.monthlyMaintenance + snap.monthlyVacancy + snap.monthlyStrata;
      totalCosts += costs;
    });

    const coverage = totalCosts > 0 ? Math.round((totalRent / totalCosts) * 100) : 0;
    return { totalNet, totalRent, totalCosts, coverage, activeCount };
  }, [properties, snapshotYear]);

  if (properties.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see holding costs
      </p>
    );
  }

  const isPositive = totals.totalNet >= 0;

  return (
    <div>
      {/* Header row — subtitle left, controls pulled up to title area right */}
      <div className="flex items-start justify-between mb-5">
        <p className="text-xs text-gray-400 -mt-4">
          Per-property cost breakdown — drag the slider to see costs over time
        </p>
        <div className="flex items-center gap-4 flex-shrink-0 ml-4 -mt-8">
          {/* Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
              Snapshot
            </span>
            <input
              type="range"
              min={startYear}
              max={endYear}
              value={snapshotYear}
              onChange={e => setSnapshotYear(Number(e.target.value))}
              className="w-24 h-1 slider-blue"
              style={{ accentColor: CHART_COLORS.primary }}
            />
            <span className="text-sm font-medium text-gray-600 min-w-[32px] text-right">
              {snapshotYear}
            </span>
          </div>
          {/* Net total */}
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight">
              Net cashflow
            </p>
            <p className="text-lg font-semibold text-gray-600">
              {isPositive ? '+' : '-'}{fmtMo(totals.totalNet)}<span className="text-xs font-normal text-gray-400">/mo</span>
            </p>
          </div>
        </div>
      </div>

      {/* Property rows — matching equity unlock style */}
      <div className="flex flex-col gap-3">
        {properties.map((prop, idx) => {
          const snapshot = prop.snapshots.find(s => s.year === snapshotYear);
          if (!snapshot) return null;

          const propIsPositive = snapshot.monthlyNetCost >= 0;
          const totalCosts = snapshot.monthlyMortgage + snapshot.monthlyManagement +
            snapshot.monthlyCouncil + snapshot.monthlyInsurance +
            snapshot.monthlyMaintenance + snapshot.monthlyVacancy + snapshot.monthlyStrata;
          const coveragePct = totalCosts > 0 ? Math.min(100, (snapshot.monthlyRent / totalCosts) * 100) : 0;
          const isOpen = expandedIdx === idx;

          const breakdownItems = [
            { label: 'Mortgage', value: snapshot.monthlyMortgage },
            { label: 'Management', value: snapshot.monthlyManagement },
            { label: 'Council Rates', value: snapshot.monthlyCouncil },
            { label: 'Insurance', value: snapshot.monthlyInsurance },
            { label: 'Maintenance', value: snapshot.monthlyMaintenance },
            { label: 'Vacancy', value: snapshot.monthlyVacancy },
            ...(snapshot.monthlyStrata > 0 ? [{ label: 'Strata', value: snapshot.monthlyStrata }] : []),
          ];

          return (
            <div key={prop.instanceId}>
              {/* Main row */}
              <button
                className="w-full flex items-start cursor-pointer hover:bg-gray-50/50 rounded-md transition-colors py-1"
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
              >
                {/* Label — same width as equity unlock, left-aligned */}
                <div className="flex-shrink-0 text-left" style={{ width: LABEL_WIDTH }}>
                  <p className="text-xs font-semibold text-gray-600 leading-tight truncate">{prop.title}</p>
                  <p className="text-[11px] text-gray-400">Bought {prop.buyYear}</p>
                </div>

                {/* Cost vs Rent bar — same 20px height as Gantt bars */}
                <div className="flex-1 relative mt-0.5" style={{ height: 20 }}>
                  {/* Costs bar from left (light blue) */}
                  {(() => {
                    const maxVal = Math.max(totalCosts, snapshot.monthlyRent, 1);
                    const costsPct = (totalCosts / maxVal) * 100;
                    const rentPct = (snapshot.monthlyRent / maxVal) * 100;
                    return (
                      <>
                        <div
                          className="absolute top-0 left-0 rounded-md"
                          style={{
                            width: `${costsPct}%`,
                            height: '100%',
                            backgroundColor: COLORS.costs,
                          }}
                        />
                        {/* Rent bar from right (darker blue) */}
                        <div
                          className="absolute top-0 right-0 rounded-md"
                          style={{
                            width: `${rentPct}%`,
                            height: '100%',
                            backgroundColor: COLORS.rent,
                          }}
                        />
                      </>
                    );
                  })()}
                  {/* Labels inside bar — costs on left, rent on right */}
                  <div className="relative flex justify-between items-center h-full px-2">
                    <span className="text-[10px] text-gray-400">
                      Costs: {fmtMo(totalCosts)} · {Math.round(coveragePct)}%
                    </span>
                    <span className="text-[10px] font-medium text-gray-600">
                      Rent: {fmtMo(snapshot.monthlyRent)}
                    </span>
                  </div>
                </div>

                {/* Net cost — right side */}
                <div className="flex-shrink-0 text-right flex items-center gap-1 mt-0.5" style={{ width: FINAL_WIDTH }}>
                  <span className="text-xs font-medium text-gray-500 flex-1">
                    {propIsPositive ? '+' : '-'}{fmtMo(snapshot.monthlyNetCost)}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Expanded breakdown */}
              {isOpen && (
                <div className="pt-1 pb-2" style={{ paddingLeft: LABEL_WIDTH }}>
                  {breakdownItems.map((item, bi) => {
                    const pct = totalCosts > 0 ? (item.value / totalCosts) * 100 : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-2 py-0.5">
                        <div className="flex-1 text-[11px] text-gray-400">{item.label}</div>
                        <div className="w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS.rent }}
                          />
                        </div>
                        <div className="w-14 text-right text-[11px] font-medium text-gray-500">
                          {fmtMo(item.value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend + portfolio total — matches equity unlock footer */}
      <div className="flex items-center justify-between mt-4" style={{ paddingLeft: LABEL_WIDTH }}>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: COLORS.rent }} />
            <span className="text-[11px] text-gray-400">Rental income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: COLORS.costs }} />
            <span className="text-[11px] text-gray-400">Total costs</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400">
          Coverage: {totals.coverage}%
        </div>
      </div>
    </div>
  );
};
