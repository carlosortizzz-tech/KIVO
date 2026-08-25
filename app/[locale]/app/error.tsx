'use client';

import { useTranslations } from 'next-intl';

export default function ErrorRadar({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('app.errorGeneric');
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16">
      <div className="text-sm font-bold">{t('title')}</div>
      <p className="text-[13px] text-text2 max-w-[28ch]">{t('body')}</p>
      <button
        onClick={reset}
        className="bg-accent-btn text-white font-bold text-sm rounded-xl px-5 py-2.5 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {t('retry')}
      </button>
    </div>
  );
}
