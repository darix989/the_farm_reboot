import React from 'react';
import './index.scss';
import BoilerPlateUI from './screens/BoilerPlateUI';
import MainMenuUI from './screens/MainMenuUI';
import TrialUI from './screens/TrialUI';
import FarmUI from './screens/FarmUI';
import AnimalGalleryUI from './screens/AnimalGalleryUI';
import GameLoadingScreen from './screens/GameLoadingScreen';
import ReactRoot from './ReactRoot';
import TutorialOverlay from './tutorial/TutorialOverlay';
import { useGameStore } from '../store/gameStore';
import { DEBATES } from '../data/levels';

const ReactApp: React.FC = () => {
  const { currentScene, isGameReady, isSceneLoading, activeDebateId } = useGameStore();

  // `isGameReady` means the first playable scene has run `create()` — not merely that a
  // Phaser instance exists. Until then `currentScene` names a scene that is not up yet, so
  // rendering its overlay would put live buttons over a still-loading game.
  // `isSceneLoading` is the same gate for a later pack fetch (Farm / Trial / Gallery):
  // `currentScene` still names the scene we are leaving until the new one reports in.
  if (!isGameReady || isSceneLoading) {
    return (
      <ReactRoot>
        <GameLoadingScreen />
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
