import React, { useMemo } from 'react';
import cn from 'classnames';
import { uiColor } from '../../uiColor';
import styles from './ModeratorOpinionGauge.module.scss';

export type ModeratorOpinionGaugeVariant = 'default' | 'compact';

export interface ModeratorOpinionGaugeProps {
  value: number;
  min: number;
  max: number;
  variant?: ModeratorOpinionGaugeVariant;
  className?: string;
  /** Shown as `aria-label` on the progressbar (e.g. moderator opinion + score). */
  ariaLabel: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function fillColorForT(t: number): string {
  if (t < 0.4) return uiColor.danger;
  if (t <= 0.6) return uiColor.warning;
  return uiColor.success;
}

const ModeratorOpinionGauge: React.FC<ModeratorOpinionGaugeProps> = ({
  value,
  min,
  max,
  variant = 'default',
  className,
  ariaLabel,
}) => {
  const { clamped, fillPct, fillColor } = useMemo(() => {
    const span = max - min;
    if (span <= 0) {
      return { clamped: value, fillPct: 50, fillColor: fillColorForT(0.5) };
    }
    const clamped = clamp(value, min, max);
    const t = (clamped - min) / span;
    return {
      clamped,
      fillPct: t * 100,
      fillColor: fillColorForT(t),
    };
  }, [value, min, max]);

  const valueText = `${clamped > 0 ? '+' : ''}${clamped}`;

  return (
    <span
      className={cn(
        styles.gaugeRoot,
        variant === 'compact' ? styles.compact : styles.default,
        className,
      )}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
    >
      <span className={styles.track}>
        <span
          className={styles.fill}
          style={{
            width: `${fillPct}%`,
            backgroundColor: fillColor,
          }}
        />
      </span>
    </span>
  );
};

export default ModeratorOpinionGauge;
