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

// Template data matching TitleDeedCard format
const TEMPLATES = [
  { name: "Units / Apartments", price: "$350k", rent: "$471/wk", yield: "7.0%", growth: "Medium", lvr: "80%", rate: "6.5%", state: "VIC", image: "units-apartments.png", growthRates: { y1: "8%", y23: "6%", y4: "5%", y5: "4%" } },
  { name: "Villas / Townhouses", price: "$325k", rent: "$437/wk", yield: "7.0%", growth: "Medium", lvr: "80%", rate: "6.5%", state: "QLD", image: "townhouses.png", growthRates: { y1: "8%", y23: "6%", y4: "5%", y5: "4%" } },
  { name: "Metro Houses", price: "$550k", rent: "$550/wk", yield: "5.2%", growth: "High", lvr: "80%", rate: "6.5%", state: "VIC", image: "metro-house.png", growthRates: { y1: "12.5%", y23: "10%", y4: "7.5%", y5: "6%" } },
  { name: "Houses (Regional)", price: "$350k", rent: "$437/wk", yield: "6.5%", growth: "Medium", lvr: "85%", rate: "6.5%", state: "QLD", image: "regional-house.png", growthRates: { y1: "8%", y23: "6%", y4: "5%", y5: "4%" } },
  { name: "Duplexes", price: "$450k", rent: "$590/wk", yield: "6.8%", growth: "Medium", lvr: "80%", rate: "6.5%", state: "QLD", image: "duplex.png", growthRates: { y1: "8%", y23: "6%", y4: "5%", y5: "4%" } },
  { name: "Small Blocks (3-4)", price: "$850k", rent: "$982/wk", yield: "6.0%", growth: "Medium", lvr: "75%", rate: "6.5%", state: "VIC", image: "smaller-blocks-3-4.png", growthRates: { y1: "8%", y23: "6%", y4: "5%", y5: "4%" } },
  { name: "Larger Blocks (10-20)", price: "$2.8m", rent: "$2,960/wk", yield: "5.5%", growth: "Low", lvr: "70%", rate: "6.5%", state: "NSW", image: "larger-blocks-10-20.png", growthRates: { y1: "5%", y23: "4%", y4: "3.5%", y5: "3%" } },
  { name: "Commercial Property", price: "$1.5m", rent: "$1,875/wk", yield: "6.5%", growth: "Low", lvr: "65%", rate: "7.0%", state: "VIC", image: "commercial-property.png", growthRates: { y1: "5%", y23: "4%", y4: "3.5%", y5: "3%" } },
];

