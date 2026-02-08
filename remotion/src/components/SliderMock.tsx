import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type SliderMockProps = {
  label: string;
  fromValue: number;
  toValue: number;
  min: number;
  max: number;
  startFrame?: number;
  durationInFrames?: number;
  format?: "currency" | "percent" | "number";
};

const formatSliderValue = (value: number, format: string): string => {
  switch (format) {
    case "currency":
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${Math.round(value / 1000)}K`;
      return `$${Math.round(value)}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    default:
      return Math.round(value).toString();
  }
};

export const SliderMock: React.FC<SliderMockProps> = ({
  label,
  fromValue,
  toValue,
  min,
  max,
  startFrame = 0,
  durationInFrames = 60,
  format = "currency",
}) => {
  const frame = useCurrentFrame();

  const currentValue = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [fromValue, toValue],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#94a3b8",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
          }}
        >
          {formatSliderValue(currentValue, format)}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(to right, #0f172a 0%, #0f172a ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
        }}
      >
        {/* Handle */}
        <div
          style={{
            position: "absolute",
            left: `${percentage}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#0f172a",
            border: "2px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </div>
  );
};
