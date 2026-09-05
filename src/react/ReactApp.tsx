import React from 'react';
import './index.scss';
import BoilerPlateUI from './screens/BoilerPlateUI';
import MainMenuUI from './screens/MainMenuUI';
import TrialUI from './screens/TrialUI';
import FarmUI from './screens/FarmUI';
import AnimalGalleryUI from './screens/AnimalGalleryUI';
import ReactRoot from './ReactRoot';
import TutorialOverlay from './tutorial/TutorialOverlay';
import { useGameStore } from '../store/gameStore';
import { DEBATES } from '../data/levels';
import styles from './ReactApp.module.scss';
import getLabel from '../data/labels';

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
      case 'Farm':
        return <FarmUI />;
      case 'AnimalGallery':
        return <AnimalGalleryUI />;
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
      <TutorialOverlay />
    </ReactRoot>
  );
};

export default ReactApp;
