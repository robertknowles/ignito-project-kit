import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
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

export const Scene10CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 15], [1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Title entrance
  const titleSpring = spring({ frame, fps, delay: 5, config: { damping: 12, stiffness: 200 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.9, 1]);

  // Subtitle
  const subOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA button
  const buttonSpring = spring({ frame, fps, delay: 30, config: { damping: 12, stiffness: 200 } });
  const buttonScale = interpolate(buttonSpring, [0, 1], [0.8, 1]);

  // Feature recap
  const recapOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: interFont,
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Logo / Title */}
      <div
        style={{
          opacity: titleSpring,
          transform: `scale(${titleScale})`,
          fontFamily: playfairFont,
          fontSize: 80,
          fontWeight: 600,
          color: "#000000",
          letterSpacing: "-0.02em",
          marginBottom: 20,
        }}
      >
        PropPath
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subOpacity,
          fontSize: 22,
          color: "#64748b",
          marginBottom: 32,
        }}
      >
        Property roadmaps, made simple.
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: buttonSpring,
          transform: `scale(${buttonScale})`,
          backgroundColor: "#0f172a",
          color: "white",
          padding: "14px 40px",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "0.02em",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          marginBottom: 36,
        }}
      >
        Get Started Free
      </div>

      {/* Feature recap pills */}
      <div style={{ opacity: recapOpacity, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
        {["Templates", "Timeline", "Events", "Analytics", "Scenarios", "Client Portal"].map((label) => (
          <span key={label} style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", padding: "4px 12px", backgroundColor: "#f8fafc", borderRadius: 20, border: "1px solid #f1f5f9" }}>
            {label}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
