import { PhaserGame } from './phaser/PhaserGame';
import ReactApp from './react/ReactApp';

function App()
{
    return (
        <div id="app">
            {/*
              Letterboxed 16:9 (1920×1080) stage: max size that fits in the window while keeping aspect ratio.
              Phaser + React overlay both use this rectangle as their coordinate space.
            */}
            <div
                id="app-stage-16x9"
                className="relative box-border overflow-hidden [height:min(100vh,calc(100vw*9/16))] [width:min(100vw,calc(100vh*16/9))]"
            >
                <PhaserGame />
                <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
                    <ReactApp />
                </div>
            </div>
        </div>
    )
}

export default App
