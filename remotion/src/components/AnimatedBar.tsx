import { spring, useCurrentFrame, useVideoConfig } from "remotion";

type AnimatedBarProps = {
  targetHeight: number;
  width: number;
  x: number;
  maxHeight: number;
  delay?: number;
  color?: string;
  bottomY: number;
};

export const AnimatedBar: React.FC<AnimatedBarProps> = ({
  targetHeight,
  width,
  x,
  maxHeight,
  delay = 0,
  color = "#0f172a",
  bottomY,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const height = progress * targetHeight;
  const y = bottomY - height;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={Math.max(height, 0)}
      rx={4}
      fill={color}
    />
  );
};
