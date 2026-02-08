import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Scene0Dot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bouncing dot: moderate damping to settle within 2s
  const bounceSpring = spring({
    frame,
    fps,
    config: { damping: 6, stiffness: 120, mass: 1 },
  });

  const dotScale = interpolate(bounceSpring, [0, 1], [0, 1]);
  const dotOpacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: "#000000",
          transform: `scale(${dotScale})`,
          opacity: dotOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
