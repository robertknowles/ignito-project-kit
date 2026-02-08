import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily: interFont } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

type SceneLabelProps = {
  text: string;
  delay?: number;
  style?: React.CSSProperties;
};

export const SceneLabel: React.FC<SceneLabelProps> = ({
  text,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(frame, [delay, delay + 20], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity,
        transform: `translateY(${y}px)`,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: interFont,
          fontSize: 28,
          fontWeight: 500,
          color: "#64748b",
          letterSpacing: "0.01em",
        }}
      >
        {text}
      </span>
    </div>
  );
};
