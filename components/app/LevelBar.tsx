'use client';

import { useEffect, useState } from 'react';

export function LevelBar({ pct, xpEnNivel, xpParaSiguiente }: { pct: number; xpEnNivel: number; xpParaSiguiente: number }) {
  const [width, setWidth] = useState(0);
  const [xpShown, setXpShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setWidth(pct);
      setXpShown(xpEnNivel);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(pct));

    const steps = 16;
    const durationMs = 700;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      setXpShown(Math.round(xpEnNivel * progress));
      if (progress === 1) clearInterval(timer);
    }, durationMs / steps);

    return () => {
      cancelAnimationFrame(id);
      clearInterval(timer);
    };
  }, [pct, xpEnNivel]);

  return (
    <div>
      <div className="text-xs text-text2 tabular-nums mb-2 text-right">{xpShown}/{xpParaSiguiente} XP</div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-accent-btn transition-[width] duration-700 ease-out" style={{ width: `${width}%`, boxShadow: 'var(--glow)' }} />
      </div>
    </div>
  );
}
