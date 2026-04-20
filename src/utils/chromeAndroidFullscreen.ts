/**
 * True when the device is treated as a phone (handset), not a tablet or desktop browser.
 * Prefers `navigator.userAgentData.mobile` when available; otherwise uses UA heuristics.
 */
export function isSmartphone(): boolean {
  if (typeof navigator === 'undefined') return false;

  const uaData = navigator.userAgentData;
  if (uaData != null && typeof uaData.mobile === 'boolean') {
    return uaData.mobile;
  }

  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return false;
  if (/Tablet|PlayBook|Silk/i.test(ua)) return false;
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua)) return /Mobile/i.test(ua);
  if (/webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  return false;
}

/**
 * True when the in-app browser is Google Chrome on Android (not WebView, Edge, Samsung Internet, etc.).
 */
export function isChromeOnAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  if (!/Chrome\/\d/i.test(ua)) return false;
  if (/; wv\)/.test(ua)) return false;
  if (/Edg\//i.test(ua)) return false;
  if (/OPR\/|Opera/i.test(ua)) return false;
  if (/SamsungBrowser/i.test(ua)) return false;
  if (/Firefox/i.test(ua)) return false;
  return true;
}

export function requestFullscreenIfChromeAndroid(): void {
  if (!isChromeOnAndroid()) return;
  const root = document.documentElement;
  if (!document.fullscreenEnabled || !root.requestFullscreen) return;
  void root.requestFullscreen().catch(() => {
    /* Often fails without a user gesture; ignore */
  });
}

export function isDocumentFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export function exitFullscreenIfActive(): void {
  if (!document.fullscreenElement) return;
  void document.exitFullscreen().catch(() => {
    /* User gesture or policy may block; ignore */
  });
}
