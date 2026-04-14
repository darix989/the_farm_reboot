import React from 'react';
import './index.css';
import BoilerPlateUI from './BoilerPlateUI';
import MainMenuUI from './MainMenuUI';
import TrialUI from './TrialUI';
import ReactRoot from './ReactRoot';
import { useGameStore } from '../store/gameStore';
import type { DebateScenarioJson } from '../types/debateEntities';
import sampleDebateJson from '../data/debates/sample-debate.json';

const sampleDebate = sampleDebateJson as unknown as DebateScenarioJson;

const ReactApp: React.FC = () => {
    const { currentScene, isGameReady } = useGameStore();

    // Show loading state if game is not ready
    if (!isGameReady) {
        return (
            <ReactRoot>
                <div className="loading-container">
                    <h2>Loading Game...</h2>
                </div>
            </ReactRoot>
        );
    }

    // Render different UI components based on current scene
    const renderSceneUI = () => {
        switch (currentScene) {
            case 'MainMenu':
                return <MainMenuUI />;
            case 'Trial':
                return <TrialUI debate={sampleDebate} />;
            case 'Game':
            case 'GameOver':
            case 'Boot':
            case 'Preloader':
            default:
                // For other scenes, show the original boilerplate UI
                return <BoilerPlateUI />;
        }
    };

    return (
        <ReactRoot>
            {renderSceneUI()}
        </ReactRoot>
    );
};

export default ReactApp;
