'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Rss, BookOpen, MessagesSquare, Check, ArrowLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

const STORAGE_KEY = 'kivo_onboarding_state';

type OnboardingAnswers = {
  plataforma?: 'weverse' | 'bubble' | 'twitter' | 'todas';
  dolor?: 'tickets' | 'comebacks' | 'membresia' | 'todo';
};

const platformNames: Record<string, string> = {
  weverse: 'Weverse',
  bubble: 'Bubble',
  twitter: 'Twitter (X)',
  todas: 'Weverse, Bubble, Twitter',
};

export default function PaywallPage() {
  const t = useTranslations('paywall');
  const locale = useLocale();
  const router = useRouter();
  const [plan, setPlan] = useState<'anual' | 'mensual'>('anual');
  const [chargeDate, setChargeDate] = useState('');
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [migrateFailed, setMigrateFailed] = useState(false);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setChargeDate(d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }));

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAnswers(parsed.respuestas ?? {});
      } catch {}

      fetch('/api/onboarding/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw,
      })
        .then((res) => {
          if (res.ok) localStorage.removeItem(STORAGE_KEY);
          else setMigrateFailed(true);
        })
        .catch(() => setMigrateFailed(true));
    }
  }, [locale]);

  function handleStart() {
    // TODO (pendiente de cuenta de Hotmart del usuario): conectar el checkout real.
    router.push('/app');
  }

  const guideSub = answers.plataforma
    ? t('guideFor', { platform: platformNames[answers.plataforma] })
    : t('guideDefault');
  const radarSub = answers.dolor === 'tickets'
    ? t('radarTickets')
    : answers.dolor === 'comebacks'
    ? t('radarComebacks')
    : answers.dolor === 'membresia'
    ? t('radarMembership')
    : t('radarDefault');

  return (
    <div className="max-w-[420px] mx-auto w-full pb-40 px-5">
      <div className="flex items-center justify-between py-5">
        <button onClick={() => router.back()} className="text-text2 p-1 transition-transform duration-150 active:scale-90" aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className="font-display font-extrabold text-lg text-accent2" style={{ textShadow: '0 0 18px rgba(180,79,245,0.7)' }}>KIVO</div>
        <div className="w-7" />
      </div>

      <div>
        <div className="text-center pb-5 pt-2">
          <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-2">{t('eyebrow')}</div>
          <h1 className="font-display text-[23px] font-extrabold mb-2">{t('title')}</h1>
          <p className="text-sm text-text2 max-w-[34ch] mx-auto">{t('subtitle')}</p>
        </div>

        <div className="feature-card rounded-[20px] p-4 mb-5">
          {[
            { Icon: Rss, title: t('radarTitle'), sub: radarSub },
            { Icon: BookOpen, title: t('guideTitle'), sub: guideSub },
            { Icon: MessagesSquare, title: t('communityTitle'), sub: t('communityDesc') },
          ].map(({ Icon, title, sub }, i) => (
            <div key={title} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="icon-chip-accent firma-icon w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0">
                <Icon size={18} strokeWidth={2} />
              </div>
              <div className="text-sm"><b className="block text-sm mb-0.5">{title}</b>{sub}</div>
            </div>
          ))}
        </div>
        {migrateFailed && (
          <p className="text-[11px] text-warn text-center -mt-3 mb-4">{t('migrateError')}</p>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-text2 mb-6 text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-success" /> {t('trustLine')}
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <button
            onClick={() => setPlan('anual')}
            className={`rounded-[20px] p-4 flex items-center justify-between gap-3 relative border transition-transform duration-150 active:scale-[0.98] ${plan === 'anual' ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
            style={plan === 'anual' ? { boxShadow: 'var(--glow)' } : undefined}
          >
            <span className="absolute -top-2.5 left-4 bg-accent-btn text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{t('bestValue')}</span>
            <span className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${plan === 'anual' ? 'border-accent bg-accent' : 'border-border'}`}>
                {plan === 'anual' && <Check size={12} strokeWidth={3} color="white" />}
              </span>
              <span className="text-left"><span className="block text-sm font-bold">{t('annual')}</span><span className="text-xs text-text2">{t('annualNote')}</span></span>
            </span>
            <span className="text-right"><span className="block font-display text-2xl font-extrabold tabular-nums">$1.67</span><span className="text-[11px] text-text2">{t('perMonth')}</span></span>
          </button>
          <button
            onClick={() => setPlan('mensual')}
            className={`rounded-[20px] p-4 flex items-center justify-between gap-3 border transition-transform duration-150 active:scale-[0.98] ${plan === 'mensual' ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
            style={plan === 'mensual' ? { boxShadow: 'var(--glow)' } : undefined}
          >
            <span className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${plan === 'mensual' ? 'border-accent bg-accent' : 'border-border'}`}>
                {plan === 'mensual' && <Check size={12} strokeWidth={3} color="white" />}
              </span>
              <span className="text-left"><span className="block text-sm font-bold">{t('monthly')}</span><span className="text-xs text-text2">{t('monthlyNote')}</span></span>
            </span>
            <span className="text-right"><span className="block font-display text-2xl font-extrabold tabular-nums">$2.99</span><span className="text-[11px] text-text2">{t('perMonth')}</span></span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5 text-[13px] text-text2 mb-6">
          <div>✓ {t('trialCharge', { date: chargeDate || '…' })}</div>
          <div>✓ {t('cancelAnytime')}</div>
          <div>✓ {t('guarantee')}</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-6" style={{ background: 'linear-gradient(180deg, transparent, var(--bg) 30%)' }}>
        <div className="max-w-[420px] mx-auto flex flex-col gap-2">
          <button onClick={handleStart} className="bg-accent-btn text-white font-bold text-[15px] rounded-[14px] py-4 transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
            {t('cta')}
          </button>
          <div className="text-center text-[11px] text-text2">{t('noChargeToday')}</div>
          <button onClick={() => router.push('/app')} className="text-center text-[13px] text-text2 underline">{t('skip')}</button>
        </div>
      </div>
    </div>
  );
}
