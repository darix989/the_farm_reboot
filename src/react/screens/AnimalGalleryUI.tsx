import React, { useEffect, useMemo } from 'react';
import cn from 'classnames';
import { GameManager } from '../../utils/gameManager';
import { useAnimalGalleryStore } from '../../store/animalGalleryStore';
import {
  animalClips,
  animalFaceClips,
  type AnimalClip,
  type AnimalFaceClip,
} from '../../phaser/animals/animalClipCatalogue';
import { ANIMAL_SPRITE_IDS } from '../../phaser/animals/animalDescriptors';
import { CURRENT_EMOTION_FRAME_COUNT } from '../../phaser/animals/animalEmotions';
import { FACE_BOX_PX, preloadFaceSheets } from '../../phaser/animals/animalFaces';
import {
  animalEmotionQualityStatus,
  type ClipQualityStatus,
} from '../../phaser/animals/emotionQuality';
import { CHARACTERS, resolveCharacter, type AnimalSpriteId } from '../../data/characters';
import { DEFAULT_MODERATOR_ID } from '../../data/debateCast';
import getLabel, { type Labels } from '../../data/labels';
import FaceClip from '../characters/FaceClip';
import ModeratorStatusFace from '../trial/components/ModeratorStatusFace';
import { moderatorOpinionFace } from '../trial/utils/trialHelpers';
import styles from './AnimalGalleryUI.module.scss';

/**
 * Controls for the `AnimalGallery` scene: pick an animal, hold any one of its clips, and
 * toggle whether switching cuts or crossfades.
 *
 * Every body-clip button is a store write and nothing more — the scene owns the sprite and
 * reacts (see `animalGalleryStore`). That keeps this file free of Phaser entirely, which is why
 * it can render the clip list from `animalClips()` without caring which loader owns each clip.
 *
 * The **dialogue portraits** section is the exception, and the only part of the gallery that
 * draws its own art: face clips are played in the DOM by design (`animalFaces.ts` explains at
 * length why they are not Phaser textures), so there is no scene to delegate to. It renders
 * them through the same `FaceClip` the game uses, so a portrait approved here is framed exactly
 * as it will ship. The two registers select independently — a portrait plays beside the body
 * clip it was cut from rather than replacing it, which is the comparison worth having.
 *
 * That section ends with the **moderator status stills** for the owl alone, since Duchess is the
 * only animal whose face is held still anywhere in the game. They are frames of the `approving`
 * portrait listed directly above them, not art of their own, which is why they are a row inside
 * that section rather than a register of their own — and why they are not selectable: there is
 * no clip to play and nothing for the stage to do with them.
 */

/** Which character wears this skin, so the list reads as the cast rather than as asset ids. */
const WORN_BY: Partial<Record<AnimalSpriteId, string>> = Object.fromEntries(
  Object.values(CHARACTERS)
    .filter((character) => character.animal)
    .map((character) => [character.animal!, getLabel(character.nameLabel)]),
);

/** Portrait thumbnail in the list. Big enough to see the mouth move, small enough for a grid. */
const FACE_THUMB_PX = 56;

/**
 * The stage preview shows every portrait twice, at exactly the two sizes
 * `.ludo-review-faces/boxes.html` uses: what ships, and what a 2x display asks the source
 * pixels for. Softness only shows at the second — upscales run 1.23x (owl) to 2.21x
 * (brown-wolf) — so judging at one size judges half the question.
 */
const FACE_PREVIEW_SIZES: readonly { px: number; label: Labels }[] = [
  { px: FACE_BOX_PX, label: 'galleryFacePreviewShip' },
  { px: FACE_BOX_PX * 2, label: 'galleryFacePreviewRetina' },
];

/**
 * The moderator status stills, shown for the one animal that wears them.
 *
 * Scores rather than frame indices, and rendered through the game's own `ModeratorStatusFace`,
 * so this section cannot disagree with what a debate shows — the same discipline that has the
 * portraits above go through `FaceClip`. `moderatorOpinionFace()` is consulted only for the
 * caption, which names the sheet and frame each still is cut from.
 */
const STATUS_FACE_STATES: readonly { score: number; label: Labels }[] = [
  { score: -1, label: 'galleryStatusFaceDisapproval' },
  { score: 0, label: 'galleryStatusFaceNeutral' },
  { score: 1, label: 'galleryStatusFaceApproval' },
];

/** Whose portraits carry the status stills. Everyone else's portrait list ends at the crops. */
const STATUS_FACE_ANIMAL = resolveCharacter(DEFAULT_MODERATOR_ID).animal;

const QUALITY_PILL_LABEL: Record<Exclude<ClipQualityStatus, 'none'>, Labels> = {
  pass: 'galleryQualityPass',
  warn: 'galleryQualityWarn',
  unknown: 'galleryQualityUnknown',
};

