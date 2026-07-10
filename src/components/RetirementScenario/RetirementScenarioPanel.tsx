import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAffordabilityCalculator } from '../../hooks/useAffordabilityCalculator';
import { useInvestmentProfile } from '../../hooks/useInvestmentProfile';
import { usePropertyInstance } from '../../contexts/PropertyInstanceContext';
import { useExistingPropertiesSafe } from '../../contexts/ScenarioSaveContext';
import { useRetirementProjection, type RetirementPropertyProjection } from './useRetirementProjection';
import { buildSaleBreakdown, type CgtMethod } from './saleBreakdown';
import { SaleBreakdownSection } from './SaleBreakdownSection';
import { InfoPopover } from './InfoPopover';
import { PAGE_EXPLAINERS } from './retirementExplainers';
import { getCategoryLabel } from '../../utils/propertyCells';
import { BASE_YEAR } from '../../constants/financialParams';

/**
 * Retirement Scenario Panel
 *
 * Full-page sell/hold planner (Portfolio Plan → Retirement subtab). Renders
 * directly on the grey dashboard page and supplies its own header + white cards.
 *
 * Layout: header ("Retire in" year slider) → hero cash-in-hand summary → two
 * columns (properties owned / properties sold) → Tax and sale details table.
 *
 * All figures stay wired to the real projection engine (useRetirementProjection
 * + buildSaleBreakdown) so the scenario is accurate, not illustrative.
 */

// ── Dashboard design tokens ─────────────────────────────────────────────────
const BRAND = '#7F56D9';      // brand-600 - owned / equity side
const GREEN = '#067647';      // sold / cash side + self-funding
const RED = '#D92D20';        // holding cost (negative cashflow)
const AMBER = '#B54708';      // top-up / no-discount
const INTER = 'Inter, system-ui, sans-serif';

// "Retire in" year slider range. 0 = now (BASE_YEAR) so a property bought this
// year sits at the track's left edge.
const SLIDER_MIN = 0;
const SLIDER_MAX = 25;

