import React, { useEffect, useId, useMemo } from 'react';
import cn from 'classnames';
import { GameManager } from '../../utils/gameManager';
import { useAnimalGalleryStore } from '../../store/animalGalleryStore';
import {
  animalClips,
  animalFaceClips,
  EMOTION_PARTS,
  type AnimalClip,
  type EmotionPart,
} from '../../phaser/animals/animalClipCatalogue';
import { ANIMAL_SPRITE_IDS } from '../../phaser/animals/animalDescriptors';
import { isCurrentEmotionFrameCount } from '../../phaser/animals/animalEmotions';
import { FACE_BOX_PX, preloadFaceSheets } from '../../phaser/animals/animalFaces';
import {
  animalEmotionQualityStatus,
  type ClipQualityStatus,
} from '../../phaser/animals/emotionQuality';
import { CHARACTERS, type AnimalSpriteId } from '../../data/characters';
import { moderatorCharacterIdForAnimal } from '../../data/debateCast';
import getLabel, { type Labels } from '../../data/labels';
import FaceClip from '../characters/FaceClip';
import ModeratorStatusFace from '../trial/components/ModeratorStatusFace';
import { moderatorOpinionFace } from '../trial/utils/trialHelpers';
import styles from './AnimalGalleryUI.module.scss';

/**
 * Controls for the `AnimalGallery` scene: pick an animal from a dropdown, then hold any one of
 * its clips.
 *
 * Every body-clip button is a store write and nothing more — the scene owns the sprite and
 * reacts (see `animalGalleryStore`). That keeps this file free of Phaser entirely, which is why
 * it can render the clip list from `animalClips()` without caring which loader owns each clip.
 *
 * **Emotions are one button each.** A phased emotion (ease-in, loop, ease-out) is still one
 * button; picking it lights a part switch under the grid — Whole / Ease in / Loop / Ease out —
 * and the part chosen there is remembered across emotions and animals (see `setPart`).
 *
 * **The dialogue portrait plays on the stage, never in the panel.** Whenever an emotion is
 * selected, its portrait loops over the top-left of the scene beside the body clip it was cut
 * from, which is the comparison worth having. Face clips are played in the DOM by design
 * (`animalFaces.ts` explains at length why they are not Phaser textures), through the same
 * `FaceClip` the game uses, so a portrait approved here is framed exactly as it will ship.
 *
 * The **moderator status stills** for every animal a debate moderator wears (owl for Duchess,
 * fox for Cass) sit under the emotions. They are frames of the portraits, not art of their own,
 * and are not selectable: there is no clip to play and nothing for the stage to do with them.
 */

/** Which character wears this skin, so the list reads as the cast rather than as asset ids. */
const WORN_BY: Partial<Record<AnimalSpriteId, string>> = Object.fromEntries(
  Object.values(CHARACTERS)
    .filter((character) => character.animal)
    .map((character) => [character.animal!, getLabel(character.nameLabel)]),
);

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
 * The moderator status stills, shown for every animal a debate moderator wears.
 *
 * Scores rather than frame indices, and rendered through the game's own `ModeratorStatusFace`,
 * so this section cannot disagree with what a debate shows — the same discipline that has the
 * stage portrait go through `FaceClip`. `moderatorOpinionFace()` is consulted only for the
 * caption, which names the sheet and frame each still is cut from.
 */
const STATUS_FACE_STATES: readonly { score: number; label: Labels }[] = [
  { score: -1, label: 'galleryStatusFaceDisapproval' },
  { score: 0, label: 'galleryStatusFaceNeutral' },
  { score: 1, label: 'galleryStatusFaceApproval' },
];

const QUALITY_PILL_LABEL: Record<Exclude<ClipQualityStatus, 'none'>, Labels> = {
  pass: 'galleryQualityPass',
  warn: 'galleryQualityWarn',
  unknown: 'galleryQualityUnknown',
  placeholder: 'galleryQualityPlaceholder',
};

const PART_LABEL: Record<EmotionPart, Labels> = {
  sequence: 'galleryPartSequence',
  in: 'galleryPartIn',
  loop: 'galleryPartLoop',
  out: 'galleryPartOut',
};

