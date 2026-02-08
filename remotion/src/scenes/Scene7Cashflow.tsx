import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { SceneLabel } from "../components/SceneLabel";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Cashflow data matching client-view CashflowChart placeholder
const YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040];
const CASHFLOWS = [-32497, -28000, -22000, -15000, -8000, 2000, 12000, 18000, 25000, 32000, 38000, 45000, 52000, 60000, 70000, 80000];

// Chart dimensions
const CHART_W = 1000;
const CHART_H = 200;
const PAD_L = 80;
const PAD_R = 20;
const PAD_T = 15;
const PAD_B = 28;

const MAX_VAL = 90000;
const MIN_VAL = -40000;
const RANGE = MAX_VAL - MIN_VAL;

const BAND_W = (CHART_W - PAD_L - PAD_R) / YEARS.length;
const getX = (i: number) => Math.round(PAD_L + (i + 0.5) * BAND_W);
const getY = (val: number) => Math.round(PAD_T + (1 - (val - MIN_VAL) / RANGE) * (CHART_H - PAD_T - PAD_B));
const getBarH = (val: number) => Math.round(Math.abs(val) / RANGE * (CHART_H - PAD_T - PAD_B));
const zeroY = getY(0);

// Softer colors matching client-view
const POSITIVE_COLOR = "#a7dfc4";
const NEGATIVE_COLOR = "#f5c4c4";

// AffordabilityBreakdownTable-style data for cashflow
const TABLE_DATA = [
  { year: 2025, portfolio: "$1.05M", equity: "$158K", funds: "$42K", cashflow: "-$32K", lvr: "85%", rental: "80%", decision: "PURCHASED" },
  { year: 2027, portfolio: "$1.20M", equity: "$280K", funds: "$68K", cashflow: "-$22K", lvr: "77%", rental: "80%", decision: "PURCHASED" },
  { year: 2029, portfolio: "$1.50M", equity: "$500K", funds: "$95K", cashflow: "-$8K", lvr: "67%", rental: "80%", decision: "PURCHASED" },
  { year: 2030, portfolio: "$1.70M", equity: "$650K", funds: "$110K", cashflow: "+$2K", lvr: "62%", rental: "80%", decision: "Break-even" },
  { year: 2034, portfolio: "$3.05M", equity: "$1.28M", funds: "$180K", cashflow: "+$32K", lvr: "58%", rental: "80%", decision: "PURCHASED" },
  { year: 2037, portfolio: "$4.55M", equity: "$2.05M", funds: "$250K", cashflow: "+$52K", lvr: "55%", rental: "80%", decision: "-" },
  { year: 2040, portfolio: "$6.50M", equity: "$3.25M", funds: "$340K", cashflow: "+$80K", lvr: "50%", rental: "80%", decision: "-" },
];

const COLUMNS = [
  { label: "Year", flex: 0.7 },
  { label: "Portfolio Value", flex: 1.2 },
  { label: "Equity", flex: 1 },
  { label: "Available Funds", flex: 1 },
  { label: "Net Cashflow", flex: 1 },
  { label: "Portfolio LVR", flex: 0.9 },
  { label: "Decision", flex: 0.9 },
];

