import { useEffect, useRef } from 'react';

const TIMEOUT_MS = 15 * 60 * 1000;

export function useSessionTimeout(onTimeout, enabled) {
  const timerRef = useRef(null);
  const cbRef = useRef(onTimeout);
  cbRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => cbRef.current(), TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [enabled]);
}
