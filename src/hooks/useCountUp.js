import { useEffect, useRef, useState } from "react";

// Anima um número de valor anterior → valor atual via requestAnimationFrame.
// Não altera lógica: apenas formata a renderização. Respeita prefers-reduced-motion.
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(typeof target === "number" ? target : 0);
  const fromRef = useRef(typeof target === "number" ? target : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number" || !isFinite(target)) {
      setValue(0);
      return;
    }

    const reduceMotion = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const startVal = fromRef.current;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}
