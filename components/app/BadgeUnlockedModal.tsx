'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function BadgeUnlockedModal({ name, description, icon }: { name: string; description: string | null; icon: string | null }) {
  const t = useTranslations('app.radar');
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Un frame después del montaje para que la transición de entrada sí se vea (si arranca ya
  // visible, el navegador la pinta de una y no hay animación).
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
          boxShadow: '0 0 50px rgba(180,79,245,0.35)',
          transform: visible ? 'scale(1)' : 'scale(0.85)',
          transitionTimingFunction: 'var(--ease-out, cubic-bezier(.16,1,.3,1))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">{icon ?? '🏆'}</div>
        <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1">{t('badgeUnlocked')}</div>
        <div className="font-display text-xl font-extrabold mb-2">{name}</div>
        {description && <p className="text-sm text-text2 mb-5">{description}</p>}
        <button
          onClick={close}
          className="bg-accent-btn text-white font-bold text-[14px] rounded-2xl py-3 w-full transition-transform duration-150 active:scale-[0.97]"
          style={{ boxShadow: 'var(--glow)' }}
        >
          {t('badgeClose')}
        </button>
      </div>
    </div>
  );
}