/** Compact money, trailing zeros trimmed - matches Dashboard formatMoney ($1.58M, $777k). */
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
  const existingProperties = useExistingPropertiesSafe();

  const [years, setYears] = useState(profile.timelineYears || 20);
  // Each sold property maps to the year it's sold in (its own static price is
  // locked to that year). Held properties simply have no entry.
  const [saleYears, setSaleYears] = useState<Record<string, number>>({});

  const retirementYear = BASE_YEAR + years;

  // Local what-if controls for the sale breakdown (not persisted to the profile).
  // Each property defaults to its grandfathered CGT method (by acquisition year);
  // a per-property override flips a single one to model a not-yet-law scenario.
  // SMSF always keeps its own treatment and ignores the override.
  const [methodOverrides, setMethodOverrides] = useState<Record<string, CgtMethod>>({});
  const cycleMethod = useCallback(
    (instanceId: string, current: CgtMethod) =>
      setMethodOverrides(prev => ({
        ...prev,
        [instanceId]: current === 'discount' ? 'indexation' : 'discount',
      })),
    [],
  );
  const [taxRatePct, setTaxRatePct] = useState(() => Math.round((profile.marginalTaxRate ?? 0.45) * 100));
  const [taxDetailsOpen, setTaxDetailsOpen] = useState(true);

  const summary = useRetirementProjection(timelineProperties, profile, years, saleYears, getInstance, existingProperties);

  // Toggle a property between held and sold. When first sold it defaults to the
  // retirement year; the per-card dropdown can then move it to an earlier year.
  const toggleSold = useCallback((instanceId: string) => {
    setSaleYears(prev => {
      const next = { ...prev };
      if (next[instanceId] != null) delete next[instanceId];
      else next[instanceId] = retirementYear;
      return next;
    });
  }, [retirementYear]);

  // Move a single property's sale to a specific year.
  const setSaleYear = useCallback((instanceId: string, year: number) => {
    setSaleYears(prev => ({ ...prev, [instanceId]: year }));
  }, []);

  // Keep sale years valid: drop properties not yet purchased at retirement, and
  // clamp each remaining sale year into [purchase year (or now), retirement year].
  useEffect(() => {
    if (summary.properties.length === 0) return;
    const byId = new Map(summary.properties.map(p => [p.instanceId, p]));
    setSaleYears(prev => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [id, year] of Object.entries(prev)) {
        const prop = byId.get(id);
        if (!prop || !prop.purchasedByRetirement) {
          changed = true;
          continue;
        }
        const floor = Math.max(prop.purchaseYear, BASE_YEAR);
        const clamped = Math.min(retirementYear, Math.max(floor, year));
        if (clamped !== year) changed = true;
        next[id] = clamped;
      }
      return changed ? next : prev;
    });
  }, [summary.properties, retirementYear]);

  // Per-property sale breakdowns for every sold, already-purchased property.
  // The scenario default method (+ per-property overrides) and tax rate drive
  // every net figure shown across the page.
  const soldBreakdowns = useMemo(
    () =>
      summary.properties
        .filter(p => saleYears[p.instanceId] != null && p.purchasedByRetirement)
        .map(prop => ({
          prop,
          saleYear: saleYears[prop.instanceId],
          // The property's own sale year drives its price, holding period and CGT.
          data: buildSaleBreakdown(prop, profile, saleYears[prop.instanceId], {
            methodOverride: methodOverrides[prop.instanceId],
            taxRatePct,
          }),
        })),
    [summary.properties, saleYears, profile, methodOverrides, taxRatePct],
  );

  if (summary.properties.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[#A4A7AE]">
        Add properties to see the retirement scenario
      </p>
    );
  }

  // Net-of-tax-and-costs aggregates from the per-property breakdowns (honest
  // headline - cash in hand is what actually lands, not gross equity).
  const netCashInHand = soldBreakdowns.reduce((s, b) => s + b.data.netCashReleased, 0);
  const grossCashReleased = soldBreakdowns.reduce((s, b) => s + b.data.cashBeforeTax, 0);
  const taxAndCosts = soldBreakdowns.reduce((s, b) => s + b.data.sellingCosts + b.data.activeCgt, 0);
  const cashBeforeById = new Map(soldBreakdowns.map(b => [b.prop.instanceId, b.data.cashBeforeTax]));

  // Global "Prop N" numbering (existing first, then future) - stable across the
  // owned column, the sold column and the tax table.
  const numberById = new Map(summary.properties.map((p, i) => [p.instanceId, i + 1]));

  const purchasedProps = summary.properties.filter(p => p.purchasedByRetirement);
  const upcomingProps = summary.properties.filter(p => !p.purchasedByRetirement);
  const heldProps = purchasedProps.filter(p => saleYears[p.instanceId] == null);
  const soldProps = purchasedProps.filter(p => saleYears[p.instanceId] != null);

  const purchasedCount = purchasedProps.length;
  const soldCount = soldProps.length;
  const heldCount = heldProps.length;

  const fillPct = ((years - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  return (
    <div className="space-y-6" style={{ fontFamily: INTER }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#181D27]">Retirement scenario</h2>
          <p className="mt-1 text-[13px] text-[#717680]">
            Pick a year, then choose which properties are sold and which stay owned
          </p>
        </div>

        {/* "Retire in [slider] {year}" pill */}
        <div className="flex items-center gap-3 rounded-xl border border-[#E9EAEB] bg-white px-4 py-2.5 shadow-xs">
          <span className="whitespace-nowrap text-[13px] font-medium text-[#535862]">Retire in</span>
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            className="ret-slider"
            style={{
              width: 132,
              height: 4,
              appearance: 'none',
              WebkitAppearance: 'none',
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
              background: `linear-gradient(to right, ${BRAND} 0%, ${BRAND} ${fillPct}%, #E5E5E5 ${fillPct}%, #E5E5E5 100%)`,
            }}
          />
          <span className="w-[42px] text-right text-[16px] font-semibold tabular-nums text-[#181D27]">
            {retirementYear}
          </span>
        </div>
      </div>

      {/* ── Hero summary card ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E9EAEB] bg-white p-6">
        <p className="max-w-3xl text-[17px] leading-[1.7] text-[#414651]">
          Retiring in <span className="font-semibold text-[#181D27]">{retirementYear}</span>, selling{' '}
          <span className="font-semibold text-[#181D27]">{soldCount}</span> of{' '}
          <span className="font-semibold text-[#181D27]">{purchasedCount}</span> properties, your client ends up with{' '}
          <span className="font-bold" style={{ fontSize: 26, color: BRAND }}>{fmt(netCashInHand)}</span>{' '}
          cash in the bank after tax and costs
        </p>

        <div className="mt-5 grid grid-cols-3 gap-6 border-t border-[#F2F2F4] pt-5">
          {/* Portfolio income - green when self-funding, red when a top-up is needed. */}
          <div>
            <span className="flex items-center text-[11px] font-semibold uppercase tracking-wide text-[#717680]">
              Portfolio income
              <InfoPopover title={PAGE_EXPLAINERS.annualCashflow.title} body={PAGE_EXPLAINERS.annualCashflow.body} />
            </span>
            <div className="mt-1.5">
              <span
                className="text-[22px] font-semibold tracking-[-0.02em]"
                style={{ color: summary.annualCashflow >= 0 ? GREEN : RED }}
              >
                {summary.annualCashflow >= 0 ? '+' : ''}{fmt(summary.annualCashflow)}
              </span>
              <span className="ml-1 text-[13px] text-[#A4A7AE]">/yr</span>
            </div>
            <span className="mt-0.5 block text-[12px]" style={{ color: summary.annualCashflow >= 0 ? GREEN : RED }}>
              {summary.annualCashflow >= 0
                ? 'Self-funding'
                : `Costs ${fmt(Math.abs(summary.annualCashflow))}/yr to hold`}
            </span>
          </div>

          {/* Equity kept - value less loan across held properties. */}
          <div>
            <span className="flex items-center text-[11px] font-semibold uppercase tracking-wide text-[#717680]">
              Equity kept
              <InfoPopover title={PAGE_EXPLAINERS.equityRetained.title} body={PAGE_EXPLAINERS.equityRetained.body} />
            </span>
            <div className="mt-1.5">
              <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#181D27]">
                {fmt(summary.totalEquity)}
              </span>
            </div>
            <span className="mt-0.5 block text-[12px] text-[#717680]">
              in {heldCount} propert{heldCount === 1 ? 'y' : 'ies'}
            </span>
          </div>

          {/* Debt remaining - loan still owed on held properties. */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#717680]">Debt remaining</span>
            <div className="mt-1.5">
              <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#181D27]">
                {fmt(summary.debtRemaining)}
              </span>
            </div>
            <span className="mt-0.5 block text-[12px] text-[#717680]">on held properties</span>
          </div>
        </div>
      </div>

      {/* ── Owned / Sold split ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        {/* Properties owned */}
        <section className="flex flex-col">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: BRAND }} />
            <span className="text-[14px] font-semibold text-[#181D27]">Properties owned</span>
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[12px] font-semibold"
              style={{ backgroundColor: 'rgba(127, 86, 217, 0.10)', color: BRAND }}
            >
              {heldCount} of {purchasedCount}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5">
            {heldProps.length === 0 && upcomingProps.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#D5D7DA] bg-white/60 px-4 py-10 text-center text-[13px] text-[#A4A7AE]">
                Every property is sold in this scenario
              </div>
            ) : (
              <>
                {heldProps.map(prop => {
                  const tag = strategyTag(prop);
                  return (
                    <div
                      key={prop.instanceId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#E9EAEB] bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#181D27]">
                            Prop {numberById.get(prop.instanceId)}
                          </span>
                          {prop.isExisting ? (
                            <span className="rounded-full bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#717680]">Owned</span>
                          ) : (
                            tag && <span className="text-[11px] font-medium text-[#717680]">{tag}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-[17px] font-semibold tracking-[-0.02em] text-[#181D27]">
                            {fmt(Math.max(0, prop.futureEquity))}
                          </span>
                          <span className="text-[12px] text-[#717680]">equity</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSold(prop.instanceId)}
                        className="flex-shrink-0 rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors hover:bg-[rgba(127,86,217,0.06)]"
                        style={{ backgroundColor: '#FFFFFF', border: `1px solid rgba(127, 86, 217, 0.50)`, color: BRAND }}
                      >
                        Sell
                      </button>
                    </div>
                  );
                })}

                {/* Upcoming (not yet purchased at the retirement year) - faded. */}
                {upcomingProps.map(prop => (
                  <div
                    key={prop.instanceId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#E9EAEB] bg-white/50 px-4 py-2.5 opacity-70"
                  >
                    <span className="text-[13px] font-semibold text-[#A4A7AE]">
                      Prop {numberById.get(prop.instanceId)}
                    </span>
                    <span className="text-[12px] text-[#A4A7AE]">Not yet purchased · Buys {prop.purchaseYear}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between px-1 pt-3 border-t border-[#E9EAEB]">
            <span className="text-[13px] text-[#535862]">Equity kept</span>
            <span className="text-[15px] font-semibold text-[#181D27]">{fmt(summary.totalEquity)}</span>
          </div>
        </section>

        {/* Properties sold */}
        <section className="flex flex-col">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: GREEN }} />
            <span className="text-[14px] font-semibold text-[#181D27]">Properties sold</span>
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[12px] font-semibold"
              style={{ backgroundColor: 'rgba(6, 118, 71, 0.10)', color: GREEN }}
            >
              {soldCount} of {purchasedCount}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5">
            {soldProps.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#C7E3D6] bg-white/60 px-4 py-10 text-center text-[13px] text-[#8A9E93]">
                No sales yet - click <span className="mx-1 font-semibold" style={{ color: BRAND }}>Sell</span> on a property to cash it out
              </div>
            ) : (
              soldProps.map(prop => {
                const tag = strategyTag(prop);
                const gross = cashBeforeById.get(prop.instanceId) ?? 0;
                const saleYear = saleYears[prop.instanceId] ?? retirementYear;
                const floorYear = Math.max(prop.purchaseYear, BASE_YEAR);
                const yearOptions: number[] = [];
                for (let y = floorYear; y <= retirementYear; y++) yearOptions.push(y);
                return (
                  <div
                    key={prop.instanceId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E9EAEB] bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#181D27]">
                          Prop {numberById.get(prop.instanceId)}
                        </span>
                        {prop.isExisting ? (
                          <span className="rounded-full bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#717680]">Owned</span>
                        ) : (
                          tag && <span className="text-[11px] font-medium text-[#717680]">{tag}</span>
                        )}
                      </div>
                      {/* Value + sale year on one row so sold cards align with owned cards. */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[17px] font-semibold tracking-[-0.02em]" style={{ color: GREEN }}>
                            {fmt(gross)}
                          </span>
                          <span className="text-[12px] text-[#717680]">before tax</span>
                        </div>
                        {/* Per-property sale year - locks this property's price to the chosen year. */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11.5px] text-[#717680]">· Sold in</span>
                          <div className="relative inline-flex items-center">
                            <select
                              value={saleYear}
                              onChange={e => setSaleYear(prop.instanceId, Number(e.target.value))}
                              disabled={yearOptions.length <= 1}
                              className="appearance-none rounded-md border border-[#D5D7DA] bg-white py-0.5 pl-2 pr-6 text-[11.5px] font-semibold text-[#181D27] outline-none transition-colors hover:border-[#B8BCC4] focus:border-[#7F56D9] disabled:cursor-default disabled:opacity-70"
                              style={{ cursor: yearOptions.length <= 1 ? 'default' : 'pointer' }}
                            >
                              {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-1.5 text-[#717680]" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSold(prop.instanceId)}
                      className="flex-shrink-0 rounded-lg border border-[#D5D7DA] bg-white px-4 py-1.5 text-[13px] font-semibold text-[#535862] transition-colors hover:bg-[#F9FAFB]"
                    >
                      Keep
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center justify-between px-1 pt-3 border-t border-[#E9EAEB]">
            <span className="text-[13px] text-[#535862]">Cash released, before tax</span>
            <span className="text-[15px] font-semibold" style={{ color: GREEN }}>{fmt(grossCashReleased)}</span>
          </div>
        </section>
      </div>

      {/* ── Tax and sale details ─────────────────────────────────────────── */}
      {soldBreakdowns.length > 0 && (
        <SaleBreakdownSection
          breakdowns={soldBreakdowns}
          numberById={numberById}
          saleYearById={new Map(Object.entries(saleYears))}
          onCycleMethod={cycleMethod}
          taxRatePct={taxRatePct}
          onTaxRate={setTaxRatePct}
          totalTaxAndCosts={taxAndCosts}
          open={taxDetailsOpen}
          onToggle={() => setTaxDetailsOpen(o => !o)}
        />
      )}

      {/* ── Negative-cashflow note ───────────────────────────────────────── */}
      {summary.annualCashflow < 0 && soldCount < purchasedCount && (
        <p className="text-[13px] text-[#535862]">
          Negative cashflow of {fmt(summary.annualCashflow)}/yr - top-up from other income required to hold this portfolio through retirement.
        </p>
      )}

      {/* Slider thumb - matches the dashboard's Portfolio Cashflow slider */}
      <style>{`
        .ret-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2.5px solid ${BRAND};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .ret-slider::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2.5px solid ${BRAND};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
};