// TitleDeedCard mockup matching the actual app component
const TitleDeedCard: React.FC<{ t: (typeof TEMPLATES)[0]; delay: number }> = ({ t, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, delay, config: { damping: 200 } });
  const y = interpolate(entrance, [0, 1], [16, 0]);

  const mortgageValue = t.price.includes("m")
    ? `$${(parseFloat(t.price.replace("$", "").replace("m", "")) * parseFloat(t.lvr) / 100).toFixed(1)}m`
    : `$${Math.round(parseInt(t.price.replace("$", "").replace("k", "")) * parseFloat(t.lvr) / 100)}k`;

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${y}px)`,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        backgroundColor: "white",
        fontFamily: interFont,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Image */}
      <div style={{ width: "100%", height: 65, overflow: "hidden", backgroundColor: "#f8fafc" }}>
        <Img src={staticFile(`images/properties/${t.image}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Name + growth bar */}
      <div style={{ backgroundColor: "#f9fafb", padding: "4px 8px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: "white", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
        </div>
        <div>
          <div style={{ fontSize: 7, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>{t.name}</div>
          <div style={{ fontSize: 6, fontWeight: 500, color: "#6b7280" }}>Growth: {t.growth}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "5px 8px" }}>
        {/* Purchase price */}
        <div style={{ textAlign: "center", paddingBottom: 4, borderBottom: "1px solid #f8fafc", marginBottom: 3 }}>
          <div style={{ fontSize: 5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Purchase Price</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#0f172a" }}>{t.price}</div>
        </div>

        {/* Rent & Yield */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6, marginBottom: 1 }}>
          <span style={{ color: "#6b7280", fontWeight: 500 }}>Rent</span>
          <span style={{ color: "#374151" }}>{t.rent}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6, paddingBottom: 3, borderBottom: "1px solid #f8fafc", marginBottom: 3 }}>
          <span style={{ color: "#6b7280", fontWeight: 500 }}>Annual Yield</span>
          <span style={{ color: "#374151" }}>{t.yield}</span>
        </div>

        {/* Growth rates */}
        <div style={{ marginBottom: 3, paddingBottom: 3, borderBottom: "1px solid #f8fafc" }}>
          <div style={{ fontSize: 5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Growth ({t.growth})</div>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            {[["Y1", t.growthRates.y1], ["Y2-3", t.growthRates.y23], ["Y4", t.growthRates.y4], ["Y5+", t.growthRates.y5]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 5, fontWeight: 600, color: "#9ca3af" }}>{label}</div>
                <div style={{ fontSize: 6, color: "#374151" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mortgage section */}
        <div style={{ textAlign: "center", marginBottom: 2 }}>
          <div style={{ fontSize: 5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mortgage Value</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#0f172a" }}>{mortgageValue}</div>
        </div>
        <div style={{ backgroundColor: "#f9fafb", borderRadius: 4, padding: "3px 5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 8px" }}>
          {[["LVR", t.lvr], ["Rate", t.rate], ["Type", "IO"], ["State", t.state]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 6 }}>
              <span style={{ color: "#6b7280", fontWeight: 500 }}>{l}</span>
              <span style={{ color: "#374151" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "3px 8px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
        <span style={{ fontSize: 6, color: "#87B5FA", fontWeight: 500 }}>Edit Template →</span>
      </div>
    </div>
  );
};

export const Scene3Templates: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const modalSpring = spring({ frame, fps, delay: 5, config: { damping: 200 } });
  const modalScale = interpolate(modalSpring, [0, 1], [0.95, 1]);
  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Background dimming */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", opacity: modalSpring }} />

      {/* Modal matching PropertyBlocksOnboardingModal */}
      <div
        style={{
          opacity: modalSpring,
          transform: `scale(${modalScale})`,
          backgroundColor: "white",
          borderRadius: 16,
          width: 1200,
          maxHeight: 620,
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: interFont,
        }}
      >
        {/* Header - matching PropertyBlocksOnboardingModal */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>Build Your Property Blocks</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Configure your investment property templates</div>
          </div>
          <div style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 8, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {/* Blue info banner - matching the sparkles banner */}
        <div style={{ margin: "10px 16px 4px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 3l1.912 5.813L20 10.236l-4.706 3.832L16.882 20 12 16.697 7.118 20l1.588-5.932L4 10.236l6.088-1.423z" /></svg>
          <div style={{ fontFamily: interFont }}>
            <div style={{ fontSize: 9, color: "#0f172a", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600 }}>Welcome!</span> These are your default property templates — pre-configured "building blocks" for creating investment strategies.
            </div>
            <div style={{ fontSize: 8, color: "#475569", marginTop: 2 }}>
              <span style={{ fontWeight: 600 }}>We recommend reviewing and customizing these defaults</span> to match your local market conditions.
            </div>
          </div>
        </div>

        {/* Grid of TitleDeedCards - 4 columns matching the modal */}
        <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, overflow: "hidden" }}>
          {TEMPLATES.map((t, i) => (
            <TitleDeedCard key={t.name} t={t} delay={15 + i * 4} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", backgroundColor: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 8, color: "#64748b" }}>You can always edit these templates later from the sidebar</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 9, fontWeight: 500, color: "#64748b" }}>Skip for now</span>
            <div style={{ backgroundColor: "#0f172a", color: "white", padding: "6px 16px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
              Looks Good, Continue
            </div>
          </div>
        </div>
      </div>

      <SceneLabel text="Pre-configured property building blocks" delay={30} style={{ bottom: 5 }} />
    </AbsoluteFill>
  );
};
