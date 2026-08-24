'use client';

import { useEffect, useState } from 'react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number } | null>(null);

  useEffect(() => {
    const targetDate = new Date(target).getTime();
    function tick() {
      const diff = Math.max(0, targetDate - Date.now());
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target]);

  const display = remaining ?? { d: 2, h: 14, m: 37 };

  return (
    <div className="flex gap-2 mb-4" suppressHydrationWarning>
      <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
        <div className="font-display text-[32px] font-extrabold tabular-nums leading-none transition-opacity duration-300">{pad(display.d)}</div>
        <div className="text-[9px] text-text2 uppercase mt-1">días</div>
      </div>
      <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
        <div className="font-display text-[32px] font-extrabold tabular-nums leading-none transition-opacity duration-300">{pad(display.h)}</div>
        <div className="text-[9px] text-text2 uppercase mt-1">hrs</div>
      </div>
      <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
        <div className="font-display text-[32px] font-extrabold tabular-nums leading-none transition-opacity duration-300">{pad(display.m)}</div>
        <div className="text-[9px] text-text2 uppercase mt-1">min</div>
      </div>
    </div>
  );
}
