import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useExistingPropertiesSafe } from '../../contexts/ScenarioSaveContext';
import { useRetirementProjection, type RetirementPropertyProjection } from './useRetirementProjection';
import { buildSaleBreakdown, type CgtMethodSelection } from './saleBreakdown';
import { SaleBreakdownSection } from './SaleBreakdownSection';
import { InfoPopover } from './InfoPopover';
import { PAGE_EXPLAINERS } from './retirementExplainers';
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
const GREEN = '#067647';      // self-funding cashflow
const AMBER = '#B54708';      // top-up needed
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

/** Full money with thousands separators ($472,347) — for property-card sub-lines. */
const fmtFull = (value: number): string => `$${Math.round(value).toLocaleString('en-AU')}`;

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
  const existingProperties = useExistingPropertiesSafe();

  const [years, setYears] = useState(profile.timelineYears || 20);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());

  const retirementYear = BASE_YEAR + years;

  // Local what-if controls for the sale breakdown (not persisted to the profile).
  // 'auto' grandfathers each property by its purchase date; the BA can override.
  const [cgtMethod, setCgtMethod] = useState<CgtMethodSelection>('auto');
  const [taxRatePct, setTaxRatePct] = useState(() => Math.round((profile.marginalTaxRate ?? 0.45) * 100));
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const summary = useRetirementProjection(timelineProperties, profile, years, soldIds, getInstance, existingProperties);

  const toggleSold = useCallback((instanceId: string) => {
    setSoldIds(prev => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
        // Focus the newly sold property in the breakdown tabs.
        setActiveTab(instanceId);
      }
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

  // Per-property sale breakdowns for every sold, already-purchased property.
  // The local CGT method + tax rate drive the net figures shown everywhere.
  const soldBreakdowns = useMemo(
    () =>
      summary.properties
        .filter(p => soldIds.has(p.instanceId) && p.purchasedByRetirement)
        .map(prop => ({
          prop,
          data: buildSaleBreakdown(prop, profile, retirementYear, { method: cgtMethod, taxRatePct }),
        })),
    [summary.properties, soldIds, profile, retirementYear, cgtMethod, taxRatePct],
  );

  if (summary.properties.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#A4A7AE]">
        Add properties to see the retirement scenario
      </p>
    );
  }

  // Net-of-tax-and-costs aggregates from the per-property breakdowns. These
  // drive the honest headline (cash in hand is what actually lands, not gross).
  const netCashInHand = soldBreakdowns.reduce((s, b) => s + b.data.netCashReleased, 0);
  const taxAndCosts = soldBreakdowns.reduce((s, b) => s + b.data.sellingCosts + b.data.activeCgt, 0);
  const netCashById = new Map(soldBreakdowns.map(b => [b.prop.instanceId, b.data.netCashReleased]));

  const purchasedCount = summary.properties.filter(p => p.purchasedByRetirement).length;
  const soldCount = summary.soldIds.size;
  const heldCount = Math.max(0, purchasedCount - soldCount);

  // Progress-bar fill = sold value / total value across purchased properties.
  const purchasedProps = summary.properties.filter(p => p.purchasedByRetirement);
  const totalValue = purchasedProps.reduce((s, p) => s + p.futureValue, 0);
  const soldValue = purchasedProps
    .filter(p => soldIds.has(p.instanceId))
    .reduce((s, p) => s + p.futureValue, 0);
  const soldValuePct = totalValue > 0 ? (soldValue / totalValue) * 100 : 0;

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
        {/* Annual cashflow — green when self-funding, red when a top-up is needed. */}
        <div>
          <span className="flex items-center text-[13px] font-medium text-[#535862]">
            Annual cashflow
            <InfoPopover
              title={PAGE_EXPLAINERS.annualCashflow.title}
              body={PAGE_EXPLAINERS.annualCashflow.body}
            />
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: INTER, color: summary.annualCashflow >= 0 ? GREEN : '#181D27' }}
            >
              {summary.annualCashflow >= 0 ? '+' : ''}{fmt(summary.annualCashflow)}
            </span>
            <span className="text-sm text-[#A4A7AE]">/yr</span>
          </div>
          {summary.annualCashflow >= 0 ? (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: GREEN }} />
              <span style={{ color: GREEN }}>Self-funding</span>
            </span>
          ) : (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: AMBER }} />
              <span style={{ color: AMBER }}>Top-up needed · {fmt(Math.abs(summary.annualCashflow))}/yr</span>
            </span>
          )}
        </div>

        {/* Cash in hand — net of selling costs and CGT (what the client walks away with). */}
        <div>
          <span className="flex items-center text-[13px] font-medium text-[#535862]">
            Cash in hand
            <InfoPopover
              title={PAGE_EXPLAINERS.cashInHand.title}
              body={PAGE_EXPLAINERS.cashInHand.body}
            />
          </span>
          <div className="mt-1">
            <span className="text-2xl font-semibold text-neutral-900 tracking-tight" style={{ fontFamily: INTER }}>
              {fmt(netCashInHand)}
            </span>
          </div>
          {soldCount > 0 ? (
            <span className="mt-0.5 block text-xs text-[#717680]">
              after {fmt(taxAndCosts)} tax &amp; costs
            </span>
          ) : (
            <span className="mt-0.5 block text-xs text-[#A4A7AE]">from 0 sold</span>
          )}
        </div>

        <div>
          <span className="flex items-center text-[13px] font-medium text-[#535862]">
            Equity retained
            <InfoPopover
              title={PAGE_EXPLAINERS.equityRetained.title}
              body={PAGE_EXPLAINERS.equityRetained.body}
            />
          </span>
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

      {/* ── Sell-down progress bar ──────────────────────────────────────── */}
      {/* Fill = sold value / total value across purchased properties (spec §4). */}
      <div>
        <div className="flex w-full overflow-hidden rounded-full" style={{ height: 16 }}>
          {totalValue > 0 ? (
            <>
              {soldValuePct > 0 && (
                <div className="transition-all duration-300" style={{ width: `${soldValuePct}%`, backgroundColor: EQUITY }} />
              )}
              {soldValuePct < 100 && (
                <div className="transition-all duration-300" style={{ width: `${100 - soldValuePct}%`, backgroundColor: CASH }} />
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
        <span className="flex items-center whitespace-nowrap text-[13px] font-medium text-[#535862]">
          Time to retirement
          <InfoPopover
            title={PAGE_EXPLAINERS.sellYear.title}
            body={PAGE_EXPLAINERS.sellYear.body}
          />
        </span>
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
                  {prop.isExisting ? (
                    <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#717680]">Owned</span>
                  ) : (
                    tag && <span className="text-xs font-medium text-[#717680]">{tag}</span>
                  )}
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
                      {isSold
                        ? `${fmt(netCashById.get(prop.instanceId) ?? 0)} net cash`
                        : `${fmt(Math.max(0, prop.futureEquity))} equity`}
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

      {/* ── Sale breakdown panel — appears once a property is sold ──────── */}
      {soldBreakdowns.length > 0 && (
        <SaleBreakdownSection
          breakdowns={soldBreakdowns}
          method={cgtMethod}
          onMethod={setCgtMethod}
          taxRatePct={taxRatePct}
          onTaxRate={setTaxRatePct}
          activeTab={activeTab}
          onTab={setActiveTab}
        />
      )}

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
