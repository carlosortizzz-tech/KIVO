import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type ProGateType = 'guide' | 'community' | 'safe';

export async function ProGate({ feature, type }: { feature: string; type: ProGateType }) {
  const t = await getTranslations('app.proGate');
  const bullets = [t(`${type}Bullet1` as never), t(`${type}Bullet2` as never), t(`${type}Bullet3` as never)];
  return (
    <div className="flex flex-col items-center text-center gap-4 py-16 px-4">
      <div className="icon-chip-accent firma-icon w-14 h-14 rounded-2xl flex items-center justify-center">
        <Lock size={24} strokeWidth={2} />
      </div>
      <div>
        <div className="text-sm font-bold mb-1.5">{t('title', { feature })}</div>
        <p className="text-[13px] text-text2 max-w-[30ch]">{t('body')}</p>
      </div>
      <div className="feature-card rounded-2xl px-4 py-3.5 max-w-[320px] w-full flex flex-col gap-2.5 text-left">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex items-start gap-2.5 text-[13px] text-text2">
            <span className="text-accent2 font-bold flex-shrink-0">✓</span>
            <span>{bullet}</span>
          </div>
        ))}
      </div>
      <Link
        href="/paywall"
        className="bg-accent-btn text-white font-bold text-[13px] rounded-xl px-6 py-3 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {t('cta')}
      </Link>
    </div>
  );
}
