import React, { useState, useCallback, useEffect } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useRetirementProjection } from './useRetirementProjection';
import { CHART_COLORS } from '../../constants/chartColors';

/**
 * Retirement Scenario Panel
 *
 * Interactive sell/hold calculator for retirement planning.
 * Wrapped externally by ChartCard in Dashboard.tsx — no custom header needed.
 *
 * Layout: Strategy header + chip → 4 KPI cards → wealth bar + legend → 2-col (slider | sell list)
 */

const fmt = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}k`;
  return `${sign}$${Math.round(abs)}`;
};

export const RetirementScenarioPanel: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  const { profile } = useInvestmentProfile();
  const { getInstance } = usePropertyInstance();

  const [years, setYears] = useState(profile.timelineYears || 20);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());

  const summary = useRetirementProjection(timelineProperties, profile, years, soldIds, getInstance);

  const toggleSold = useCallback((instanceId: string) => {
    setSoldIds(prev => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }, []);

  // Auto-clear sold status for properties not yet purchased at current retirement year
  useEffect(() => {
    if (summary.properties.length === 0) return;
    const unpurchased = summary.properties
      .filter(p => !p.purchasedByRetirement && soldIds.has(p.instanceId))
      .map(p => p.instanceId);
    if (unpurchased.length > 0) {
      setSoldIds(prev => {
        const next = new Set(prev);
        unpurchased.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [summary.properties, soldIds]);

  if (summary.properties.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see retirement scenario
      </p>
    );
  }

  const totalWealth = summary.totalEquity + summary.cashInHand;
  const equityPct = totalWealth > 0 ? (summary.totalEquity / totalWealth) * 100 : 0;
  const cashPct = totalWealth > 0 ? (summary.cashInHand / totalWealth) * 100 : 0;
  const soldCount = summary.soldIds.size;
  const totalCount = summary.properties.length;

  return (
    <div className="relative space-y-5">
      {/* ── Strategy Chip — pinned top-right ─────────────────────── */}
      <div className="absolute right-0 text-right" style={{ top: '-4.5rem' }}>
        <span className="text-[11px] font-medium text-gray-500 border border-gray-200 rounded-full px-3 py-1 whitespace-nowrap">
          {summary.chipLabel}
        </span>
        <p className="text-[11px] text-gray-400 mt-1.5">
          {soldCount} of {totalCount} properties sold at retirement
        </p>
      </div>

      {/* ── KPI Cards — 5 across ─────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Cash in Hand</span>
          <div className="mt-1">
            <span className="text-lg font-semibold text-gray-600">{fmt(summary.cashInHand)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Portfolio Value</span>
          <div className="mt-1">
            <span className="text-lg font-semibold text-gray-600">{fmt(summary.portfolioValue)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total Equity</span>
          <div className="mt-1">
            <span className="text-lg font-semibold text-gray-600">{fmt(summary.totalEquity)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Debt Remaining</span>
          <div className="mt-1">
            <span className="text-lg font-semibold text-gray-600">{fmt(summary.debtRemaining)}</span>
          </div>
          {summary.debtRemaining === 0 && (
            <span className="text-[10px] text-gray-400 block mt-0.5">Debt free</span>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Annual Cashflow</span>
          <div className="mt-1">
            <span className="text-lg font-semibold text-gray-600">
              {summary.annualCashflow >= 0 ? '+' : ''}{fmt(summary.annualCashflow)}
            </span>
            <span className="text-[10px] font-normal text-gray-400">/yr</span>
          </div>
        </div>
      </div>

      {/* ── Wealth Split Bar ───────────────────────────────────────── */}
      <div>
        <div className="flex w-full overflow-hidden rounded-full" style={{ height: 12 }}>
          {totalWealth > 0 ? (
            <>
              {equityPct > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    width: `${equityPct}%`,
                    backgroundColor: CHART_COLORS.barPositive,
                  }}
                />
              )}
              {cashPct > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    width: `${cashPct}%`,
                    backgroundColor: CHART_COLORS.barNegative,
                  }}
                />
              )}
            </>
          ) : (
            <div className="w-full bg-gray-100" />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS.barPositive }} />
            <span className="text-[11px] text-gray-400">Equity in property {fmt(summary.totalEquity)} — grows, not liquid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS.barNegative }} />
            <span className="text-[11px] text-gray-400">Cash in hand {fmt(summary.cashInHand)} — liquid after debt clearance</span>
          </div>
        </div>
      </div>

      {/* ── Bottom 2-col: Slider | Sell List ──────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Time to Retirement */}
        <div className="rounded-lg border border-gray-200 px-4 py-4">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Time to Retirement
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-gray-600">{years}</span>
              <span className="text-[11px] text-gray-400">yrs</span>
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="h-1.5 w-full appearance-none cursor-pointer bg-gray-200 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-[#9CA3AF] [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-[#9CA3AF] [&::-moz-range-thumb]:shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
            style={{ background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${((years - 5) / (25 - 5)) * 100}%, #E5E7EB ${((years - 5) / (25 - 5)) * 100}%, #E5E7EB 100%)` }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-300">5 yrs</span>
            <span className="text-[10px] text-gray-300">25 yrs</span>
          </div>
        </div>

        {/* Sell at Retirement */}
        <div className="rounded-lg border border-gray-200 px-4 py-4">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 block mb-3">
            Sell at Retirement
          </span>
          <div className="flex flex-col gap-2">
            {summary.properties.map(prop => {
              const isSold = soldIds.has(prop.instanceId);
              const canSell = prop.purchasedByRetirement;
              return (
                <button
                  key={prop.instanceId}
                  onClick={() => canSell && toggleSold(prop.instanceId)}
                  disabled={!canSell}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-150 ${
                    !canSell
                      ? 'border-gray-50 bg-gray-50/50 opacity-50 cursor-not-allowed'
                      : isSold
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="text-left">
                    <div className="text-[12px] font-medium text-gray-600 leading-tight">
                      {isSold && <span className="text-gray-400 mr-1">Selling —</span>}
                      {prop.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {!canSell
                        ? `Not yet purchased (buys ${prop.purchaseYear})`
                        : `${prop.propertyType || 'Property'} · ${fmt(prop.futureEquity)} equity`
                      }
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-wide px-2.5 py-1 rounded ${
                      !canSell
                        ? 'border border-gray-100 text-gray-300'
                        : isSold
                          ? 'bg-gray-500 text-white'
                          : 'border border-gray-200 text-gray-400'
                    }`}
                  >
                    {isSold ? 'SOLD' : 'SELL'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Cashflow Warning ──────────────────────────────────────── */}
      {summary.annualCashflow < 0 && soldCount < totalCount && (
        <div className="px-1">
          <p className="text-[11px] font-medium text-gray-500">
            Negative cashflow of {fmt(summary.annualCashflow)}/yr — top-up from other income required to hold this portfolio through retirement.
          </p>
        </div>
      )}
    </div>
  );
};
