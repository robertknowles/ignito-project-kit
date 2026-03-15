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
 * Matches existing dashboard styling (SummaryBar metric cards, HoldingCost slider).
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
    <div className="space-y-5">
      {/* Strategy label row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="stat-number text-gray-900">
            {summary.zoneName}
          </span>
          <span className="meta ml-2">{years} year snapshot · {soldCount} of {totalCount} sold</span>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[10px] font-medium"
          style={{
            color: CHART_COLORS.primary,
            backgroundColor: 'rgba(59, 108, 244, 0.08)',
          }}
        >
          {summary.chipLabel}
        </span>
      </div>

      {/* ── 4 Metric Cards — matches SummaryBar pattern ─────────── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <span className="metric-label">Cash in Hand</span>
          <div className="mt-1">
            <span className="stat-number" style={{ color: summary.cashInHand > 0 ? '#111827' : '#9CA3AF' }}>
              {fmt(summary.cashInHand)}
            </span>
          </div>
          <span className="meta mt-1 block">From {soldCount} sold</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <span className="metric-label">Equity Retained</span>
          <div className="mt-1">
            <span className="stat-number text-gray-900">{fmt(summary.equityRetained)}</span>
          </div>
          <span className="meta mt-1 block">In {totalCount - soldCount} held</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <span className="metric-label">Debt Remaining</span>
          <div className="mt-1">
            <span className="stat-number" style={{ color: summary.debtRemaining > 0 ? CHART_COLORS.secondary : '#111827' }}>
              {fmt(summary.debtRemaining)}
            </span>
          </div>
          <span className="meta mt-1 block">{summary.debtRemaining > 0 ? 'On held properties' : 'Debt free'}</span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <span className="metric-label">Annual Cashflow</span>
          <div className="mt-1">
            <span className="stat-number" style={{ color: summary.annualCashflow >= 0 ? '#111827' : CHART_COLORS.secondary }}>
              {summary.annualCashflow >= 0 ? '+' : ''}{fmt(summary.annualCashflow)}
              <span className="text-sm font-normal text-gray-400">/yr</span>
            </span>
          </div>
          <span className="meta mt-1 block">Net rental income</span>
        </div>
      </div>

      {/* ── Wealth Split Bar ──────────────────────────────────────── */}
      <div>
        <div className="flex w-full overflow-hidden rounded-lg" style={{ height: 44 }}>
          {totalWealth > 0 ? (
            <>
              {equityPct > 0 && (
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${equityPct}%`,
                    backgroundColor: CHART_COLORS.primary,
                  }}
                >
                  {equityPct > 12 && (
                    <span className="text-[13px] font-bold text-white">{fmt(summary.equityRetained)}</span>
                  )}
                </div>
              )}
              {cashPct > 0 && (
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${cashPct}%`,
                    backgroundColor: CHART_COLORS.secondary,
                  }}
                >
                  {cashPct > 12 && (
                    <span className="text-[13px] font-bold text-white">{fmt(summary.cashInHand)}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center w-full bg-gray-100 text-xs text-gray-400">
              Portfolio fully liquidated
            </div>
          )}
        </div>

        <div className="flex gap-5 mt-2 pl-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
            <span className="text-[11px] text-gray-400">Equity in property</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }} />
            <span className="text-[11px] text-gray-400">Cash in hand</span>
          </div>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Slider — matches HoldingCostPanel pattern */}
        <div className="bg-[#F8FAFC] rounded-lg border border-[#F1F3F5] p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
              Time to Retirement
            </span>
            <div className="flex-1" />
            <span className="text-base font-bold text-gray-900 min-w-[40px] text-right">
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
            className="flex-1 h-1 w-full"
            style={{ accentColor: CHART_COLORS.primary }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-300">5 yrs</span>
            <span className="text-[10px] text-gray-300">25 yrs</span>
          </div>
        </div>

        {/* Sell at Retirement — property toggle buttons */}
        <div className="bg-[#F8FAFC] rounded-lg border border-[#F1F3F5] p-5">
          <span className="text-[11px] font-semibold text-gray-500 block mb-3">
            Sell at Retirement
          </span>
          <div className="flex flex-col gap-2">
            {summary.properties.map(prop => {
              const isSold = soldIds.has(prop.instanceId);
              return (
                <button
                  key={prop.instanceId}
                  onClick={() => toggleSold(prop.instanceId)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                    isSold
                      ? 'border-2 bg-white'
                      : 'border border-[#E2E8F0] bg-white hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: isSold ? CHART_COLORS.primary : undefined,
                  }}
                >
                  <div className="text-left">
                    <div className="text-[13px] font-semibold text-gray-900 leading-tight">
                      {prop.title}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {prop.propertyType || 'Property'} · {fmt(prop.futureEquity)} equity
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded"
                    style={{
                      color: isSold ? 'white' : '#94A3B8',
                      backgroundColor: isSold ? CHART_COLORS.primary : 'transparent',
                      border: isSold ? 'none' : '1px solid #E2E8F0',
                    }}
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
        <div
          className="px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: 'rgba(59, 108, 244, 0.04)',
            borderColor: 'rgba(59, 108, 244, 0.15)',
          }}
        >
          <p className="text-[12px] font-semibold" style={{ color: CHART_COLORS.primary }}>
            Negative cashflow of {fmt(summary.annualCashflow)}/yr
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Top-up from other income required to hold this portfolio through retirement.
          </p>
        </div>
      )}
    </div>
  );
};
