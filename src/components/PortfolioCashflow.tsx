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
import { getPropertyIconPath } from './icons/PropertyIconPaths';

// ── UUI Design Tokens (matched to PropertyRoadmapChart) ──────────────────
const UUI = {
  brand600: '#7C3AED',
  brand200: 'rgba(127, 86, 217, 0.25)',
  neutral900: '#181D27',
  neutral700: '#404040',
  neutral500: '#717680',
  neutral300: '#D4D4D4',
  neutral200: '#E9EAEB',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const ROW_HEIGHT = 44;
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

  const chartHeight = Math.max(snapshot.properties.length * ROW_HEIGHT + 8, 48);

  // Customized renderer — draws icons, bars, labels inside the Recharts coordinate system
  const CashflowBars = useCallback((props: any) => {
    const { offset } = props;
    if (!offset) return null;

    const plotLeft = offset.left ?? 16;
    const plotWidth = offset.width ?? 600;
    const plotTop = offset.top ?? 0;

    // Layout zones within the plot area
    const iconCx = plotLeft + 13;
    const iconSize = 14;
    const bgSize = 26;

    const labelX = plotLeft + bgSize + 6;       // IN / OUT text start
    const barStartX = plotLeft + bgSize + 68;  // bars start after "IN $31k" labels
    const netLabelWidth = 72;                   // right-aligned net value
    const barMaxWidth = plotLeft + plotWidth - barStartX - netLabelWidth - 8;

    return (
      <g>
        {snapshot.properties.map((prop, idx) => {
          const rowY = plotTop + idx * ROW_HEIGHT;
          const centerY = rowY + ROW_HEIGHT / 2;
          const inBarY = centerY - BAR_H - 4;
          const outBarY = centerY + 4;

          const inW = Math.max((prop.grossIncome / maxBar) * barMaxWidth, 2);
          const outW = Math.max((prop.totalOutgoings / maxBar) * barMaxWidth, 2);

          const iconPath = getPropertyIconPath(prop.title);

          return (
            <g key={prop.instanceId}>
              {/* Icon — white circle + stroke path (same as PropertyRoadmapChart) */}
              <circle
                cx={iconCx}
                cy={centerY}
                r={bgSize / 2}
                fill={UUI.white}
                stroke={UUI.neutral200}
                strokeWidth={1}
              />
              <svg
                x={iconCx - iconSize / 2}
                y={centerY - iconSize / 2}
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                style={{ pointerEvents: 'none' }}
              >
                <path
                  d={iconPath}
                  stroke={UUI.neutral700}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* IN label with amount + bar */}
              <text
                x={labelX}
                y={inBarY + BAR_H / 2}
                fontSize={10}
                fontWeight={600}
                fill={UUI.neutral500}
                dominantBaseline="central"
                fontFamily={UUI.fontFamily}
              >
                {`IN ${fmt(prop.grossIncome)}`}
              </text>
              <rect
                x={barStartX}
                y={inBarY}
                width={inW}
                height={BAR_H}
                rx={1.5}
                fill={UUI.brand600}
              />

              {/* OUT label with amount + bar */}
              <text
                x={labelX}
                y={outBarY + BAR_H / 2}
                fontSize={10}
                fontWeight={600}
                fill={UUI.neutral500}
                dominantBaseline="central"
                fontFamily={UUI.fontFamily}
              >
                {`OUT ${fmt(prop.totalOutgoings)}`}
              </text>
              <rect
                x={barStartX}
                y={outBarY}
                width={outW}
                height={BAR_H}
                rx={1.5}
                fill={UUI.brand200}
              />

              {/* Net cashflow — right-aligned */}
              <text
                x={plotLeft + plotWidth}
                y={centerY}
                fontSize={12}
                fontWeight={600}
                fill={UUI.neutral700}
                textAnchor="end"
                dominantBaseline="central"
                fontFamily={UUI.fontFamily}
              >
                {fmtNet(prop.netCashflow)}/yr
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [snapshot.properties, maxBar]);

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
      <div style={{ position: 'relative', paddingTop: 8, paddingBottom: 2 }}>
        {purchaseYears.map(py => {
          const pct = ((py - min) / range) * 100;
          return (
            <div
              key={py}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: 3,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: py <= value ? UUI.brand600 : UUI.neutral300,
                border: `2px solid ${UUI.white}`,
                transform: 'translateX(-50%)',
                zIndex: 2,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
              }}
            />
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
            background: `linear-gradient(to right, ${UUI.brand600} 0%, ${UUI.brand600} ${fillPct}%, ${UUI.neutral200} ${fillPct}%, ${UUI.neutral200} 100%)`,
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
