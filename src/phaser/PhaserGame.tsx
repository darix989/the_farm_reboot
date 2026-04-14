import { useLayoutEffect, useRef } from 'react';
import StartGame from './main';
import { EventBus } from './EventBus';
import { PHASER_PARENT_ID } from '../utils/constants';
import { useGameStore } from '../store/gameStore';

export const PhaserGame = function PhaserGame()
{
    const game = useRef<Phaser.Game | null>(null!);
    const setGame = useGameStore((state) => state.setGame);

    useLayoutEffect(() =>
    {
        if (game.current === null)
        {
            game.current = StartGame(PHASER_PARENT_ID);

            // Update Zustand store with game instance
            setGame(game.current);
            
            // Emit game-ready event for EventBus listeners
            EventBus.emit('game-ready', game.current);
        }

        return () =>
        {
            if (game.current)
            {
                // Emit game-destroyed event before destroying
                EventBus.emit('game-destroyed');
                
                game.current.destroy(true);
                if (game.current !== null)
                {
                    game.current = null;
                }
                
                // Clear from Zustand store
                setGame(null);
            }
        }
    }, [setGame]);

    // Scene ready events are now handled automatically by the store via EventBus
    // No need for additional useEffect here since the store listeners handle everything

    return (
        <div
            id={PHASER_PARENT_ID}
            className="phaser-container"
        />
    );

};
