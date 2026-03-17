import { useState, useEffect, useRef, useCallback } from "react";

const EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
];

/**
 * Starts a countdown when `enabled` is true. Any user interaction
 * (mouse, keyboard, scroll, touch) permanently cancels the timer.
 * When the countdown reaches 0 without interaction, `onTimeout` fires.
 *
 * @returns `remaining` — seconds left (null when cancelled), `cancelled` flag
 */
export function useIdleTimer(
  enabled: boolean,
  seconds: number,
  onTimeout: () => void,
): { remaining: number | null; cancelled: boolean } {
  const [remaining, setRemaining] = useState<number | null>(
    enabled ? seconds : null,
  );
  const cancelled = useRef(false);
  const fired = useRef(false);
  const cb = useRef(onTimeout);
  cb.current = onTimeout;

  useEffect(() => {
    if (enabled) {
      cancelled.current = false;
      fired.current = false;
      setRemaining(seconds);
    } else {
      setRemaining(null);
    }
  }, [enabled, seconds]);

  const cancel = useCallback(() => {
    if (cancelled.current) return;
    cancelled.current = true;
    setRemaining(null);
  }, []);

  useEffect(() => {
    if (!enabled || cancelled.current) return;
    for (const evt of EVENTS)
      document.addEventListener(evt, cancel, { once: true, passive: true });
    return () => {
      for (const evt of EVENTS) document.removeEventListener(evt, cancel);
    };
  }, [enabled, cancel]);

  useEffect(() => {
    if (remaining === null || cancelled.current) return;
    if (remaining <= 0) {
      if (!fired.current) {
        fired.current = true;
        cb.current();
      }
      return;
    }
    const id = setTimeout(
      () => setRemaining((r) => (r !== null ? r - 1 : null)),
      1000,
    );
    return () => clearTimeout(id);
  }, [remaining]);

  return { remaining, cancelled: cancelled.current };
}
