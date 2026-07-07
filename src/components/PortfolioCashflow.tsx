import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Customized,
  ResponsiveContainer,
} from 'recharts';
import { usePortfolioProjection, type YearCashflowSnapshot, type PropertyCashflowEntry } from '../hooks/usePortfolioProjection';

// ── UUI Design Tokens (matched to PropertyRoadmapChart) ──────────────────
const UUI = {
  brand600: '#7C3AED',
  brand200: 'rgba(127, 86, 217, 0.25)',
  neutral900: '#181D27',
  neutral700: '#414651',
  neutral500: '#717680',
  neutral300: '#D5D7DA',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  muted: '#C4C4CC',        // pre-purchase rows + scrubber track/fill (axis, not data)
  white: '#FFFFFF',
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const ROW_HEIGHT = 54;
const BAR_H = 3;

const fmt = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
};

const fmtNet = (v: number) => `${v < 0 ? '-' : v > 0 ? '+' : ''}${fmt(v)}`;

export const PortfolioCashflow: React.FC = () => {
  const { portfolioCashflow: data } = usePortfolioProjection();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const dummyData = useMemo(() => [{ v: 0 }], []);

  useEffect(() => {
    if (data) setSelectedYear(data.lastPurchaseYear);
  }, [data?.lastPurchaseYear]);

  const snapshot: YearCashflowSnapshot = useMemo(() => {
    if (!data || selectedYear === null) {
      return { year: 0, properties: [], totalIn: 0, totalOut: 0, netAnnual: 0, netMonthly: 0 };
    }
    return data.snapshots.get(selectedYear) || {
      year: selectedYear,
      properties: [],
      totalIn: 0,
      totalOut: 0,
      netAnnual: 0,
      netMonthly: 0,
    };
  }, [data, selectedYear]);

  const maxBar = Math.max(
    ...snapshot.properties.map(p => Math.max(p.grossIncome, p.totalOutgoings)),
    1,
  );

  // Full, stable property list (union across all years) so every row is always
  // present — rows stay muted until their purchase year, then fill in (§3.7).
  const allProperties = useMemo(() => {
    if (!data) return [] as { instanceId: string; title: string; purchaseYear: number }[];
    const byId = new Map<string, { instanceId: string; title: string; purchaseYear: number }>();
    for (const snap of data.snapshots.values()) {
      for (const p of snap.properties) {
        if (!byId.has(p.instanceId)) {
          byId.set(p.instanceId, { instanceId: p.instanceId, title: p.title, purchaseYear: p.purchaseYear });
        }
      }
    }
    return [...byId.values()].sort((a, b) => a.purchaseYear - b.purchaseYear || a.title.localeCompare(b.title));
  }, [data]);

  // Live entries for the selected year, keyed by property (present ⇒ owned).
  const activeById = useMemo(() => {
    const m = new Map<string, PropertyCashflowEntry>();
    snapshot.properties.forEach(p => m.set(p.instanceId, p));
    return m;
  }, [snapshot]);

  const chartHeight = Math.max(allProperties.length * ROW_HEIGHT + 8, 48);

  // Customized renderer — draws icons, bars, labels inside the Recharts coordinate system
  const CashflowBars = useCallback((props: any) => {
    const { offset } = props;
    if (!offset) return null;

    const plotLeft = offset.left ?? 16;
    const plotWidth = offset.width ?? 600;
    const plotTop = offset.top ?? 0;

    // Layout zones: name/net header row, then paired In / Out bars (no LHS icon)
    const labelX = plotLeft + 2;                 // "In" / "Out" text start
    const barStartX = plotLeft + 26;             // bars start after the In/Out label
    const valueW = 46;                           // right-aligned bar value
    const valueRightX = plotLeft + plotWidth;
    const barTrackW = Math.max(40, plotWidth - 26 - valueW - 6);

    return (
      <g>
        {allProperties.map((prop, idx) => {
          const entry = activeById.get(prop.instanceId);
          const active = !!entry;                       // owned by the selected year
          const rowY = plotTop + idx * ROW_HEIGHT;
          const headerY = rowY + 11;
          const inY = rowY + 31;
          const outY = rowY + 45;

          const nameFill = active ? UUI.neutral900 : UUI.muted;
          const labelFill = active ? UUI.neutral500 : UUI.muted;

          const inW = active ? Math.max((entry!.grossIncome / maxBar) * barTrackW, 2) : 0;
          const outW = active ? Math.max((entry!.totalOutgoings / maxBar) * barTrackW, 2) : 0;

          return (
            <g key={prop.instanceId}>
              {/* Header — property name + net/yr (muted with — before purchase) */}
              <text
                x={labelX} y={headerY} fontSize={12} fontWeight={600}
                fill={nameFill} dominantBaseline="central" fontFamily={UUI.fontFamily}
              >
                {`P${idx + 1} ${prop.title}`}
              </text>
              <text
                x={valueRightX} y={headerY} fontSize={12} fontWeight={600}
                fill={active ? UUI.neutral700 : UUI.muted} textAnchor="end" dominantBaseline="central" fontFamily={UUI.fontFamily}
              >
                {active ? `${fmtNet(entry!.netCashflow)}/yr` : '—'}
              </text>

              {/* In — violet fill on a track */}
              <text x={labelX} y={inY} fontSize={10} fill={labelFill} dominantBaseline="central" fontFamily={UUI.fontFamily}>In</text>
              <rect x={barStartX} y={inY - BAR_H / 2} width={barTrackW} height={BAR_H} rx={1.5} fill="#F2F2F3" />
              {active && <rect x={barStartX} y={inY - BAR_H / 2} width={inW} height={BAR_H} rx={1.5} fill="#8B5CF6" />}
              <text x={valueRightX} y={inY} fontSize={11} fill={labelFill} textAnchor="end" dominantBaseline="central" fontFamily={UUI.fontFamily}>{active ? fmt(entry!.grossIncome) : '—'}</text>

              {/* Out — light-violet fill on a track */}
              <text x={labelX} y={outY} fontSize={10} fill={labelFill} dominantBaseline="central" fontFamily={UUI.fontFamily}>Out</text>
              <rect x={barStartX} y={outY - BAR_H / 2} width={barTrackW} height={BAR_H} rx={1.5} fill="#F2F2F3" />
              {active && <rect x={barStartX} y={outY - BAR_H / 2} width={outW} height={BAR_H} rx={1.5} fill="#D9D2F2" />}
              <text x={valueRightX} y={outY} fontSize={11} fill={labelFill} textAnchor="end" dominantBaseline="central" fontFamily={UUI.fontFamily}>{active ? fmt(entry!.totalOutgoings) : '—'}</text>
            </g>
          );
        })}
      </g>
    );
  }, [allProperties, activeById, maxBar]);

  if (!data || selectedYear === null) {
    return (
      <p
        className="text-sm text-neutral-400 py-8 text-center"
        style={{ fontFamily: UUI.fontFamily }}
      >
        Add properties to see portfolio cashflow
      </p>
    );
  }

  const [minYear, maxYear] = data.yearRange;

  return (
    <div style={{ fontFamily: UUI.fontFamily, padding: '0 16px' }}>
      {/* ── KPI headline — matches Dashboard pattern ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-semibold"
            style={{ fontFamily: 'Inter, system-ui, sans-serif', color: UUI.neutral900 }}
          >
            {fmtNet(snapshot.netMonthly)}
          </span>
          <span className="text-sm" style={{ color: UUI.neutral500 }}>
            /mo net in {selectedYear}
          </span>
        </div>
        <div style={{ textAlign: 'right', lineHeight: '18px' }}>
          <span style={{ fontSize: 12, color: UUI.neutral500 }}>
            IN{' '}
            <span style={{ fontWeight: 600, color: UUI.neutral700 }}>{fmt(snapshot.totalIn)}</span>
          </span>
          <br />
          <span style={{ fontSize: 12, color: UUI.neutral500 }}>
            OUT{' '}
            <span style={{ fontWeight: 600, color: UUI.neutral700 }}>{fmt(snapshot.totalOut)}</span>
          </span>
        </div>
      </div>

      {/* ── Year slider ── */}
      <YearSlider
        min={minYear}
        max={maxYear}
        value={selectedYear}
        purchaseYears={data.purchaseYears}
        onChange={setSelectedYear}
      />

      {/* ── Chart — Recharts frame with custom SVG content ── */}
      <div style={{ marginTop: 8 }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart
            data={dummyData}
            margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke={UUI.neutral100}
              strokeOpacity={0.8}
              vertical={false}
            />
            <XAxis hide type="number" dataKey="v" domain={[0, 1]} />
            <YAxis hide type="number" domain={[0, chartHeight]} />
            <Customized component={CashflowBars} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ── Year Slider ─────────────────────────────────────────────────────────── */

interface YearSliderProps {
  min: number;
  max: number;
  value: number;
  purchaseYears: number[];
  onChange: (year: number) => void;
}

const YearSlider: React.FC<YearSliderProps> = ({ min, max, value, purchaseYears, onChange }) => {
  const range = max - min || 1;
  const fillPct = ((value - min) / range) * 100;

  const tickYears = useMemo(() => {
    const ticks: number[] = [];
    for (let y = min; y <= max; y++) ticks.push(y);
    if (ticks.length > 12) {
      const step = Math.ceil(ticks.length / 8);
      return ticks.filter((_, i) => i === 0 || i === ticks.length - 1 || i % step === 0);
    }
    return ticks;
  }, [min, max]);

  return (
    <div>
      <div style={{ position: 'relative', paddingTop: 22, paddingBottom: 2 }}>
        {purchaseYears.map(py => {
          const pct = ((py - min) / range) * 100;
          return (
            <React.Fragment key={py}>
              {/* purchase year label above the pin (§3.7) */}
              <span
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#414651',
                  fontFamily: UUI.fontFamily,
                  whiteSpace: 'nowrap',
                  zIndex: 2,
                }}
              >
                {py}
              </span>
              {/* purchase pin (violet = reached, grey = future) */}
              <div
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 14,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: py <= value ? UUI.brand600 : UUI.muted,
                  border: `2px solid ${UUI.white}`,
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                }}
              />
            </React.Fragment>
          );
        })}

        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 4,
            appearance: 'none',
            WebkitAppearance: 'none',
            background: `linear-gradient(to right, ${UUI.muted} 0%, ${UUI.muted} ${fillPct}%, ${UUI.neutral200} ${fillPct}%, ${UUI.neutral200} 100%)`,
            borderRadius: 2,
            outline: 'none',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 3,
          }}
          className="pcf-slider"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {tickYears.map(y => (
            <span
              key={y}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: UUI.neutral500,
                fontFamily: UUI.fontFamily,
              }}
            >
              {y}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .pcf-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: ${UUI.white};
          border: 2.5px solid ${UUI.brand600};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .pcf-slider::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: ${UUI.white};
          border: 2.5px solid ${UUI.brand600};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
};
