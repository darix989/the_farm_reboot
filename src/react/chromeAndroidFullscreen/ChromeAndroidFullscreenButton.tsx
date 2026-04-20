import React, { useCallback, useEffect, useState } from 'react';
import {
  exitFullscreenIfActive,
  isDocumentFullscreen,
  requestFullscreenIfChromeAndroid,
} from '../../utils/chromeAndroidFullscreen';
import styles from './ChromeAndroidFullscreenButton.module.scss';

const ICON_ENTER_FULLSCREEN =
  'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z';

const ICON_EXIT_FULLSCREEN =
  'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z';

export function ChromeAndroidFullscreenButton() {
  const [fullscreen, setFullscreen] = useState(() => isDocumentFullscreen());

  useEffect(() => {
    const sync = () => setFullscreen(isDocumentFullscreen());
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const onClick = useCallback(() => {
    if (isDocumentFullscreen()) {
      exitFullscreenIfActive();
    } else {
      requestFullscreenIfChromeAndroid();
    }
  }, []);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen (Chrome on Android)'}
        onClick={onClick}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d={fullscreen ? ICON_EXIT_FULLSCREEN : ICON_ENTER_FULLSCREEN} />
        </svg>
      </button>
    </div>
  );
}