const ANIMAL_QUALITY_TITLE: Record<Exclude<ClipQualityStatus, 'none'>, Labels> = {
  pass: 'galleryQualityAnimalPass',
  warn: 'galleryQualityAnimalWarn',
  unknown: 'galleryQualityAnimalUnknown',
};

/** The fields both registers' clips share, which is everything the badge tooltip reads. */
type QualityBearing = Pick<AnimalClip, 'qualityStatus' | 'quality' | 'frameCount' | 'reviewNotes'>;

/**
 * Tooltip for one badge. `metrics` differs per register because a portrait's height swing is
 * not a defect — see `FACE_QUALITY_THRESHOLDS`.
 */
function clipQualityTitle(clip: QualityBearing, metrics: Labels = 'galleryQualityMetrics'): string {
  const parts: string[] = [];
  if (clip.qualityStatus === 'unknown' || !clip.quality) {
    parts.push(getLabel('galleryQualityUnmeasured'));
  } else {
    parts.push(
      getLabel(metrics, {
        replacements: {
          loopPop: clip.quality.loopPop,
          heightSwing: clip.quality.heightSwing,
          driftX: clip.quality.driftX,
        },
      }),
    );
    if (clip.frameCount !== CURRENT_EMOTION_FRAME_COUNT) {
      parts.push(
        getLabel('galleryQualityStale', { replacements: { frames: String(clip.frameCount) } }),
      );
    }
    if (clip.quality.warnings.length > 0) {
      parts.push(clip.quality.warnings.join(' '));
    }
  }
  if (clip.reviewNotes && clip.reviewNotes.length > 0) {
    parts.push(clip.reviewNotes.join(' '));
  }
  return parts.join(' · ');
}

const QualityBadge: React.FC<{ status: ClipQualityStatus; title: string }> = ({
  status,
  title,
}) => {
  if (status === 'none') return null;
  return (
    <span
      className={cn(
        styles.qualityBadge,
        status === 'pass' && styles.qualityBadgePass,
        status === 'warn' && styles.qualityBadgeWarn,
        status === 'unknown' && styles.qualityBadgeUnknown,
      )}
      title={title}
    >
      {getLabel(QUALITY_PILL_LABEL[status])}
    </span>
  );
};

