import React from 'react';
import cn from 'classnames';
import getLabel from '../../data/labels';
import { phaserTintToCss, resolveCharacter } from '../../data/characters';
import styles from './CharacterStage.module.scss';

export interface CharacterStageProps {
  participantIds: readonly string[];
  activeSpeakerId: string | null;
  /** Overlay sits top-left on the farm; hole fills the Trial game cell. */
  layout?: 'overlay' | 'hole';
  /**
   * 'busts' (default) draws the placeholder CSS busts. 'nameplates' draws only a name row,
   * for use over the Phaser `Trial` scene's animated cast (which now occupies the game hole
   * — see `Trial.ts`). Callers pick this per-debate: only scenarios whose cast has sprite
   * art should use it, so legacy debates with no art keep their busts unchanged.
   */
  variant?: 'busts' | 'nameplates';
}

/**
 * Identifies whoever is in the conversation. Display-only and `pointer-events: none` in
 * both layouts, so farm clicks still hit the canvas and Trial clicks still hit the panels.
 *
 * Kept even though the Trial cast is now Phaser sprites: this is the only accessible
 * description of who is on stage (`role="group"` + `aria-label`) — a Phaser canvas is
 * opaque to assistive tech — and `FarmUI`'s dialogue busts still use it unchanged.
 */
const CharacterStage: React.FC<CharacterStageProps> = ({
  participantIds,
  activeSpeakerId,
  layout = 'overlay',
  variant = 'busts',
}) => {
  const names = participantIds.map((id) => resolveCharacter(id).displayName).join(', ');

  return (
    <div
      className={cn(
        styles.stage,
        layout === 'hole' && styles.stageHole,
        variant === 'nameplates' && styles.nameplateRow,
      )}
      role="group"
      aria-label={getLabel('characterStage', { replacements: { names } })}
    >
      {participantIds.map((id) => {
        const character = resolveCharacter(id);
        const isActive = activeSpeakerId === id;
        const isDimmed = activeSpeakerId !== null && !isActive;
        return (
          <div
            key={id}
            className={cn(
              styles.participant,
              variant === 'nameplates' && styles.nameplateSlot,
              isActive && styles.active,
              isDimmed && styles.dimmed,
            )}
          >
            {variant === 'busts' && (
              <div
                className={cn(
                  styles.bust,
                  character.kind === 'player' ? styles.playerBust : styles.npcBust,
                )}
                style={{ backgroundColor: phaserTintToCss(character.tint) }}
                aria-hidden
              />
            )}
            <p className={styles.name}>{character.displayName}</p>
          </div>
        );
      })}
    </div>
  );
};

export default CharacterStage;
