import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

/**
 * iOS-like pull-to-refresh. Attach the returned ref to the scroll container
 * (typically <main>). Triggers `onRefresh` when user pulls down past threshold
 * while at scrollTop = 0.
 */
export function usePullToRefresh({ onRefresh, threshold = 70, enabled = true }: Options) {
  const ref = useRef<HTMLElement | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const tracking = useRef(false);
  const armed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current || (document.scrollingElement as HTMLElement | null);
    if (!el) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      const scrollEl = ref.current ?? document.scrollingElement!;
      if (scrollEl.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
      armed.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // resistance curve
      const eased = Math.min(120, Math.pow(dy, 0.85));
      setPull(eased);
      if (eased >= threshold && !armed.current) {
        armed.current = true;
        haptic("selection");
      }
      if (eased > 10) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!tracking.current) return;
      tracking.current = false;
      const shouldRefresh = pull >= threshold;
      if (shouldRefresh) {
        setRefreshing(true);
        haptic("medium");
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    const target = ref.current ?? window;
    target.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    target.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });
    target.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    target.addEventListener("touchcancel", onTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener("touchstart", onTouchStart as EventListener);
      target.removeEventListener("touchmove", onTouchMove as EventListener);
      target.removeEventListener("touchend", onTouchEnd as EventListener);
      target.removeEventListener("touchcancel", onTouchEnd as EventListener);
    };
  }, [enabled, onRefresh, pull, refreshing, threshold]);

  return { ref, pull, refreshing, progress: Math.min(1, pull / threshold) };
}
