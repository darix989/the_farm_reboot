import { MainMenu } from '../../phaser/scenes/MainMenu';
import { useGameStore } from '../../store/gameStore';
import { useGame, useCurrentScene, useGameOperations } from '../hooks/useGame';
import { GameManager } from '../../utils/gameManager';
import styles from './BoilerPlateUI.module.scss';
import getLabel from '../../data/labels';

function App() {
  const { isReady } = useGame();
  const { sceneKey: currentScene } = useCurrentScene();
  const { switchScene } = useGameOperations();

  const { spritePositions, updateSpritePosition, player } = useGameStore();

  const canMoveSprite = currentScene !== 'MainMenu';
  const spritePosition = spritePositions.logo || { x: 0, y: 0 };

  const changeScene = () => {
    const scene = GameManager.getCurrentScene() as MainMenu;

    if (scene && scene.changeScene) {
      scene.changeScene();
    } else {
      switchScene('Game');
    }
  };

  const moveSprite = () => {
    const scene = GameManager.getCurrentScene() as MainMenu;

    if (scene && scene.scene.key === 'MainMenu' && scene.moveLogo) {
      scene.moveLogo(({ x, y }) => {
        updateSpritePosition('logo', x, y);
      });
    }
  };

  const addSprite = () => {
    const scene = GameManager.getCurrentScene();

    if (scene) {
      const x = Phaser.Math.Between(64, scene.scale.width - 64);
      const y = Phaser.Math.Between(64, scene.scale.height - 64);

      const star = scene.add.sprite(x, y, 'star');

      scene.add.tween({
        targets: star,
        duration: 500 + Math.random() * 1000,
        alpha: 0,
        yoyo: true,
        repeat: -1,
      });
    }
  };

  if (!isReady) {
    return (
      <div style={{ pointerEvents: 'auto' }}>
        <div className={styles.spritePosition}>
          <div>
            {getLabel('gameStatus')} <strong>{getLabel('loadingEllipsis')}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ pointerEvents: 'auto' }}>
      <div>
        <button className={styles.button} onClick={changeScene}>
          {getLabel('changeScene')}
        </button>
      </div>
      <div>
        <button disabled={canMoveSprite} className={styles.button} onClick={moveSprite}>
          {getLabel('toggleMovement')}
        </button>
      </div>
      <div className={styles.spritePosition}>
        <div>
          {getLabel('currentScene')} <strong>{currentScene}</strong>
        </div>
        <div>
          {getLabel('gameStatus')} <strong>{getLabel('ready')}</strong>
        </div>
        <div>
          {getLabel('playerLevelExperience', false, {
            level: player.level,
            experience: player.experience,
          })}
        </div>
        <div>{getLabel('logoPosition', false, { x: spritePosition.x, y: spritePosition.y })}</div>
      </div>
      <div>
        <button className={styles.button} onClick={addSprite}>
          {getLabel('addNewSprite')}
        </button>
      </div>
    </div>
  );
}

export default App;
