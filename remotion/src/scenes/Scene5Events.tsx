import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { SceneLabel } from "../components/SceneLabel";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Lucide-style SVG icon paths (matching eventIcons.tsx)
const LucideIcon: React.FC<{ d: string; size?: number; stroke?: string }> = ({ d, size = 18, stroke = "#475569" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// Event categories with Lucide icons (slate colors, not rainbow)
const CATEGORIES = [
  { label: "Income", sub: "Salary · Partner · Bonus", iconD: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" },
  { label: "Portfolio", sub: "Sell · Refinance · Renovate", iconD: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { label: "Life", sub: "Inheritance · Expense · Dependents", iconD: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { label: "Market", sub: "Rates · Corrections", iconD: "M23 6l-9.5 9.5-5-5L1 18" },
];

// Event cards that appear
const EVENTS = [
  {
    label: "Salary Change",
    shortLabel: "Salary",
    badge: "+$20K",
    year: "2027",
    effects: ["Borrowing Capacity changes", "Annual Savings adjust"],
    iconD: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  },
  {
    label: "Inheritance",
    shortLabel: "Inheritance",
    badge: "+$100K",
    year: "2029",
    effects: ["Available Cash: +$100,000"],
    iconD: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  },
  {
    label: "Interest Rate Change",
    shortLabel: "Rates",
    badge: "-0.5%",
    year: "2031",
    effects: ["All loans affected", "Cashflow changes"],
    iconD: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  },
];

export const Scene5Events: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Background: faded timeline behind
  const bgOpacity = interpolate(frame, [0, 10], [0, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "+" button pulse
  const plusPulse = frame >= 5 && frame < 18 ? interpolate(frame, [5, 11, 18], [1, 1.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  // Modal slides up from bottom
  const modalEntrance = spring({ frame, fps, delay: 15, config: { damping: 200 } });
  const modalY = interpolate(modalEntrance, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        fontFamily: interFont,
        transform: `scale(${sceneScale})`,
        overflow: "hidden",
      }}
    >
      {/* Faded timeline background */}
      <div style={{ position: "absolute", top: 0, left: 60, bottom: 0, width: 500, opacity: bgOpacity }}>
        <div style={{ position: "absolute", left: 18, top: 40, bottom: 40, width: 2, backgroundColor: "#e5e7eb" }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 0, top: 60 + i * 90, width: 400, height: 60, borderRadius: 12, backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" }} />
        ))}
      </div>

      {/* + Button (top right area, animated) */}
      <div
        style={{
          position: "absolute",
          top: 50,
          right: 80,
          transform: `scale(${plusPulse})`,
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, color: "#64748b", fontWeight: 500 }}>Add</div>
      </div>

      {/* Event config popup - slides up */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateY(${modalY}px)`,
          opacity: modalEntrance,
          width: 520,
          backgroundColor: "white",
          borderRadius: 20,
          boxShadow: "0 25px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>Add Custom Event</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </div>

        {/* Event categories */}
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {CATEGORIES.map((cat, i) => {
            const catDelay = 25 + i * 6;
            const catSpring = spring({ frame, fps, delay: catDelay, config: { damping: 200 } });
            return (
              <div
                key={cat.label}
                style={{
                  opacity: catSpring,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LucideIcon d={cat.iconD} size={18} stroke="#475569" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{cat.sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            );
          })}
        </div>

        {/* Configured event cards appearing below */}
        <div style={{ padding: "4px 16px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 4 }}>
            Added Events
          </div>
          {EVENTS.map((ev, i) => {
            const evDelay = 65 + i * 18;
            const evSpring = spring({ frame, fps, delay: evDelay, config: { damping: 15, stiffness: 200 } });
            const evY = interpolate(evSpring, [0, 1], [15, 0]);
            return (
              <div
                key={i}
                style={{
                  opacity: evSpring,
                  transform: `translateY(${evY}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  borderRadius: 10,
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "white", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LucideIcon d={ev.iconD} size={15} stroke="#475569" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{ev.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: 8 }}>{ev.shortLabel}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    {ev.year} · <span style={{ color: "#16a34a", fontWeight: 600 }}>{ev.badge}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 150 }}>
                  {ev.effects.map((eff, j) => (
                    <span key={j} style={{ fontSize: 8, color: "#475569", backgroundColor: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>
                      {eff}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SceneLabel text="Model life events that impact the journey" delay={75} style={{ bottom: 30 }} />
    </AbsoluteFill>
  );
};
