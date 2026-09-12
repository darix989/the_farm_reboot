/// <reference types="vite/client" />

/**
 * `navigator.userAgentData` is Chromium-only and not in the DOM lib. Declared here rather
 * than cast at the call site so `isSmartphone()` can keep reading it as a typed optional.
 * See `src/utils/chromeAndroidFullscreen.ts`.
 */
interface NavigatorUAData {
  readonly mobile: boolean;
  readonly brands?: ReadonlyArray<{ brand: string; version: string }>;
  readonly platform?: string;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
}
