import React from "react";
import {
  AbsoluteFill,
  interpolate,
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
  weights: ["400", "500"],
  subsets: ["latin"],
});

const TAGLINE = "Build Property Roadmaps in Minutes";
const PILLS = ["Fast to build", "Simple to understand", "Designed for sales"];

export const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom-in energy: scene starts slightly zoomed out, settles to 1 (slower)
  const sceneScale = interpolate(frame, [0, 50], [1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "PropPath" typewriter
  const TITLE = "PropPath";
  const titleCharsPerFrame = 0.5;
  const titleStart = 8; // small delay after dot fades
  const titleVisibleChars = Math.min(
    Math.max(0, Math.floor((frame - titleStart) * titleCharsPerFrame)),
    TITLE.length
  );
  const titleText = TITLE.slice(0, titleVisibleChars);
  const titleCursorVisible =
    frame >= titleStart &&
    titleVisibleChars < TITLE.length &&
    Math.floor(frame / 8) % 2 === 0;
  // Tagline typewriter: starts after title finishes
  const typewriterStart = titleStart + Math.ceil(TITLE.length / titleCharsPerFrame) + 6;
  const charsPerFrame = 0.7;
  const visibleChars = Math.min(
    Math.max(0, Math.floor((frame - typewriterStart) * charsPerFrame)),
    TAGLINE.length
  );
  const taglineText = TAGLINE.slice(0, visibleChars);
  const taglineOpacity = frame >= typewriterStart ? 1 : 0;

  const cursorVisible =
    frame >= typewriterStart &&
    visibleChars < TAGLINE.length &&
    Math.floor(frame / 8) % 2 === 0;

  // Pills entrance: staggered
  const pillsStart = typewriterStart + Math.ceil(TAGLINE.length / charsPerFrame) + 5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${sceneScale})`,
      }}
    >
      <div
        style={{
          fontFamily: playfairFont,
          fontSize: 120,
          fontWeight: 600,
          color: "#000000",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: 28,
          opacity: frame >= titleStart ? 1 : 0,
        }}
      >
        {titleText}
        {titleCursorVisible && <span style={{ color: "#000", fontWeight: 300 }}>|</span>}
      </div>

      <div
        style={{
          opacity: taglineOpacity,
          fontFamily: interFont,
          fontSize: 30,
          color: "#6b7280",
          height: 40,
          marginBottom: 40,
        }}
      >
        {taglineText}
        {cursorVisible && <span style={{ color: "#000", fontWeight: 300 }}>|</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {PILLS.map((pill, i) => {
          const pillDelay = pillsStart + i * 5;
          const pillOpacity = interpolate(frame, [pillDelay, pillDelay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <React.Fragment key={pill}>
              {i > 0 && (
                <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#d1d5db", opacity: pillOpacity }} />
              )}
              <span style={{ opacity: pillOpacity, fontFamily: interFont, fontSize: 17, color: "#9ca3af" }}>{pill}</span>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
