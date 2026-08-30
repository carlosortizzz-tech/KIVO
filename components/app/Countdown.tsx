'use client';

import { useEffect, useState } from 'react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number } | null>(null);
  const [display, setDisplay] = useState<{ d: number; h: number; m: number } | null>(null);

  useEffect(() => {
    const targetDate = new Date(target).getTime();
    function computeRemaining() {
      const diff = Math.max(0, targetDate - Date.now());
      return {
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      };
    }
    const first = computeRemaining();
    setRemaining(first);

    // Conteo animado solo en la primera aparición (baseline #2 de movimiento) — de 0 al valor
    // real en ~600ms, sin `prefers-reduced-motion`; los ticks de después son instantáneos.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(first);
    } else {
      const steps = 16;
      const durationMs = 600;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = Math.min(1, step / steps);
        setDisplay({
          d: Math.round(first.d * progress),
          h: Math.round(first.h * progress),
          m: Math.round(first.m * progress),
        });
        if (progress === 1) clearInterval(timer);
      }, durationMs / steps);
    }

    const id = setInterval(() => {
      const next = computeRemaining();
      setRemaining(next);
      setDisplay(next);
    }, 60000);
    return () => clearInterval(id);
  }, [target]);

  const shown = display ?? remaining ?? { d: 2, h: 14, m: 37 };

  return (
    <div className="flex gap-2 mb-4" suppressHydrationWarning>
      <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
        <div className="font-display text-[32px] font-extrabold tabular-nums leading-none transition-opacity duration-300">{pad(shown.d)}</div>
        <div className="text-[9px] text-text2 uppercase mt-1">días</div>
      </div>
      <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
        <div className="font-display text-[32px] font-extrabold tabular-nums leading-none transition-opacity duration-300">{pad(shown.h)}</div>
        <div className="text-[9px] text-text2 uppercase mt-1">hrs</div>
      </div>
      <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
        <div className="font-display text-[32px] font-extrabold tabular-nums leading-none transition-opacity duration-300">{pad(shown.m)}</div>
        <div className="text-[9px] text-text2 uppercase mt-1">min</div>
      </div>
    </div>
  );
}
