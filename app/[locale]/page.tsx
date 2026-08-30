import { Calendar, Search, Globe2, ShieldAlert, UserRound, HeartHandshake } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Countdown } from '@/components/app/Countdown';
import { Reveal } from '@/components/app/Reveal';
import { CopyEmailLink } from '@/components/app/CopyEmailLink';
import { Link } from '@/i18n/navigation';

export const revalidate = 60;

async function getNextEvent() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('title, platform, starts_at')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tNav = await getTranslations('nav');
  const nextEvent = await getNextEvent();
  const eventTitle = nextEvent?.title ?? t('defaultEventTitle');
  const eventStartsAt = nextEvent?.starts_at ?? new Date(Date.now() + (2 * 86400 + 14 * 3600 + 37 * 60) * 1000).toISOString();

  const problems = [
    { icon: Calendar, text: t('problem1') },
    { icon: Search, text: t('problem2') },
    { icon: Globe2, text: t('problem3') },
    { icon: ShieldAlert, text: t('problem4') },
    { icon: UserRound, text: t('problem5') },
  ];

  const faqs = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
  ];

  const steps = [
    [t('step1Title'), t('step1Desc')],
    [t('step2Title'), t('step2Desc')],
    [t('step3Title'), t('step3Desc')],
  ];

  return (
    <div className="max-w-[480px] mx-auto w-full px-5">
      {/* HEADER */}
      <header className="flex items-center justify-between py-5">
        <div className="relative inline-block font-display font-extrabold text-xl">
          <span className="relative z-10">KIVO</span>
          <span
            className="absolute -inset-y-1 -inset-x-2.5 -rotate-2 rounded-[9999px_9999px_9999px_12px] border-2 border-accent"
            style={{ boxShadow: 'var(--glow)' }}
          />
        </div>
        <Link href="/login" className="text-sm font-semibold text-text2">{tNav('enter')}</Link>
      </header>

      {/* HERO */}
      <section>
        <h1 className="font-display text-[32px] font-extrabold leading-tight mb-3.5 tracking-tight">
          {t('heroTitle')}
        </h1>
        <p className="text-[15px] text-text2 mb-5 max-w-[40ch]">
          <b className="text-text font-semibold">KIVO Radar</b> {t('heroSubtitlePrefix')}
        </p>
        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 px-6 w-full transition-transform duration-150 active:scale-[0.97]"
          style={{ boxShadow: 'var(--glow)' }}
        >
          {t('ctaCreateAccount')}
        </Link>
        <div className="flex items-center gap-2.5 mt-3.5 text-xs text-text2">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          {t('proof')}
        </div>
        <div className="flex items-center gap-2 mt-2.5 text-xs font-semibold text-accent2">
          <HeartHandshake size={14} strokeWidth={2} />
          {t('trustBadge')}
        </div>

        <div
          className="rounded-[20px] p-5.5 my-6 border border-accent/35"
          style={{ background: 'linear-gradient(180deg, #1B1128, #0F0817)', boxShadow: '0 0 40px rgba(180,79,245,0.15)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-accent2 mb-2">{t('radarNext')}</div>
          <div className="text-[17px] font-bold mb-3.5">{eventTitle}</div>
          <Countdown target={eventStartsAt} />
          <div className="text-[11px] text-text2 mt-3">{t('radarLive')}</div>
        </div>
      </section>

      {/* PROBLEMA */}
      <Reveal>
        <section className="py-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">{t('problemsEyebrow')}</div>
          <h2 className="font-display text-[20px] font-extrabold mb-2">{t('problemsTitle')}</h2>
          <p className="text-xs text-text2 mb-4">{t('problemsProof')}</p>
          <div className="flex flex-col gap-3">
            {problems.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex gap-3 items-start bg-surface border border-border rounded-[18px] p-4">
                <div className="w-9 h-9 rounded-[10px] bg-accent-soft text-accent2 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="text-sm font-medium">{text}</div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* AGITACION */}
      <Reveal>
        <section className="pb-10">
          <div className="bg-sunken rounded-[20px] p-5.5">
            <p className="text-sm mb-2.5">{t('agitation1')}</p>
            <p className="text-sm mb-3">
              <b>{t('agitation2Strong')}</b>{t('agitation2Rest')}
            </p>
            <div className="font-display text-[32px] font-extrabold text-accent tabular-nums">8–12</div>
            <div className="text-xs text-text2">{t('agitationStatLabel')}</div>
          </div>
        </section>
      </Reveal>

      {/* SOLUCION */}
      <Reveal>
        <section className="pb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">{t('solutionEyebrow')}</div>
          <h2 className="font-display text-[20px] font-extrabold mb-2.5">{t('solutionTitle')}</h2>
          <p className="text-sm text-text2 mb-5">{t('solutionBody')}</p>
          <div className="flex flex-col gap-3.5">
            {steps.map(([title, desc], i) => (
              <div key={title} className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full text-white font-display font-extrabold text-sm flex items-center justify-center flex-shrink-0" style={{ boxShadow: 'var(--glow)', background: 'var(--accent-btn)' }}>
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-bold mb-0.5">{title}</div>
                  <div className="text-[13px] text-text2">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* OFERTA */}
      <Reveal>
        <section className="pb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">{t('offerEyebrow')}</div>
          <h2 className="font-display text-[20px] font-extrabold mb-4">{t('offerTitle')}</h2>
          <div className="flex flex-col gap-3">
            <div className="border-2 border-accent bg-accent-soft rounded-[18px] p-4.5 relative" style={{ boxShadow: 'var(--glow)' }}>
              <div className="absolute -top-2.5 right-4 bg-accent-btn text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">{t('bestValue')}</div>
              <div className="text-xs font-bold uppercase text-text2">{t('annual')}</div>
              <div className="font-display text-[26px] font-extrabold my-1 tabular-nums">$1.67<span className="text-[13px] font-medium text-text2">{t('perMonth')}</span></div>
              <div className="text-[11px] text-text2">{t('annualNote')}</div>
            </div>
            <div className="border border-border rounded-[18px] p-4.5">
              <div className="text-xs font-bold uppercase text-text2">{t('monthly')}</div>
              <div className="font-display text-[26px] font-extrabold my-1 tabular-nums">$2.99<span className="text-[13px] font-medium text-text2">{t('perMonth')}</span></div>
              <div className="text-[11px] text-text2">{t('monthlyNote')}</div>
            </div>
          </div>
          <Link href="/onboarding" className="mt-4 flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 px-6 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
            {t('ctaCreateAccount')}
          </Link>
        </section>
      </Reveal>

      {/* FAQ */}
      <Reveal>
        <section className="pb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-1.5">{t('faqEyebrow')}</div>
          <h2 className="font-display text-[20px] font-extrabold mb-1">{t('faqTitle')}</h2>
          <div>
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-border py-4">
                <div className="text-sm font-bold">{f.q}</div>
                <div className="text-[13px] text-text2 mt-2 leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* CTA FINAL */}
      <Reveal>
        <section className="pb-10">
          <div className="rounded-[20px] p-7 text-center border border-accent/35" style={{ background: 'linear-gradient(180deg, #1B1128, #0F0817)', boxShadow: '0 0 40px rgba(180,79,245,0.15)' }}>
            <h2 className="font-display text-[19px] font-extrabold mb-2.5">{t('finalTitle')}</h2>
            <p className="text-sm text-text2 mb-4.5">{t('finalBody')}</p>
            <Link href="/onboarding" className="flex items-center justify-center gap-2 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 px-6 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
              {t('ctaCreateAccount')}
            </Link>
            <div className="text-[12px] text-accent2 mt-3.5 font-semibold">{t('finalPrice')}</div>
            <div className="text-xs text-text2 mt-4.5 text-left leading-relaxed border-t border-border pt-4">{t('ps')}</div>
          </div>
        </section>
      </Reveal>

      {/* FOOTER */}
      <footer className="pb-16 pt-2">
        <div className="text-[11px] text-text2 leading-relaxed bg-sunken rounded-xl p-3.5 mb-4">{t('footerDisclaimer')}</div>
        <div className="flex flex-wrap gap-3.5 text-xs mb-4">
          <Link href="/privacidad" className="text-text2">{t('privacyLink')}</Link>
          <Link href="/terminos" className="text-text2">{t('termsLink')}</Link>
          <Link href="/reembolso" className="text-text2">{t('refundLink')}</Link>
          <CopyEmailLink label={t('contactLink')} copiedLabel={t('contactCopiedShort')} className="text-text2" />
        </div>
        <div className="text-xs text-text2">{t('copyright')}</div>
      </footer>
    </div>
  );
}