/** Worst first — the order a phased emotion's parts are rolled up into its one badge. */
const QUALITY_SEVERITY: readonly ClipQualityStatus[] = [
  'warn',
  'placeholder',
  'unknown',
  'pass',
  'none',
];

/**
 * Dropdown rows. A native `<select>` cannot hold a badge, so the animal's quality rides along
 * as text; the selected animal's real badge sits beside the control.
 */
const ANIMAL_OPTIONS: readonly { id: AnimalSpriteId; quality: ClipQualityStatus; text: string }[] =
  ANIMAL_SPRITE_IDS.map((id) => {
    const quality = animalEmotionQualityStatus(id);
    const text = [
      id,
      WORN_BY[id],
      quality !== 'none' ? getLabel(QUALITY_PILL_LABEL[quality]) : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    return { id, quality, text };
  });

const ANIMAL_QUALITY_TITLE: Record<Exclude<ClipQualityStatus, 'none'>, Labels> = {
  pass: 'galleryQualityAnimalPass',
  warn: 'galleryQualityAnimalWarn',
  unknown: 'galleryQualityAnimalUnknown',
  placeholder: 'galleryQualityAnimalPlaceholder',
};

/** The fields both registers' clips share, which is everything the badge tooltip reads. */
type QualityBearing = Pick<AnimalClip, 'qualityStatus' | 'quality' | 'frameCount' | 'reviewNotes'>;

/**
 * Tooltip for one badge. `metrics` differs per register because a portrait's height swing is
 * not a defect — see `FACE_QUALITY_THRESHOLDS`.
 */
function clipQualityTitle(clip: QualityBearing, metrics: Labels = 'galleryQualityMetrics'): string {
  const parts: string[] = [];
  if (clip.qualityStatus === 'placeholder') {
    // No quality numbers apply to a clip borrowed from another animation — the note below
    // (always present for a placeholder) says everything there is to say.
  } else if (clip.qualityStatus === 'unknown' || !clip.quality) {
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
    if (!isCurrentEmotionFrameCount(clip.frameCount)) {
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
        status === 'placeholder' && styles.qualityBadgePlaceholder,
      )}
      title={title}
    >
      {getLabel(QUALITY_PILL_LABEL[status])}
    </span>
  );
};

/**
 * One emotion button's worth of clips: the bare clip for an unphased emotion, or every part of
 * a phased one. `lead` is what the button describes — the whole chain for a phased emotion.
 */
interface EmotionGroup {
  emotion: string;
  lead: AnimalClip;
  parts: AnimalClip[];
}

function groupEmotions(clips: readonly AnimalClip[]): EmotionGroup[] {
  const groups = new Map<string, AnimalClip[]>();
  for (const clip of clips) {
    const emotion = clip.emotion ?? clip.name;
    groups.set(emotion, [...(groups.get(emotion) ?? []), clip]);
  }
  return [...groups].map(([emotion, members]) => ({
    emotion,
    lead: members.find((clip) => clip.part === 'sequence') ?? members[0]!,
    parts: members.filter((clip) => clip.part),
  }));
}

/**
 * The badge a phased emotion's button carries: its worst part, named, so a warn on the ease-out
 * is not hidden behind a clean loop. The whole-chain entry has no measurements of its own.
 */
function groupQuality(group: EmotionGroup): { status: ClipQualityStatus; title: string } {
  if (group.parts.length === 0) {
    return { status: group.lead.qualityStatus ?? 'none', title: clipQualityTitle(group.lead) };
  }
  const measured = group.parts.filter((clip) => clip.qualityStatus);
  const worst = [...measured].sort(
    (a, b) =>
      QUALITY_SEVERITY.indexOf(a.qualityStatus!) - QUALITY_SEVERITY.indexOf(b.qualityStatus!),
  )[0];
  if (!worst) return { status: 'none', title: '' };
  return {
    status: worst.qualityStatus!,
    title: `${getLabel(PART_LABEL[worst.part!])}: ${clipQualityTitle(worst)}`,
  };
}

function clipMeta(clip: AnimalClip): string {
  return clip.available
    ? getLabel('galleryClipMeta', {
        replacements: { frames: String(clip.frameCount), fps: String(clip.frameRate) },
      })
    : getLabel('galleryNoArt');
}

