import React from 'react';
import cn from 'classnames';
import getLabel from '../../data/labels';
import { phaserTintToCss, resolveCharacter } from '../../data/characters';
import styles from './CharacterStage.module.scss';

export interface CharacterStageProps {
  participantIds: readonly string[];
  activeSpeakerId: string | null;
  /**
   * 'busts' (default) draws the placeholder CSS busts. 'nameplates' draws only a name row,
   * for use over the Phaser `Trial` scene's animated cast (which now occupies the game hole
   * — see `Trial.ts`). Callers pick this per-debate: only scenarios whose cast has sprite
   * art should use it, so legacy debates with no art keep their busts unchanged.
   */
  variant?: 'busts' | 'nameplates';
}

/**
 * Identifies whoever is in the Trial's game hole. Display-only and `pointer-events: none`, so
 * clicks still reach the panels behind it.
 *
 * Kept even though the cast is now Phaser sprites: this is the only accessible description of
 * who is on stage (`role="group"` + `aria-label`) — a Phaser canvas is opaque to assistive
 * tech. The farm used to mount it top-left over the overworld too, until the dialogue box grew
 * a real animated portrait (`AnimalFace`) and made the placeholder busts a worse duplicate of
 * what sits directly below them; that call site is gone, and with it the `overlay` layout.
 */
const CharacterStage: React.FC<CharacterStageProps> = ({
  participantIds,
  activeSpeakerId,
  variant = 'busts',
}) => {
  const names = participantIds.map((id) => resolveCharacter(id).displayName).join(', ');

  return (
    <div
      className={cn(styles.stage, variant === 'nameplates' && styles.nameplateRow)}
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
