import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { MockPhoneFrame } from "../components/MockPhoneFrame";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { SceneLabel } from "../components/SceneLabel";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Mini line chart inside the phone
const MiniChart: React.FC<{ progress: number }> = ({ progress }) => {
  const values = [20, 35, 50, 48, 72, 85, 100, 95, 120, 145];
  const w = 280;
  const h = 80;
  const maxV = 150;

  const visibleCount = Math.floor(progress * values.length);
  const path = values
    .slice(0, Math.max(2, visibleCount))
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - (v / maxV) * (h - 10);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Area fill
  const areaPath = path + ` L ${(Math.max(1, visibleCount - 1) / (values.length - 1) * w).toFixed(1)} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartFill)" />
      <path d={path} fill="none" stroke="#0f172a" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
};

export const Scene9Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phoneSpring = spring({ frame, fps, delay: 5, config: { damping: 12, stiffness: 200 } });

  const chartProgress = interpolate(frame, [30, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // KPI cards
  const kpi1Spring = spring({ frame, fps, delay: 25, config: { damping: 200 } });
  const kpi2Spring = spring({ frame, fps, delay: 35, config: { damping: 200 } });
  const kpi3Spring = spring({ frame, fps, delay: 45, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        fontFamily: interFont,
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Text content */}
      <div style={{ maxWidth: 420, opacity: phoneSpring }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 8 }}>
          Client Portal
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, color: "#0f172a", lineHeight: 1.2, marginBottom: 16 }}>
          Branded Client Dashboard
        </div>
        <div style={{ fontSize: 16, color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
          Give your clients their own login to view projections, track progress, and stay engaged.
        </div>

        {/* Feature pills */}
        {[
          "Portfolio overview",
          "Growth projections",
          "Cashflow tracking",
          "Downloadable reports",
        ].map((feat, i) => {
          const pillOpacity = interpolate(frame, [40 + i * 8, 50 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={feat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, opacity: pillOpacity }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{feat}</span>
            </div>
          );
        })}
      </div>

      {/* Phone mockup */}
      <div
        style={{
          opacity: phoneSpring,
          transform: `scale(${interpolate(phoneSpring, [0, 1], [0.9, 1])})`,
        }}
      >
        <MockPhoneFrame style={{ width: 320, height: 580 }}>
          <div style={{ padding: 20, fontFamily: interFont }}>
            {/* Status bar mock */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>My Portfolio</div>
              <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, opacity: kpi1Spring, backgroundColor: "white", borderRadius: 12, padding: "10px 12px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>Value</div>
                <AnimatedNumber from={0} to={2350000} startFrame={25} durationInFrames={30} format="currencyCompact" style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }} />
              </div>
              <div style={{ flex: 1, opacity: kpi2Spring, backgroundColor: "white", borderRadius: 12, padding: "10px 12px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>Equity</div>
                <AnimatedNumber from={0} to={1020000} startFrame={35} durationInFrames={25} format="currencyCompact" style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }} />
              </div>
              <div style={{ flex: 1, opacity: kpi3Spring, backgroundColor: "white", borderRadius: 12, padding: "10px 12px", border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>Props</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>5</div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ backgroundColor: "white", borderRadius: 12, padding: "12px 14px", border: "1px solid #f1f5f9", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#334155", marginBottom: 8 }}>Portfolio Growth</div>
              <MiniChart progress={chartProgress} />
            </div>

            {/* Property list items */}
            {["Units / Apartments", "Villas / Townhouses"].map((name, i) => {
              const itemDelay = 55 + i * 15;
              const itemSpring = spring({ frame, fps, delay: itemDelay, config: { damping: 200 } });
              return (
                <div key={name} style={{ opacity: itemSpring, display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f1f5f9" }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{name}</div>
                    <div style={{ fontSize: 9, color: "#64748b" }}>Active · Performing</div>
                  </div>
                </div>
              );
            })}
          </div>
        </MockPhoneFrame>
      </div>

      <SceneLabel text="Each client gets their own branded portal" delay={25} style={{ bottom: 30 }} />
    </AbsoluteFill>
  );
};
