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
}

/**
 * Placeholder busts of whoever is in the conversation. Display-only: the overlay
 * is `pointer-events: none`, and this stays that way so farm clicks still hit
 * the canvas and Trial clicks still hit the panels.
 */
const CharacterStage: React.FC<CharacterStageProps> = ({
  participantIds,
  activeSpeakerId,
  layout = 'overlay',
}) => {
  const names = participantIds.map((id) => resolveCharacter(id).displayName).join(', ');

  return (
    <div
      className={cn(styles.stage, layout === 'hole' && styles.stageHole)}
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
            className={cn(styles.participant, isActive && styles.active, isDimmed && styles.dimmed)}
          >
            <div
              className={cn(
                styles.bust,
                character.kind === 'player' ? styles.playerBust : styles.npcBust,
              )}
              style={{ backgroundColor: phaserTintToCss(character.tint) }}
              aria-hidden
            />
            <p className={styles.name}>{character.displayName}</p>
          </div>
        );
      })}
    </div>
  );
};

export default CharacterStage;
