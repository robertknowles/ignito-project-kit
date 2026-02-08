import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { SceneLabel } from "../components/SceneLabel";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Data for the line chart (matching PortfolioChart placeholder data)
const YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040];
const PORTFOLIO_VALUES = [1050, 1100, 1200, 1350, 1500, 1700, 2000, 2300, 2650, 3050, 3500, 4000, 4550, 5150, 5800, 6500]; // $K
const EQUITY_VALUES = [158, 200, 280, 380, 500, 650, 800, 950, 1100, 1280, 1500, 1750, 2050, 2400, 2800, 3250]; // $K

// Chart dimensions
const CHART_W = 1000;
const CHART_H = 200;
const PAD_L = 50;
const PAD_R = 20;
const PAD_T = 10;
const PAD_B = 28;

const maxVal = 7000;
const getX = (i: number) => PAD_L + (i / (YEARS.length - 1)) * (CHART_W - PAD_L - PAD_R);
const getY = (val: number) => PAD_T + (1 - val / maxVal) * (CHART_H - PAD_T - PAD_B);

const makePath = (values: number[]): string =>
  values.map((v, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(" ");

const makeAreaPath = (values: number[]): string => {
  const linePath = makePath(values);
  const lastX = getX(values.length - 1);
  const firstX = getX(0);
  const baseY = CHART_H - PAD_B;
  return `${linePath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
};

// AffordabilityBreakdownTable-style data
const TABLE_DATA = [
  { year: 2025, portfolio: "$1.05M", equity: "$158K", funds: "$42K", cashflow: "-$32K", lvr: "85%", decision: "PURCHASED", status: "green" },
  { year: 2027, portfolio: "$1.20M", equity: "$280K", funds: "$68K", cashflow: "-$22K", lvr: "77%", decision: "PURCHASED", status: "green" },
  { year: 2029, portfolio: "$1.50M", equity: "$500K", funds: "$95K", cashflow: "-$8K", lvr: "67%", decision: "PURCHASED", status: "green" },
  { year: 2031, portfolio: "$2.00M", equity: "$800K", funds: "$130K", cashflow: "+$12K", lvr: "60%", decision: "PURCHASED", status: "green" },
  { year: 2034, portfolio: "$3.05M", equity: "$1.28M", funds: "$180K", cashflow: "+$32K", lvr: "58%", decision: "PURCHASED", status: "green" },
  { year: 2037, portfolio: "$4.55M", equity: "$2.05M", funds: "$250K", cashflow: "+$52K", lvr: "55%", decision: "-", status: "gray" },
  { year: 2040, portfolio: "$6.50M", equity: "$3.25M", funds: "$340K", cashflow: "+$80K", lvr: "50%", decision: "-", status: "gray" },
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

export const Scene6Portfolio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineProgress = interpolate(frame, [10, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const portfolioPath = makePath(PORTFOLIO_VALUES);
  const equityPath = makePath(EQUITY_VALUES);
  const portfolioArea = makeAreaPath(PORTFOLIO_VALUES);
  const equityArea = makeAreaPath(EQUITY_VALUES);
  const pathLength = 2000;
  const dashOffset = (1 - lineProgress) * pathLength;

  const tableSpring = spring({ frame, fps, delay: 55, config: { damping: 200 } });

  const gridValues = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];

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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Portfolio Value & Equity Growth</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#7dd3c2" }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Portfolio Value</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#b8c5d3" }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Equity</span>
          </div>
        </div>
      </div>

      {/* Chart - area chart matching client-view PortfolioChart */}
      <div style={{ position: "relative", marginBottom: 16, backgroundColor: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "8px 4px" }}>
        <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          <defs>
            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7dd3c2" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#7dd3c2" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b8c5d3" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#b8c5d3" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {gridValues.map((v) => (
            <line key={v} x1={PAD_L} y1={getY(v)} x2={CHART_W - PAD_R} y2={getY(v)} stroke="rgba(148,163,184,0.2)" strokeWidth={1} />
          ))}

          {/* Y-axis labels */}
          {gridValues.filter((_, i) => i % 2 === 0).map((v) => (
            <text key={v} x={PAD_L - 8} y={getY(v) + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily={interFont}>
              {v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}M`}
            </text>
          ))}

          {/* X-axis labels */}
          {YEARS.filter((_, i) => i % 3 === 0).map((year, i) => (
            <text key={year} x={getX(YEARS.indexOf(year))} y={CHART_H - 5} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily={interFont}>
              {year}
            </text>
          ))}

          {/* Area fills */}
          <path d={portfolioArea} fill="url(#portfolioGrad)" opacity={lineProgress} />
          <path d={equityArea} fill="url(#equityGrad)" opacity={lineProgress} />

          {/* Lines */}
          <path d={portfolioPath} fill="none" stroke="#4db6a0" strokeWidth={2} strokeLinecap="round" strokeDasharray={pathLength} strokeDashoffset={dashOffset} />
          <path d={equityPath} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" strokeDasharray={pathLength} strokeDashoffset={dashOffset} />
        </svg>

        {/* Final values */}
        <div style={{ position: "absolute", top: 12, right: 20, textAlign: "right", opacity: interpolate(frame, [60, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Portfolio: <span style={{ fontWeight: 600, color: "#0f172a" }}>$6.5M</span></div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Equity: <span style={{ fontWeight: 600, color: "#0f172a" }}>$3.25M</span></div>
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
        {/* Table header - matching AffordabilityBreakdownTable */}
        <div style={{ display: "flex", backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb", padding: "8px 14px" }}>
          {COLUMNS.map((col) => (
            <div key={col.label} style={{ flex: col.flex, fontSize: 10, fontWeight: 600, color: "#374151" }}>
              {col.label}
            </div>
          ))}
        </div>

        {/* Table rows */}
        {TABLE_DATA.map((row, i) => {
          const rowDelay = 60 + i * 6;
          const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isPurchased = row.decision === "PURCHASED";
          return (
            <div
              key={row.year}
              style={{
                display: "flex",
                padding: "6px 14px",
                borderBottom: i < TABLE_DATA.length - 1 ? "1px solid #f3f4f6" : "none",
                opacity: rowOpacity,
                backgroundColor: isPurchased ? "rgba(240, 253, 244, 0.3)" : "white",
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
                ) : (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SceneLabel text="Track portfolio value and equity over time" delay={20} style={{ bottom: 12 }} />
    </AbsoluteFill>
  );
};
