import { Composition } from "remotion";
import { PropPathDemo } from "./Video";

// Scene durations: 60+150+180+150+210+270+150+150+150+150+150+150 = 1920
// Transitions: 11 * 15 = 165 subtracted
// Total: 1920 - 165 = 1755 frames (~58.5 seconds at 30fps)
const TOTAL_FRAMES = 1755;

export const RemotionRoot = () => {
  return (
    <Composition
      id="PropPathDemo"
      component={PropPathDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
