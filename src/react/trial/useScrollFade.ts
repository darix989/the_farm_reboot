import { useEffect, useState } from "react";
import type React from "react";

export interface ScrollFadeState {
    top: boolean;
    bottom: boolean;
}

/**
 * Tracks whether a scrollable container has hidden content above/below.
 * Returns { top, bottom } booleans — drive overlay opacity to animate scroll hints.
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
