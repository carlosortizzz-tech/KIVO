import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LegalContent } from '@/components/app/LegalContent';

export default async function TerminosPage() {
  const t = await getTranslations('legal');
  return (
    <div className="max-w-[560px] mx-auto w-full min-h-dvh px-5 pb-16">
      <div className="flex items-center gap-3 py-5">
        <Link href="/" className="text-text2 p-1 transition-transform duration-150 active:scale-90" aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <div className="font-display font-extrabold text-lg text-accent2" style={{ textShadow: '0 0 14px rgba(180,79,245,0.6)' }}>KIVO</div>
      </div>
      <h1 className="font-display text-xl font-extrabold mb-1.5">{t('termsTitle')}</h1>
      <p className="text-xs text-text2 mb-6">{t('updated')}</p>
      <LegalContent text={t('termsContent')} />
    </div>
  );
}
