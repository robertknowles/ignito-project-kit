import React from "react";

type MockPhoneFrameProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const MockPhoneFrame: React.FC<MockPhoneFrameProps> = ({
  children,
  style,
}) => {
  return (
    <div
      style={{
        width: 320,
        backgroundColor: "white",
        borderRadius: 32,
        padding: 12,
        border: "4px solid #1f2937",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Notch */}
      <div
        style={{
          width: 100,
          height: 6,
          backgroundColor: "#1f2937",
          borderRadius: 3,
          margin: "0 auto 12px",
        }}
      />
      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          borderRadius: 20,
        }}
      >
        {children}
      </div>
    </div>
  );
};
