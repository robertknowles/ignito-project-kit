import React, { useState, useMemo, useEffect } from 'react';
import { usePortfolioCashflow } from '../hooks/usePortfolioCashflow';
import type { YearCashflowSnapshot } from '../hooks/usePortfolioCashflow';

// ── UUI Design Tokens (matched to PropertyRoadmapChart / CashflowChart) ───
const UUI = {
  brand600: '#7F56D9',
  brand200: 'rgba(127, 86, 217, 0.25)',
  neutral900: '#171717',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral300: '#D4D4D4',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  white: '#FFFFFF',
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

// Bar height matched to PropertyRoadmapChart segments (barH = 3)
const BAR_HEIGHT = 3;

const fmt = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
};

const fmtNet = (v: number) => `${v < 0 ? '-' : v > 0 ? '+' : ''}${fmt(v)}`;

export const PortfolioCashflow: React.FC = () => {
  const data = usePortfolioCashflow();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    if (data) setSelectedYear(data.lastPurchaseYear);
  }, [data?.lastPurchaseYear]);

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
  const snapshot: YearCashflowSnapshot = data.snapshots.get(selectedYear) || {
    year: selectedYear,
    properties: [],
    totalIn: 0,
    totalOut: 0,
    netAnnual: 0,
    netMonthly: 0,
  };

  const maxBar = Math.max(
    ...snapshot.properties.map(p => Math.max(p.grossIncome, p.totalOutgoings)),
    1,
  );

  return (
    <div style={{ fontFamily: UUI.fontFamily, padding: '0 16px' }}>
      {/* ── KPI headline — matches Dashboard "Total Equity" / "Net Cashflow" pattern ── */}
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
            IN {' '}
            <span style={{ fontWeight: 600, color: UUI.neutral700 }}>{fmt(snapshot.totalIn)}</span>
          </span>
          <br />
          <span style={{ fontSize: 12, color: UUI.neutral500 }}>
            OUT {' '}
            <span style={{ fontWeight: 600, color: UUI.neutral700 }}>{fmt(snapshot.totalOut)}</span>
          </span>
        </div>
      </div>

      {/* ── Year slider ───────────────────────────────────────────────── */}
      <YearSlider
        min={minYear}
        max={maxYear}
        value={selectedYear}
        purchaseYears={data.purchaseYears}
        onChange={setSelectedYear}
      />

      {/* ── Property rows ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        {snapshot.properties.map(prop => (
          <PropertyRow key={prop.instanceId} prop={prop} maxBar={maxBar} />
        ))}
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

  // Tick labels — match XAxis style from PropertyRoadmapChart / CashflowChart
  const tickYears = useMemo(() => {
    const ticks: number[] = [];
    for (let y = min; y <= max; y++) ticks.push(y);
    // Thin out if too dense (> 12 ticks)
    if (ticks.length > 12) {
      const step = Math.ceil(ticks.length / 8);
      return ticks.filter((_, i) => i === 0 || i === ticks.length - 1 || i % step === 0);
    }
    return ticks;
  }, [min, max]);

  return (
    <div>
      {/* Slider track */}
      <div style={{ position: 'relative', paddingTop: 8, paddingBottom: 2 }}>
        {/* Purchase year dots */}
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

        {/* Tick labels — matches Recharts XAxis style: 12px, 600 weight, neutral-500 */}
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

/* ── Property Row ────────────────────────────────────────────────────────── */
// Row height 44px to match PropertyRoadmapChart ROW_HEIGHT

interface PropertyRowProps {
  prop: {
    title: string;
    purchaseYear: number;
    color: string;
    grossIncome: number;
    totalOutgoings: number;
    netCashflow: number;
  };
  maxBar: number;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ prop, maxBar }) => {
  const inPct = (prop.grossIncome / maxBar) * 100;
  const outPct = (prop.totalOutgoings / maxBar) * 100;

  return (
    <div style={{ paddingTop: 12, paddingBottom: 12 }}>
      {/* Header: dot + purchase year + title + net value */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: prop.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: UUI.neutral500, fontFamily: UUI.fontFamily }}>
            {prop.purchaseYear} Purchase
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: UUI.neutral700, fontFamily: UUI.fontFamily }}>
          {fmtNet(prop.netCashflow)}/yr
        </span>
      </div>

      {/* IN bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: UUI.neutral500, width: 28, flexShrink: 0, fontFamily: UUI.fontFamily }}>
          IN
        </span>
        <div style={{ flex: 1, height: BAR_HEIGHT, backgroundColor: UUI.neutral100, borderRadius: BAR_HEIGHT / 2 }}>
          <div
            style={{
              width: `${Math.max(inPct, 0.5)}%`,
              height: '100%',
              backgroundColor: UUI.brand600,
              borderRadius: BAR_HEIGHT / 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: UUI.neutral500, width: 40, textAlign: 'right', flexShrink: 0, fontFamily: UUI.fontFamily }}>
          {fmt(prop.grossIncome)}
        </span>
      </div>

      {/* OUT bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: UUI.neutral500, width: 28, flexShrink: 0, fontFamily: UUI.fontFamily }}>
          OUT
        </span>
        <div style={{ flex: 1, height: BAR_HEIGHT, backgroundColor: UUI.neutral100, borderRadius: BAR_HEIGHT / 2 }}>
          <div
            style={{
              width: `${Math.max(outPct, 0.5)}%`,
              height: '100%',
              backgroundColor: UUI.brand200,
              borderRadius: BAR_HEIGHT / 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: UUI.neutral500, width: 40, textAlign: 'right', flexShrink: 0, fontFamily: UUI.fontFamily }}>
          {fmt(prop.totalOutgoings)}
        </span>
      </div>
    </div>
  );
};
