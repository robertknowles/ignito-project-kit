import React, { useState, useCallback } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { useRetirementProjection } from './useRetirementProjection';
import { CHART_COLORS } from '../../constants/chartColors';

/**
 * Retirement Scenario Panel
 *
 * Interactive sell/hold calculator for retirement planning.
 * Wrapped externally by ChartCard in Dashboard.tsx — no custom header needed.
 *
 * Layout: Wealth bar (with legend on RHS) → Strategy label → 2-col (KPIs left | slider + sell right)
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

  const [years, setYears] = useState(profile.timelineYears || 20);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());

  const summary = useRetirementProjection(timelineProperties, profile, years, soldIds);

  const toggleSold = useCallback((instanceId: string) => {
    setSoldIds(prev => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }, []);

  if (summary.properties.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Add properties to see retirement scenario
      </p>
    );
  }

  const totalWealth = summary.equityRetained + summary.cashInHand;
  const equityPct = totalWealth > 0 ? (summary.equityRetained / totalWealth) * 100 : 0;
  const cashPct = totalWealth > 0 ? (summary.cashInHand / totalWealth) * 100 : 0;
  const soldCount = summary.soldIds.size;
  const totalCount = summary.properties.length;

  return (
    <div className="space-y-4">
      {/* ── KPIs — 2x2 grid, no inner borders (Circle-style) ──── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <span className="text-[11px] font-medium text-gray-400">Cash in Hand</span>
          <div className="mt-0.5">
            <span className="text-lg font-semibold text-gray-900">{fmt(summary.cashInHand)}</span>
          </div>
          <span className="text-[10px] text-gray-400 block">From {soldCount} sold</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-gray-400">Equity Retained</span>
          <div className="mt-0.5">
            <span className="text-lg font-semibold text-gray-900">{fmt(summary.equityRetained)}</span>
          </div>
          <span className="text-[10px] text-gray-400 block">In {totalCount - soldCount} held</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-gray-400">Debt Remaining</span>
          <div className="mt-0.5">
            <span className="text-lg font-semibold text-gray-900">{fmt(summary.debtRemaining)}</span>
          </div>
          <span className="text-[10px] text-gray-400 block">{summary.debtRemaining > 0 ? 'On held properties' : 'Debt free'}</span>
        </div>

        <div>
          <span className="text-[11px] font-medium text-gray-400">Annual Cashflow</span>
          <div className="mt-0.5">
            <span className="text-lg font-semibold text-gray-900">
              {summary.annualCashflow >= 0 ? '+' : ''}{fmt(summary.annualCashflow)}
            </span>
            <span className="text-[10px] font-normal text-gray-400">/yr</span>
          </div>
          <span className="text-[10px] text-gray-400 block">Net rental income</span>
        </div>
      </div>

      {/* ── Wealth Split Bar ───────────────────────────────────────── */}
      <div>
        <div className="flex w-full overflow-hidden rounded" style={{ height: 24 }}>
          {totalWealth > 0 ? (
            <>
              {equityPct > 0 && (
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${equityPct}%`,
                    backgroundColor: CHART_COLORS.barPositive,
                  }}
                >
                  {equityPct > 12 && (
                    <span className="text-[11px] font-semibold text-white">{fmt(summary.equityRetained)}</span>
                  )}
                </div>
              )}
              {cashPct > 0 && (
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${cashPct}%`,
                    backgroundColor: CHART_COLORS.barNegative,
                  }}
                >
                  {cashPct > 12 && (
                    <span className="text-[11px] font-semibold text-white">{fmt(summary.cashInHand)}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center w-full bg-gray-100 text-[11px] text-gray-400">
              Portfolio fully liquidated
            </div>
          )}
        </div>

        {/* Strategy label + legend */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-medium text-gray-500">
              {summary.zoneName}
            </span>
            <span className="text-[11px] text-gray-400">· {years} yr · {soldCount} of {totalCount} sold</span>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.barPositive }} />
              <span className="text-[11px] text-gray-400">Equity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.barNegative }} />
              <span className="text-[11px] text-gray-400">Cash</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slider ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
            Time to Retirement
          </span>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-gray-900 min-w-[40px] text-right">
            {years}
          </span>
          <span className="text-[11px] text-gray-400">yrs</span>
        </div>
        <input
          type="range"
          min={5}
          max={25}
          step={1}
          value={years}
          onChange={e => setYears(Number(e.target.value))}
          className="flex-1 h-1 w-full slider-blue"
          style={{ accentColor: CHART_COLORS.primary }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-300">5 yrs</span>
          <span className="text-[10px] text-gray-300">25 yrs</span>
        </div>
      </div>

      {/* ── Sell at Retirement ──────────────────────────────────────── */}
      <div>
        <span className="text-[11px] font-medium text-gray-400 block mb-1.5">
          Sell at Retirement
        </span>
        <div className="flex flex-col gap-1">
          {summary.properties.map(prop => {
            const isSold = soldIds.has(prop.instanceId);
            return (
              <button
                key={prop.instanceId}
                onClick={() => toggleSold(prop.instanceId)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 ${
                  isSold
                    ? 'bg-gray-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-left">
                  <div className="text-[11px] font-medium text-gray-900 leading-tight">
                    {prop.title}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {prop.propertyType || 'Property'} · {fmt(prop.futureEquity)} equity
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide px-2 py-0.5 rounded ${
                    isSold
                      ? 'bg-gray-900 text-white'
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

      {/* ── Cashflow Warning ──────────────────────────────────────── */}
      {summary.annualCashflow < 0 && soldCount < totalCount && (
        <div className="px-4 py-2 pt-3">
          <p className="text-[11px] font-medium text-gray-500">
            Negative cashflow of {fmt(summary.annualCashflow)}/yr — top-up from other income required to hold this portfolio through retirement.
          </p>
        </div>
      )}
    </div>
  );
};
