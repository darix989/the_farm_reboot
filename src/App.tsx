import { PhaserGame } from './phaser/PhaserGame';
import ReactApp from './react/ReactApp';

function App()
{
    return (
        <div id="app">
            <PhaserGame />
            <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
                <ReactApp />
            </div>
        </div>
    )
}

export default App
