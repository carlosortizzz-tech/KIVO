'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Rss } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { track } from '@/lib/analytics';
import { Reveal } from '@/components/app/Reveal';

type Answers = {
  antiguedad?: string;
  dolor?: string;
  plataforma?: string;
  aviso?: string;
};

const STORAGE_KEY = 'kivo_onboarding_state';

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between gap-2.5 rounded-2xl border px-4.5 py-4 text-left text-[15px] font-semibold w-full transition-transform duration-150 active:scale-[0.98] ${
        selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
      }`}
      style={selected ? { boxShadow: 'var(--glow)' } : undefined}
    >
      {label}
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-accent bg-accent' : 'border-border'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} color="white" />}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [loadingDone, setLoadingDone] = useState<number>(0);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.v === 1) setAnswers(parsed.respuestas ?? {});
      } catch {}
    }
  }, []);

  const progressMap: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 6 };

  function saveAnswer(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, respuestas: next }));
    track('onboarding_paso_completado', { paso: progressMap[step], total_pasos: 6 });
    setTimeout(() => setStep((s) => s + 1), 300);
  }

  function startLoading() {
    track('onboarding_paso_completado', { paso: progressMap[6], total_pasos: 6 });
    setStep(7);
    const timings = [600, 1300, 2000, 2700];
    timings.forEach((t, i) => setTimeout(() => setLoadingDone(i + 1), t));
    setTimeout(() => {
      setStep(8);
      track('onboarding_completado', {});
    }, 3400);
  }
  const progress = Math.round((progressMap[step] / 6) * 100);

  const resultText = (() => {
    switch (answers.dolor) {
      case 'tickets': return t('resultTickets');
      case 'comebacks': return t('resultComebacks');
      case 'membresia': return t('resultMembership');
      default: return t('resultDefault');
    }
  })();

  const chipsAntiguedad = [
    { v: 'nuevo', label: t('q1a') },
    { v: 'medio', label: t('q1b') },
    { v: 'og', label: t('q1c') },
    { v: 'perdida', label: t('q1d') },
  ];
  const chipsDolor = [
    { v: 'tickets', label: t('q2a') },
    { v: 'comebacks', label: t('q2b') },
    { v: 'membresia', label: t('q2c') },
    { v: 'todo', label: t('q2d') },
  ];
  const chipsPlataforma = [
    { v: 'weverse', label: t('q3a') },
    { v: 'bubble', label: t('q3b') },
    { v: 'twitter', label: t('q3c') },
    { v: 'todas', label: t('q3d') },
  ];
  const chipsAviso = [
    { v: 'instante', label: t('q4a') },
    { v: 'resumen', label: t('q4b') },
    { v: 'urgente', label: t('q4c') },
  ];

  return (
    <div className="max-w-[480px] mx-auto w-full min-h-dvh flex flex-col px-5">
      <div className="flex items-center gap-3 py-5">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          className={`text-text2 text-xl px-1 ${step === 0 ? 'invisible' : ''}`}
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex-1 h-1.5 bg-sunken rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-350"
            style={{ width: `${progress}%`, boxShadow: 'var(--glow)' }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center pb-8">
        {step === 0 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="firma-icon w-[88px] h-[88px] rounded-full flex items-center justify-center mb-2 relative" style={{ background: 'radial-gradient(circle, var(--glow-icon), transparent 70%)' }}>
                <Rss size={40} strokeWidth={1.8} color="var(--accent2)" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('kickerMinutes')}</div>
              <h1 className="font-display text-2xl font-extrabold">{t('introTitle')}</h1>
              <p className="text-sm text-text2">{t('introBody')}</p>
              <div className="flex flex-col gap-2 text-[13px] text-text2">
                <div>{t('introBullet1')}</div>
                <div>{t('introBullet2')}</div>
                <div>{t('introBullet3')}</div>
              </div>
              <button onClick={() => { track('onboarding_iniciado', {}); setStep(1); }} className="mt-1 bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
                {t('start')}
              </button>
            </div>
          </Reveal>
        )}

        {step === 1 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('step1of6')}</div>
              <h2 className="font-display text-2xl font-extrabold">{t('q1Title')}</h2>
              <div className="flex flex-col gap-2.5">
                {chipsAntiguedad.map((c) => (
                  <Chip key={c.v} label={c.label} selected={answers.antiguedad === c.v} onClick={() => saveAnswer('antiguedad', c.v)} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {step === 2 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('step2of6')}</div>
              <h2 className="font-display text-2xl font-extrabold">{t('q2Title')}</h2>
              <p className="text-sm text-text2 -mt-2">{t('q2Sub')}</p>
              <div className="flex flex-col gap-2.5">
                {chipsDolor.map((c) => (
                  <Chip key={c.v} label={c.label} selected={answers.dolor === c.v} onClick={() => saveAnswer('dolor', c.v)} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {step === 3 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('recoEyebrow')}</div>
              <div className="feature-card rounded-2xl p-6">
                <div className="font-display text-4xl font-extrabold text-accent mb-2">{t('recoStat')}</div>
                <p className="text-[15px] leading-relaxed">{t('recoText')}</p>
              </div>
              <button onClick={() => { track('onboarding_paso_completado', { paso: progressMap[3], total_pasos: 6 }); setStep(4); }} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
                {t('recoCta')}
              </button>
            </div>
          </Reveal>
        )}

        {step === 4 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('step3of6')}</div>
              <h2 className="font-display text-2xl font-extrabold">{t('q3Title')}</h2>
              <div className="flex flex-col gap-2.5">
                {chipsPlataforma.map((c) => (
                  <Chip key={c.v} label={c.label} selected={answers.plataforma === c.v} onClick={() => saveAnswer('plataforma', c.v)} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {step === 5 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('step4of6')}</div>
              <h2 className="font-display text-2xl font-extrabold">{t('q4Title')}</h2>
              <div className="flex flex-col gap-2.5">
                {chipsAviso.map((c) => (
                  <Chip key={c.v} label={c.label} selected={answers.aviso === c.v} onClick={() => saveAnswer('aviso', c.v)} />
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {step === 6 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('step5of6')}</div>
              <h2 className="font-display text-2xl font-extrabold">{t('commitTitle')}</h2>
              <div className="rounded-[20px] p-6 text-center border border-accent bg-surface" style={{ boxShadow: 'var(--glow)' }}>
                <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('commitEyebrow')}</div>
                <div className="font-display text-[19px] font-extrabold my-2.5">{t('commitGoal')}</div>
                <p className="text-sm text-text2">{t('commitBody')}</p>
              </div>
              <button onClick={startLoading} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
                {t('commitCta')}
              </button>
            </div>
          </Reveal>
        )}

        {step === 7 && (
          <div className="flex flex-col items-center gap-6 text-center pt-10">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 self-start">{t('step6of6')}</div>
            <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--sunken)" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={251} strokeDashoffset={251 * (1 - loadingDone / 4)}
                style={{ transition: 'stroke-dashoffset 400ms var(--ease-out)', filter: 'drop-shadow(0 0 6px rgba(180,79,245,.7))' }}
              />
            </svg>
            <h2 className="font-display text-lg font-extrabold">{t('loadingTitle')}</h2>
            <div className="flex flex-col gap-2.5 text-left w-full">
              {[t('loading1'), t('loading2'), t('loading3'), t('loading4')].map((txt, i) => (
                <div key={txt} className={`flex items-center gap-2.5 text-sm transition-opacity ${loadingDone > i ? 'opacity-100 text-text' : 'opacity-40 text-text2'}`}>
                  <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${loadingDone > i ? 'border-success bg-success' : 'border-border'}`}>
                    {loadingDone > i && <Check size={10} strokeWidth={3} color="white" />}
                  </span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <Reveal>
            <div className="flex flex-col gap-4.5">
              <div className="text-xs font-bold uppercase tracking-wide text-accent2">{t('doneEyebrow')}</div>
              <h1 className="font-display text-2xl font-extrabold">{t('doneTitle')}</h1>
              <p className="text-sm text-text2 -mt-2">{resultText}</p>
              <div className="feature-card rounded-2xl p-5.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-accent2 mb-2">{t('radarNext')}</div>
                <div className="text-[17px] font-bold mb-3.5">{t('defaultEventTitle')}</div>
                <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5 text-[13px]">
                  {t('streakStarted')}
                </div>
              </div>
              <button onClick={() => router.push('/crear-cuenta')} className="bg-accent-btn text-white font-bold text-[15px] rounded-2xl py-4 w-full transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
                {t('saveCta')}
              </button>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
