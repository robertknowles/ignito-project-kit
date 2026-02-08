import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type PropertyCardProps = {
  name: string;
  price: string;
  yieldPercent: string;
  state: string;
  imageName: string;
  delay?: number;
  compact?: boolean;
};

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  VIC: { bg: "#dbeafe", text: "#1d4ed8" },
  NSW: { bg: "#e0f2fe", text: "#0369a1" },
  QLD: { bg: "#fef3c7", text: "#b45309" },
  SA: { bg: "#fee2e2", text: "#b91c1c" },
  WA: { bg: "#fef9c3", text: "#a16207" },
  TAS: { bg: "#ede9fe", text: "#6d28d9" },
  NT: { bg: "#fce7f3", text: "#be185d" },
  ACT: { bg: "#ecfdf5", text: "#047857" },
};

export const PropertyCard: React.FC<PropertyCardProps> = ({
  name,
  price,
  yieldPercent,
  state,
  imageName,
  delay = 0,
  compact = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const scale = 0.8 + entrance * 0.2;
  const opacity = entrance;
  const stateColor = STATE_COLORS[state] || STATE_COLORS.VIC;

  if (compact) {
    return (
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          backgroundColor: "white",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          width: 240,
        }}
      >
        <Img
          src={staticFile(`images/properties/${imageName}`)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            objectFit: "cover",
          }}
        />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{price}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        backgroundColor: "white",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        width: 380,
      }}
    >
      {/* Image */}
      <div
        style={{
          height: 140,
          overflow: "hidden",
          backgroundColor: "#f3f4f6",
        }}
      >
        <Img
          src={staticFile(`images/properties/${imageName}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
            {name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              backgroundColor: stateColor.bg,
              color: stateColor.text,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {state}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          <span style={{ fontWeight: 600, color: "#111827" }}>{price}</span>
          <span>Yield: {yieldPercent}</span>
        </div>
      </div>
    </div>
  );
};
