import { useEffect, useState } from "react";
import type React from "react";

export interface ScrollFadeState {
    top: boolean;
    bottom: boolean;
}

/**
 * Tracks whether a scrollable container has hidden content above/below.
 * Returns { top, bottom } booleans that can drive a CSS mask-image.
 */
export function useScrollFade(
    ref: React.RefObject<HTMLDivElement | null>,
): ScrollFadeState {
    const [fade, setFade] = useState<ScrollFadeState>({ top: false, bottom: false });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = () => {
            setFade({
                top: el.scrollTop > 2,
                bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2,
            });
        };

        el.addEventListener("scroll", update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();

        return () => {
            el.removeEventListener("scroll", update);
            ro.disconnect();
        };
    }, [ref]);

    return fade;
}

const FADE = "2.5rem";

/** Returns a CSS mask-image value based on which edges have hidden content. */
export function scrollFadeMask(fade: ScrollFadeState): string | undefined {
    if (!fade.top && !fade.bottom) return undefined;
    if (fade.top && fade.bottom)
        return `linear-gradient(to bottom, transparent 0%, black ${FADE}, black calc(100% - ${FADE}), transparent 100%)`;
    if (fade.top)
        return `linear-gradient(to bottom, transparent 0%, black ${FADE})`;
    return `linear-gradient(to bottom, black calc(100% - ${FADE}), transparent 100%)`;
}