const AnimalGalleryUI: React.FC = () => {
  const {
    animalId,
    clipName,
    faceEmotion,
    smoothTransitions,
    setAnimal,
    setClip,
    setFaceEmotion,
    setSmoothTransitions,
  } = useAnimalGalleryStore();

  // Leaving the gallery should not strand the store mid-review: re-entering opens on the
  // first animal's rest pose, the same state a cold start gives.
  useEffect(() => () => useAnimalGalleryStore.getState().resetGallery(), []);

  // A dialogue box warms these on open for the same reason: a 200KB sheet does not decode in
  // one frame, and five of them appearing one at a time reads as the list being broken.
  useEffect(() => preloadFaceSheets(animalId), [animalId]);

  const clips = useMemo(() => animalClips(animalId), [animalId]);
  const faces = useMemo(() => animalFaceClips(animalId), [animalId]);
  const emotions = clips.filter((clip) => clip.kind === 'emotion');
  const base = clips.filter((clip) => clip.kind === 'base');
  const selected = clips.find((clip) => clip.name === clipName) ?? null;
  const selectedFace = faces.find((face) => face.emotion === faceEmotion) ?? null;
  const missingArt = emotions.filter((clip) => !clip.available).length;
  const missingFaces = faces.filter((face) => !face.available).length;

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
      <span className={styles.clipHeader}>
        <span className={styles.clipName}>{clip.name.replace(/_/g, ' ')}</span>
        {clip.qualityStatus && clip.qualityStatus !== 'none' && (
          <QualityBadge status={clip.qualityStatus} title={clipQualityTitle(clip)} />
        )}
      </span>
      <span className={styles.clipMeta}>
        {clip.available
          ? getLabel('galleryClipMeta', {
              replacements: { frames: String(clip.frameCount), fps: String(clip.frameRate) },
            })
          : getLabel('galleryNoArt')}
        {clip.isRest ? ` · ${getLabel('galleryRestPose')}` : ''}
      </span>
      {clip.reviewNotes?.map((note) => (
        <span key={note} className={styles.clipNote}>
          {note}
        </span>
      ))}
    </button>
  );

  const renderFace = (face: AnimalFaceClip) => (
    <button
      key={face.emotion}
      type="button"
      className={cn(
        styles.clipButton,
        styles.faceButton,
        face.emotion === faceEmotion && styles.clipButtonActive,
        !face.available && styles.clipButtonMissing,
      )}
      // Missing portraits stay clickable for the same reason missing body clips do: selecting
      // one says "nothing was cropped here", which is an answer. Selecting the one already
      // showing clears the preview.
      onClick={() => setFaceEmotion(face.emotion)}
      aria-pressed={face.emotion === faceEmotion}
    >
      <span className={styles.faceThumb} style={{ width: FACE_THUMB_PX, height: FACE_THUMB_PX }}>
        <FaceClip sheet={face.sheet} box={FACE_THUMB_PX} />
      </span>
      <span className={styles.faceText}>
        <span className={styles.clipHeader}>
          <span className={styles.clipName}>{face.emotion.replace(/_/g, ' ')}</span>
          <QualityBadge
            status={face.qualityStatus}
            title={clipQualityTitle(face, 'galleryFaceQualityMetrics')}
          />
        </span>
        <span className={styles.clipMeta}>
          {face.available
            ? getLabel('galleryClipMeta', {
                replacements: { frames: String(face.frameCount), fps: String(face.frameRate) },
              })
            : getLabel('galleryNoArt')}
        </span>
        {face.reviewNotes?.map((note) => (
          <span key={note} className={styles.clipNote}>
            {note}
          </span>
        ))}
      </span>
    </button>
  );

  return (
    <div className={styles.galleryUi}>
      {/* Over the scene's stage, never inside the panel: a portrait is judged at a fixed pixel
          size, and the panel is a scrolling column that would clip and move it. */}
      {selectedFace && (
        <div className={styles.facePreview}>
          <p className={styles.facePreviewCaption}>{`${animalId} · ${selectedFace.emotion}`}</p>
          {selectedFace.sheet ? (
            <div className={styles.facePreviewBoxes}>
              {FACE_PREVIEW_SIZES.map((size) => (
                <div key={size.px} className={styles.facePreviewBox}>
                  <FaceClip sheet={selectedFace.sheet} box={size.px} />
                  <span className={styles.facePreviewSize}>{getLabel(size.label)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.facePreviewEmpty}>{getLabel('galleryFaceNoPreview')}</p>
          )}
        </div>
      )}

      <aside className={styles.panel}>
        <h1 className={styles.title}>{getLabel('galleryTitle')}</h1>

        <h2 className={styles.heading}>{getLabel('galleryAnimalHeading')}</h2>
        <div className={styles.animalGrid}>
          {ANIMAL_SPRITE_IDS.map((id) => {
            const animalQuality = animalEmotionQualityStatus(id);
            return (
              <button
                key={id}
                type="button"
                className={cn(styles.animalButton, id === animalId && styles.animalButtonActive)}
                onClick={() => setAnimal(id)}
                aria-pressed={id === animalId}
              >
                <span className={styles.animalHeader}>
                  <span className={styles.animalId}>{id}</span>
                  {animalQuality !== 'none' && (
                    <QualityBadge
                      status={animalQuality}
                      title={getLabel(ANIMAL_QUALITY_TITLE[animalQuality])}
                    />
                  )}
                </span>
                {WORN_BY[id] && <span className={styles.animalWornBy}>{WORN_BY[id]}</span>}
              </button>
            );
          })}
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

        {/* Directly under the emotions: every portrait is a crop of the body clip above it with
            the same name, so the two belong next to each other. */}
        <h2 className={styles.heading}>{getLabel('galleryFacesHeading')}</h2>
        <div className={styles.faceGrid}>{faces.map(renderFace)}</div>
        {missingFaces > 0 && (
          <p className={styles.note}>
            {getLabel('galleryMissingFaceNote', {
              replacements: { count: String(missingFaces), total: String(faces.length) },
            })}
          </p>
        )}

        {/* Still frames of a portrait above, so they belong under this heading rather than in a
            section of their own — and only for the animal the debate's moderator wears. */}
        {animalId === STATUS_FACE_ANIMAL && (
          <>
            <h3 className={styles.subHeading}>{getLabel('galleryStatusFacesHeading')}</h3>
            <div className={styles.statusFaceRow}>
              {STATUS_FACE_STATES.map(({ score, label }) => {
                const source = moderatorOpinionFace(score);
                return (
                  <div key={label} className={styles.statusFaceItem}>
                    <span className={styles.statusFaceBox}>
                      <ModeratorStatusFace score={score} />
                    </span>
                    <span className={styles.statusFaceLabel}>{getLabel(label)}</span>
                    <span className={styles.statusFaceMeta}>
                      {getLabel('galleryStatusFaceMeta', {
                        replacements: {
                          emotion: source.emotion,
                          frame: String(source.frame),
                        },
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className={styles.note}>{getLabel('galleryStatusFacesNote')}</p>
          </>
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
