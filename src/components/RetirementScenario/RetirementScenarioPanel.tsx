import React, { useState, useCallback, useEffect } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useRetirementProjection, type RetirementPropertyProjection } from './useRetirementProjection';
import { getCategoryLabel } from '../../utils/propertyCells';
import { BASE_YEAR } from '../../constants/financialParams';

/**
 * Retirement Scenario Panel
 *
 * Interactive sell/hold calculator for retirement planning. Rendered inside a
 * ChartCard in Dashboard.tsx (Portfolio Plan → Retirement subtab) — the card
 * supplies the title, so no internal header is needed.
 *
 * Styling matches the rest of the dashboard: brand purple (#7F56D9) for the
 * retained/equity side, neutral grey for the liquidated/cash side, UUI neutral
 * scale for chrome, and the same KPI/slider typography used across chart cards.
 *
 * Layout (mirrors the design reference): 4 KPIs → equity/cash split bar →
 * time-to-retirement slider → property grid (click to sell / hold).
 */

// ── Dashboard design tokens ─────────────────────────────────────────────────
const BRAND = '#7F56D9';      // brand-600 — held accent + sell button
const EQUITY = '#9E77ED';     // purple — equity split-bar segment + legend
const CASH = '#A4A7AE';       // neutral — liquidated cash / sold
const SLIDER = '#9CA3AF';     // neutral grey — time-to-retirement slider (matches the other dashboard sliders)
const INTER = 'Inter, system-ui, sans-serif';

// Time-to-retirement slider range. Starts at 0 (i.e. "now", BASE_YEAR) so the
// timeline's left edge is the present — that way a property purchased this year
// sits at the start of the track and every purchase-event dot is visible.
const SLIDER_MIN = 0;
const SLIDER_MAX = 25;

/** Compact money, trailing zeros trimmed — matches Dashboard formatMoney ($1.58M, $777k). */
const fmt = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = Math.round((abs / 1_000_000) * 100) / 100;
    return `${sign}$${m}M`;
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
};