export const Scene7Cashflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tableSpring = spring({ frame, fps, delay: 55, config: { damping: 200 } });

  // Grid tick values
  const gridValues = [-40000, -20000, 0, 20000, 40000, 60000, 80000];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        fontFamily: interFont,
        padding: "30px 80px",
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Cashflow Analysis</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: POSITIVE_COLOR }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Positive</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: NEGATIVE_COLOR }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Negative</span>
          </div>
        </div>
      </div>

      {/* Chart - bar chart matching client-view CashflowChart */}
      <div style={{ position: "relative", marginBottom: 16, backgroundColor: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "8px 4px" }}>
        <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ shapeRendering: "crispEdges" }}>
          {/* Horizontal grid */}
          {gridValues.map((v) => (
            <React.Fragment key={v}>
              <line x1={PAD_L} y1={getY(v)} x2={CHART_W - PAD_R} y2={getY(v)} stroke="rgba(148,163,184,0.2)" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={PAD_L - 8} y={getY(v) + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily={interFont} textRendering="geometricPrecision">
                {v === 0 ? "$0" : `${v > 0 ? "" : "-"}$${Math.abs(v / 1000)}K`}
              </text>
            </React.Fragment>
          ))}

          {/* Break-even reference line */}
          <line x1={PAD_L} y1={zeroY} x2={CHART_W - PAD_R} y2={zeroY} stroke="#b8c5d3" strokeWidth={1} strokeDasharray="3 3" shapeRendering="crispEdges" />
          <text x={PAD_L + 8} y={zeroY - 5} fontSize={9} fill="#b8c5d3" fontWeight={500} fontFamily={interFont} textRendering="geometricPrecision">Break-even</text>

          {/* X-axis labels */}
          {YEARS.filter((_, i) => i % 3 === 0).map((year) => (
            <text key={year} x={getX(YEARS.indexOf(year))} y={CHART_H - 5} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily={interFont} textRendering="geometricPrecision">
              {year}
            </text>
          ))}

          {/* Bars */}
          {YEARS.map((year, i) => {
            const barDelay = 8 + i * 3;
            const barProgress = interpolate(frame, [barDelay, barDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cf = CASHFLOWS[i];
            const isPositive = cf >= 0;
            const barH = getBarH(cf) * barProgress;
            const barWidth = 24;
            const x = getX(i) - barWidth / 2;
            const y = isPositive ? zeroY - barH : zeroY;

            return (
              <rect
                key={year}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={isPositive ? POSITIVE_COLOR : NEGATIVE_COLOR}
              />
            );
          })}
        </svg>

        {/* Break-even and final callout */}
        <div style={{ position: "absolute", top: 8, right: 20, textAlign: "right", opacity: interpolate(frame, [55, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Break-even: <span style={{ fontWeight: 600, color: "#0f172a" }}>2030</span></div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Final: <span style={{ fontWeight: 600, color: "#16a34a" }}>+$80K/yr</span></div>
        </div>
      </div>

      {/* AffordabilityBreakdownTable-style table */}
      <div
        style={{
          opacity: tableSpring,
          transform: `translateY(${interpolate(tableSpring, [0, 1], [12, 0])}px)`,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        <div style={{ display: "flex", backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb", padding: "8px 14px" }}>
          {COLUMNS.map((col) => (
            <div key={col.label} style={{ flex: col.flex, fontSize: 10, fontWeight: 600, color: "#374151" }}>
              {col.label}
            </div>
          ))}
        </div>

        {TABLE_DATA.map((row, i) => {
          const rowDelay = 60 + i * 6;
          const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isPurchased = row.decision === "PURCHASED";
          const isBreakEven = row.decision === "Break-even";
          return (
            <div
              key={row.year}
              style={{
                display: "flex",
                padding: "6px 14px",
                borderBottom: i < TABLE_DATA.length - 1 ? "1px solid #f3f4f6" : "none",
                opacity: rowOpacity,
                backgroundColor: isPurchased ? "rgba(240, 253, 244, 0.3)" : isBreakEven ? "rgba(254, 249, 195, 0.3)" : "white",
              }}
            >
              <div style={{ flex: 0.7, fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{row.year}</div>
              <div style={{ flex: 1.2, fontSize: 11, fontWeight: 500, color: "#334155" }}>{row.portfolio}</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 500, color: "#334155" }}>{row.equity}</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 500, color: "#334155" }}>{row.funds}</div>
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: row.cashflow.startsWith("+") ? "#16a34a" : "#ef4444" }}>{row.cashflow}</div>
              <div style={{ flex: 0.9, fontSize: 11, fontWeight: 500, color: "#64748b" }}>{row.lvr}</div>
              <div style={{ flex: 0.9 }}>
                {isPurchased ? (
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#16a34a", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: 10 }}>
                    PURCHASED
                  </span>
                ) : isBreakEven ? (
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#92400e", backgroundColor: "#fef3c7", padding: "2px 8px", borderRadius: 10 }}>
                    💚 Break-even
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SceneLabel text="See when you become cashflow positive" delay={20} style={{ bottom: 12 }} />
    </AbsoluteFill>
  );
};
