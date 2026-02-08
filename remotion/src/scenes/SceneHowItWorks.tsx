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

const STEPS = [
  {
    title: "Enter a few key inputs",
    desc: "Capture the essentials so the strategy can be built quickly.",
  },
  {
    title: "Build your roadmap",
    desc: "Use smart property blocks to outline purchase timing, equity and progress.",
  },
  {
    title: "See the bigger picture",
    desc: "Instant visual output makes complex interactions obvious — fast.",
  },
  {
    title: "Share & discuss with confidence",
    desc: "A clear, simple narrative that supports your advice, not competes with it.",
  },
];

const StepCard: React.FC<{
  step: (typeof STEPS)[0];
  index: number;
  entrance: number;
}> = ({ step, index, entrance }) => {
  const y = interpolate(entrance, [0, 1], [40, 0]);

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${y}px)`,
        padding: "28px 24px",
        borderRadius: 24,
        border: "1px solid #f1f5f9",
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: interFont,
      }}
    >
      {/* Number circle */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: entrance > 0.7 ? "#0f172a" : "white",
          border: entrance > 0.7 ? "2px solid #0f172a" : "2px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
          transition: "background-color 0.3s, border-color 0.3s",
        }}
      >
        <span
          style={{
            fontFamily: playfairFont,
            fontSize: 16,
            fontWeight: 600,
            color: entrance > 0.7 ? "white" : "#0f172a",
          }}
        >
          {index + 1}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: playfairFont,
          fontSize: 20,
          fontWeight: 600,
          color: "#0f172a",
          lineHeight: 1.25,
          marginBottom: 10,
        }}
      >
        {step.title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.6,
          marginTop: "auto",
        }}
      >
        {step.desc}
      </div>
    </div>
  );
};

export const SceneHowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneScale = interpolate(frame, [0, 20], [1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title entrance
  const titleOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [8, 22], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Underline bar width
  const barWidth = interpolate(frame, [20, 50], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        transform: `scale(${sceneScale})`,
      }}
    >
      {/* Title block */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: playfairFont,
            fontSize: 48,
            color: "#0f172a",
            lineHeight: 1.1,
          }}
        >
          How PropPath works.
        </div>
        {/* Underline */}
        <div
          style={{
            width: barWidth,
            height: 3,
            backgroundColor: "#0f172a",
            borderRadius: 2,
            marginTop: 24,
          }}
        />
      </div>

      {/* 4-step card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 16,
          marginTop: 36,
        }}
      >
        {STEPS.map((step, i) => {
          const entrance = spring({
            frame,
            fps,
            delay: 30 + i * 10,
            config: { damping: 18, stiffness: 120 },
          });
          return <StepCard key={i} step={step} index={i} entrance={entrance} />;
        })}
      </div>
    </AbsoluteFill>
  );
};
