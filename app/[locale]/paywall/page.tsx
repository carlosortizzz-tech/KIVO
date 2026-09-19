'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useLocale, useTranslations } from 'next-intl';
import { Rss, BookOpen, MessagesSquare, ShieldCheck, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { track, identifyUser } from '@/lib/analytics';
import { getAttribution } from '@/lib/attribution';
import { Reveal } from '@/components/app/Reveal';

// Checkout embebido de Hotmart (overlay): el pago se abre encima de esta misma pantalla, sin
// redirigir a hotmart.com — ver docs/sistema/02C-PRICING-Y-MODELO-DE-NEGOCIO.md → "EL PUENTE DE
// CHECKOUT". El webhook empareja la compra por CORREO (app/api/webhooks/hotmart/route.ts), por
// eso lo único crítico que hay que mandar prellenado es el email.
const HOTMART_OFFERS: Record<'mensual' | 'anual', string | undefined> = {
  mensual: process.env.NEXT_PUBLIC_HOTMART_OFFER_MENSUAL,
  anual: process.env.NEXT_PUBLIC_HOTMART_OFFER_ANUAL,
};

declare global {
  interface Window {
    checkoutElements?: {
      init: (type: 'overlayCheckout', opts: { offer: string; prefilledInfo?: { email?: string; sck?: string } }) => { attach: (selector: string) => void };
    };
  }
}

// Cuánto esperamos (webhook de Hotmart + confirmación) antes de avisar que está tardando más de
// lo normal, en vez de dejar al usuario mirando un spinner sin explicación.
const CONFIRM_POLL_MS = 3000;
const CONFIRM_TIMEOUT_MS = 90000;

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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkoutNotReady, setCheckoutNotReady] = useState(false);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'confirming' | 'slow'>('idle');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setUserEmail(data.user?.email ?? null);
        userIdRef.current = data.user?.id ?? null;
        // Esta pestaña llegó tras redirigir desde /auth/callback — con `persistence:'memory'`
        // de PostHog, esa redirección ya le dio una identidad anónima NUEVA (sin relación con
        // la del onboarding). Identificarla aquí la funde con la cuenta real de una vez —
        // complementa el alias server-side de /auth/callback (ver lib/analytics.ts).
        if (data.user) identifyUser(data.user.id, 'free', getAttribution());
      });
  }, []);

  // El botón se ATTACHea al SDK de Hotmart (abre el checkout embebido al hacer clic) cada vez
  // que cambia el plan elegido, porque cada plan tiene su propio código de oferta.
  useEffect(() => {
    if (!scriptLoaded || !window.checkoutElements || checkoutState !== 'idle') return;
    const offer = HOTMART_OFFERS[plan];
    if (!offer) return;
    window.checkoutElements
      .init('overlayCheckout', { offer, prefilledInfo: { email: userEmail ?? undefined, sck: getAttribution() } })
      .attach('#kivo-checkout-cta');
  }, [scriptLoaded, plan, userEmail, checkoutState]);

  // Deja de sondear al desmontar la pantalla, para no dejar un intervalo corriendo en el vacío.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    track('paywall_visto', { plan: 'free' });
  }, []);

  function tryMigrate() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
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
        if (res.ok) {
          localStorage.removeItem(STORAGE_KEY);
          setMigrateFailed(false);
        } else {
          setMigrateFailed(true);
        }
      })
      .catch(() => setMigrateFailed(true));
  }

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setChargeDate(d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }));
    tryMigrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  function handleStart() {
    track('paywall_click', { plan_elegido: plan });
    if (!HOTMART_OFFERS[plan]) {
      // El producto de Hotmart todavía no está creado/publicado — sin código de oferta, no hay
      // checkout que abrir. Se le avisa en vez de dejarlo pasar gratis en silencio.
      setCheckoutNotReady(true);
      return;
    }
    // El clic también dispara el checkout embebido de Hotmart (bindeado por separado vía
    // `elements.attach`, ver el useEffect de arriba) — este handler solo se encarga de empezar
    // a preguntar si el pago ya se confirmó, sin depender de que Hotmart avise nada por su cuenta
    // (su SDK no expone un evento de "compra completada").
    setCheckoutState('confirming');
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const supabase = createClient();
    pollRef.current = setInterval(async () => {
      const userId = userIdRef.current;
      if (!userId) return;
      const { data: profile } = await supabase.from('profiles').select('status, plan').eq('id', userId).maybeSingle();
      if (profile && profile.plan === 'pro' && (profile.status === 'active' || profile.status === 'trialing')) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        track('plan_actualizado', { plan_elegido: plan });
        router.push('/app');
      }
    }, CONFIRM_POLL_MS);
    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setCheckoutState('slow');
    }, CONFIRM_TIMEOUT_MS);
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
      <Script src="https://checkout.hotmart.com/lib/hotmart-checkout-elements.js" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className="flex items-center justify-between py-5">
        <button onClick={() => router.back()} className="text-text2 p-1 transition-transform duration-150 active:scale-90" aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className="font-display font-extrabold text-lg text-accent2" style={{ textShadow: '0 0 18px rgba(180,79,245,0.7)' }}>KIVO</div>
        <div className="w-7" />
      </div>

      <div>
        <Reveal>
          <div className="text-center pb-5 pt-2">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-2">{t('eyebrow')}</div>
            <h1 className="font-display text-[23px] font-extrabold mb-2">{t('title')}</h1>
            <p className="text-sm text-text2 max-w-[34ch] mx-auto">{t('subtitle')}</p>
          </div>
        </Reveal>

        <Reveal delayMs={60}>
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

        <div className="flex items-center justify-center gap-2 text-xs text-text2 mb-5 text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-success" /> {t('trustLine')}
        </div>
        </Reveal>

        <Reveal delayMs={120}>
        <div className="feature-card rounded-[20px] p-4 mb-5">
          {[
            { Icon: ShieldCheck, title: t('safeTitle'), sub: t('safeDesc') },
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
          <p className="text-[11px] text-warn text-center -mt-3 mb-4">
            {t('migrateError')} <button type="button" onClick={tryMigrate} className="underline font-semibold">{t('migrateRetry')}</button>
          </p>
        )}

        <div className="flex flex-col gap-2.5 text-[13px] text-text2 mb-6">
          <div>✓ {t('trialCharge', { date: chargeDate || '…' })}</div>
          <div>✓ {t('cancelAnytime')}</div>
          <div>✓ {t('guarantee')}</div>
        </div>
        </Reveal>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-6" style={{ background: 'linear-gradient(180deg, transparent, var(--bg) 30%)' }}>
        <div className="max-w-[420px] mx-auto flex flex-col gap-2">
          {checkoutState === 'confirming' && (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <Loader2 size={22} strokeWidth={2} className="animate-spin text-accent2" />
              <div className="text-sm font-bold">{t('confirmingTitle')}</div>
              <div className="text-xs text-text2">{t('confirmingSubtitle')}</div>
            </div>
          )}
          {checkoutState === 'slow' && (
            <div className="flex flex-col items-center gap-2.5 py-1 text-center">
              <div className="text-sm font-bold">{t('slowTitle')}</div>
              <div className="text-xs text-text2 mb-1">{t('slowSubtitle')}</div>
              <a
                href="mailto:soporte@kivoapp.app?subject=Ya%20pagu%C3%A9%20y%20no%20se%20activ%C3%B3%20mi%20plan"
                className="text-center text-[13px] font-bold text-accent2 underline underline-offset-2"
              >
                {t('slowContactCta')}
              </a>
              <button onClick={() => setCheckoutState('idle')} className="text-center text-[12px] text-text2 underline">
                {t('slowBack')}
              </button>
            </div>
          )}
          {checkoutState === 'idle' && (
            <>
              {checkoutNotReady && (
                <p className="text-[11px] text-warn text-center -mt-1 mb-1">{t('checkoutNotReady')}</p>
              )}
              <button id="kivo-checkout-cta" onClick={handleStart} className="bg-accent-btn text-white font-bold text-[15px] rounded-[14px] py-4 transition-transform duration-150 active:scale-[0.97]" style={{ boxShadow: 'var(--glow)' }}>
                {t('cta')}
              </button>
              <div className="text-center text-[11px] text-text2">{t('noChargeToday')}</div>
              <button onClick={() => router.push('/app')} className="text-center text-[13px] text-text2 underline">{t('skip')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
