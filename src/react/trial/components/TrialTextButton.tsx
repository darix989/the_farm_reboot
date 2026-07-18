import React, { forwardRef } from 'react';
import cn from 'classnames';
import styles from './TrialTextButton.module.scss';

export type TrialTextButtonVariant = 'solid' | 'dashed';
export type TrialTextButtonWidthMode = 'content' | 'fill' | 'flexGrow';
export type TrialTextButtonSize = 'default' | 'compact';

export interface TrialTextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TrialTextButtonVariant;
  widthMode?: TrialTextButtonWidthMode;
  size?: TrialTextButtonSize;
}

const TrialTextButton = forwardRef<HTMLButtonElement, TrialTextButtonProps>(
  (
    {
      variant = 'solid',
      widthMode = 'content',
      size = 'default',
      type = 'button',
      className,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        styles.root,
        variant === 'solid' ? styles.variantSolid : styles.variantDashed,
        widthMode === 'content' && styles.widthContent,
        widthMode === 'fill' && styles.widthFill,
        widthMode === 'flexGrow' && styles.widthFlexGrow,
        size === 'default' && styles.sizeDefault,
        size === 'compact' && styles.sizeCompact,
        className,
      )}
      {...rest}
    />
  ),
);

TrialTextButton.displayName = 'TrialTextButton';

export default TrialTextButton;