/** Strategy tag (Growth / Yield / Commercial) inferred from the property's category. */
const strategyTag = (prop: RetirementPropertyProjection): string | null => {
  for (const candidate of [prop.instanceId, prop.propertyType ?? '', prop.title]) {
    if (!candidate) continue;
    const category = getCategoryLabel(candidate);
    if (category === 'Equity Growth Property') return 'Growth';
    if (category === 'Cashflow Property') return 'Yield';
    if (category === 'Commercial Property') return 'Commercial';
  }
  return null;
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

  // Auto-clear sold status for properties not yet purchased at the current retirement year
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
      <p className="py-8 text-center text-sm text-[#A4A7AE]">
        Add properties to see the retirement scenario
      </p>
    );
  }

  const totalWealth = summary.totalEquity + summary.cashInHand;
  const equityPct = totalWealth > 0 ? (summary.totalEquity / totalWealth) * 100 : 0;
  const cashPct = totalWealth > 0 ? (summary.cashInHand / totalWealth) * 100 : 0;

  const purchasedCount = summary.properties.filter(p => p.purchasedByRetirement).length;
  const soldCount = summary.soldIds.size;
  const heldCount = Math.max(0, purchasedCount - soldCount);

  const zoneLabel =
    summary.zone === 'hold' ? 'Hold all'
    : summary.zone === 'exit' ? 'Full sell-down'
    : 'Partial sell-down';

  const fillPct = ((years - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  // Dots on the time-to-retirement track marking each property purchase year
  // (deduped, clamped to the slider's visible range).
  const purchaseMarkers = Array.from(new Set(summary.properties.map(p => p.purchaseYear)))
    .map(year => ({
      year,
      pct: ((year - BASE_YEAR - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100,
    }))
    .filter(m => m.pct >= 0 && m.pct <= 100);

  return (
    <div className="space-y-7">
      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6">
        <div>
          <span className="text-[13px] font-medium text-[#535862]">Annual cashflow</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-neutral-900 tracking-tight" style={{ fontFamily: INTER }}>
              {summary.annualCashflow >= 0 ? '+' : ''}{fmt(summary.annualCashflow)}
            </span>
            <span className="text-sm text-[#A4A7AE]">/yr</span>
          </div>
          <span className="mt-0.5 block text-xs text-[#A4A7AE]">net rental income</span>
        </div>

        <div>
          <span className="text-[13px] font-medium text-[#535862]">Cash in hand</span>
          <div className="mt-1">
            <span className="text-2xl font-semibold text-neutral-900 tracking-tight" style={{ fontFamily: INTER }}>
              {fmt(summary.cashInHand)}
            </span>
          </div>
          <span className="mt-0.5 block text-xs text-[#A4A7AE]">from {soldCount} sold</span>
        </div>

        <div>
          <span className="text-[13px] font-medium text-[#535862]">Equity retained</span>
          <div className="mt-1">
            <span className="text-2xl font-semibold text-neutral-900 tracking-tight" style={{ fontFamily: INTER }}>
              {fmt(summary.totalEquity)}
            </span>
          </div>
          <span className="mt-0.5 block text-xs text-[#A4A7AE]">in {heldCount} held</span>
        </div>

        <div>
          <span className="text-[13px] font-medium text-[#535862]">Debt remaining</span>
          <div className="mt-1">
            <span className="text-2xl font-semibold text-neutral-900 tracking-tight" style={{ fontFamily: INTER }}>
              {fmt(summary.debtRemaining)}
            </span>
          </div>
          <span className="mt-0.5 block text-xs text-[#A4A7AE]">on held properties</span>
        </div>
      </div>

      {/* ── Equity / Cash split bar ─────────────────────────────────────── */}
      <div>
        <div className="flex w-full overflow-hidden rounded-full" style={{ height: 16 }}>
          {totalWealth > 0 ? (
            <>
              {cashPct > 0 && (
                <div className="transition-all duration-300" style={{ width: `${cashPct}%`, backgroundColor: EQUITY }} />
              )}
              {equityPct > 0 && (
                <div className="transition-all duration-300" style={{ width: `${equityPct}%`, backgroundColor: CASH }} />
              )}
            </>
          ) : (
            <div className="w-full" style={{ backgroundColor: '#F5F5F5' }} />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[13px] text-[#717680]">
            <span className="font-semibold text-[#181D27]">{zoneLabel}</span>
            {' · '}by {BASE_YEAR + years}{' · '}{soldCount} of {purchasedCount} sold
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: EQUITY }} />
              <span className="text-xs text-[#717680]">Cash</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: CASH }} />
              <span className="text-xs text-[#717680]">Equity</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Time to retirement slider ───────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <span className="whitespace-nowrap text-[13px] font-medium text-[#535862]">Time to retirement</span>
        <div className="relative flex items-center" style={{ flex: 1, height: 16 }}>
          {/* Track line, inset by the thumb radius (8px) on each end so the
              thumb sits flush with the line ends instead of stopping short. */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: 8,
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              height: 4,
              borderRadius: 2,
              background: `linear-gradient(to right, ${SLIDER} 0%, ${SLIDER} ${fillPct}%, #E5E5E5 ${fillPct}%, #E5E5E5 100%)`,
            }}
          >
            {/* Purchase-event dots, positioned within the inset line so they
                line up with the thumb at any value. */}
            {purchaseMarkers.map(m => (
              <span
                key={m.year}
                title={`Property purchased ${m.year}`}
                className="absolute"
                style={{
                  left: `${m.pct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: BRAND,
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 0 1px rgba(127, 86, 217, 0.45)',
                }}
              />
            ))}
          </div>
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="ret-slider"
            style={{
              position: 'relative',
              width: '100%',
              height: 4,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: 'transparent',
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
        <span className="whitespace-nowrap text-base font-semibold text-[#181D27]">
          {BASE_YEAR + years}
        </span>
      </div>

      {/* ── Property grid — click to sell / hold ────────────────────────── */}
      <div>
        <p className="mb-3 text-[13px] text-[#717680]">Click a property to sell it for cash, or keep it for income</p>
        <div className="grid grid-cols-4 gap-4">
          {summary.properties.map((prop, idx) => {
            const isSold = soldIds.has(prop.instanceId);
            const canSell = prop.purchasedByRetirement;
            const tag = strategyTag(prop);

            // Unpurchased properties stay visible but faded so the client can
            // see they're coming — they "pop" to a full card once bought.
            const base = 'flex min-h-[116px] flex-col rounded-xl border p-4 text-left transition-all duration-150';
            const stateClass = !canSell
              ? 'border-[#E9EAEB] bg-[#F9FAFB] opacity-50 cursor-not-allowed'
              : isSold
                ? 'border-[#E9EAEB] bg-[#FAFAFA] cursor-pointer hover:border-[#D5D7DA]'
                : 'cursor-pointer hover:border-[#98A2B3]';
            const heldStyle = canSell && !isSold
              ? { borderColor: '#D5D7DA', backgroundColor: 'rgba(127, 86, 217, 0.04)' }
              : undefined;

            return (
              <button
                key={prop.instanceId}
                onClick={() => canSell && toggleSold(prop.instanceId)}
                disabled={!canSell}
                className={`${base} ${stateClass}`}
                style={heldStyle}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[15px] font-semibold text-[#181D27]">Prop {idx + 1}</span>
                  {tag && <span className="text-xs font-medium text-[#717680]">{tag}</span>}
                </div>

                {!canSell ? (
                  <>
                    <span className="mt-3 text-[13px] font-medium text-[#A4A7AE]">Not yet purchased</span>
                    <span className="mt-0.5 text-xs text-[#A4A7AE]">Buys {prop.purchaseYear}</span>
                  </>
                ) : (
                  <>
                    <span className="mt-3 text-xl font-semibold text-neutral-900 tracking-tight" style={{ fontFamily: INTER }}>
                      {fmt(prop.futureValue)}
                    </span>
                    <span className="mt-1 text-[13px] text-[#717680]">
                      {fmt(Math.max(0, prop.futureEquity))} {isSold ? 'cash' : 'equity'}
                    </span>
                    <span
                      title={isSold ? 'Click to keep this property for income' : 'Click to sell this property for cash'}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={isSold
                        ? { backgroundColor: '#F5F5F5', border: '1px solid #E9EAEB', color: '#535862' }
                        : { backgroundColor: '#FFFFFF', border: `1px solid rgba(127, 86, 217, 0.50)`, color: BRAND }}
                    >
                      {isSold ? 'Sold for cash ✓' : 'Sell for cash'}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Negative-cashflow note ──────────────────────────────────────── */}
      {summary.annualCashflow < 0 && soldCount < purchasedCount && (
        <p className="text-[13px] text-[#535862]">
          Negative cashflow of {fmt(summary.annualCashflow)}/yr — top-up from other income required to hold this portfolio through retirement.
        </p>
      )}

      {/* Slider thumb — matches the dashboard's Portfolio Cashflow slider */}
      <style>{`
        .ret-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2.5px solid ${SLIDER};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .ret-slider::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2.5px solid ${SLIDER};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
};
