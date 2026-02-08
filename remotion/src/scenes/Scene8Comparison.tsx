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

interface MetricRow {
  label: string;
  base: string;
  alt: string;
  baseColor?: string;
  altColor?: string;
  winner?: "base" | "alt" | "tie";
}

const METRICS: MetricRow[] = [
  { label: "Total Portfolio Value", base: "$2.35M", alt: "$1.85M", winner: "base" },
  { label: "Total Equity", base: "$1.02M", alt: "$780K", winner: "base" },
  { label: "Net Cash Position", base: "-$42K", alt: "+$15K", baseColor: "#ef4444", altColor: "#16a34a", winner: "alt" },
  { label: "Avg. Yield", base: "6.2%", alt: "5.8%", winner: "base" },
  { label: "Properties Owned", base: "5", alt: "3", winner: "base" },
  { label: "Cashflow Positive", base: "Year 10", alt: "Year 6", winner: "alt" },
];

// Mini sparkline chart for each scenario
const Sparkline: React.FC<{ values: number[]; color: string; progress: number }> = ({ values, color, progress }) => {
  const maxV = Math.max(...values);
  const w = 180;
  const h = 50;
  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (v / maxV) * (h - 8);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={500}
        strokeDashoffset={(1 - progress) * 500}
      />
    </svg>
  );
};

export const Scene8Comparison: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Panels slide in from sides
  const leftSpring = spring({ frame, fps, delay: 8, config: { damping: 200 } });
  const rightSpring = spring({ frame, fps, delay: 16, config: { damping: 200 } });

  const leftX = interpolate(leftSpring, [0, 1], [-60, 0]);
  const rightX = interpolate(rightSpring, [0, 1], [60, 0]);

  // Metrics entrance
  const metricsStart = 35;

  // Sparkline draw
  const sparkProgress = interpolate(frame, [25, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const BASE_SPARKLINE = [350, 420, 780, 850, 1020, 1280, 1490, 1720, 2010, 2350];
  const ALT_SPARKLINE = [350, 400, 680, 750, 880, 1020, 1200, 1400, 1620, 1850];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fafafa",
        fontFamily: interFont,
        padding: "40px 60px",
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 4 }}>
          Compare
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: "#0f172a" }}>
          Scenario Comparison
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
          Side-by-side analysis of different strategies
        </div>
      </div>

      {/* Two panels side by side */}
      <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
        {/* Base scenario */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${leftX}px)`,
            opacity: leftSpring,
            backgroundColor: "white",
            borderRadius: 16,
            border: "2px solid #0f172a",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Aggressive Growth</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>5 properties · 10 years</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18" /></svg>
            </div>
          </div>
          <div style={{ padding: "8px 16px" }}>
            <Sparkline values={BASE_SPARKLINE} color="#0f172a" progress={sparkProgress} />
          </div>
        </div>

        {/* Alt scenario */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${rightX}px)`,
            opacity: rightSpring,
            backgroundColor: "white",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Conservative</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>3 properties · 10 years</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18" /></svg>
            </div>
          </div>
          <div style={{ padding: "8px 16px" }}>
            <Sparkline values={ALT_SPARKLINE} color="#64748b" progress={sparkProgress} />
          </div>
        </div>
      </div>

      {/* Metrics comparison table */}
      <div style={{ backgroundColor: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "flex", padding: "10px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ flex: 2, fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Metric</div>
          <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Aggressive</div>
          <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Conservative</div>
        </div>

        {METRICS.map((row, i) => {
          const rowDelay = metricsStart + i * 6;
          const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                padding: "8px 16px",
                borderBottom: i < METRICS.length - 1 ? "1px solid #f8fafc" : "none",
                opacity: rowOpacity,
                alignItems: "center",
              }}
            >
              <div style={{ flex: 2, fontSize: 12, fontWeight: 500, color: "#334155" }}>{row.label}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: row.winner === "base" ? 700 : 500, color: row.baseColor || (row.winner === "base" ? "#0f172a" : "#64748b"), textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {row.winner === "base" && <span style={{ fontSize: 10, color: "#16a34a" }}>★</span>}
                {row.base}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: row.winner === "alt" ? 700 : 500, color: row.altColor || (row.winner === "alt" ? "#0f172a" : "#64748b"), textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {row.winner === "alt" && <span style={{ fontSize: 10, color: "#16a34a" }}>★</span>}
                {row.alt}
              </div>
            </div>
          );
        })}
      </div>

      <SceneLabel text="Compare strategies to find the best path" delay={35} style={{ bottom: 20 }} />
    </AbsoluteFill>
  );
};
