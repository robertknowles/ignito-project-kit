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
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { SceneLabel } from "../components/SceneLabel";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: playfairFont } = loadPlayfair("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

// ─── Property types for the "Add to Timeline" panel ────────────────
const PROPERTIES = [
  { name: "Units / Apartments", price: "$400k", yield: "6.1%", state: "VIC", image: "units-apartments.png" },
  { name: "Villas / Townhouses", price: "$500k", yield: "4.6%", state: "QLD", image: "townhouses.png" },
  { name: "Houses (Regional)", price: "$450k", yield: "5.4%", state: "NSW", image: "regional-house.png" },
  { name: "Duplexes", price: "$550k", yield: "7.0%", state: "QLD", image: "duplex.png" },
  { name: "Metro Houses", price: "$550k", yield: "5.2%", state: "VIC", image: "metro-house.png" },
  { name: "Small Blocks (3-4)", price: "$850k", yield: "6.0%", state: "VIC", image: "smaller-blocks-3-4.png" },
];

// Which properties get "selected" and at what frame
const SELECTION_EVENTS = [
  { index: 0, frame: 70 },  // Units selected first
  { index: 3, frame: 95 },  // Duplexes selected second
  { index: 4, frame: 120 }, // Metro Houses selected third
];

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  VIC: { bg: "#dbeafe", text: "#1d4ed8" },
  NSW: { bg: "#e0f2fe", text: "#0369a1" },
  QLD: { bg: "#fef3c7", text: "#b45309" },
};

// ─── Input & Simulate card (left panel) ─────────────────────────────
const INPUT_PARAMS = [
  { label: "Deposit Pool", value: "$120,000", highlight: true },
  { label: "Borrowing Capacity", value: "$950,000", highlight: true },
  { label: "Annual Savings", value: "$45,000", highlight: true },
  { label: "Equity Goal", value: "$5,000,000", highlight: false },
  { label: "Cashflow Goal", value: "$150,000", highlight: false },
];

