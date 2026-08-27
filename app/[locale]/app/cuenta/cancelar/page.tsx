import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const HOTMART_BUYER_PORTAL = 'https://consumer.hotmart.com';

export default async function CancelarPage() {
  const t = await getTranslations('cuenta');

  const steps = [
    { title: t('cancelStep1Title'), body: t('cancelStep1Body') },
    { title: t('cancelStep2Title'), body: t('cancelStep2Body') },
    { title: t('cancelStep3Title'), body: t('cancelStep3Body') },
  ];

  return (
    <div>
      <Link href="/app/cuenta" className="text-xs text-text2 mb-4 inline-block">{t('back')}</Link>
      <h1 className="font-display text-lg font-extrabold mb-3">{t('cancelTitle')}</h1>
      <p className="text-sm text-text2 leading-relaxed mb-5">{t('cancelIntro')}</p>

      <div className="flex flex-col gap-3 mb-5">
        {steps.map((s) => (
          <div key={s.title} className="bg-surface border border-border rounded-2xl p-4">
            <div className="text-sm font-bold mb-1">{s.title}</div>
            <div className="text-xs text-text2">{s.body}</div>
          </div>
        ))}
      </div>

      <a
        href={HOTMART_BUYER_PORTAL}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 mb-3 transition-transform duration-150 active:scale-[0.97]"
        style={{ boxShadow: 'var(--glow)' }}
      >
        {t('cancelCta')}
      </a>

      <p className="text-xs text-text2 text-center leading-relaxed">{t('cancelHelp')}</p>
    </div>
  );
}
