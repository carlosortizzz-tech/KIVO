import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function ReembolsoPage() {
  const t = await getTranslations('legal');
  return (
    <div className="max-w-[420px] mx-auto w-full min-h-dvh flex flex-col items-center justify-center text-center gap-5 px-5">
      <h1 className="font-display text-xl font-extrabold">{t('refundTitle')}</h1>
      <p className="text-sm text-text2 leading-relaxed">{t('body')}</p>
      <Link href="/" className="text-accent2 font-bold text-sm border-2 border-accent rounded-2xl px-5 py-3" style={{ boxShadow: 'var(--glow)' }}>{t('back')}</Link>
    </div>
  );
}
