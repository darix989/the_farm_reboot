import React, { useEffect, useMemo } from 'react';
import cn from 'classnames';
import { GameManager } from '../../utils/gameManager';
import { useAnimalGalleryStore } from '../../store/animalGalleryStore';
import { animalClips, type AnimalClip } from '../../phaser/animals/animalClipCatalogue';
import { ANIMAL_SPRITE_IDS } from '../../phaser/animals/animalDescriptors';
import { CHARACTERS } from '../../data/characters';
import getLabel from '../../data/labels';
import styles from './AnimalGalleryUI.module.scss';
import type { AnimalSpriteId } from '../../data/characters';

/**
 * Controls for the `AnimalGallery` scene: pick an animal, hold any one of its clips, and
 * toggle whether switching cuts or crossfades.
 *
 * Every button is a store write and nothing more — the scene owns the sprite and reacts (see
 * `animalGalleryStore`). That keeps this file free of Phaser entirely, which is why it can
 * render the clip list from `animalClips()` without caring which loader owns each clip.
 */

/** Which character wears this skin, so the list reads as the cast rather than as asset ids. */
const WORN_BY: Partial<Record<AnimalSpriteId, string>> = Object.fromEntries(
  Object.values(CHARACTERS)
    .filter((character) => character.animal)
    .map((character) => [character.animal!, getLabel(character.nameLabel)]),
);

const AnimalGalleryUI: React.FC = () => {
  const { animalId, clipName, smoothTransitions, setAnimal, setClip, setSmoothTransitions } =
    useAnimalGalleryStore();

  // Leaving the gallery should not strand the store mid-review: re-entering opens on the
  // first animal's rest pose, the same state a cold start gives.
  useEffect(() => () => useAnimalGalleryStore.getState().resetGallery(), []);

  const clips = useMemo(() => animalClips(animalId), [animalId]);
  const emotions = clips.filter((clip) => clip.kind === 'emotion');
  const base = clips.filter((clip) => clip.kind === 'base');
  const selected = clips.find((clip) => clip.name === clipName) ?? null;
  const missingArt = emotions.filter((clip) => !clip.available).length;

  const renderClip = (clip: AnimalClip) => (
    <button
      key={`${clip.kind}-${clip.name}`}
      type="button"
      className={cn(
        styles.clipButton,
        clip.name === clipName && styles.clipButtonActive,
        !clip.available && styles.clipButtonMissing,
      )}
      // A clip with no art stays clickable on purpose: selecting it shows the rest pose and
      // the "no art yet" note, which is the honest answer to "what does this emotion look
      // like" — quieter than a disabled button that explains nothing.
      onClick={() => setClip(clip.name)}
      aria-pressed={clip.name === clipName}
    >
      <span className={styles.clipName}>{clip.name.replace(/_/g, ' ')}</span>
      <span className={styles.clipMeta}>
        {clip.available
          ? getLabel('galleryClipMeta', {
              replacements: { frames: String(clip.frameCount), fps: String(clip.frameRate) },
            })
          : getLabel('galleryNoArt')}
        {clip.isRest ? ` · ${getLabel('galleryRestPose')}` : ''}
      </span>
    </button>
  );

  return (
    <div className={styles.galleryUi}>
      <aside className={styles.panel}>
        <h1 className={styles.title}>{getLabel('galleryTitle')}</h1>

        <h2 className={styles.heading}>{getLabel('galleryAnimalHeading')}</h2>
        <div className={styles.animalGrid}>
          {ANIMAL_SPRITE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={cn(styles.animalButton, id === animalId && styles.animalButtonActive)}
              onClick={() => setAnimal(id)}
              aria-pressed={id === animalId}
            >
              <span className={styles.animalId}>{id}</span>
              {WORN_BY[id] && <span className={styles.animalWornBy}>{WORN_BY[id]}</span>}
            </button>
          ))}
        </div>

        <h2 className={styles.heading}>{getLabel('galleryEmotionsHeading')}</h2>
        <div className={styles.clipGrid}>{emotions.map(renderClip)}</div>
        {missingArt > 0 && (
          <p className={styles.note}>
            {getLabel('galleryMissingArtNote', {
              replacements: { count: String(missingArt), total: String(emotions.length) },
            })}
          </p>
        )}

        <h2 className={styles.heading}>{getLabel('galleryBaseHeading')}</h2>
        <div className={styles.clipGrid}>{base.map(renderClip)}</div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={smoothTransitions}
            onChange={(event) => setSmoothTransitions(event.target.checked)}
          />
          <span>
            <span className={styles.toggleLabel}>{getLabel('gallerySmoothTransitions')}</span>
            <span className={styles.toggleHint}>{getLabel('gallerySmoothHint')}</span>
          </span>
        </label>

        <div className={styles.statusBar}>
          {selected ? `${animalId} · ${selected.name}` : getLabel('galleryNothingSelected')}
        </div>

        <button
          type="button"
          className={styles.backButton}
          onClick={() => GameManager.switchScene('MainMenu')}
        >
          {getLabel('galleryBackToMenu')}
        </button>
      </aside>
    </div>
  );
};

export default AnimalGalleryUI;
