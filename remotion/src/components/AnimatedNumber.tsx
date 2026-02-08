import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type AnimatedNumberProps = {
  from: number;
  to: number;
  startFrame?: number;
  durationInFrames?: number;
  format?: "currency" | "currencyCompact" | "percent" | "number";
  style?: React.CSSProperties;
};

const formatValue = (value: number, format: string): string => {
  switch (format) {
    case "currency":
      return `$${Math.round(value).toLocaleString()}`;
    case "currencyCompact":
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `$${Math.round(value / 1000)}K`;
      }
      return `$${Math.round(value)}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
    default:
      return Math.round(value).toLocaleString();
  }
};

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  from,
  to,
  startFrame = 0,
  durationInFrames,
  format = "currencyCompact",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = durationInFrames ?? fps * 2;

  const value = interpolate(frame, [startFrame, startFrame + duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return <span style={style}>{formatValue(value, format)}</span>;
};
