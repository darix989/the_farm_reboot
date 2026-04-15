import React from 'react';
import './index.scss';
import BoilerPlateUI from './BoilerPlateUI';
import MainMenuUI from './MainMenuUI';
import TrialUI from './TrialUI';
import ReactRoot from './ReactRoot';
import { useGameStore } from '../store/gameStore';
import type { DebateScenarioJson } from '../types/debateEntities';
import sampleDebateJson from '../data/debates/sample-debate.json';
import styles from './ReactApp.module.scss';

const sampleDebate = sampleDebateJson as unknown as DebateScenarioJson;

const ReactApp: React.FC = () => {
    const { currentScene, isGameReady } = useGameStore();

    if (!isGameReady) {
        return (
            <ReactRoot>
                <div className={styles.loadingContainer}>
                    <h2>Loading Game...</h2>
                </div>
            </ReactRoot>
        );
    }

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
