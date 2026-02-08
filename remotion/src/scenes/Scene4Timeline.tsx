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
import { SliderMock } from "../components/SliderMock";
import { SceneLabel } from "../components/SceneLabel";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Tab component
const Tab: React.FC<{ label: string; active: boolean; opacity: number }> = ({ label, active, opacity }) => (
  <div
    style={{
      flex: 1,
      padding: "8px 0",
      textAlign: "center",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.05em",
      color: active ? "#0f172a" : "#94a3b8",
      borderBottom: active ? "2px solid #0f172a" : "2px solid transparent",
      opacity,
      fontFamily: interFont,
    }}
  >
    {label}
  </div>
);

export const Scene4Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase A (0-50): Timeline cards appear  
  // Phase B (50-85): Card 1 expands with tabs + sliders
  // Phase C (85-115): PROPERTY tab - sliders animate
  // Phase D (115-135): Fade to LOAN tab, sliders animate
  // Phase E (135-160): Fade to ASSUMPTIONS tab, show details
  // Phase F (160-180): Hold on ASSUMPTIONS

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Timeline cards entrance
  const card1Spring = spring({ frame, fps, delay: 8, config: { damping: 200 } });
  const card2Spring = spring({ frame, fps, delay: 20, config: { damping: 200 } });
  const card3Spring = spring({ frame, fps, delay: 32, config: { damping: 200 } });
  const card3Opacity = interpolate(card3Spring, [0, 1], [0, 0.4]);

  // Expand animation (phase B)
  const expandStart = 50;
  const expandProgress = frame >= expandStart ? interpolate(frame, [expandStart, expandStart + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const expandHeight = expandProgress * 340;

  // Tab switching with smooth crossfades
  // Tab 0 (PROPERTY): frames 70-130
  // Tab 1 (LOAN): frames 130-190
  // Tab 2 (ASSUMPTIONS): frames 190-240
  const tab0Opacity = interpolate(frame, [70, 80, 125, 135], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tab1Opacity = interpolate(frame, [130, 140, 185, 195], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tab2Opacity = interpolate(frame, [190, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Active tab for styling (which tab is highlighted)
  const activeTab = frame < 130 ? 0 : frame < 190 ? 1 : 2;

  // Slider animation frames: relative to when expand completes
  const sliderAnimStart = frame >= expandStart + 20 ? frame - (expandStart + 20) : -999;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        padding: "40px 100px",
        fontFamily: interFont,
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Header */}
      <div style={{ opacity: card1Spring, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 4 }}>
          Timeline
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: "#0f172a" }}>
          Your Property Roadmap
        </div>
      </div>

      {/* Timeline content */}
      <div>
        {/* Vertical timeline rail */}
        <div style={{ position: "relative", paddingLeft: 50 }}>
          {/* Rail line */}
          <div style={{ position: "absolute", left: 22, top: 0, bottom: 0, width: 2, backgroundColor: "#e5e7eb" }} />

          {/* Card 1 - expandable */}
          <div style={{ opacity: card1Spring, marginBottom: 16, position: "relative" }}>
            {/* Dot */}
            <div style={{ position: "absolute", left: -36, top: 18, width: 14, height: 14, borderRadius: 7, backgroundColor: "#0f172a", border: "3px solid white", boxShadow: "0 0 0 2px #0f172a" }} />
            <div style={{ position: "absolute", left: -90, top: 16, fontSize: 12, fontWeight: 600, color: "#6b7280", fontFamily: "monospace" }}>2025</div>

            {/* Card */}
            <div style={{ backgroundColor: "white", border: "2px solid #0f172a", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                <Img src={staticFile("images/properties/units-apartments.png")} style={{ width: 50, height: 50, borderRadius: 12, objectFit: "cover" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>Units / Apartments</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>$350K · VIC · Yield: 7.0%</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ transform: expandProgress > 0 ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6" /></svg>
              </div>

              {/* Expanded detail panel */}
              <div style={{ height: expandHeight, overflow: "hidden", borderTop: expandProgress > 0 ? "1px solid #f1f5f9" : "none" }}>
                <div style={{ opacity: expandProgress }}>
                  {/* Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
                    {["PROPERTY", "LOAN", "ASSUMPTIONS", "COSTS"].map((tab, i) => (
                      <Tab key={tab} label={tab} active={i === activeTab} opacity={expandProgress} />
                    ))}
                  </div>

                  {/* Tab content area — relative container for stacked panels */}
                  <div style={{ position: "relative", height: 280 }}>
                    {/* PROPERTY tab content */}
                    <div style={{ padding: "14px 20px", opacity: tab0Opacity, position: "absolute", top: 0, left: 0, right: 0 }}>
                      <SliderMock label="PURCHASE PRICE" fromValue={350000} toValue={420000} min={100000} max={2000000} startFrame={sliderAnimStart} durationInFrames={40} format="currency" />
                      <SliderMock label="VALUATION AT PURCHASE" fromValue={378000} toValue={453000} min={100000} max={2000000} startFrame={sliderAnimStart + 5} durationInFrames={38} format="currency" />
                      <SliderMock label="WEEKLY RENT" fromValue={471} toValue={565} min={100} max={2000} startFrame={sliderAnimStart + 10} durationInFrames={40} format="currency" />
                      <SliderMock label="DEPOSIT (%)" fromValue={12} toValue={20} min={5} max={40} startFrame={sliderAnimStart + 8} durationInFrames={35} format="percent" />
                      {/* Extra detail rows */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 8, borderTop: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Annual Yield</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>7.0%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Growth Assumption</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Medium</span>
                      </div>
                    </div>

                    {/* LOAN tab content */}
                    <div style={{ padding: "14px 20px", opacity: tab1Opacity, position: "absolute", top: 0, left: 0, right: 0 }}>
                      <SliderMock label="INTEREST RATE" fromValue={6.5} toValue={6.0} min={3} max={10} startFrame={0} durationInFrames={30} format="percent" />
                      <SliderMock label="LOAN TERM (YEARS)" fromValue={30} toValue={30} min={10} max={30} startFrame={0} durationInFrames={5} format="number" />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 8, borderTop: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Loan Product</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Interest Only</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>LVR</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>80%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Loan Amount</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>$336K</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Monthly Repayment</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>$1,820</span>
                      </div>
                    </div>

                    {/* ASSUMPTIONS tab content */}
                    <div style={{ padding: "14px 20px", opacity: tab2Opacity, position: "absolute", top: 0, left: 0, right: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Capital Growth (Year 1)</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>8.0%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Capital Growth (Years 2-3)</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>6.0%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Capital Growth (Year 4+)</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>5.0%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Rental Growth (Annual)</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>3.5%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Vacancy Rate</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>2 weeks/year</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>Property Management Fee</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>7.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ opacity: card2Spring, marginBottom: 16, position: "relative" }}>
            <div style={{ position: "absolute", left: -36, top: 18, width: 14, height: 14, borderRadius: 7, border: "2px solid #d1d5db", backgroundColor: "white" }} />
            <div style={{ position: "absolute", left: -90, top: 16, fontSize: 12, fontWeight: 600, color: "#9ca3af", fontFamily: "monospace" }}>2027</div>
            <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 14, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
              <Img src={staticFile("images/properties/townhouses.png")} style={{ width: 50, height: 50, borderRadius: 12, objectFit: "cover" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>Villas / Townhouses</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>$325K · QLD · Yield: 7.0%</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>

          {/* Card 3 - ghost/dashed */}
          <div style={{ opacity: card3Opacity, position: "relative" }}>
            <div style={{ position: "absolute", left: -36, top: 18, width: 14, height: 14, borderRadius: 7, border: "2px solid #e5e7eb", backgroundColor: "white" }} />
            <div style={{ position: "absolute", left: -90, top: 16, fontSize: 12, fontWeight: 600, color: "#d1d5db", fontFamily: "monospace" }}>····</div>
            <div style={{ border: "2px dashed #e5e7eb", borderRadius: 14, height: 64, backgroundColor: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </div>
          </div>
        </div>
      </div>

      <SceneLabel
        text={
          frame < expandStart
            ? "Expand any card to edit details"
            : frame < 115
            ? "Adjust property details with interactive sliders"
            : frame < 135
            ? "Configure loan parameters"
            : "Review growth and rental assumptions"
        }
        delay={frame < expandStart ? 40 : 0}
        style={{ bottom: 20 }}
      />
    </AbsoluteFill>
  );
};
