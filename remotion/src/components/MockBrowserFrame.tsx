import React from "react";

type MockBrowserFrameProps = {
  url?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const MockBrowserFrame: React.FC<MockBrowserFrameProps> = ({
  url = "proppath.app",
  children,
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Browser Header */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "10px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#f87171",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#fbbf24",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#34d399",
            }}
          />
        </div>
        <div
          style={{
            margin: "0 auto",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            padding: "2px 12px",
            fontSize: 11,
            color: "#9ca3af",
            fontFamily: "monospace",
          }}
        >
          {url}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
};
