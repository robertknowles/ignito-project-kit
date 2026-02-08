import { AbsoluteFill, interpolate, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";

import { Scene0Dot } from "./scenes/Scene0Dot";
import { Scene1Title } from "./scenes/Scene1Title";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { SceneHowItWorks } from "./scenes/SceneHowItWorks";
import { Scene3Templates } from "./scenes/Scene3Templates";
import { Scene4Timeline } from "./scenes/Scene4Timeline";
import { Scene5Events } from "./scenes/Scene5Events";
import { Scene6Portfolio } from "./scenes/Scene6Portfolio";
import { Scene7Cashflow } from "./scenes/Scene7Cashflow";
import { Scene8Comparison } from "./scenes/Scene8Comparison";
import { Scene9Dashboard } from "./scenes/Scene9Dashboard";
import { Scene10CTA } from "./scenes/Scene10CTA";

const T = 15; // transition duration in frames (0.5s at 30fps)

/**
 * Global content scale factor.
 * Renders content at a virtual viewport of (1920/SCALE)x(1080/SCALE)
 * then CSS-scales up to fill the full 1920x1080 composition frame.
 * This makes all text, charts, and UI elements proportionally larger.
 */
const CONTENT_SCALE = 1.5;

export const PropPathDemo = () => {
  const { fps, durationInFrames } = useVideoConfig();

  // Use the first 59 seconds of the audio track (covers full video duration)
  const audioTrimAfter = 59 * fps;
  // Fade out over the last 2 seconds so the audio doesn't cut abruptly
  const fadeOutStart = durationInFrames - 2 * fps;

  return (
    <AbsoluteFill>
      {/* Background music – first 50s of Refreshed.mp3 */}
      <Audio
        src={staticFile("Refreshed.mp3")}
        trimAfter={audioTrimAfter}
        volume={(f) =>
          interpolate(f, [0, fps, fadeOutStart, durationInFrames], [0, 0.8, 0.8, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <div
        style={{
          width: `${100 / CONTENT_SCALE}%`,
          height: `${100 / CONTENT_SCALE}%`,
          transform: `scale(${CONTENT_SCALE})`,
          transformOrigin: "top left",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <TransitionSeries>
          {/* 0: Bouncing dot intro (2s) */}
          <TransitionSeries.Sequence durationInFrames={60}>
            <Scene0Dot />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 1: Title - PropPath (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene1Title />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 2: The Problem - spreadsheets chaos (6s) */}
          <TransitionSeries.Sequence durationInFrames={180}>
            <Scene2Problem />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 2b: How it Works — 4-step overview (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneHowItWorks />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 3: Input & Simulate + Add to Timeline split (7s) */}
          <TransitionSeries.Sequence durationInFrames={210}>
            <Scene3Templates />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 4: Timeline + expand + sliders (9s) */}
          <TransitionSeries.Sequence durationInFrames={270}>
            <Scene4Timeline />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 5: Custom Events flow (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene5Events />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 6: Portfolio Growth line chart + table (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene6Portfolio />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 7: Cashflow Analysis bar chart + table (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene7Cashflow />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 8: Scenario Comparison (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene8Comparison />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 9: Client Dashboard (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene9Dashboard />
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: T })}
          />

          {/* 10: CTA / Outro (5s) */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <Scene10CTA />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </div>
    </AbsoluteFill>
  );
};
