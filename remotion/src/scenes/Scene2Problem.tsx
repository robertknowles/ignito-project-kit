import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: playfairFont } = loadPlayfair("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

// ─── Mini spreadsheet mockup ───────────────────────────
const SpreadsheetDoc: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const rows = [
    ["Property", "Price", "Yield", "LVR"],
    ["Metro House", "$550K", "5.2%", "80%"],
    ["Apartment", "$350K", "7.0%", "80%"],
    ["Townhouse", "$325K", "7.0%", "80%"],
    ["Regional", "$350K", "6.5%", "85%"],
    ["Duplex", "$450K", "6.8%", "80%"],
  ];
  return (
    <div style={{ width: 320, backgroundColor: "white", borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", ...style }}>
      {/* Toolbar */}
      <div style={{ backgroundColor: "#1a1a1a", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 10, height: 10, backgroundColor: "white", opacity: 0.5, borderRadius: 2 }} />
        <span style={{ fontFamily: interFont, fontSize: 8, color: "white", fontWeight: 500 }}>Portfolio_Strategy_v3.xlsx</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" }} />
        </div>
      </div>
      {/* Formula bar */}
      <div style={{ padding: "2px 6px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 4, backgroundColor: "#f9fafb" }}>
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "#6b7280" }}>fx</span>
        <span style={{ fontFamily: "monospace", fontSize: 7, color: "#374151" }}>=SUM(B2:B6)</span>
      </div>
      {/* Grid */}
      <div style={{ fontFamily: interFont }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", borderBottom: ri < rows.length - 1 ? "1px solid #f1f5f9" : "none", backgroundColor: ri === 0 ? "#f0f4f8" : "white" }}>
            {/* Row number */}
            <div style={{ width: 20, padding: "3px 4px", fontSize: 7, color: "#9ca3af", textAlign: "center", borderRight: "1px solid #f1f5f9", backgroundColor: "#f9fafb" }}>{ri + 1}</div>
            {row.map((cell, ci) => (
              <div key={ci} style={{ flex: 1, padding: "3px 6px", fontSize: 8, color: ri === 0 ? "#374151" : "#6b7280", fontWeight: ri === 0 ? 600 : 400, borderRight: ci < row.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PDF document mockup ───────────────────────────────
const PDFDoc: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ width: 300, backgroundColor: "white", borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", ...style }}>
    {/* Title bar */}
    <div style={{ backgroundColor: "#1a1a1a", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
      <span style={{ fontFamily: interFont, fontSize: 8, color: "white", fontWeight: 500 }}>Client_Report_FINAL_v2.pdf</span>
    </div>
    {/* Content */}
    <div style={{ padding: "10px 14px", fontFamily: interFont }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Investment Strategy Report</div>
      <div style={{ fontSize: 7, color: "#64748b", marginBottom: 8 }}>Prepared for: John & Sarah Smith</div>
      {/* Text lines */}
      {[95, 80, 90, 60, 85, 70, 88].map((w, i) => (
        <div key={i} style={{ width: `${w}%`, height: 4, backgroundColor: "#f1f5f9", borderRadius: 2, marginBottom: 4 }} />
      ))}
      {/* Mini table */}
      <div style={{ marginTop: 8, border: "1px solid #f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        {[["Total Value", "$2.1M"], ["Equity", "$850K"], ["Cashflow", "-$12K"]].map(([l, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", fontSize: 7, color: "#374151", backgroundColor: i === 0 ? "#fafafa" : "white", borderBottom: i < 2 ? "1px solid #f8fafc" : "none" }}>
            <span>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Email mockup ──────────────────────────────────────
const EmailDoc: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ width: 300, backgroundColor: "white", borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", ...style }}>
    {/* Header */}
    <div style={{ backgroundColor: "#1a1a1a", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" fill="none" stroke="white" strokeWidth="2" /></svg>
      <span style={{ fontFamily: interFont, fontSize: 8, color: "white", fontWeight: 500 }}>Gmail - Re: Property Strategy Update</span>
    </div>
    <div style={{ padding: "10px 14px", fontFamily: interFont }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "#374151" }}>JS</div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#0f172a" }}>John Smith</div>
          <div style={{ fontSize: 7, color: "#94a3b8" }}>to me, Sarah &lt;sarah@...&gt;</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 7, color: "#94a3b8" }}>2 days ago</div>
      </div>
      <div style={{ fontSize: 8, color: "#374151", lineHeight: 1.6, marginBottom: 6 }}>
        Hi, can you send the updated cashflow projections? I think the numbers from last month are wrong...
      </div>
      {/* Reply chain */}
      <div style={{ borderLeft: "2px solid #e5e7eb", paddingLeft: 8, marginTop: 6 }}>
        <div style={{ fontSize: 7, color: "#94a3b8", marginBottom: 2 }}>Sarah wrote:</div>
        <div style={{ fontSize: 7, color: "#94a3b8" }}>Which version? I have v2, v3, and v3_FINAL...</div>
      </div>
    </div>
  </div>
);

// ─── Notes/paper mockup ───────────────────────────────
const NotesDoc: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ width: 280, backgroundColor: "#f5f5f5", borderRadius: 4, border: "1px solid #d1d5db", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "10px 12px", ...style }}>
    <div style={{ fontFamily: interFont, fontSize: 8, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>Meeting Notes - 15 Jan</div>
    <div style={{ fontFamily: interFont, fontSize: 7, color: "#374151", lineHeight: 1.8 }}>
      • Buy apartments first?{"\n"}
      • Check yield on regionals{"\n"}
      • Sarah wants duplex??{"\n"}
      • Need to recalculate LVR{"\n"}
      • Ask broker about rates
    </div>
  </div>
);

// ─── Calculator mockup ─────────────────────────────────
const CalcDoc: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div style={{ width: 270, backgroundColor: "white", borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", ...style }}>
    <div style={{ backgroundColor: "#374151", padding: "6px 10px", textAlign: "right" }}>
      <div style={{ fontFamily: "monospace", fontSize: 7, color: "#9ca3af" }}>Loan Calculator</div>
      <div style={{ fontFamily: "monospace", fontSize: 14, color: "white", fontWeight: 600 }}>$2,847/mo</div>
    </div>
    <div style={{ padding: "6px 8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 3 }}>
      {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "C", "0", ".", "="].map((k) => (
        <div key={k} style={{ padding: "4px", textAlign: "center", fontSize: 8, fontFamily: interFont, backgroundColor: k === "=" ? "#374151" : "#f8fafc", color: k === "=" ? "white" : "#374151", borderRadius: 4, fontWeight: 500 }}>
          {k}
        </div>
      ))}
    </div>
  </div>
);

// ──────────────────── DOCUMENTS LAYOUT ─────────────────
// Positions scaled for 1280x720 virtual viewport (÷1.5 from original 1920x1080 layout)
// Arranged in a 3×2 grid, centred well below the title with comfortable spacing
// Sizes normalised: Spreadsheet 320, Email 300, PDF 300, Notes 280, Calc 270
const DOCS = [
  { Component: SpreadsheetDoc, x: 130, y: 195, rot: -4 },
  { Component: EmailDoc, x: 490, y: 185, rot: 3 },
  { Component: PDFDoc, x: 830, y: 190, rot: -2 },
  { Component: NotesDoc, x: 155, y: 400, rot: 5 },
  { Component: CalcDoc, x: 475, y: 395, rot: -4 },
  { Component: SpreadsheetDoc, x: 785, y: 390, rot: 3 },
];

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sweep starts near end of the 180-frame scene
  const sweepProgress = interpolate(frame, [148, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const sweepX = sweepProgress * -2200;

  const textOpacity = interpolate(frame, [12, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const wordsOpacity = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fafafa",
        transform: `scale(${sceneScale})`,
        overflow: "hidden",
      }}
    >
      <div style={{ transform: `translateX(${sweepX}px)`, position: "absolute", inset: 0 }}>
        {/* Header text */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: textOpacity,
            zIndex: 10,
          }}
        >
          <div style={{ fontFamily: playfairFont, fontSize: 52, color: "#0f172a", marginBottom: 8 }}>
            The Old Way
          </div>
          <div style={{ fontFamily: interFont, fontSize: 20, color: "#94a3b8" }}>
            Scattered tools. No clarity. No single source of truth.
          </div>
        </div>

        {/* Actual document mockups */}
        {DOCS.map(({ Component, x, y, rot }, i) => {
          const entrance = spring({
            frame,
            fps,
            delay: 10 + i * 5,
            config: { damping: 15, stiffness: 180 },
          });
          const docScale = interpolate(entrance, [0, 1], [0.7, 1]);

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `rotate(${rot}deg) scale(${docScale})`,
                opacity: entrance,
              }}
            >
              <Component />
            </div>
          );
        })}

        {/* Bottom frustration words */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: wordsOpacity,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 32 }}>
            {["Spreadsheets", "PDFs", "Emails", "Guesswork"].map((word, i) => (
              <span
                key={word}
                style={{
                  fontFamily: interFont,
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#374151",
                  opacity: interpolate(frame, [88 + i * 4, 92 + i * 4], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
