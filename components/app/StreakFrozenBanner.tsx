'use client';

import { useState, useEffect } from 'react';
import { Snowflake } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Distinto tono del de BadgeUnlockedModal a propósito (24-GAMIFICACION): esto NO es un logro que
// celebrar, es un aviso de "te cuidamos" — un día perdido no rompió nada. Copy sin culpa.
export function StreakFrozenBanner({ streak, freezesLeft }: { streak: number; freezesLeft: number }) {
  const t = useTranslations('app.radar');
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(() => setDismissed(true), 250);
  }
  if (dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 transition-opacity duration-300"
      style={{ background: 'rgba(11,7,16,0.8)', opacity: visible ? 1 : 0 }}
      onClick={close}
    >
      <div
        className="feature-card rounded-[24px] p-7 text-center max-w-[320px] w-full transition-transform duration-350"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          transitionTimingFunction: 'var(--ease-out, cubic-bezier(.16,1,.3,1))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-accent2/10 flex items-center justify-center mx-auto mb-3">
          <Snowflake size={26} strokeWidth={2} className="text-accent2" />
        </div>
        <div className="font-display text-xl font-extrabold mb-2">{t('freezeUsedTitle')}</div>
        <p className="text-sm text-text2 mb-5">{t('freezeUsedBody', { streak, count: freezesLeft })}</p>
        <button
          onClick={close}
          className="bg-accent-btn text-white font-bold text-[14px] rounded-2xl py-3 w-full transition-transform duration-150 active:scale-[0.97]"
          style={{ boxShadow: 'var(--glow)' }}
        >
          {t('freezeClose')}
        </button>
      </div>
    </div>
  );
}
