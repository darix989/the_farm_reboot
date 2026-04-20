import React from 'react';
import './index.scss';
import BoilerPlateUI from './screens/BoilerPlateUI';
import MainMenuUI from './screens/MainMenuUI';
import TrialUI from './screens/TrialUI';
import ReactRoot from './ReactRoot';
import { useGameStore, type DebateScenarioKey } from '../store/gameStore';
import type { DebateScenarioJson } from '../types/debateEntities';
import montyVsPennyJson from '../data/debates/001_monty_vs_penny.json';
import bellaVsWoolseyJson from '../data/debates/002_bella_vs_woolsey.json';
import sampleDebateJson from '../data/debates/sample-debate.json';
import styles from './ReactApp.module.scss';
import getLabel from '../data/labels';

const DEBATES: Record<DebateScenarioKey, DebateScenarioJson> = {
  'sample-debate': sampleDebateJson as unknown as DebateScenarioJson,
  '001_monty_vs_penny': montyVsPennyJson as unknown as DebateScenarioJson,
  '002_bella_vs_woolsey': bellaVsWoolseyJson as unknown as DebateScenarioJson,
};

const ReactApp: React.FC = () => {
  const { currentScene, isGameReady, activeDebateId } = useGameStore();

  if (!isGameReady) {
    return (
      <ReactRoot>
        <div className={styles.loadingContainer}>
          <h2>{getLabel('loadingGame')}</h2>
        </div>
      </ReactRoot>
    );
  }

  const renderSceneUI = () => {
    switch (currentScene) {
      case 'MainMenu':
        return <MainMenuUI />;
      case 'Trial':
        return <TrialUI debate={DEBATES[activeDebateId]} />;
      case 'Game':
      case 'GameOver':
      case 'Boot':
      case 'Preloader':
      default:
        return <BoilerPlateUI />;
    }
  };

  return <ReactRoot>{renderSceneUI()}</ReactRoot>;
};

export default ReactApp;
