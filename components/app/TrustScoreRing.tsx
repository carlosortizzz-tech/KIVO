'use client';

import { useEffect, useState } from 'react';

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TrustScoreRing({ score }: { score: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(score);
      return;
    }
    const steps = 24;
    const durationMs = 900;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      setShown(Math.round(score * progress));
      if (progress === 1) clearInterval(timer);
    }, durationMs / steps);
    return () => clearInterval(timer);
  }, [score]);

  const color = shown >= 70 ? 'var(--success)' : shown >= 40 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={RADIUS} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset,stroke] duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold tabular-nums">{shown}</div>
    </div>
  );
}