const AnimalGalleryUI: React.FC = () => {
  const { animalId, clipName, setAnimal, setClip, selectEmotion, setPart } =
    useAnimalGalleryStore();
  const animalLabelId = useId();

  // Leaving the gallery should not strand the store mid-review: re-entering opens on the
  // first animal's rest pose, the same state a cold start gives.
  useEffect(() => () => useAnimalGalleryStore.getState().resetGallery(), []);

  // A dialogue box warms these on open for the same reason: a 200KB sheet does not decode in
  // one frame, and a portrait popping in late reads as the preview being broken.
  useEffect(() => preloadFaceSheets(animalId), [animalId]);

  const clips = useMemo(() => animalClips(animalId), [animalId]);
  const faces = useMemo(() => animalFaceClips(animalId), [animalId]);
  const emotionGroups = useMemo(
    () => groupEmotions(clips.filter((clip) => clip.kind === 'emotion')),
    [clips],
  );
  const base = clips.filter((clip) => clip.kind === 'base');
  const selected = clips.find((clip) => clip.name === clipName) ?? null;
  const selectedGroup = emotionGroups.find((group) => group.emotion === selected?.emotion) ?? null;
  // Follows the body clip: an emotion shows its portrait, a base animation shows none.
  const selectedFace = selected?.emotion
    ? (faces.find((face) => face.emotion === selected.emotion) ?? null)
    : null;
  const missingArt = emotionGroups.filter((group) => !group.lead.available).length;
  const statusCharacterId = moderatorCharacterIdForAnimal(animalId);
  const animalQuality = animalEmotionQualityStatus(animalId);

  const renderNotes = (clip: AnimalClip) =>
    clip.reviewNotes?.map((note) => (
      <span
        key={note}
        className={cn(
          styles.clipNote,
          clip.qualityStatus === 'placeholder' && styles.clipNotePlaceholder,
        )}
      >
        {note}
      </span>
    ));

  const renderEmotion = (group: EmotionGroup) => {
    const { lead, parts } = group;
    const active = group === selectedGroup;
    const quality = groupQuality(group);
    return (
      <button
        key={group.emotion}
        type="button"
        className={cn(
          styles.clipButton,
          active && styles.clipButtonActive,
          !lead.available && styles.clipButtonMissing,
        )}
        // A clip with no art stays clickable on purpose: selecting it shows the rest pose and
        // the "no art yet" note, which is the honest answer to "what does this emotion look
        // like" — quieter than a disabled button that explains nothing.
        onClick={() => selectEmotion(group.emotion)}
        aria-pressed={active}
      >
        <span className={styles.clipHeader}>
          <span className={styles.clipName}>{group.emotion.replace(/_/g, ' ')}</span>
          <QualityBadge status={quality.status} title={quality.title} />
        </span>
        <span className={styles.clipMeta}>
          {parts.length > 0
            ? getLabel('galleryPhaseMeta', {
                replacements: {
                  count: String(parts.filter((clip) => clip.part !== 'sequence').length),
                },
              })
            : clipMeta(lead)}
        </span>
        {parts.length === 0 && renderNotes(lead)}
      </button>
    );
  };

  const renderBase = (clip: AnimalClip) => (
    <button
      key={`${clip.kind}-${clip.name}`}
      type="button"
      className={cn(styles.clipButton, clip.name === clipName && styles.clipButtonActive)}
      onClick={() => setClip(clip.name)}
      aria-pressed={clip.name === clipName}
    >
      <span className={styles.clipHeader}>
        <span className={styles.clipName}>{clip.name.replace(/_/g, ' ')}</span>
      </span>
      <span className={styles.clipMeta}>
        {clipMeta(clip)}
        {clip.isRest ? ` · ${getLabel('galleryRestPose')}` : ''}
      </span>
    </button>
  );

  return (
    <div className={styles.galleryUi}>
      {/* Over the scene's stage, never inside the panel: a portrait is judged at a fixed pixel
          size, and the panel is a scrolling column that would clip and move it. */}
      {selectedFace && (
        <div className={styles.facePreview}>
          <div className={styles.facePreviewHeader}>
            <p className={styles.facePreviewCaption}>{`${animalId} · ${selectedFace.emotion}`}</p>
            <QualityBadge
              status={selectedFace.qualityStatus}
              title={clipQualityTitle(selectedFace, 'galleryFaceQualityMetrics')}
            />
          </div>
          {selectedFace.sheet ? (
            <>
              <div className={styles.facePreviewBoxes}>
                {FACE_PREVIEW_SIZES.map((size) => (
                  <div key={size.px} className={styles.facePreviewBox}>
                    <FaceClip sheet={selectedFace.sheet} box={size.px} />
                    <span className={styles.facePreviewSize}>{getLabel(size.label)}</span>
                  </div>
                ))}
              </div>
              <span className={styles.clipMeta}>
                {getLabel('galleryClipMeta', {
                  replacements: {
                    frames: String(selectedFace.frameCount),
                    fps: String(selectedFace.frameRate),
                  },
                })}
              </span>
              {selectedFace.reviewNotes?.map((note) => (
                <span key={note} className={styles.clipNote}>
                  {note}
                </span>
              ))}
            </>
          ) : (
            <p className={styles.facePreviewEmpty}>{getLabel('galleryFaceNoPreview')}</p>
          )}
        </div>
      )}

      <aside className={styles.panel}>
        <h1 className={styles.title}>{getLabel('galleryTitle')}</h1>

        <h2 id={animalLabelId} className={styles.heading}>
          {getLabel('galleryAnimalHeading')}
        </h2>
        <div className={styles.animalPicker}>
          <select
            className={styles.animalSelect}
            aria-labelledby={animalLabelId}
            value={animalId}
            onChange={(event) => setAnimal(event.target.value as AnimalSpriteId)}
          >
            {ANIMAL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
          {animalQuality !== 'none' && (
            <QualityBadge
              status={animalQuality}
              title={getLabel(ANIMAL_QUALITY_TITLE[animalQuality])}
            />
          )}
        </div>

        <h2 className={styles.heading}>{getLabel('galleryEmotionsHeading')}</h2>
        <div className={styles.clipGrid}>{emotionGroups.map(renderEmotion)}</div>
        {missingArt > 0 && (
          <p className={styles.note}>
            {getLabel('galleryMissingArtNote', {
              replacements: { count: String(missingArt), total: String(emotionGroups.length) },
            })}
          </p>
        )}

        {/* Only while a phased emotion is lit: the part is a property of that button. */}
        {selected?.part && selectedGroup && (
          <>
            <div
              className={styles.partSwitch}
              role="radiogroup"
              aria-label={getLabel('galleryPartHeading')}
            >
              {EMOTION_PARTS.filter((part) =>
                selectedGroup.parts.some((clip) => clip.part === part),
              ).map((part) => (
                <button
                  key={part}
                  type="button"
                  role="radio"
                  aria-checked={selected.part === part}
                  className={cn(
                    styles.partButton,
                    selected.part === part && styles.partButtonActive,
                  )}
                  onClick={() => setPart(part)}
                >
                  {getLabel(PART_LABEL[part])}
                </button>
              ))}
            </div>
            <div className={styles.partDetail}>
              <span className={styles.clipHeader}>
                <span className={styles.clipMeta}>{clipMeta(selected)}</span>
                {selected.qualityStatus && (
                  <QualityBadge
                    status={selected.qualityStatus}
                    title={clipQualityTitle(selected)}
                  />
                )}
              </span>
              {renderNotes(selected)}
            </div>
          </>
        )}

        {/* Still frames of the portraits, and only for animals a debate moderator wears. */}
        {statusCharacterId && (
          <>
            <h2 className={styles.heading}>{getLabel('galleryStatusFacesHeading')}</h2>
            <div className={styles.statusFaceRow}>
              {STATUS_FACE_STATES.map(({ score, label }) => {
                const source = moderatorOpinionFace(score, animalId);
                return (
                  <div key={label} className={styles.statusFaceItem}>
                    <span className={styles.statusFaceBox}>
                      <ModeratorStatusFace score={score} characterId={statusCharacterId} />
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
            <p className={styles.note}>
              {getLabel(
                animalId === 'fox' ? 'galleryStatusFacesNoteFox' : 'galleryStatusFacesNote',
              )}
            </p>
          </>
        )}

        <h2 className={styles.heading}>{getLabel('galleryBaseHeading')}</h2>
        <div className={styles.clipGrid}>{base.map(renderBase)}</div>

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
