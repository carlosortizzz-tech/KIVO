'use client';

import { useEffect, useState } from 'react';

export function LevelBar({ pct }: { pct: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setWidth(pct);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="h-2 rounded-full bg-border overflow-hidden">
      <div className="h-full rounded-full bg-accent-btn transition-[width] duration-700 ease-out" style={{ width: `${width}%`, boxShadow: 'var(--glow)' }} />
    </div>
  );
}
