'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useLocale, useTranslations } from 'next-intl';
import { BellRing, BookOpen, MessagesSquare, ShieldCheck, Check, ArrowLeft, Loader2 } from 'lucide-react';
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
  const metaOnboardingRef = useRef<string | null>(null);
  const migratingRef = useRef(false);
  // Si llega desde "Avisarme" en el Radar (ya usó su aviso gratis), el titular nombra ESE evento:
  // es el momento de mayor intención del modelo de cobro (02C).
  const [eventTitle, setEventTitle] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('evento');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    createClient()
      .from('events')
      .select('title, title_en, title_fr, title_ko, starts_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const localized = { en: data.title_en, fr: data.title_fr, ko: data.title_ko }[locale as 'en' | 'fr' | 'ko'];
        // Con fecha: una misma ciudad tiene varias fechas con el mismo título (Bogotá 2 y 3 de oct).
        const date = new Date(data.starts_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
        setEventTitle(`${localized || data.title} (${date})`);
      });
  }, [locale]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      userIdRef.current = data.user?.id ?? null;
      if (!data.user) return;
      // Esta pestaña llegó tras redirigir desde /auth/confirm o /auth/callback — con
      // `persistence:'memory'` de PostHog, esa redirección ya le dio una identidad anónima NUEVA
      // (sin relación con la del onboarding). Identificarla aquí la funde con la cuenta real de
      // una vez — complementa el alias server-side de lib/auth-finalize.ts.
      identifyUser(data.user.id, 'free', getAttribution());
      // Estado del funnel en el servidor: desde ahora, los próximos inicios de sesión van directo
      // a /app (lib/auth-redirect.ts). Si falla, lo peor es volver a ver el paywall una vez más.
      supabase.rpc('mark_paywall_seen').then(({ error }) => {
        if (error) console.error('mark_paywall_seen failed', error.message);
      });
      // Respaldo de las respuestas del onboarding guardadas en la cuenta al registrarse
      // (crear-cuenta/page.tsx): el enlace del correo casi siempre abre en OTRO navegador que
      // el del onboarding, donde este localStorage está vacío.
      const saved = data.user.user_metadata?.onboarding;
      if (saved && typeof saved === 'object') {
        metaOnboardingRef.current = JSON.stringify({ v: 1, respuestas: saved });
        tryMigrate();
      }
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
    // Primero lo de este navegador; si no hay (enlace abierto en otro navegador), lo guardado en
    // la cuenta. `migratingRef` evita mandar dos migraciones a la vez (el montaje y la llegada
    // del usuario pueden dispararla casi juntas).
    const raw = localStorage.getItem(STORAGE_KEY) ?? metaOnboardingRef.current;
    if (!raw || migratingRef.current) return;
    migratingRef.current = true;
    try {
      const parsed = JSON.parse(raw);
      setAnswers(parsed.respuestas ?? {});
    } catch {}

    fetch('/api/onboarding/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    })
      .then(async (res) => {
        if (res.ok) {
          localStorage.removeItem(STORAGE_KEY);
          setMigrateFailed(false);
          // Ya aplicado (el endpoint solo responde OK si TODAS sus escrituras funcionaron): se borra
          // la copia de la cuenta para no volver a migrar en cada visita. Vale también si esta
          // migración salió de localStorage — son las mismas respuestas. Si el borrado falla, la
          // copia queda y se reintenta en la próxima visita (la migración es idempotente).
          if (metaOnboardingRef.current) {
            metaOnboardingRef.current = null;
            const { error } = await createClient().auth.updateUser({ data: { onboarding: null } });
            if (error) console.error('clear onboarding metadata failed', error.message);
          }
        } else {
          setMigrateFailed(true);
        }
      })
      .catch(() => setMigrateFailed(true))
      .finally(() => {
        migratingRef.current = false;
      });
  }

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setChargeDate(d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }));
    tryMigrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  function cancelCheckoutWait() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCheckoutState('idle');
  }

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
        // `plan_actualizado` ya se manda server-side desde el webhook de Hotmart
        // (app/api/webhooks/hotmart/route.ts) — mandarlo también aquí lo contaba 2 veces en
        // PostHog (36-ANALITICA-Y-EVENTOS.md § captura server-side).
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
        <button onClick={() => router.back()} className="text-text2 min-w-11 min-h-11 -ml-3 flex items-center justify-center transition-transform duration-150 active:scale-90" aria-label={t('back')}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className="font-display font-extrabold text-lg text-accent2" style={{ textShadow: '0 0 18px rgba(180,79,245,0.7)' }}>KIVO</div>
        <div className="w-7" />
      </div>

      <div>
        <Reveal>
          <div className="text-center pb-5 pt-2">
            <div className="text-xs font-bold uppercase tracking-wide text-accent2 mb-2">{t('eyebrow')}</div>
            {/* Titular con el mecanismo (el aviso), no "comunidad"; si llega desde "Avisarme" en el
                Radar, nombra el evento que quiere (crítica de expertos + revisor-visual 2026-09-30). */}
            <h1 className="font-display text-[23px] font-extrabold mb-2">
              {eventTitle ? t('titleEvent', { event: eventTitle }) : t('title')}
            </h1>
            <p className="text-sm text-text2 max-w-[34ch] mx-auto">{t('subtitle')}</p>
          </div>
        </Reveal>

        <Reveal delayMs={60}>
        <div role="radiogroup" aria-label={t('planLabel')} className="flex flex-col gap-3 mb-5">
          <button
            role="radio"
            aria-checked={plan === 'anual'}
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
            {/* "US" explícito: "$1.67" a secas se lee como pesos/soles en LATAM (crítica de expertos 2026-09-30). */}
            <span className="text-right"><span className="block font-display text-2xl font-extrabold tabular-nums"><span className="text-xs font-bold mr-0.5 align-top">US</span>$1.67</span><span className="text-[11px] text-text2">{t('perMonth')}</span></span>
          </button>
          <button
            role="radio"
            aria-checked={plan === 'mensual'}
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
            <span className="text-right"><span className="block font-display text-2xl font-extrabold tabular-nums"><span className="text-xs font-bold mr-0.5 align-top">US</span>$2.99</span><span className="text-[11px] text-text2">{t('perMonth')}</span></span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-text2 mb-5 text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-success" /> {t('trustLine')}
        </div>

        <ul className="flex flex-col gap-2.5 text-[13px] text-text2 mb-6">
          {[t('trialCharge', { date: chargeDate || '…' }), t('cancelAnytime'), t('guarantee')].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check size={14} strokeWidth={2.5} className="text-accent2 flex-shrink-0 mt-0.5" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        </Reveal>
        {/* Beneficios DESPUÉS de los planes: en la primera vista se decide el plan con su precio a la
            vista (revisor-visual 2026-09-30); el CTA de la barra ya resume la compra ("Activar mis avisos"). */}
        <Reveal delayMs={120}>
        <div className="feature-card rounded-[20px] p-4 mb-5">
          {[
            { Icon: BellRing, title: t('radarTitle'), sub: radarSub },
            { Icon: BookOpen, title: t('guideTitle'), sub: guideSub },
            { Icon: ShieldCheck, title: t('safeTitle'), sub: t('safeDesc') },
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
        </Reveal>

      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 pb-5 pt-6" style={{ background: 'linear-gradient(180deg, transparent, var(--bg) 30%)' }}>
        <div className="max-w-[420px] mx-auto flex flex-col gap-2">
          {checkoutState === 'confirming' && (
            // Fondo sólido: sin él, el spinner quedaba encima del texto de la lista de beneficios.
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-2 py-3 text-center bg-bg rounded-2xl">
              <Loader2 size={22} strokeWidth={2} className="animate-spin text-accent2" />
              <div className="text-sm font-bold">{t('confirmingTitle')}</div>
              <div className="text-xs text-text2">{t('confirmingSubtitle')}</div>
              {/* El estado "confirmando" empieza al TOCAR el botón (el SDK de Hotmart no avisa si se
                  pagó): quien cierra el checkout sin pagar necesita una salida inmediata, no 90 s de
                  "Confirmando tu compra…" sin poder volver (crítica de expertos 2026-09-30). */}
              <button onClick={cancelCheckoutWait} className="text-center text-[12px] text-text2 underline mt-1">
                {t('confirmingBack')}
              </button>
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
              {/* Aviso ANTES de que Hotmart pida la tarjeta: el copy previo prometía "gratis" y el
                  checkout la pedía sin aviso. Monto y fecha reales según el plan elegido. */}
              <div className="text-center text-[11px] text-text2 leading-relaxed">
                {t('noChargeToday', { date: chargeDate || '…', amount: plan === 'anual' ? '19.99' : '2.99' })}
              </div>
              <button onClick={() => router.push('/app')} className="text-center text-[13px] text-text2 underline">{t('skip')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