// ─── InputSimulateCard ──────────────────────────────────────────────
const InputSimulateCard: React.FC<{ entrance: number; frame: number }> = ({ entrance, frame }) => {
  const y = interpolate(entrance, [0, 1], [30, 0]);

  // Progress bar animation — starts at frame 100, pulses
  const barProgress = interpolate(frame, [100, 170], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bar2Progress = interpolate(frame, [110, 170], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const simOpacity = interpolate(frame, [95, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${y}px)`,
        backgroundColor: "white",
        borderRadius: 20,
        padding: "28px 30px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        fontFamily: interFont,
        width: "100%",
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: playfairFont, fontSize: 26, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
          Input & Simulate
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
          Fast, self-serving modelling for agents that doesn't disrupt the sales process
        </div>
      </div>

      {/* Parameter card */}
      <div style={{ backgroundColor: "#f8fafc", borderRadius: 14, padding: "16px 20px", border: "1px solid #f1f5f9" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid #e5e7eb", marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>Parameter</span>
          <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>Value</span>
        </div>

        {/* Parameter rows */}
        {INPUT_PARAMS.map((p, i) => {
          const rowEntrance = interpolate(frame, [15 + i * 6, 25 + i * 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={p.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                opacity: rowEntrance,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "#374151", fontFamily: "monospace" }}>{p.label}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: p.highlight ? "#3b82f6" : "#374151",
                  backgroundColor: "white",
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  fontFamily: "monospace",
                }}
              >
                {p.value}
              </span>
            </div>
          );
        })}

        {/* Simulating progress bar */}
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            backgroundColor: "white",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            opacity: simOpacity,
          }}
        >
          <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 6, fontFamily: "monospace" }}>
            Simulating Scenarios...
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ height: 5, width: "100%", backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${barProgress * 100}%`, backgroundColor: "#0f172a", borderRadius: 3 }} />
            </div>
            <div style={{ height: 5, width: "75%", backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${bar2Progress * 100}%`, backgroundColor: "#94a3b8", borderRadius: 3 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Single property row in the Add-to-Timeline panel ───────────────
const PropertyRow: React.FC<{
  property: (typeof PROPERTIES)[0];
  selected: boolean;
  selectionNumber: number;
  entrance: number;
  selectProgress: number;
}> = ({ property, selected, selectionNumber, entrance, selectProgress }) => {
  const y = interpolate(entrance, [0, 1], [12, 0]);
  const stateColor = STATE_COLORS[property.state] || STATE_COLORS.VIC;

  // Blend border/bg toward green when selected
  const borderColor = selected
    ? `rgba(134, 239, 172, ${selectProgress})`
    : "#e5e7eb";
  const bgColor = selected
    ? `rgba(240, 253, 244, ${selectProgress * 0.4})`
    : "white";

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${y}px)`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        fontFamily: interFont,
      }}
    >
      {/* Image thumbnail */}
      <div style={{ width: 44, height: 34, borderRadius: 7, overflow: "hidden", backgroundColor: "#f3f4f6", border: "1px solid #f1f5f9", flexShrink: 0 }}>
        <Img
          src={staticFile(`images/properties/${property.image}`)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#0f172a" }}>{property.name}</span>
          {/* Green selection badge */}
          {selected && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "#15803d",
                backgroundColor: "#dcfce7",
                padding: "1px 6px",
                borderRadius: 10,
                opacity: selectProgress,
              }}
            >
              {selectionNumber} added
            </span>
          )}
          {/* State badge */}
          <span
            style={{
              fontSize: 7,
              fontWeight: 600,
              color: stateColor.text,
              backgroundColor: stateColor.bg,
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            {property.state}
          </span>
        </div>
        <div style={{ fontSize: 8, color: "#64748b", marginTop: 1 }}>
          {property.price} · Yield: {property.yield}
        </div>
      </div>

      {/* Plus button */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: selected ? "#0f172a" : "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={selected ? "white" : "#94a3b8"} strokeWidth="2.5">
          {selected ? (
            <polyline points="20 6 9 17 4 12" />
          ) : (
            <path d="M12 5v14M5 12h14" />
          )}
        </svg>
      </div>
    </div>
  );
};

// ─── Add to Timeline panel (right side) ─────────────────────────────
const AddToTimelinePanel: React.FC<{ entrance: number; frame: number; fps: number }> = ({ entrance, frame, fps }) => {
  const y = interpolate(entrance, [0, 1], [30, 0]);

  // Build a map of which properties are selected and their selection number
  const selections = new Map<number, { number: number; progress: number }>();
  let count = 0;
  for (const evt of SELECTION_EVENTS) {
    count++;
    if (frame >= evt.frame) {
      const progress = spring({
        frame,
        fps,
        delay: evt.frame,
        config: { damping: 200 },
      });
      selections.set(evt.index, { number: count, progress });
    }
  }

  // Count banner
  const totalSelected = selections.size;
  const countOpacity = interpolate(frame, [SELECTION_EVENTS[0].frame, SELECTION_EVENTS[0].frame + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${y}px)`,
        backgroundColor: "white",
        borderRadius: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        fontFamily: interFont,
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Add to Timeline</div>
          <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>Select properties for your client's roadmap</div>
        </div>
        {/* Selection count badge */}
        {totalSelected > 0 && (
          <div
            style={{
              opacity: countOpacity,
              backgroundColor: "#dcfce7",
              color: "#15803d",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {totalSelected} selected
          </div>
        )}
      </div>

      {/* Property list */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {PROPERTIES.map((p, i) => {
          const rowEntrance = spring({
            frame,
            fps,
            delay: 20 + i * 5,
            config: { damping: 200 },
          });
          const sel = selections.get(i);
          return (
            <PropertyRow
              key={p.name}
              property={p}
              selected={!!sel}
              selectionNumber={sel?.number ?? 0}
              entrance={rowEntrance}
              selectProgress={sel?.progress ?? 0}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", backgroundColor: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 500, color: "#64748b" }}>Cancel</span>
        <div
          style={{
            backgroundColor: totalSelected > 0 ? "#0f172a" : "#e2e8f0",
            color: totalSelected > 0 ? "white" : "#94a3b8",
            padding: "6px 16px",
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          Add {totalSelected > 0 ? `${totalSelected} Properties` : "to Timeline"}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════ SCENE ═════════════════════════════════
export const Scene3Templates: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Left panel entrance (slightly earlier)
  const leftEntrance = spring({ frame, fps, delay: 5, config: { damping: 200 } });
  // Right panel entrance (slightly later)
  const rightEntrance = spring({ frame, fps, delay: 12, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${sceneScale})`,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 28,
          alignItems: "flex-start",
          width: 1080,
          padding: "0 20px",
        }}
      >
        {/* Left — Input & Simulate */}
        <div style={{ flex: 1 }}>
          <InputSimulateCard entrance={leftEntrance} frame={frame} />
        </div>

        {/* Right — Add to Timeline */}
        <div style={{ flex: 1 }}>
          <AddToTimelinePanel entrance={rightEntrance} frame={frame} fps={fps} />
        </div>
      </div>

      <SceneLabel text="Enter key inputs, then pick properties for the roadmap" delay={30} style={{ bottom: 5 }} />
    </AbsoluteFill>
  );
};
