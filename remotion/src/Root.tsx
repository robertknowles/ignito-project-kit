import { Composition } from "remotion";
import { PropPathDemo } from "./Video";

// Scene durations: 60+150+180+150+180+150+150+150+150+150+90 = 1560
// Transitions: 10 * 15 = 150 subtracted
// Total: 1560 - 150 = 1410 frames (47 seconds at 30fps)
const TOTAL_FRAMES = 1410;

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
