import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './phaser/PhaserGame';
import BoilerPlateUI from './react/BoilerPlateUI';
import ReactRoot from './react/ReactRoot';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    // Event emitted from the PhaserGame component
    const onSceneReady = (scene: Phaser.Scene) => {
        // Store will be updated automatically via EventBus
        console.log('Scene ready:', scene.scene.key);
    }

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={onSceneReady} />
            <ReactRoot>
                <BoilerPlateUI />
            </ReactRoot>
        </div>
    )
}

export default App
