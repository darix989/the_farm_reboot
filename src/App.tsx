import { useLayoutEffect, useRef } from 'react';
import { PhaserGame } from './phaser/PhaserGame';
import { ChromeAndroidFullscreenButton } from './react/chromeAndroidFullscreen';
import ReactApp from './react/ReactApp';
import {
  STAGE_DESIGN_WIDTH,
  STAGE_REM_BASE_PX,
  STAGE_REM_MAX_PX,
  STAGE_REM_MIN_PX,
  STAGE_REM_SCALE_POWER,
} from './utils/constants';

function App() {
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const applyRootRem = () => {
      const w = el.getBoundingClientRect().width;
      const ratio = w / STAGE_DESIGN_WIDTH;
      const scaled = STAGE_REM_BASE_PX * Math.pow(ratio, STAGE_REM_SCALE_POWER);
      const clamped = Math.max(STAGE_REM_MIN_PX, Math.min(STAGE_REM_MAX_PX, scaled));
      document.documentElement.style.fontSize = `${clamped}px`;
    };

    applyRootRem();
    const ro = new ResizeObserver(applyRootRem);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('font-size');
    };
  }, []);

  return (
    <div id="app">
      {/*
              Letterboxed 16:9 (1920×1080) stage: max size that fits in the window while keeping aspect ratio.
              Phaser + React overlay both use this rectangle as their coordinate space.
            */}
      <div ref={stageRef} id="app-stage-16x9">
        <PhaserGame />
        <div className="react-ui-overlay">
          <ReactApp />
        </div>
        <ChromeAndroidFullscreenButton />
      </div>
    </div>
  );
}

export default App;
