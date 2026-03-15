import React, { useState, useMemo } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { useHoldingCostTimeline } from './useHoldingCostTimeline';
import { HoldingCostCard } from './HoldingCostCard';
import { CHART_COLORS } from '../../constants/chartColors';

const fmtMo = (v: number) => `$${Math.abs(Math.round(v)).toLocaleString()}`;

/**
 * Monthly Holding Cost Panel
 *
 * Shows per-property monthly holding costs with a year slider.
 * Portfolio total at top, individual property cards below.
 */
export const HoldingCostPanel: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { properties, startYear, endYear } = useHoldingCostTimeline(timelineProperties, profile);

  // Default to latest property buy year so all properties are visible
  const latestBuyYear = properties.length > 0
    ? Math.max(...properties.map(p => p.buyYear))
    : endYear;
  const [snapshotYear, setSnapshotYear] = useState(() =>
    Math.min(latestBuyYear, endYear)
  );

  // Portfolio totals for the snapshot year
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
      {/* Header with portfolio total */}
      <div className="flex justify-between items-start mb-4">
        <div className="text-[11px] text-gray-400">
          Per-property cost breakdown — drag the slider to see costs over time
        </div>
        <div className="text-right flex-shrink-0">
          <div>
            <span className="text-xl font-semibold text-gray-600">
              {isPositive ? '+' : '-'}{fmtMo(totals.totalNet)}
            </span>
            <span className="text-xs font-normal text-gray-400">/mo</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            across {totals.activeCount} {totals.activeCount === 1 ? 'property' : 'properties'}
          </div>
        </div>
      </div>

      {/* Year slider — no border, just content */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
          Snapshot Year
        </span>
        <input
          type="range"
          min={startYear}
          max={endYear}
          value={snapshotYear}
          onChange={e => setSnapshotYear(Number(e.target.value))}
          className="flex-1 h-1 slider-blue"
          style={{ accentColor: CHART_COLORS.primary }}
        />
        <span className="text-sm font-medium text-gray-600 min-w-[40px] text-right">
          {snapshotYear}
        </span>
      </div>

      {/* Property cards */}
      <div className="flex flex-col gap-2">
        {properties.map(prop => (
          <HoldingCostCard
            key={prop.instanceId}
            title={prop.title}
            buyYear={prop.buyYear}
            color={prop.color}
            snapshots={prop.snapshots}
            snapshotYear={snapshotYear}
          />
        ))}
      </div>

      {/* Portfolio total */}
      <div className="flex justify-between items-center mt-4 pt-3">
        <div>
          <div className="text-xs font-medium text-gray-600">Total Portfolio</div>
          <div className="text-[11px] text-gray-400">
            Rent: {fmtMo(totals.totalRent)}/mo · Costs: {fmtMo(totals.totalCosts)}/mo · Coverage: {totals.coverage}%
          </div>
        </div>
        <div>
          <span className="text-base font-medium text-gray-600">
            {isPositive ? '+' : '-'}{fmtMo(totals.totalNet)}
          </span>
          <span className="text-[10px] font-normal text-gray-400">/mo</span>
        </div>
      </div>
    </div>
  );
};
